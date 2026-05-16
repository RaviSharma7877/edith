import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

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

  const url       = new URL(req.url)
  const from      = url.searchParams.get("from")
  const to        = url.searchParams.get("to")
  const accountId = url.searchParams.get("accountId")

  const fromDate  = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const toDate    = to   ? new Date(to)   : new Date()
  toDate.setHours(23, 59, 59, 999)

  // All active posting accounts for the selector
  const allAccounts = await prisma.chartAccount.findMany({
    where:   { companyId: ctx.company.id, isPosting: true, isActive: true, deletedAt: null },
    orderBy: [{ code: "asc" }],
    select:  { id: true, code: true, name: true, type: true, subtype: true, openingBalance: true },
  })

  if (!accountId) {
    return NextResponse.json({ accounts: allAccounts, entries: [], openingBalance: 0 })
  }

  const account = allAccounts.find((a) => a.id === accountId)
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  // Opening balance = journal lines before fromDate
  const priorLines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { lt: fromDate },
      },
    },
    select: { direction: true, amount: true },
  })

  const isDebitNormal = DEBIT_NORMAL.has(account.type)
  let openingBalance  = Number(account.openingBalance ?? 0)
  for (const line of priorLines) {
    const amt = Number(line.amount)
    if (line.direction === "DEBIT")  openingBalance += isDebitNormal ? amt : -amt
    else                              openingBalance += isDebitNormal ? -amt : amt
  }

  // Period lines
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { gte: fromDate, lte: toDate },
      },
    },
    include: {
      journalEntry: {
        select: {
          id: true, date: true, voucherNumber: true, description: true, narration: true,
        },
      },
    },
    orderBy: [{ journalEntry: { date: "asc" } }],
  })

  let runningBalance = openingBalance
  const entries = lines.map((line) => {
    const amt = Number(line.amount)
    const delta = line.direction === "DEBIT"
      ? (isDebitNormal ? amt : -amt)
      : (isDebitNormal ? -amt : amt)
    runningBalance += delta

    return {
      id:            line.id,
      journalId:     line.journalEntry.id,
      date:          line.journalEntry.date.toISOString(),
      voucherNumber: line.journalEntry.voucherNumber,
      description:   line.description ?? line.journalEntry.description ?? line.journalEntry.narration ?? "",
      debit:         line.direction === "DEBIT"  ? amt : 0,
      credit:        line.direction === "CREDIT" ? amt : 0,
      balance:       runningBalance,
    }
  })

  const totalDebit  = entries.reduce((s, e) => s + e.debit,  0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  return NextResponse.json({
    accounts: allAccounts,
    account: {
      id:      account.id,
      code:    account.code,
      name:    account.name,
      type:    account.type,
      subtype: account.subtype,
    },
    from:           fromDate.toISOString(),
    to:             toDate.toISOString(),
    openingBalance,
    entries,
    totalDebit,
    totalCredit,
    closingBalance: runningBalance,
  })
}
