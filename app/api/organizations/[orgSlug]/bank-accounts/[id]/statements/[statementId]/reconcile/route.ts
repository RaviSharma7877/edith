import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Confidence scoring:
//   exact amount + 0 day diff  → 1.00
//   exact amount + 1 day diff  → 0.92
//   exact amount + 2 day diff  → 0.85
//   exact amount + 3 day diff  → 0.78
//   fuzzy amount (≤0.5%) + 0d  → 0.70
//   fuzzy + 1d                 → 0.62
//   below 0.60 → not suggested
function score(dayDiff: number, amountExact: boolean): number {
  const base = amountExact ? 1.0 : 0.70
  const decay = dayDiff * 0.08
  return Math.round((base - decay) * 100) / 100
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string; statementId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id, statementId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const statement = await prisma.bankStatement.findFirst({
    where:   { id: statementId, bankAccountId: id },
    include: { lines: { orderBy: { date: "asc" } } },
  })
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Resume existing open run
  const existingRun = await prisma.reconciliationRun.findFirst({
    where:   { statementId, completedAt: null },
    orderBy: { startedAt: "desc" },
  })
  if (existingRun) return NextResponse.json({ runId: existingRun.id, resumed: true })

  // Create new run
  const run = await prisma.reconciliationRun.create({
    data: { statementId, startedById: ctx.userId },
  })

  // Gather unreconciled lines
  const unreconciledLines = statement.lines.filter(
    (l) => l.reconciliationStatus === "UNRECONCILED",
  )
  if (unreconciledLines.length === 0)
    return NextResponse.json({ runId: run.id, resumed: false, suggestionsCreated: 0 })

  // Fetch posted journal lines for this bank chart account within ±7 days of statement range
  const windowStart = new Date(statement.startDate)
  windowStart.setDate(windowStart.getDate() - 7)
  const windowEnd = new Date(statement.endDate)
  windowEnd.setDate(windowEnd.getDate() + 7)

  const journalLines = await prisma.journalLine.findMany({
    where: {
      accountId:    account.chartAccountId,
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { gte: windowStart, lte: windowEnd },
      },
    },
    include: { journalEntry: { select: { id: true, date: true, voucherNumber: true, description: true } } },
  })

  // Build a set of already-matched journalLineIds
  const alreadyMatchedLineIds = new Set<string>()
  const existingMatches = await prisma.reconciliationMatch.findMany({
    where: {
      run:    { statementId },
      status: { in: ["MATCHED", "CLEARED"] },
      journalLineId: { not: null },
    },
    select: { journalLineId: true },
  })
  existingMatches.forEach((m) => { if (m.journalLineId) alreadyMatchedLineIds.add(m.journalLineId) })

  const suggestOps: Prisma.PrismaPromise<any>[] = []

  for (const stmtLine of unreconciledLines) {
    const stmtAmt = Number(stmtLine.creditAmount ?? stmtLine.debitAmount ?? 0)
    if (stmtAmt === 0) continue

    // Bank credit = money in = book DEBIT on bank account
    // Bank debit  = money out = book CREDIT on bank account
    const expectedDirection = stmtLine.creditAmount ? "DEBIT" : "CREDIT"

    let best: { jLine: (typeof journalLines)[0]; conf: number } | null = null

    for (const jLine of journalLines) {
      if (alreadyMatchedLineIds.has(jLine.id)) continue
      if (jLine.direction !== expectedDirection) continue

      const jAmt = Number(jLine.amount)
      const dayDiff = Math.abs(
        (new Date(jLine.journalEntry.date).getTime() - new Date(stmtLine.date).getTime()) /
        86_400_000,
      )
      if (dayDiff > 3) continue

      const amountExact  = Math.abs(jAmt - stmtAmt) < 0.005
      const amountFuzzy  = Math.abs(jAmt - stmtAmt) / stmtAmt <= 0.005
      if (!amountExact && !amountFuzzy) continue

      const conf = score(Math.floor(dayDiff), amountExact)
      if (conf < 0.60) continue
      if (!best || conf > best.conf) best = { jLine, conf }
    }

    if (best) {
      alreadyMatchedLineIds.add(best.jLine.id)
      suggestOps.push(
        prisma.reconciliationMatch.create({
          data: {
            runId:           run.id,
            statementLineId: stmtLine.id,
            journalLineId:   best.jLine.id,
            confidenceScore: best.conf,
            matchType:       best.conf >= 0.90 ? "exact" : "fuzzy",
            status:          "MATCHED",
          },
        }),
      )
    }
  }

  if (suggestOps.length > 0) await prisma.$transaction(suggestOps)

  // Update run stats
  const matched   = suggestOps.length
  const unmatched = unreconciledLines.length - matched
  await prisma.reconciliationRun.update({
    where: { id: run.id },
    data:  { totalMatched: matched, totalUnmatched: unmatched },
  })

  return NextResponse.json({ runId: run.id, resumed: false, suggestionsCreated: matched })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string; statementId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id, statementId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const run = await prisma.reconciliationRun.findFirst({
    where:   { statementId, statement: { bankAccountId: id } },
    orderBy: { startedAt: "desc" },
  })

  return NextResponse.json(run ?? null)
}
