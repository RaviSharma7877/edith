import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── Auth + membership guard ───────────────────────────────────────────────────

async function resolveCompany(orgSlug: string, userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true } } },
      },
    },
  })

  const member = user?.workspaceMembers.find((m) => m.workspace.slug === orgSlug)
  if (!member) return null

  const company = await prisma.company.findFirst({
    where: { workspaceId: member.workspace.id, isDefault: true, deletedAt: null },
  })

  return { company, workspaceId: member.workspace.id, userId: user!.id }
}

// ── GET /api/organizations/[orgSlug]/company ──────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const result = await resolveCompany(orgSlug, session.user.email)
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(result.company)
}

// ── PATCH /api/organizations/[orgSlug]/company ────────────────────────────────

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const result = await resolveCompany(orgSlug, session.user.email)
  if (!result) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const body = await req.json()

  // Whitelist of updatable fields
  const allowed = [
    "name", "legalName", "displayName", "phone", "email", "website",
    "addressLine1", "addressLine2", "city", "state", "postalCode",
    "taxId", "panNumber", "cin",
    "invoiceNotes", "invoiceTerms",
    "logoUrl", "signatureUrl",
  ] as const

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === "" ? null : body[key]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })
  }

  let updated;
  if (result.company) {
    updated = await prisma.company.update({
      where: { id: result.company.id },
      data,
    })
  } else {
    // Create new default company for this workspace
    updated = await prisma.company.create({
      data: {
        ...data as any,
        workspaceId: result.workspaceId,
        isDefault: true,
        isActive: true,
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      workspaceId:   result.workspaceId,
      actorId:       result.userId,
      action:        "COMPANY_UPDATED",
      severity:      "INFO",
      resourceType:  "company",
      resourceId:    updated.id,
      resourceName:  updated.name,
      changedFields: Object.keys(data),
      description:   `Company profile updated`,
    },
  })

  return NextResponse.json(updated)
}
