import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url    = new URL(_req.url)
  const search = url.searchParams.get("search") ?? ""
  const active = url.searchParams.get("active")
  const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit  = 50

  const where = {
    companyId: ctx.company.id,
    deletedAt: null,
    ...(active !== null && active !== "" ? { isActive: active === "true" } : {}),
    ...(search ? {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { code:  { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, code: true, name: true, email: true, phone: true,
        gstin: true, creditLimit: true, creditDays: true, isActive: true,
        createdAt: true,
        _count: { select: { salesInvoices: true } },
      },
    }),
  ])

  return NextResponse.json({
    customers,
    pagination: { page, pages: Math.ceil(total / limit), total },
  })
}

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
  const { name, code, email, phone, gstin, pan, creditLimit, creditDays, billingAddress, shippingAddress } = body

  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 })

  if (code?.trim()) {
    const existing = await prisma.customer.findFirst({
      where: { companyId: ctx.company.id, code: code.trim(), deletedAt: null },
    })
    if (existing) return NextResponse.json({ error: `Customer code "${code}" already exists.` }, { status: 409 })
  }

  const customer = await prisma.customer.create({
    data: {
      companyId:      ctx.company.id,
      name:           name.trim(),
      code:           code?.trim() || null,
      email:          email?.trim() || null,
      phone:          phone?.trim() || null,
      gstin:          gstin?.trim() || null,
      pan:            pan?.trim() || null,
      creditLimit:    creditLimit ? parseFloat(creditLimit) : null,
      creditDays:     creditDays  ? parseInt(creditDays)   : null,
      billingAddress: billingAddress  || null,
      shippingAddress: shippingAddress || null,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CONTACT_CREATED",
      resourceType: "customer",
      resourceId:   customer.id,
      resourceName: customer.name,
    },
  })

  return NextResponse.json(customer, { status: 201 })
}
