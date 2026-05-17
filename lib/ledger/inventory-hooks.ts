import { prisma } from "@/lib/prisma"
import type { StockVoucherType, TransactionDirection, AccountSubtype } from "@prisma/client"
import { postJournal } from "./ledger-service"

// ─────────────────────────────────────────────────────────────────────────────
// GL MAPPING TABLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps each StockVoucherType to the GL treatment it triggers.
 *
 * inventoryDirection = which way the Inventory account moves:
 *   DEBIT  → stock coming IN  (Inventory ↑)
 *   CREDIT → stock going OUT  (Inventory ↓)
 *
 * counterpartSubtype = subtype of the offsetting ChartAccount to look up.
 * For TRANSFER the counterpart is also INVENTORY (warehouse-to-warehouse move).
 */
const STOCK_GL_MAP: Record<
  StockVoucherType,
  { inventoryDirection: TransactionDirection; counterpartSubtype: AccountSubtype } | null
> = {
  RECEIPT:           { inventoryDirection: "DEBIT",  counterpartSubtype: "ACCOUNTS_PAYABLE" },
  DELIVERY:          { inventoryDirection: "CREDIT", counterpartSubtype: "COST_OF_GOODS_SOLD" },
  TRANSFER:          null, // Internal move — no GL impact (same asset account)
  ADJUSTMENT:        { inventoryDirection: "DEBIT",  counterpartSubtype: "OPERATING_EXPENSE" },
  WRITE_OFF:         { inventoryDirection: "CREDIT", counterpartSubtype: "OPERATING_EXPENSE" },
  OPENING:           { inventoryDirection: "DEBIT",  counterpartSubtype: "CAPITAL" },
  DELIVERY_NOTE:     { inventoryDirection: "CREDIT", counterpartSubtype: "COST_OF_GOODS_SOLD" },
  GOODS_RECEIPT_NOTE:{ inventoryDirection: "DEBIT",  counterpartSubtype: "ACCOUNTS_PAYABLE" },
  SALES_ORDER:       null, // Commitment document — no GL impact until delivery
  PURCHASE_ORDER:    null, // Commitment document — no GL impact until receipt
  REJECTION_IN:      { inventoryDirection: "DEBIT",  counterpartSubtype: "ACCOUNTS_PAYABLE" },
  REJECTION_OUT:     { inventoryDirection: "CREDIT", counterpartSubtype: "ACCOUNTS_RECEIVABLE" },
  PHYSICAL_VERIFY:   { inventoryDirection: "DEBIT",  counterpartSubtype: "OPERATING_EXPENSE" },
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export interface StockJournalParams {
  stockVoucherId: string
  companyId:      string
  workspaceId:    string
  userId:         string
  currency?:      string
}

/**
 * Creates and posts a journal entry for a stock movement, then links it back to
 * the StockVoucher via the journalEntryId field.
 *
 * Call this immediately after posting a StockVoucher so inventory movements
 * are always reflected in the general ledger.
 *
 * Returns null for voucher types that carry no GL impact (TRANSFER, SALES_ORDER,
 * PURCHASE_ORDER) — callers should treat null as "no action needed".
 */
export async function postStockMovementJournal(params: StockJournalParams) {
  const { stockVoucherId, companyId, workspaceId, userId } = params

  const voucher = await prisma.stockVoucher.findFirst({
    where:   { id: stockVoucherId, companyId },
    include: { lines: true },
  })
  if (!voucher)                throw new Error("Stock voucher not found.")
  if (voucher.journalEntryId)  throw new Error("A journal entry already exists for this stock voucher.")
  if (voucher.status !== "POSTED") {
    throw new Error("Journal entries can only be created for posted stock vouchers.")
  }

  const mapping = STOCK_GL_MAP[voucher.voucherType]
  if (!mapping) return null // No GL impact for this type

  // ── Resolve GL accounts ────────────────────────────────────────────────────

  const inventoryAccount = await prisma.chartAccount.findFirst({
    where: { companyId, subtype: "INVENTORY", isPosting: true, isActive: true },
  })
  if (!inventoryAccount) {
    throw new Error(
      "No active Inventory GL account (subtype: INVENTORY) found. " +
      "Please configure your Chart of Accounts before posting stock movements.",
    )
  }

  const counterpartAccount = await prisma.chartAccount.findFirst({
    where: { companyId, subtype: mapping.counterpartSubtype, isPosting: true, isActive: true },
  })
  if (!counterpartAccount) {
    throw new Error(
      `No active GL account found for subtype "${mapping.counterpartSubtype}". ` +
      `Please add this account to your Chart of Accounts.`,
    )
  }

  // ── Aggregate value across all lines ──────────────────────────────────────

  const totalAmount = voucher.lines.reduce((sum, l) => sum + Number(l.amount), 0)
  if (totalAmount === 0) return null // Zero-value movement — nothing to journal

  const isIn = mapping.inventoryDirection === "DEBIT"

  // ── Post the journal entry ─────────────────────────────────────────────────

  const journalEntry = await postJournal({
    companyId,
    workspaceId,
    userId,
    voucherType: "JOURNAL_ENTRY",
    date:        voucher.date,
    description: `Inventory ${isIn ? "receipt" : "issue"}: ${voucher.voucherNumber}`,
    narration:   voucher.narration ?? undefined,
    currency:    params.currency,
    sourceType:  "stock_voucher",
    sourceId:    stockVoucherId,
    lines: [
      {
        accountId:   inventoryAccount.id,
        direction:   mapping.inventoryDirection,
        amount:      totalAmount,
        description: `Inventory ${isIn ? "in" : "out"}: ${voucher.voucherNumber}`,
      },
      {
        accountId:   counterpartAccount.id,
        direction:   isIn ? "CREDIT" : "DEBIT",
        amount:      totalAmount,
        description: `${mapping.counterpartSubtype} offset: ${voucher.voucherNumber}`,
      },
    ],
  })

  // ── Link back to the stock voucher ─────────────────────────────────────────

  await prisma.stockVoucher.update({
    where: { id: stockVoucherId },
    data:  { journalEntryId: journalEntry.id },
  })

  return journalEntry
}
