import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Reject/dismiss a suggested match — marks line as DISPUTED (carry forward, needs manual action)
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

  const { matchId, statementLineId } = await req.json()

  if (matchId) {
    // Reject a specific suggested match
    const match = await prisma.reconciliationMatch.findFirst({ where: { id: matchId, runId } })
    if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 })
    if (match.status === "CLEARED")
      return NextResponse.json({ error: "Cannot reject an already-accepted match." }, { status: 422 })
    await prisma.reconciliationMatch.delete({ where: { id: matchId } })
  } else if (statementLineId) {
    // Mark a statement line as DISPUTED (no match to be expected, carry-over)
    await prisma.bankStatementLine.update({
      where: { id: statementLineId },
      data:  { reconciliationStatus: "DISPUTED" },
    })
  } else {
    return NextResponse.json({ error: "matchId or statementLineId is required." }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
