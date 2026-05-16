import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Normal balance: ASSET/EXPENSE = DEBIT; LIABILITY/EQUITY/REVENUE = CREDIT
const DEBIT_NORMAL = new Set(["ASSET", "EXPENSE"])

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url    = new URL(req.url)
  const from   = url.searchParams.get("from")
  const to     = url.searchParams.get("to")

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const toDate   = to   ? new Date(to)   : new Date()
  toDate.setHours(23, 59, 59, 999)

  // Fetch all posting accounts
  const accounts = await prisma.chartAccount.findMany({
    where:   { companyId: ctx.company.id, isPosting: true, isActive: true, deletedAt: null },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })

  // Fetch all journal lines in range (POSTED only)
  const lines = await prisma.journalLine.findMany({
    where: {
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { gte: fromDate, lte: toDate },
      },
    },
    select: { accountId: true, direction: true, amount: true },
  })

  // Aggregate per account
  const sumMap = new Map<string, { debit: number; credit: number }>()
  for (const line of lines) {
    const s = sumMap.get(line.accountId) ?? { debit: 0, credit: 0 }
    if (line.direction === "DEBIT")  s.debit  += Number(line.amount)
    else                              s.credit += Number(line.amount)
    sumMap.set(line.accountId, s)
  }

  const rows = accounts.map((acct) => {
    const s         = sumMap.get(acct.id) ?? { debit: 0, credit: 0 }
    const opening   = Number(acct.openingBalance ?? 0)
    const isDebitNormal = DEBIT_NORMAL.has(acct.type)

    // Net balance = opening + (debit - credit) for debit-normal, or (credit - debit) for credit-normal
    const netMovement = s.debit - s.credit
    const closingBalance = isDebitNormal ? opening + netMovement : opening - netMovement

    return {
      id:              acct.id,
      code:            acct.code,
      name:            acct.name,
      type:            acct.type,
      subtype:         acct.subtype,
      debit:           s.debit,
      credit:          s.credit,
      closingBalance,
      isDebitNormal,
    }
  }).filter((r) => r.debit > 0 || r.credit > 0 || r.closingBalance !== 0)

  const totalDebit   = rows.reduce((s, r) => s + r.debit,  0)
  const totalCredit  = rows.reduce((s, r) => s + r.credit, 0)

  return NextResponse.json({
    from:   fromDate.toISOString(),
    to:     toDate.toISOString(),
    rows,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.005,
  })
}
