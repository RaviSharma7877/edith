import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"

const UPDATABLE_FIELDS = [
  "name", "description", "isPosting", "isActive",
  "openingBalance", "openingDate", "defaultTaxCodeId",
  "isTaxAccount", "isBankAccount", "isCashAccount", "parentId",
] as const

// ── GET /api/organizations/[orgSlug]/accounts/[id] ────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.chartAccount.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      parent: { select: { id: true, code: true, name: true } },
      children: {
        where: { deletedAt: null },
        select: { id: true, code: true, name: true, isPosting: true, isActive: true },
        orderBy: { code: "asc" },
      },
      _count: { select: { journalLines: true } },
    },
  })

  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })
  return NextResponse.json(account)
}

// ── PATCH /api/organizations/[orgSlug]/accounts/[id] ──────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.chartAccount.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  const body = await req.json()

  if ("code" in body && body.code !== account.code) {
    return NextResponse.json({ error: "Account code cannot be changed after creation." }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) data[key] = body[key] === "" ? null : body[key]
  }

  if ("parentId" in data && data.parentId) {
    const parent = await prisma.chartAccount.findFirst({
      where: { id: data.parentId as string, companyId: ctx.company.id, deletedAt: null },
    })
    if (!parent) return NextResponse.json({ error: "Parent account not found." }, { status: 400 })
    if (parent.type !== account.type) {
      return NextResponse.json({ error: "Parent type must match account type." }, { status: 400 })
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
  }

  const updated = await prisma.chartAccount.update({ where: { id }, data })

  await prisma.auditLog.create({
    data: {
      workspaceId:   ctx.workspaceId,
      actorId:       ctx.userId,
      action:        "COA_ACCOUNT_UPDATED",
      severity:      "INFO",
      resourceType:  "chart_account",
      resourceId:    id,
      resourceName:  `${account.code} – ${account.name}`,
      changedFields: Object.keys(data),
      description:   `Account "${account.code}" updated`,
    },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/organizations/[orgSlug]/accounts/[id] ─────────────────────────

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.chartAccount.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: { _count: { select: { journalLines: true, children: true } } },
  })
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

  if (account.isSystemAccount) {
    return NextResponse.json({ error: "System accounts cannot be deleted." }, { status: 403 })
  }
  if (account._count.journalLines > 0) {
    return NextResponse.json(
      { error: "Cannot delete an account with posted transactions. Deactivate it instead." },
      { status: 409 },
    )
  }
  if (account._count.children > 0) {
    return NextResponse.json(
      { error: "Cannot delete an account that has child accounts." },
      { status: 409 },
    )
  }

  await prisma.chartAccount.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "COA_ACCOUNT_DELETED",
      severity:     "MEDIUM",
      resourceType: "chart_account",
      resourceId:   id,
      resourceName: `${account.code} – ${account.name}`,
      description:  `Account "${account.code} – ${account.name}" deleted`,
    },
  })

  return new NextResponse(null, { status: 204 })
}
