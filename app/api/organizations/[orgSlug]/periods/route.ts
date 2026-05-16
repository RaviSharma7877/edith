import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── GET /api/organizations/[orgSlug]/periods ──────────────────────────────────
// Returns the current fiscal year + all periods

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true } } },
      },
    },
  })

  const member = user?.workspaceMembers.find((m) => m.workspace.slug === orgSlug)
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const company = await prisma.company.findFirst({
    where: { workspaceId: member.workspace.id, isDefault: true, deletedAt: null },
  })
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const fiscalYears = await prisma.fiscalYear.findMany({
    where: { companyId: company.id },
    orderBy: { startDate: "desc" },
    include: {
      periods: {
        orderBy: { startDate: "asc" },
      },
    },
  })

  return NextResponse.json({ fiscalYears })
}

// ── PATCH /api/organizations/[orgSlug]/periods ────────────────────────────────
// Update a single period's status (lock/unlock/close/reopen)

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const body = await req.json()

  const { periodId, status, reopenReason } = body as {
    periodId: string
    status: "OPEN" | "LOCKED" | "CLOSED" | "REOPENED"
    reopenReason?: string
  }

  if (!periodId || !status) {
    return NextResponse.json({ error: "periodId and status are required." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true } } },
      },
    },
  })

  const member = user?.workspaceMembers.find((m) => m.workspace.slug === orgSlug)
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const period = await prisma.accountingPeriod.findUnique({
    where: { id: periodId },
    include: { fiscalYear: { select: { companyId: true } } },
  })
  if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 })

  const now = new Date()
  const data: Record<string, unknown> = {
    status,
    isLocked: status === "LOCKED" || status === "CLOSED",
  }

  if (status === "LOCKED")   { data.lockedAt   = now; data.lockedById   = user!.id }
  if (status === "CLOSED")   { data.closedAt   = now; data.closedById   = user!.id }
  if (status === "REOPENED") { data.reopenedAt = now; data.reopenedById = user!.id; data.reopenReason = reopenReason ?? null }

  const updated = await prisma.accountingPeriod.update({
    where: { id: periodId },
    data,
  })

  const actionMap = {
    OPEN:     "PERIOD_OPENED",
    LOCKED:   "PERIOD_CLOSED",
    CLOSED:   "PERIOD_CLOSED",
    REOPENED: "PERIOD_REOPENED",
  } as const

  await prisma.auditLog.create({
    data: {
      workspaceId:  member.workspace.id,
      actorId:      user!.id,
      action:       actionMap[status],
      severity:     status === "CLOSED" ? "MEDIUM" : "INFO",
      resourceType: "accounting_period",
      resourceId:   periodId,
      resourceName: period.name,
      description:  `Period "${period.name}" set to ${status}${reopenReason ? ` — ${reopenReason}` : ""}`,
    },
  })

  return NextResponse.json(updated)
}
