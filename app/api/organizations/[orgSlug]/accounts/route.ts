import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"

// ── GET /api/organizations/[orgSlug]/accounts ─────────────────────────────────
// Returns flat list ordered by type then code. Client builds the tree.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const accounts = await prisma.chartAccount.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    orderBy: [{ type: "asc" }, { code: "asc" }],
    select: {
      id: true, code: true, name: true, description: true,
      type: true, subtype: true, parentId: true,
      isPosting: true, isActive: true, isSystemAccount: true,
      isBankAccount: true, isCashAccount: true, isTaxAccount: true,
      openingBalance: true, openingDate: true, defaultTaxCodeId: true,
      createdAt: true, updatedAt: true,
      _count: { select: { journalLines: true, children: true } },
    },
  })

  return NextResponse.json(accounts)
}

// ── POST /api/organizations/[orgSlug]/accounts ────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const {
    code, name, type, subtype, parentId, description,
    isPosting, openingBalance, openingDate, defaultTaxCodeId,
    isTaxAccount, isBankAccount, isCashAccount,
  } = body

  if (!code?.trim() || !name?.trim() || !type || !subtype) {
    return NextResponse.json({ error: "code, name, type, and subtype are required." }, { status: 400 })
  }

  const duplicate = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, code: code.trim(), deletedAt: null },
  })
  if (duplicate) {
    return NextResponse.json({ error: `Account code "${code}" already exists.` }, { status: 409 })
  }

  if (parentId) {
    const parent = await prisma.chartAccount.findFirst({
      where: { id: parentId, companyId: ctx.company.id, deletedAt: null },
    })
    if (!parent) return NextResponse.json({ error: "Parent account not found." }, { status: 400 })
    if (parent.type !== type) {
      return NextResponse.json({ error: "Parent account type must match." }, { status: 400 })
    }
  }

  const account = await prisma.chartAccount.create({
    data: {
      companyId:       ctx.company.id,
      code:            code.trim(),
      name:            name.trim(),
      description:     description?.trim() || null,
      type,
      subtype,
      parentId:        parentId || null,
      isPosting:       isPosting ?? true,
      isActive:        true,
      isTaxAccount:    isTaxAccount ?? false,
      isBankAccount:   isBankAccount ?? false,
      isCashAccount:   isCashAccount ?? false,
      openingBalance:  openingBalance != null ? String(openingBalance) : null,
      openingDate:     openingDate ? new Date(openingDate) : null,
      defaultTaxCodeId: defaultTaxCodeId || null,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "COA_ACCOUNT_CREATED",
      severity:     "INFO",
      resourceType: "chart_account",
      resourceId:   account.id,
      resourceName: `${account.code} – ${account.name}`,
      description:  `Account "${account.code} – ${account.name}" created`,
    },
  })

  return NextResponse.json(account, { status: 201 })
}
