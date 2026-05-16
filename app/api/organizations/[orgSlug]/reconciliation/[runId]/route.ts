import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
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
      statement: {
        include: {
          bankAccount: { select: { id: true, bankName: true, maskedNumber: true, chartAccountId: true } },
          lines: {
            orderBy: { date: "asc" },
            include: {
              matches: {
                where:   { runId },
                include: {
                  statementLine: false,
                },
              },
            },
          },
        },
      },
      matches: {
        include: {
          statementLine: { select: { id: true, date: true, description: true, debitAmount: true, creditAmount: true, balance: true, reconciliationStatus: true } },
        },
      },
    },
  })
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fetch unmatched journal lines for the bank account within the statement window ±7 days
  const stmt        = run.statement
  const windowStart = new Date(stmt.startDate); windowStart.setDate(windowStart.getDate() - 7)
  const windowEnd   = new Date(stmt.endDate);   windowEnd.setDate(windowEnd.getDate() + 7)

  // IDs already matched in this run
  const matchedJLineIds = new Set(
    run.matches
      .filter((m) => m.journalLineId && ["MATCHED","CLEARED"].includes(m.status))
      .map((m) => m.journalLineId!),
  )

  const unmatchedJLines = await prisma.journalLine.findMany({
    where: {
      accountId:    stmt.bankAccount.chartAccountId,
      id:           { notIn: Array.from(matchedJLineIds) },
      journalEntry: {
        companyId: ctx.company.id,
        status:    "POSTED",
        date:      { gte: windowStart, lte: windowEnd },
      },
    },
    include: {
      journalEntry: { select: { id: true, date: true, voucherNumber: true, description: true } },
    },
    orderBy: { journalEntry: { date: "asc" } },
    take: 200,
  })

  return NextResponse.json({ run, unmatchedJLines })
}
