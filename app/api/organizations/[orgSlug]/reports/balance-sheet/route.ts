import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

const ASSET_SUBTYPES = [
  "CURRENT_ASSET", "FIXED_ASSET", "INTANGIBLE_ASSET", "OTHER_ASSET",
  "BANK", "CASH", "ACCOUNTS_RECEIVABLE", "INVENTORY", "PREPAID_EXPENSE",
]
const LIABILITY_SUBTYPES = [
  "CURRENT_LIABILITY", "LONG_TERM_LIABILITY", "ACCOUNTS_PAYABLE",
  "TAX_PAYABLE", "ACCRUED_LIABILITY",
]
const EQUITY_SUBTYPES = ["CAPITAL", "RETAINED_EARNINGS", "DRAWING"]

interface BSRow {
  id: string; code: string; name: string; subtype: string; balance: number
}

function section(rows: BSRow[], subtypes: string[]) {
  const items = rows.filter((r) => subtypes.includes(r.subtype))
  return { items, total: items.reduce((s, r) => s + r.balance, 0) }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url   = new URL(req.url)
  const asOfParam = url.searchParams.get("asOf")
  const asOf  = asOfParam ? new Date(asOfParam) : new Date()
  asOf.setHours(23, 59, 59, 999)

  const accounts = await prisma.chartAccount.findMany({
    where:   {
      companyId: ctx.company.id,
      isPosting: true,
      isActive:  true,
      deletedAt: null,
      type:      { in: ["ASSET", "LIABILITY", "EQUITY"] },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  // All posted journal lines up to asOf date (cumulative balance)
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { lte: asOf },
      },
    },
    select: { accountId: true, direction: true, amount: true },
  })

  const sumMap = new Map<string, { debit: number; credit: number }>()
  for (const line of lines) {
    const s = sumMap.get(line.accountId) ?? { debit: 0, credit: 0 }
    if (line.direction === "DEBIT") s.debit  += Number(line.amount)
    else                             s.credit += Number(line.amount)
    sumMap.set(line.accountId, s)
  }

  const rows: BSRow[] = accounts.map((a) => {
    const s       = sumMap.get(a.id) ?? { debit: 0, credit: 0 }
    const opening = Number(a.openingBalance ?? 0)
    // ASSET: debit-normal → balance = opening + debit - credit
    // LIABILITY/EQUITY: credit-normal → balance = opening + credit - debit
    const balance = a.type === "ASSET"
      ? opening + s.debit - s.credit
      : opening + s.credit - s.debit
    return { id: a.id, code: a.code, name: a.name, subtype: a.subtype, balance }
  })

  // Also include retained earnings from P&L (current year net profit)
  const plLines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { lte: asOf },
      },
      account: { type: { in: ["REVENUE", "EXPENSE"] } },
    },
    select: { direction: true, amount: true, account: { select: { type: true } } },
  })

  let retainedEarnings = 0
  for (const line of plLines) {
    const amt = Number(line.amount)
    if (line.account.type === "REVENUE") {
      retainedEarnings += line.direction === "CREDIT" ? amt : -amt
    } else {
      retainedEarnings -= line.direction === "DEBIT" ? amt : -amt
    }
  }

  const assets      = section(rows, ASSET_SUBTYPES)
  const liabilities = section(rows, LIABILITY_SUBTYPES)
  const equity      = section(rows, EQUITY_SUBTYPES)
  const equityTotal = equity.total + retainedEarnings

  return NextResponse.json({
    asOf:             asOf.toISOString(),
    assets,
    liabilities,
    equity,
    retainedEarnings,
    equityTotal,
    liabilitiesAndEquity: liabilities.total + equityTotal,
    balanced: Math.abs(assets.total - (liabilities.total + equityTotal)) < 0.01,
  })
}
