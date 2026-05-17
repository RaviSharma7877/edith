import { prisma } from "@/lib/prisma"
import type { VoucherType, TransactionDirection } from "@prisma/client"
import {
  isBalanced,
  computeTotals,
  flipDirection,
  computeEntryHash,
  voucherPrefix,
  aggregateByAccount,
} from "./ledger-utils"

// ─────────────────────────────────────────────────────────────────────────────
// VOUCHER NUMBERING
// ─────────────────────────────────────────────────────────────────────────────

export async function nextVoucherNumber(
  companyId:   string,
  voucherType: VoucherType,
  opts?: { prefix?: string; voucherTypeConfigId?: string },
): Promise<string> {
  const year   = new Date().getFullYear()
  const prefix = opts?.prefix ?? voucherPrefix(voucherType)
  const count  = opts?.voucherTypeConfigId
    ? await prisma.journalEntry.count({
        where: { companyId, voucherTypeConfigId: opts.voucherTypeConfigId },
      })
    : await prisma.journalEntry.count({ where: { companyId, voucherType } })
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
}

// ─────────────────────────────────────────────────────────────────────────────
// POST JOURNAL
// ─────────────────────────────────────────────────────────────────────────────

export interface JournalLineInput {
  accountId:   string
  direction:   TransactionDirection
  amount:      number
  description?: string
  reference?:  string
  costCenterId?: string
  projectId?:  string
  branchId?:   string
  partyType?:  string
  partyId?:    string
  taxCodeId?:  string
  taxRate?:    number
  taxAmount?:  number
  baseAmount?: number
}

export interface PostJournalParams {
  companyId:    string
  workspaceId:  string
  userId:       string
  voucherType:  VoucherType
  date:         Date
  description?: string
  narration?:   string
  reference?:   string
  currency?:    string
  lines:        JournalLineInput[]
  sourceType?:  string
  sourceId?:    string
  /** When true the entry is saved as DRAFT and NOT immediately posted. */
  asDraft?:     boolean
}

/**
 * Core posting function used by all accounting flows.
 * Validates balance, checks open period, builds the hash chain, and persists
 * the entry in a single round-trip (Prisma nested create).
 */
export async function postJournal(params: PostJournalParams) {
  const {
    companyId, workspaceId, userId, voucherType, date, lines,
    sourceType, sourceId, asDraft = false,
  } = params

  if (lines.length < 2) throw new Error("At least 2 journal lines are required.")

  const numLines = lines.map((l) => ({ ...l, amount: Number(l.amount) }))
  if (!isBalanced(numLines)) {
    const { totalDebit, totalCredit } = computeTotals(numLines)
    throw new Error(
      `Journal is not balanced. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`,
    )
  }

  // Validate accounts
  const accountIds = [...new Set(numLines.map((l) => l.accountId))]
  const accounts   = await prisma.chartAccount.findMany({
    where:  { id: { in: accountIds }, companyId },
    select: { id: true, code: true, name: true, isActive: true, isPosting: true },
  })
  const invalid = accountIds.filter((id) => {
    const a = accounts.find((acct) => acct.id === id)
    return !a || !a.isActive || !a.isPosting
  })
  if (invalid.length > 0) {
    const names = invalid
      .map((id) => accounts.find((a) => a.id === id)?.name ?? id)
      .join(", ")
    throw new Error(`Accounts not postable: ${names}`)
  }

  // Open period check
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      status:    "OPEN",
      startDate: { lte: date },
      endDate:   { gte: date },
      fiscalYear: { companyId },
    },
  })
  if (!openPeriod) {
    throw new Error("No open accounting period covers this journal's date.")
  }

  const { totalDebit, totalCredit } = computeTotals(numLines)
  const voucherNumber = await nextVoucherNumber(companyId, voucherType)

  // Hash chain (only for posted entries)
  let previousHash: string | null = null
  let entryHash:    string | null = null
  if (!asDraft) {
    const lastPosted = await prisma.journalEntry.findFirst({
      where:   { companyId, status: "POSTED" },
      orderBy: { postedAt: "desc" },
      select:  { entryHash: true },
    })
    previousHash = lastPosted?.entryHash ?? null
    entryHash    = computeEntryHash(
      previousHash,
      voucherNumber,
      date,
      totalDebit,
      numLines.map((l) => ({ accountId: l.accountId, direction: l.direction, amount: l.amount })),
    )
  }

  const status    = asDraft ? "DRAFT" : "POSTED"
  const postedAt  = asDraft ? undefined : new Date()
  const postedById = asDraft ? undefined : userId

  const entry = await prisma.journalEntry.create({
    data: {
      companyId,
      voucherType,
      voucherNumber,
      date,
      status,
      description:  params.description?.trim() || null,
      narration:    params.narration?.trim()   || null,
      reference:    params.reference?.trim()   || null,
      totalDebit:   String(totalDebit),
      totalCredit:  String(totalCredit),
      periodId:     openPeriod.id,
      previousHash,
      entryHash,
      postedById:   postedById ?? null,
      postedAt:     postedAt   ?? null,
      createdById:  userId,
      sourceType:   sourceType ?? null,
      sourceId:     sourceId   ?? null,
      lines: {
        create: numLines.map((l) => ({
          accountId:    l.accountId,
          direction:    l.direction,
          amount:       String(l.amount),
          description:  l.description?.trim()  || null,
          reference:    l.reference?.trim()    || null,
          costCenterId: l.costCenterId         || null,
          projectId:    l.projectId            || null,
          branchId:     l.branchId             || null,
          partyType:    l.partyType            || null,
          partyId:      l.partyId              || null,
          taxCodeId:    l.taxCodeId            || null,
          taxRate:      l.taxRate   != null ? String(l.taxRate)   : null,
          taxAmount:    l.taxAmount != null ? String(l.taxAmount) : null,
          baseAmount:   l.baseAmount!= null ? String(l.baseAmount): null,
        })),
      },
    },
    include: { lines: true },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorId:      userId,
      action:       asDraft ? "JOURNAL_DRAFTED" : "JOURNAL_POSTED",
      severity:     "INFO",
      resourceType: "journal_entry",
      resourceId:   entry.id,
      resourceName: entry.voucherNumber,
      amount:       String(totalDebit),
      currency:     params.currency ?? "INR",
      description:  `Journal "${entry.voucherNumber}" ${asDraft ? "drafted" : "auto-posted"}`,
    },
  })

  return entry
}

