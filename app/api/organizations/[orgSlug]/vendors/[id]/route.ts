import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const vendor = await prisma.vendor.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      _count: { select: { purchaseBills: true, payments: true } },
      purchaseBills: {
        orderBy: { billDate: "desc" },
        take:    10,
        select: {
          id: true, billNumber: true, billDate: true,
          status: true, totalAmount: true, amountDue: true, isDebitNote: true,
        },
      },
    },
  })
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(vendor)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const vendor = await prisma.vendor.findFirst({ where: { id, companyId: ctx.company.id, deletedAt: null } })
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const ALLOWED = ["name","code","email","phone","gstin","pan","paymentTerms","billingAddress","isActive"] as const
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key]
  }
  if (data.paymentTerms !== undefined) data.paymentTerms = data.paymentTerms ? parseInt(data.paymentTerms as string) : null

  const updated = await prisma.vendor.update({ where: { id }, data })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CONTACT_UPDATED",
      resourceType: "vendor",
      resourceId:   id,
      resourceName: vendor.name,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const vendor = await prisma.vendor.findFirst({
    where:   { id, companyId: ctx.company.id, deletedAt: null },
    include: { _count: { select: { purchaseBills: true } } },
  })
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (vendor._count.purchaseBills > 0)
    return NextResponse.json({ error: "Cannot delete a vendor with existing bills." }, { status: 422 })

  await prisma.vendor.update({ where: { id }, data: { deletedAt: new Date() } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CONTACT_DELETED",
      resourceType: "vendor",
      resourceId:   id,
      resourceName: vendor.name,
    },
  })

  return NextResponse.json({ ok: true })
}
