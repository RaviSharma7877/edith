import { createHash } from "crypto"
import type { TransactionDirection } from "@prisma/client"

export interface LedgerLine {
  accountId: string
  direction: TransactionDirection
  amount: number
}

export function computeTotals(lines: LedgerLine[]): { totalDebit: number; totalCredit: number } {
  let totalDebit = 0
  let totalCredit = 0
  for (const l of lines) {
    if (l.direction === "DEBIT") totalDebit += l.amount
    else totalCredit += l.amount
  }
  return { totalDebit, totalCredit }
}

export function isBalanced(lines: LedgerLine[], epsilon = 0.005): boolean {
  const { totalDebit, totalCredit } = computeTotals(lines)
  return Math.abs(totalDebit - totalCredit) <= epsilon
}

export function flipDirection(direction: TransactionDirection): TransactionDirection {
  return direction === "DEBIT" ? "CREDIT" : "DEBIT"
}

export function buildReversalLines(lines: LedgerLine[]): LedgerLine[] {
  return lines.map((l) => ({ ...l, direction: flipDirection(l.direction) }))
}

/**
 * Deterministic SHA-256 hash linking this entry to the previous one.
 * Lines are sorted by accountId before hashing so insertion order doesn't matter.
 */
export function computeEntryHash(
  previousHash: string | null,
  voucherNumber: string,
  date: Date,
  totalDebit: number,
  lines: Array<{ accountId: string; direction: string; amount: number }>,
): string {
  const sorted = [...lines].sort((a, b) => a.accountId.localeCompare(b.accountId))
  const lineStr = sorted.map((l) => `${l.accountId}:${l.direction}:${l.amount}`).join("|")
  const payload = `${previousHash ?? "0"}|${voucherNumber}|${date.toISOString()}|${totalDebit}|${lineStr}`
  return createHash("sha256").update(payload).digest("hex")
}

const VOUCHER_PREFIX: Record<string, string> = {
  JOURNAL_ENTRY:           "JV",
  PAYMENT_RECEIPT:         "RV",
  PAYMENT_DISBURSEMENT:    "PV",
  SALES_INVOICE:           "SI",
  PURCHASE_BILL:           "PB",
  CREDIT_NOTE:             "CN",
  DEBIT_NOTE:              "DN",
  CONTRA:                  "CO",
  OPENING_BALANCE:         "OB",
  BANK_RECONCILIATION_ADJ: "BA",
  TAX_ADJUSTMENT:          "TA",
}

export function voucherPrefix(voucherType: string): string {
  return VOUCHER_PREFIX[voucherType] ?? "JV"
}

/** Compute per-account running balance from a flat list of journal lines. */
export function aggregateByAccount(
  lines: Array<{ accountId: string; direction: TransactionDirection; amount: number }>,
): Map<string, { debit: number; credit: number }> {
  const map = new Map<string, { debit: number; credit: number }>()
  for (const line of lines) {
    const s = map.get(line.accountId) ?? { debit: 0, credit: 0 }
    if (line.direction === "DEBIT") s.debit += line.amount
    else s.credit += line.amount
    map.set(line.accountId, s)
  }
  return map
}
