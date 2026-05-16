import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

interface AccountRow {
  id: string; code: string; name: string; subtype: string; balance: number
}

function buildSection(
  accounts: AccountRow[],
  subtypes: string[],
): { accounts: AccountRow[]; total: number } {
  const filtered = accounts.filter((a) => subtypes.includes(a.subtype))
  return { accounts: filtered, total: filtered.reduce((s, a) => s + a.balance, 0) }
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

  const url      = new URL(req.url)
  const from     = url.searchParams.get("from")
  const to       = url.searchParams.get("to")

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const toDate   = to   ? new Date(to)   : new Date()
  toDate.setHours(23, 59, 59, 999)

  // Revenue and Expense accounts only
  const accounts = await prisma.chartAccount.findMany({
    where:   {
      companyId: ctx.company.id,
      isPosting: true,
      isActive:  true,
      deletedAt: null,
      type:      { in: ["REVENUE", "EXPENSE"] },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { gte: fromDate, lte: toDate },
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

  // Revenue: credit-normal → balance = credit - debit
  // Expense: debit-normal  → balance = debit - credit
  const rows: AccountRow[] = accounts.map((a) => {
    const s = sumMap.get(a.id) ?? { debit: 0, credit: 0 }
    const balance = a.type === "REVENUE"
      ? s.credit - s.debit
      : s.debit  - s.credit
    return { id: a.id, code: a.code, name: a.name, subtype: a.subtype, balance }
  })

  const revenue      = buildSection(rows, ["OPERATING_REVENUE", "OTHER_REVENUE"])
  const cogs         = buildSection(rows, ["COST_OF_GOODS_SOLD"])
  const grossProfit  = revenue.total - cogs.total

  const opex         = buildSection(rows, ["OPERATING_EXPENSE"])
  const ebit         = grossProfit - opex.total

  const otherExpense = buildSection(rows, ["OTHER_EXPENSE"])
  const taxExpense   = buildSection(rows, ["TAX_EXPENSE"])
  const netProfit    = ebit - otherExpense.total - taxExpense.total

  return NextResponse.json({
    from: fromDate.toISOString(),
    to:   toDate.toISOString(),
    revenue,
    cogs,
    grossProfit,
    opex,
    ebit,
    otherExpense,
    taxExpense,
    netProfit,
  })
}
