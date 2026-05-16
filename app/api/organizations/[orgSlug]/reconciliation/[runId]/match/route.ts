import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// POST — create a manual match between a statement line and a journal line
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
    where: { id: runId, statement: { bankAccount: { companyId: ctx.company.id } } },
  })
  if (!run)          return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (run.completedAt) return NextResponse.json({ error: "This reconciliation run is already completed." }, { status: 422 })

  const body = await req.json()
  const { statementLineId, journalLineId } = body

  if (!statementLineId) return NextResponse.json({ error: "statementLineId is required." }, { status: 400 })
  if (!journalLineId)   return NextResponse.json({ error: "journalLineId is required."   }, { status: 400 })

  // Validate statement line belongs to this run's statement
  const stmtLine = await prisma.bankStatementLine.findFirst({
    where: { id: statementLineId, statement: { runs: { some: { id: runId } } } },
  })
  if (!stmtLine) return NextResponse.json({ error: "Statement line not found." }, { status: 404 })

  // Validate journal line belongs to this company's bank account
  const jLine = await prisma.journalLine.findFirst({
    where: {
      id:           journalLineId,
      journalEntry: { companyId: ctx.company.id, status: "POSTED" },
    },
  })
  if (!jLine) return NextResponse.json({ error: "Journal line not found." }, { status: 404 })

  // No double-matching: journal line already matched in any run for this statement
  const dupMatch = await prisma.reconciliationMatch.findFirst({
    where: {
      journalLineId,
      status:  { in: ["MATCHED", "CLEARED"] },
      run:     { statementId: run.statementId },
    },
  })
  if (dupMatch)
    return NextResponse.json({ error: "This journal line is already matched in this reconciliation." }, { status: 409 })

  // Remove any prior suggestion for this statement line in this run
  await prisma.reconciliationMatch.deleteMany({
    where: { runId, statementLineId, status: "MATCHED" },
  })

  const match = await prisma.reconciliationMatch.create({
    data: {
      runId,
      statementLineId,
      journalLineId,
      matchType:       "manual",
      confidenceScore: 1.0,
      status:          "MATCHED",
    },
  })

  return NextResponse.json(match, { status: 201 })
}

// DELETE — remove a match (revert to unreconciled)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; runId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, runId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const run = await prisma.reconciliationRun.findFirst({
    where: { id: runId, statement: { bankAccount: { companyId: ctx.company.id } } },
  })
  if (!run)          return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (run.completedAt) return NextResponse.json({ error: "Completed runs cannot be modified." }, { status: 422 })

  const url     = new URL(req.url)
  const matchId = url.searchParams.get("matchId")
  if (!matchId) return NextResponse.json({ error: "matchId query param required." }, { status: 400 })

  const match = await prisma.reconciliationMatch.findFirst({ where: { id: matchId, runId } })
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 })
  if (match.status === "CLEARED")
    return NextResponse.json({ error: "Cannot remove a CLEARED match." }, { status: 422 })

  await prisma.reconciliationMatch.delete({ where: { id: matchId } })
  return NextResponse.json({ ok: true })
}
