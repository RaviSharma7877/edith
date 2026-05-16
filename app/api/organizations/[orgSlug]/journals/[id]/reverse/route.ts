import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import type { VoucherType, TransactionDirection } from "@prisma/client"

const VOUCHER_PREFIX: Record<string, string> = {
  JOURNAL_ENTRY: "JV", PAYMENT_RECEIPT: "RV", PAYMENT_DISBURSEMENT: "PV",
  SALES_INVOICE: "SI", PURCHASE_BILL: "PB", CREDIT_NOTE: "CN",
  DEBIT_NOTE: "DN", CONTRA: "CO", OPENING_BALANCE: "OB",
  BANK_RECONCILIATION_ADJ: "BA", TAX_ADJUSTMENT: "TA",
}

async function nextVoucherNumber(companyId: string, voucherType: VoucherType): Promise<string> {
  const year   = new Date().getFullYear()
  const prefix = VOUCHER_PREFIX[voucherType] ?? "JV"
  const count  = await prisma.journalEntry.count({ where: { companyId, voucherType } })
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
}

// ── POST /api/organizations/[orgSlug]/journals/[id]/reverse ───────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { reason, date: reversalDate } = body

  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reversal reason is required." }, { status: 400 })
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { lines: true },
  })
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })

  if (entry.status !== "POSTED") {
    return NextResponse.json({ error: "Only posted journal entries can be reversed." }, { status: 409 })
  }

  const alreadyReversed = await prisma.journalEntry.findFirst({ where: { reversalOfId: id } })
  if (alreadyReversed) {
    return NextResponse.json({ error: "This journal entry has already been reversed." }, { status: 409 })
  }

  const voucherNumber = await nextVoucherNumber(ctx.company.id, entry.voucherType)
  const date          = reversalDate ? new Date(reversalDate) : new Date()

  const reversal = await prisma.journalEntry.create({
    data: {
      companyId:    ctx.company.id,
      voucherType:  entry.voucherType,
      voucherNumber,
      date,
      status:       "DRAFT",
      description:  `Reversal of ${entry.voucherNumber}`,
      narration:    reason.trim(),
      isReversal:   true,
      reversalOfId: id,
      totalDebit:   entry.totalCredit,
      totalCredit:  entry.totalDebit,
      createdById:  ctx.userId,
      lines: {
        create: entry.lines.map((l) => ({
          accountId:    l.accountId,
          direction:    (l.direction === "DEBIT" ? "CREDIT" : "DEBIT") as TransactionDirection,
          amount:       l.amount,
          description:  `Reversal: ${l.description ?? ""}`.trim() || null,
          costCenterId: l.costCenterId,
          projectId:    l.projectId,
          branchId:     l.branchId,
          taxCodeId:    l.taxCodeId,
          taxRate:      l.taxRate,
          taxAmount:    l.taxAmount,
          baseAmount:   l.baseAmount,
        })),
      },
    },
    include: { lines: true },
  })

  await prisma.journalEntry.update({
    where: { id },
    data: { status: "REVERSED", reversedById: ctx.userId, reversedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "JOURNAL_REVERSED",
      severity:     "MEDIUM",
      resourceType: "journal_entry",
      resourceId:   id,
      resourceName: entry.voucherNumber,
      description:  `Journal "${entry.voucherNumber}" reversed — ${reason}`,
    },
  })

  return NextResponse.json(reversal, { status: 201 })
}
