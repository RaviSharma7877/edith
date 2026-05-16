import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Create an adjustment journal entry for an unmatched statement line,
// then immediately accept the match.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; runId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, runId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const run = await prisma.reconciliationRun.findFirst({
    where: {
      id:        runId,
      statement: { bankAccount: { companyId: ctx.company.id } },
    },
    include: {
      statement: { include: { bankAccount: true } },
    },
  })
  if (!run)          return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (run.completedAt) return NextResponse.json({ error: "Run already completed." }, { status: 422 })

  const body = await req.json()
  const { statementLineId, adjustAccountId, description, notes } = body

  if (!statementLineId)  return NextResponse.json({ error: "statementLineId is required."  }, { status: 400 })
  if (!adjustAccountId)  return NextResponse.json({ error: "adjustAccountId is required."  }, { status: 400 })

  const stmtLine = await prisma.bankStatementLine.findFirst({
    where: { id: statementLineId, statement: { runs: { some: { id: runId } } } },
  })
  if (!stmtLine) return NextResponse.json({ error: "Statement line not found." }, { status: 404 })
  if (stmtLine.reconciliationStatus === "CLEARED")
    return NextResponse.json({ error: "Statement line already cleared." }, { status: 422 })

  const adjustAccount = await prisma.chartAccount.findFirst({
    where: { id: adjustAccountId, companyId: ctx.company.id, isActive: true, isPosting: true },
  })
  if (!adjustAccount)
    return NextResponse.json({ error: "Adjustment account not found or not postable." }, { status: 422 })

  // Verify open period
  const payDate    = stmtLine.date
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      fiscalYear: { companyId: ctx.company.id },
      startDate:  { lte: payDate },
      endDate:    { gte: payDate },
      status:     "OPEN",
    },
  })
  if (!openPeriod)
    return NextResponse.json({ error: "No open accounting period covers this statement line date." }, { status: 422 })

  const bankChartAccountId = run.statement.bankAccount.chartAccountId
  const amount = Number(stmtLine.creditAmount ?? stmtLine.debitAmount ?? 0)

  // Bank credit → DR bank account, CR adjustment account
  // Bank debit  → DR adjustment account, CR bank account
  const bankDirection   = stmtLine.creditAmount ? "DEBIT"  : "CREDIT"
  const adjustDirection = stmtLine.creditAmount ? "CREDIT" : "DEBIT"

  const year    = new Date().getFullYear()
  const count   = await prisma.journalEntry.count({
    where: { companyId: ctx.company.id, voucherNumber: { startsWith: `BRA-${year}-` } },
  })
  const voucherNumber = `BRA-${year}-${String(count + 1).padStart(4, "0")}`

  const now = new Date()
  const desc = description?.trim() || stmtLine.description

  const [journalEntry] = await prisma.$transaction([
    prisma.journalEntry.create({
      data: {
        companyId:    ctx.company.id,
        voucherType:  "BANK_RECONCILIATION_ADJ",
        voucherNumber,
        date:         payDate,
        status:       "POSTED",
        description:  desc,
        totalDebit:   amount,
        totalCredit:  amount,
        postedById:   ctx.userId,
        postedAt:     now,
        periodId:     openPeriod.id,
        sourceType:   "reconciliation",
        sourceId:     runId,
        createdById:  ctx.userId,
        lines: {
          create: [
            { accountId: bankChartAccountId, direction: bankDirection,   amount, description: desc },
            { accountId: adjustAccountId,    direction: adjustDirection,  amount, description: desc },
          ],
        },
      },
      include: { lines: true },
    }),
  ])

  // Find the bank journal line created
  const bankJLine = journalEntry.lines.find((l) => l.accountId === bankChartAccountId)!

  // Create match and accept it immediately
  const now2  = new Date()
  const match = await prisma.reconciliationMatch.create({
    data: {
      runId,
      statementLineId,
      journalLineId:   bankJLine.id,
      matchType:       "adjustment",
      confidenceScore: 1.0,
      status:          "CLEARED",
      acceptedById:    ctx.userId,
      acceptedAt:      now2,
      notes:           notes?.trim() || null,
    },
  })

  await prisma.bankStatementLine.update({
    where: { id: statementLineId },
    data:  { reconciliationStatus: "CLEARED" },
  })

  return NextResponse.json({ ok: true, journalEntryId: journalEntry.id, matchId: match.id })
}
