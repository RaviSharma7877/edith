import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; runId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, runId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const run = await prisma.reconciliationRun.findFirst({
    where: { id: runId, statement: { bankAccount: { companyId: ctx.company.id } } },
    include: {
      statement: { include: { lines: true } },
    },
  })
  if (!run)          return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (run.completedAt) return NextResponse.json({ error: "Already completed." }, { status: 422 })

  const totalLines   = run.statement.lines.length
  const clearedLines = run.statement.lines.filter((l) => l.reconciliationStatus === "CLEARED").length
  const unmatched    = totalLines - clearedLines

  const now = new Date()
  const [updatedRun] = await prisma.$transaction([
    prisma.reconciliationRun.update({
      where: { id: runId },
      data:  { completedAt: now, totalMatched: clearedLines, totalUnmatched: unmatched },
    }),
    // Lock the statement
    prisma.bankStatement.update({
      where: { id: run.statementId },
      data:  { isLocked: true },
    }),
  ])

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "RECONCILIATION_COMPLETED",
      resourceType: "reconciliation_run",
      resourceId:   runId,
      resourceName: `Run ${runId.slice(-6).toUpperCase()}`,
    },
  })

  return NextResponse.json({
    ok:          true,
    completedAt: now,
    totalLines,
    cleared:     clearedLines,
    unmatched,
  })
}
