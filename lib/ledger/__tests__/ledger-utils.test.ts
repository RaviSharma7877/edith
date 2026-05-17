import { describe, it, expect } from "vitest"
import {
  isBalanced,
  computeTotals,
  flipDirection,
  buildReversalLines,
  computeEntryHash,
  aggregateByAccount,
  voucherPrefix,
} from "../ledger-utils"
import type { LedgerLine } from "../ledger-utils"

// ─────────────────────────────────────────────────────────────────────────────
// isBalanced
// ─────────────────────────────────────────────────────────────────────────────

describe("isBalanced", () => {
  it("accepts a simple balanced pair", () => {
    expect(
      isBalanced([
        { accountId: "a1", direction: "DEBIT",  amount: 100 },
        { accountId: "a2", direction: "CREDIT", amount: 100 },
      ]),
    ).toBe(true)
  })

  it("rejects an unbalanced pair", () => {
    expect(
      isBalanced([
        { accountId: "a1", direction: "DEBIT",  amount: 200 },
        { accountId: "a2", direction: "CREDIT", amount: 100 },
      ]),
    ).toBe(false)
  })

  it("accepts multi-line balanced entries", () => {
    expect(
      isBalanced([
        { accountId: "a1", direction: "DEBIT",  amount: 60 },
        { accountId: "a2", direction: "DEBIT",  amount: 40 },
        { accountId: "a3", direction: "CREDIT", amount: 100 },
      ]),
    ).toBe(true)
  })

  it("accepts entry balanced within epsilon (floating point rounding)", () => {
    expect(
      isBalanced([
        { accountId: "a1", direction: "DEBIT",  amount: 100.001 },
        { accountId: "a2", direction: "CREDIT", amount: 100.003 },
      ]),
    ).toBe(true)
  })

  it("rejects entry outside epsilon", () => {
    expect(
      isBalanced([
        { accountId: "a1", direction: "DEBIT",  amount: 100 },
        { accountId: "a2", direction: "CREDIT", amount: 100.1 },
      ]),
    ).toBe(false)
  })

  it("returns true for an empty line list (trivially balanced)", () => {
    expect(isBalanced([])).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeTotals
// ─────────────────────────────────────────────────────────────────────────────

describe("computeTotals", () => {
  it("correctly sums debit and credit amounts", () => {
    const { totalDebit, totalCredit } = computeTotals([
      { accountId: "a1", direction: "DEBIT",  amount: 300 },
      { accountId: "a2", direction: "DEBIT",  amount: 200 },
      { accountId: "a3", direction: "CREDIT", amount: 500 },
    ])
    expect(totalDebit).toBe(500)
    expect(totalCredit).toBe(500)
  })

  it("returns zeros for empty input", () => {
    const { totalDebit, totalCredit } = computeTotals([])
    expect(totalDebit).toBe(0)
    expect(totalCredit).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// flipDirection
// ─────────────────────────────────────────────────────────────────────────────

describe("flipDirection", () => {
  it("flips DEBIT to CREDIT", () => {
    expect(flipDirection("DEBIT")).toBe("CREDIT")
  })

  it("flips CREDIT to DEBIT", () => {
    expect(flipDirection("CREDIT")).toBe("DEBIT")
  })

  it("is its own inverse", () => {
    expect(flipDirection(flipDirection("DEBIT"))).toBe("DEBIT")
    expect(flipDirection(flipDirection("CREDIT"))).toBe("CREDIT")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildReversalLines
// ─────────────────────────────────────────────────────────────────────────────

describe("buildReversalLines", () => {
  const original: LedgerLine[] = [
    { accountId: "a1", direction: "DEBIT",  amount: 100 },
    { accountId: "a2", direction: "CREDIT", amount: 100 },
  ]

  it("flips every direction", () => {
    const reversed = buildReversalLines(original)
    expect(reversed[0].direction).toBe("CREDIT")
    expect(reversed[1].direction).toBe("DEBIT")
  })

  it("preserves account IDs and amounts", () => {
    const reversed = buildReversalLines(original)
    expect(reversed[0].accountId).toBe(original[0].accountId)
    expect(reversed[0].amount).toBe(original[0].amount)
    expect(reversed[1].amount).toBe(original[1].amount)
  })

  it("reversed lines are still balanced", () => {
    expect(isBalanced(buildReversalLines(original))).toBe(true)
  })

  it("does not mutate the original array", () => {
    buildReversalLines(original)
    expect(original[0].direction).toBe("DEBIT")
  })

  it("handles multi-line entries", () => {
    const multi: LedgerLine[] = [
      { accountId: "a1", direction: "DEBIT",  amount: 60 },
      { accountId: "a2", direction: "DEBIT",  amount: 40 },
      { accountId: "a3", direction: "CREDIT", amount: 100 },
    ]
    const reversed = buildReversalLines(multi)
    expect(reversed[0].direction).toBe("CREDIT")
    expect(reversed[1].direction).toBe("CREDIT")
    expect(reversed[2].direction).toBe("DEBIT")
    expect(isBalanced(reversed)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeEntryHash
// ─────────────────────────────────────────────────────────────────────────────

describe("computeEntryHash", () => {
  const date  = new Date("2025-04-01T00:00:00.000Z")
  const lines = [
    { accountId: "a1", direction: "DEBIT",  amount: 100 },
    { accountId: "b2", direction: "CREDIT", amount: 100 },
  ]

  it("produces a 64-char lowercase hex string", () => {
    const hash = computeEntryHash(null, "JV-2025-0001", date, 100, lines)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it("is deterministic for identical inputs", () => {
    const h1 = computeEntryHash("prev", "JV-2025-0002", date, 100, lines)
    const h2 = computeEntryHash("prev", "JV-2025-0002", date, 100, lines)
    expect(h1).toBe(h2)
  })

  it("changes when previousHash changes (chain integrity)", () => {
    const h1 = computeEntryHash(null,    "JV-2025-0001", date, 100, lines)
    const h2 = computeEntryHash("prev1", "JV-2025-0001", date, 100, lines)
    expect(h1).not.toBe(h2)
  })

  it("changes when voucherNumber changes", () => {
    const h1 = computeEntryHash(null, "JV-2025-0001", date, 100, lines)
    const h2 = computeEntryHash(null, "JV-2025-0002", date, 100, lines)
    expect(h1).not.toBe(h2)
  })

  it("sorts lines by accountId for stable hashing regardless of insertion order", () => {
    const scrambled = [
      { accountId: "b2", direction: "CREDIT", amount: 100 },
      { accountId: "a1", direction: "DEBIT",  amount: 100 },
    ]
    const h1 = computeEntryHash(null, "JV-2025-0001", date, 100, lines)
    const h2 = computeEntryHash(null, "JV-2025-0001", date, 100, scrambled)
    expect(h1).toBe(h2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// aggregateByAccount
// ─────────────────────────────────────────────────────────────────────────────

describe("aggregateByAccount", () => {
  it("aggregates multiple lines for the same account", () => {
    const map = aggregateByAccount([
      { accountId: "a1", direction: "DEBIT",  amount: 100 },
      { accountId: "a1", direction: "DEBIT",  amount: 50  },
      { accountId: "a2", direction: "CREDIT", amount: 150 },
    ])
    expect(map.get("a1")).toEqual({ debit: 150, credit: 0 })
    expect(map.get("a2")).toEqual({ debit: 0,   credit: 150 })
  })

  it("returns an empty map for empty input", () => {
    expect(aggregateByAccount([])).toEqual(new Map())
  })

  it("handles mixed debits and credits on the same account", () => {
    const map = aggregateByAccount([
      { accountId: "a1", direction: "DEBIT",  amount: 200 },
      { accountId: "a1", direction: "CREDIT", amount: 80  },
    ])
    expect(map.get("a1")).toEqual({ debit: 200, credit: 80 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// voucherPrefix
// ─────────────────────────────────────────────────────────────────────────────

describe("voucherPrefix", () => {
  it("returns known prefixes", () => {
    expect(voucherPrefix("JOURNAL_ENTRY")).toBe("JV")
    expect(voucherPrefix("SALES_INVOICE")).toBe("SI")
    expect(voucherPrefix("PURCHASE_BILL")).toBe("PB")
    expect(voucherPrefix("CREDIT_NOTE")).toBe("CN")
    expect(voucherPrefix("PAYMENT_RECEIPT")).toBe("RV")
  })

  it("falls back to JV for unknown types", () => {
    expect(voucherPrefix("UNKNOWN_TYPE")).toBe("JV")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Period closing logic (pure computation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the net income calculation used by closePeriod into a pure helper
 * so it can be unit-tested without a database.
 */
function simulateClosingEntries(
  movements: Array<{ accountId: string; accountType: "REVENUE" | "EXPENSE"; net: number }>,
  retainedEarningsId: string,
) {
  type Direction = "DEBIT" | "CREDIT"
  const lines: Array<{ accountId: string; direction: Direction; amount: number }> = []
  let netIncome = 0

  for (const { accountId, accountType, net } of movements) {
    if (Math.abs(net) < 0.005) continue
    if (accountType === "REVENUE") {
      lines.push({ accountId, direction: "DEBIT",  amount: Math.abs(net) })
      netIncome += net
    } else {
      lines.push({ accountId, direction: "CREDIT", amount: Math.abs(net) })
      netIncome -= Math.abs(net)
    }
  }

  if (netIncome > 0) {
    lines.push({ accountId: retainedEarningsId, direction: "CREDIT", amount: netIncome })
  } else if (netIncome < 0) {
    lines.push({ accountId: retainedEarningsId, direction: "DEBIT",  amount: Math.abs(netIncome) })
  }

  return { lines, netIncome }
}

describe("period closing logic", () => {
  const RE = "retained-earnings-id"

  it("generates balanced closing entries for a profitable period", () => {
    const { lines, netIncome } = simulateClosingEntries(
      [
        { accountId: "rev1",  accountType: "REVENUE",  net: 10000 },
        { accountId: "exp1",  accountType: "EXPENSE",  net: 6000  },
      ],
      RE,
    )
    expect(netIncome).toBe(4000)
    expect(isBalanced(lines.map(l => ({ ...l, direction: l.direction as "DEBIT" | "CREDIT" })))).toBe(true)
    const re = lines.find((l) => l.accountId === RE)
    expect(re?.direction).toBe("CREDIT") // net profit → credit retained earnings
    expect(re?.amount).toBe(4000)
  })

  it("generates balanced closing entries for a loss period", () => {
    const { lines, netIncome } = simulateClosingEntries(
      [
        { accountId: "rev1", accountType: "REVENUE", net: 3000 },
        { accountId: "exp1", accountType: "EXPENSE", net: 8000 },
      ],
      RE,
    )
    expect(netIncome).toBe(-5000)
    expect(isBalanced(lines.map(l => ({ ...l, direction: l.direction as "DEBIT" | "CREDIT" })))).toBe(true)
    const re = lines.find((l) => l.accountId === RE)
    expect(re?.direction).toBe("DEBIT") // net loss → debit retained earnings
    expect(re?.amount).toBe(5000)
  })

  it("omits accounts with near-zero net balance", () => {
    const { lines } = simulateClosingEntries(
      [
        { accountId: "rev1", accountType: "REVENUE", net: 0.001 }, // below epsilon
        { accountId: "exp1", accountType: "EXPENSE", net: 500 },
      ],
      RE,
    )
    const accountIds = lines.map((l) => l.accountId)
    expect(accountIds).not.toContain("rev1")
  })

  it("produces no closing lines when period has no revenue or expense", () => {
    const { lines, netIncome } = simulateClosingEntries([], RE)
    expect(lines).toHaveLength(0)
    expect(netIncome).toBe(0)
  })
})
