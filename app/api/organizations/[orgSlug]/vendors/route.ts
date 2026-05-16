import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url    = new URL(req.url)
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

  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      orderBy: { name: "asc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, code: true, name: true, email: true, phone: true,
        gstin: true, paymentTerms: true, isActive: true, createdAt: true,
        _count: { select: { purchaseBills: true } },
      },
    }),
  ])

  return NextResponse.json({ vendors, pagination: { page, pages: Math.ceil(total / limit), total } })
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
  const { name, code, email, phone, gstin, pan, paymentTerms, billingAddress } = body

  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 })

  if (code?.trim()) {
    const existing = await prisma.vendor.findFirst({
      where: { companyId: ctx.company.id, code: code.trim(), deletedAt: null },
    })
    if (existing) return NextResponse.json({ error: `Vendor code "${code}" already exists.` }, { status: 409 })
  }

  const vendor = await prisma.vendor.create({
    data: {
      companyId:    ctx.company.id,
      name:         name.trim(),
      code:         code?.trim()  || null,
      email:        email?.trim() || null,
      phone:        phone?.trim() || null,
      gstin:        gstin?.trim() || null,
      pan:          pan?.trim()   || null,
      paymentTerms: paymentTerms ? parseInt(paymentTerms) : null,
      billingAddress: billingAddress || null,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CONTACT_CREATED",
      resourceType: "vendor",
      resourceId:   vendor.id,
      resourceName: vendor.name,
    },
  })

  return NextResponse.json(vendor, { status: 201 })
}
