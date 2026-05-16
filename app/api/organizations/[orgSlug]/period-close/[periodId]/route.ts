import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// ── Blocker checks ─────────────────────────────────────────────────────────────

async function getBlockers(companyId: string, workspaceId: string, start: Date, end: Date) {
  const [
    unpostedJournals,
    draftInvoices,
    draftBills,
    unreconciledLines,
    unfiledReturns,
  ] = await Promise.all([
    // Unposted journals in the period
    prisma.journalEntry.count({
      where: {
        companyId,
        status: { in: ["DRAFT", "PENDING_APPROVAL"] },
        date:   { gte: start, lte: end },
      },
    }),
    // Draft/pending invoices dated in the period
    prisma.salesInvoice.count({
      where: {
        companyId,
        status:      { in: ["DRAFT", "PENDING_APPROVAL"] },
        invoiceDate: { gte: start, lte: end },
      },
    }),
    // Draft/pending bills dated in the period
    prisma.purchaseBill.count({
      where: {
        companyId,
        status:   { in: ["DRAFT", "PENDING_APPROVAL"] },
        billDate: { gte: start, lte: end },
      },
    }),
    // Unreconciled bank statement lines with dates in the period
    prisma.bankStatementLine.count({
      where: {
        reconciliationStatus: { in: ["UNRECONCILED", "MATCHED"] },
        date: { gte: start, lte: end },
        statement: { bankAccount: { companyId } },
      },
    }),
    // Unfiled tax returns for the month(s) in the period (by period string YYYY-MM)
    prisma.taxReturn.count({
      where: {
        companyId,
        status: { not: "filed" },
        // Check if any YYYY-MM period within our date range has a draft return
        period: {
          gte: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
          lte: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}`,
        },
      },
    }),
  ])

  return {
    unpostedJournals,
    draftInvoices,
    draftBills,
    unreconciledLines,
    unfiledReturns,
    total: unpostedJournals + draftInvoices + draftBills + unreconciledLines,
  }
}

// ── GET — period detail + checklist ────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; periodId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, periodId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const period = await prisma.accountingPeriod.findFirst({
    where:   { id: periodId, fiscalYear: { companyId: ctx.company.id } },
    include: { fiscalYear: true },
  })
  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const blockers = await getBlockers(
    ctx.company.id, ctx.workspaceId, period.startDate, period.endDate,
  )

  return NextResponse.json({ period, blockers })
}

// ── PATCH — close / lock / reopen ──────────────────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; periodId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, periodId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const period = await prisma.accountingPeriod.findFirst({
    where:   { id: periodId, fiscalYear: { companyId: ctx.company.id } },
  })
  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body   = await req.json()
  const action = body.action as "lock" | "close" | "reopen"
  const now    = new Date()

  if (action === "lock") {
    if (period.status !== "OPEN")
      return NextResponse.json({ error: "Only OPEN periods can be locked." }, { status: 422 })

    const updated = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data:  { status: "LOCKED", isLocked: true, lockedAt: now, lockedById: ctx.userId },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId:  ctx.workspaceId,
        actorId:      ctx.userId,
        action:       "PERIOD_LOCKED",
        resourceType: "accounting_period",
        resourceId:   periodId,
        resourceName: period.name,
      },
    })

    return NextResponse.json(updated)
  }

  if (action === "close") {
    if (period.status !== "LOCKED" && period.status !== "OPEN")
      return NextResponse.json({ error: "Period must be OPEN or LOCKED to close." }, { status: 422 })

    // Hard blocker check — cannot close with unposted journals or draft docs
    const blockers = await getBlockers(
      ctx.company.id, ctx.workspaceId, period.startDate, period.endDate,
    )
    const hardBlockers = blockers.unpostedJournals + blockers.draftInvoices + blockers.draftBills + blockers.unreconciledLines
    if (hardBlockers > 0)
      return NextResponse.json({
        error: `Cannot close: ${hardBlockers} unresolved blocker(s). Post all journals, clear draft documents, and reconcile bank items first.`,
        blockers,
      }, { status: 422 })

    const updated = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data:  {
        status:    "CLOSED",
        isLocked:  true,
        closedAt:  now,
        closedById: ctx.userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId:  ctx.workspaceId,
        actorId:      ctx.userId,
        action:       "PERIOD_CLOSED",
        resourceType: "accounting_period",
        resourceId:   periodId,
        resourceName: period.name,
      },
    })

    return NextResponse.json(updated)
  }

  if (action === "reopen") {
    if (period.status !== "CLOSED" && period.status !== "LOCKED")
      return NextResponse.json({ error: "Only CLOSED or LOCKED periods can be reopened." }, { status: 422 })

    const reason = (body.reason ?? "").trim()
    if (!reason)
      return NextResponse.json({ error: "A reason is required to reopen a period." }, { status: 400 })

    const updated = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data:  {
        status:       "REOPENED",
        isLocked:     false,
        reopenedAt:   now,
        reopenedById: ctx.userId,
        reopenReason: reason,
      },
    })

    await prisma.auditLog.create({
      data: {
        workspaceId:  ctx.workspaceId,
        actorId:      ctx.userId,
        action:       "PERIOD_REOPENED",
        resourceType: "accounting_period",
        resourceId:   periodId,
        resourceName: period.name,
        description:  reason,
      },
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
