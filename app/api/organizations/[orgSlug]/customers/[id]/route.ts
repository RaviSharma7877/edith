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

  const customer = await prisma.customer.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      _count: { select: { salesInvoices: true, payments: true } },
      salesInvoices: {
        orderBy: { invoiceDate: "desc" },
        take: 5,
        select: { id: true, invoiceNumber: true, invoiceDate: true, status: true, totalAmount: true, amountDue: true },
      },
    },
  })
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(customer)
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

  const customer = await prisma.customer.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const ALLOWED = ["name", "email", "phone", "gstin", "pan", "creditLimit", "creditDays",
                   "billingAddress", "shippingAddress", "isActive"] as const

  const data: Record<string, unknown> = {}
  for (const k of ALLOWED) {
    if (k in body) data[k] = body[k]
  }
  if ("creditLimit" in data) data.creditLimit = data.creditLimit ? parseFloat(data.creditLimit as string) : null
  if ("creditDays"  in data) data.creditDays  = data.creditDays  ? parseInt(data.creditDays as string)   : null

  const updated = await prisma.customer.update({ where: { id }, data })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CONTACT_UPDATED",
      resourceType: "customer",
      resourceId:   id,
      resourceName: updated.name,
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

  const customer = await prisma.customer.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: { _count: { select: { salesInvoices: true } } },
  })
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (customer._count.salesInvoices > 0)
    return NextResponse.json({ error: "Cannot delete customer with existing invoices." }, { status: 409 })

  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })

  return NextResponse.json({ ok: true })
}
