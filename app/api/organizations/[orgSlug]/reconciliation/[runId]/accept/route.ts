import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Accept a suggested/manual match → promote to CLEARED, mark statement line CLEARED
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
  if (run.completedAt) return NextResponse.json({ error: "Run already completed." }, { status: 422 })

  const { matchId } = await req.json()
  if (!matchId) return NextResponse.json({ error: "matchId is required." }, { status: 400 })

  const match = await prisma.reconciliationMatch.findFirst({ where: { id: matchId, runId } })
  if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 })
  if (match.status === "CLEARED")
    return NextResponse.json({ error: "Already accepted." }, { status: 422 })

  const now = new Date()
  await prisma.$transaction([
    prisma.reconciliationMatch.update({
      where: { id: matchId },
      data:  { status: "CLEARED", acceptedById: ctx.userId, acceptedAt: now },
    }),
    prisma.bankStatementLine.update({
      where: { id: match.statementLineId },
      data:  { reconciliationStatus: "CLEARED" },
    }),
  ])

  // Update run matched count
  const clearedCount = await prisma.reconciliationMatch.count({ where: { runId, status: "CLEARED" } })
  const totalLines   = await prisma.bankStatementLine.count({ where: { statement: { runs: { some: { id: runId } } } } })
  await prisma.reconciliationRun.update({
    where: { id: runId },
    data:  { totalMatched: clearedCount, totalUnmatched: totalLines - clearedCount },
  })

  return NextResponse.json({ ok: true })
}