// ─────────────────────────────────────────────────────────────────────────────
// REVERSE ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export interface ReverseEntryParams {
  entryId:     string
  companyId:   string
  workspaceId: string
  userId:      string
  reason:      string
  date?:       Date
  currency?:   string
}

/**
 * Creates a mirror journal entry with every debit/credit flipped.
 * The reversal is saved as DRAFT so the caller can choose to auto-post it.
 */
export async function reverseEntry(params: ReverseEntryParams) {
  const { entryId, companyId, workspaceId, userId, reason, date } = params

  const entry = await prisma.journalEntry.findFirst({
    where:   { id: entryId, companyId },
    include: { lines: true },
  })
  if (!entry) throw new Error("Journal entry not found.")
  if (entry.status !== "POSTED") throw new Error("Only posted journal entries can be reversed.")

  const alreadyReversed = await prisma.journalEntry.findFirst({ where: { reversalOfId: entryId } })
  if (alreadyReversed) throw new Error("This journal entry has already been reversed.")

  const reversalDate  = date ?? new Date()
  const voucherNumber = await nextVoucherNumber(companyId, entry.voucherType as VoucherType)

  const reversal = await prisma.journalEntry.create({
    data: {
      companyId,
      voucherType:  entry.voucherType,
      voucherNumber,
      date:         reversalDate,
      status:       "DRAFT",
      description:  `Reversal of ${entry.voucherNumber}`,
      narration:    reason,
      isReversal:   true,
      reversalOfId: entryId,
      totalDebit:   entry.totalCredit,
      totalCredit:  entry.totalDebit,
      createdById:  userId,
      lines: {
        create: entry.lines.map((l) => ({
          accountId:    l.accountId,
          direction:    flipDirection(l.direction as TransactionDirection),
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
    where: { id: entryId },
    data:  { status: "REVERSED", reversedById: userId, reversedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorId:      userId,
      action:       "JOURNAL_REVERSED",
      severity:     "MEDIUM",
      resourceType: "journal_entry",
      resourceId:   entryId,
      resourceName: entry.voucherNumber,
      currency:     params.currency ?? "INR",
      description:  `Journal "${entry.voucherNumber}" reversed — ${reason}`,
    },
  })

  return reversal
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL BALANCE
// ─────────────────────────────────────────────────────────────────────────────

// Assets and Expenses have a debit normal balance; everything else credit-normal
const DEBIT_NORMAL = new Set(["ASSET", "EXPENSE"])

export interface TrialBalanceParams {
  companyId: string
  from:      Date
  to:        Date
}

export async function computeTrialBalance(params: TrialBalanceParams) {
  const { companyId, from, to } = params

  const accounts = await prisma.chartAccount.findMany({
    where:   { companyId, isPosting: true, isActive: true, deletedAt: null },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId,
        status: "POSTED",
        date:   { gte: from, lte: to },
      },
    },
    select: { accountId: true, direction: true, amount: true },
  })

  const sumMap = aggregateByAccount(
    lines.map((l) => ({
      accountId: l.accountId,
      direction: l.direction as TransactionDirection,
      amount:    Number(l.amount),
    })),
  )

  const rows = accounts
    .map((acct) => {
      const s           = sumMap.get(acct.id) ?? { debit: 0, credit: 0 }
      const opening     = Number(acct.openingBalance ?? 0)
      const isDebitNorm = DEBIT_NORMAL.has(acct.type)
      const net         = s.debit - s.credit
      const closing     = isDebitNorm ? opening + net : opening - net
      return {
        id:             acct.id,
        code:           acct.code,
        name:           acct.name,
        type:           acct.type,
        subtype:        acct.subtype,
        debit:          s.debit,
        credit:         s.credit,
        closingBalance: closing,
        isDebitNormal:  isDebitNorm,
      }
    })
    .filter((r) => r.debit > 0 || r.credit > 0 || r.closingBalance !== 0)

  const totalDebit  = rows.reduce((s, r) => s + r.debit,  0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

  return {
    from,
    to,
    rows,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.005,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOSE PERIOD
// ─────────────────────────────────────────────────────────────────────────────

export interface ClosePeriodParams {
  companyId:    string
  workspaceId:  string
  periodId:     string
  userId:       string
  currency?:    string
}

/**
 * Generates double-entry closing journal entries (revenue/expense → retained
 * earnings) then marks the period CLOSED.
 *
 * The retained earnings account is resolved automatically by subtype.
 * If there are no revenue/expense movements in the period the period is
 * locked without creating an empty journal.
 */
export async function closePeriod(params: ClosePeriodParams) {
  const { companyId, workspaceId, periodId, userId } = params

  const period = await prisma.accountingPeriod.findFirst({
    where:   { id: periodId, fiscalYear: { companyId } },
  })
  if (!period)                 throw new Error("Accounting period not found.")
  if (period.status !== "OPEN") throw new Error(`Period is already ${period.status}.`)

  // Resolve the retained earnings account
  const retainedEarnings = await prisma.chartAccount.findFirst({
    where: { companyId, subtype: "RETAINED_EARNINGS", isPosting: true, isActive: true },
  })
  if (!retainedEarnings) {
    throw new Error(
      "No active Retained Earnings account found. " +
      "Please add an account with subtype RETAINED_EARNINGS before closing the period.",
    )
  }

  // Aggregate revenue/expense movements posted in this period
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: { companyId, status: "POSTED", periodId },
    },
    include: { account: { select: { id: true, type: true } } },
  })

  // Net balance per account (credit-normal for revenue, debit-normal for expense)
  const balMap = new Map<string, { type: string; net: number }>()
  for (const line of lines) {
    if (!["REVENUE", "EXPENSE"].includes(line.account.type)) continue
    const entry = balMap.get(line.accountId) ?? { type: line.account.type, net: 0 }
    // Credit increases revenue balance; debit increases expense balance
    entry.net += line.direction === "CREDIT" ? Number(line.amount) : -Number(line.amount)
    balMap.set(line.accountId, entry)
  }

  const closingLines: JournalLineInput[] = []
  let netIncome = 0

  for (const [accountId, { type, net }] of balMap) {
    if (Math.abs(net) < 0.005) continue

    if (type === "REVENUE") {
      // Close revenue: debit the revenue account to zero it
      closingLines.push({ accountId, direction: "DEBIT",  amount: Math.abs(net) })
      netIncome += net
    } else {
      // Close expense: credit the expense account to zero it
      closingLines.push({ accountId, direction: "CREDIT", amount: Math.abs(net) })
      netIncome -= Math.abs(net)
    }
  }

  let closingEntry = null

  if (closingLines.length > 0) {
    // Transfer net income to retained earnings
    if (netIncome > 0) {
      closingLines.push({ accountId: retainedEarnings.id, direction: "CREDIT", amount: netIncome })
    } else if (netIncome < 0) {
      closingLines.push({ accountId: retainedEarnings.id, direction: "DEBIT", amount: Math.abs(netIncome) })
    }

    closingEntry = await postJournal({
      companyId,
      workspaceId,
      userId,
      voucherType: "JOURNAL_ENTRY",
      date:        period.endDate,
      description: `Period closing entry — ${period.name}`,
      narration:   "Auto-generated closing entry. Zeroes revenue/expense to retained earnings.",
      currency:    params.currency,
      lines:       closingLines,
    })
  }

  await prisma.accountingPeriod.update({
    where: { id: periodId },
    data:  { status: "CLOSED", isLocked: true, closedAt: new Date(), closedById: userId },
  })

  return { closingEntry, netIncome }
}
