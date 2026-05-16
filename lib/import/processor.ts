import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import type { AccountSubtype, AccountType } from "@prisma/client"
import type { ImportType, FieldMapping } from "./types"
import { getFieldSchema } from "./field-schemas"

export interface ProcessResult {
  rowIndex:    number
  status:      "success" | "error" | "skipped"
  entityId?:   string
  entityType?: string
  error?:      string
}

// ── Utilities ──────────────────────────────────────────────────────────────────

export function hashRow(raw: Record<string, string>): string {
  const stable = JSON.stringify(Object.entries(raw).sort())
  return createHash("sha256").update(stable).digest("hex")
}

function applyMapping(raw: Record<string, string>, mapping: FieldMapping): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    const val = raw[sourceCol]
    if (val !== undefined) mapped[targetField] = val.trim()
  }
  return mapped
}

function parseDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

function parseNumber(s: string): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[,₹$€£\s]/g, ""))
  return isNaN(n) ? 0 : n
}

function validateRequired(mapped: Record<string, string>, type: ImportType): string | null {
  const fields = getFieldSchema(type)
  for (const field of fields) {
    if (field.required && !mapped[field.key]) {
      return `Required field "${field.label}" is missing`
    }
  }
  return null
}

// ── Per-type writers ───────────────────────────────────────────────────────────

async function writeCustomer(mapped: Record<string, string>, companyId: string): Promise<string> {
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name:         mapped.name,
      email:        mapped.email || null,
      phone:        mapped.phone || null,
      gstin:        mapped.gstin || null,
      pan:          mapped.pan   || null,
      creditLimit:  mapped.creditLimit ? parseNumber(mapped.creditLimit) : null,
      billingAddress: (mapped.addressLine1 || mapped.city) ? {
        line1:   mapped.addressLine1 || "",
        city:    mapped.city    || "",
        state:   mapped.state   || "",
        pincode: mapped.pincode || "",
        country: mapped.country || "India",
      } : undefined,
    },
  })
  return customer.id
}

async function writeVendor(mapped: Record<string, string>, companyId: string): Promise<string> {
  const vendor = await prisma.vendor.create({
    data: {
      companyId,
      name:  mapped.name,
      email: mapped.email || null,
      phone: mapped.phone || null,
      gstin: mapped.gstin || null,
      pan:   mapped.pan   || null,
    },
  })
  return vendor.id
}

async function writeChartAccount(mapped: Record<string, string>, companyId: string): Promise<string> {
  const account = await prisma.chartAccount.create({
    data: {
      companyId,
      code:        mapped.code,
      name:        mapped.name,
      type:        mapped.type.toUpperCase() as AccountType,
      subtype:     (mapped.subtype?.toUpperCase() ?? "OTHER_ASSET") as AccountSubtype,
      description: mapped.description || null,
      isPosting:   true,
    },
  })
  return account.id
}

async function writeOpeningBalance(
  mapped: Record<string, string>,
  companyId: string,
  userId: string,
): Promise<string> {
  const debit  = parseNumber(mapped.debit)
  const credit = parseNumber(mapped.credit)
  const date   = parseDate(mapped.asOfDate) ?? new Date()

  const account = await prisma.chartAccount.findFirst({
    where: { companyId, code: mapped.accountCode },
  })
  if (!account) throw new Error(`Account code "${mapped.accountCode}" not found`)

  const amount    = debit > 0 ? debit : credit
  const direction = debit > 0 ? "DEBIT" : "CREDIT"

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      voucherType:   "OPENING_BALANCE",
      voucherNumber: `OB-${account.code}-${date.getFullYear()}`,
      date,
      narration:   `Opening balance — ${account.name}`,
      status:      "POSTED",
      reference:   "OB-IMPORT",
      totalDebit:  direction === "DEBIT"  ? amount : 0,
      totalCredit: direction === "CREDIT" ? amount : 0,
      createdById: userId,
      postedById:  userId,
      postedAt:    new Date(),
      lines: {
        create: [{
          accountId: account.id,
          direction,
          amount,
          description: "Opening balance import",
        }],
      },
    },
  })
  return entry.id
}

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processImportRows(
  rows:        Record<string, string>[],
  mapping:     FieldMapping,
  type:        ImportType,
  companyId:   string,
  workspaceId: string,
  userId:      string,
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw     = rows[i]
    const rowHash = hashRow(raw)

    const existing = await prisma.importRow.findFirst({ where: { rowHash } })
    if (existing?.status === "success") {
      results.push({ rowIndex: i, status: "skipped", entityId: existing.entityId ?? undefined })
      continue
    }

    const mapped = applyMapping(raw, mapping)
    const validationError = validateRequired(mapped, type)
    if (validationError) {
      results.push({ rowIndex: i, status: "error", error: validationError })
      continue
    }

    try {
      let entityId:   string | undefined
      let entityType: string | undefined

      if (type === "customers") {
        entityId   = await writeCustomer(mapped, companyId)
        entityType = "customer"
      } else if (type === "vendors") {
        entityId   = await writeVendor(mapped, companyId)
        entityType = "vendor"
      } else if (type === "chart_of_accounts") {
        entityId   = await writeChartAccount(mapped, companyId)
        entityType = "chart_account"
      } else if (type === "opening_balances") {
        entityId   = await writeOpeningBalance(mapped, companyId, userId)
        entityType = "journal_entry"
      } else {
        throw new Error(`Import type "${type}" writer is not yet implemented`)
      }

      results.push({ rowIndex: i, status: "success", entityId, entityType })
    } catch (err) {
      results.push({
        rowIndex: i,
        status:   "error",
        error:    err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return results
}
