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

  const regs = await prisma.taxRegistration.findMany({
    where:   { companyId: ctx.company.id },
    orderBy: [{ type: "asc" }, { effectiveFrom: "asc" }],
  })
  return NextResponse.json(regs)
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
  const { type, number, effectiveFrom, effectiveTo, stateCode, metadata } = body

  if (!type)          return NextResponse.json({ error: "Type is required."           }, { status: 400 })
  if (!number?.trim()) return NextResponse.json({ error: "Registration number is required." }, { status: 400 })
  if (!effectiveFrom) return NextResponse.json({ error: "Effective from date is required." }, { status: 400 })

  // Validate GSTIN format (15 chars)
  if (type === "GST" && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(number.trim()))
    return NextResponse.json({ error: "Invalid GSTIN format." }, { status: 400 })

  // Overlapping active registration check for same type
  const overlap = await prisma.taxRegistration.findFirst({
    where: {
      companyId:    ctx.company.id,
      type,
      number:       number.trim(),
      effectiveFrom: { lte: effectiveTo ? new Date(effectiveTo) : new Date("9999-12-31") },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(effectiveFrom) } }],
    },
  })
  if (overlap)
    return NextResponse.json({ error: "A registration with this number already exists in the given date range." }, { status: 409 })

  const reg = await prisma.taxRegistration.create({
    data: {
      companyId:     ctx.company.id,
      type,
      number:        number.trim(),
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo:   effectiveTo ? new Date(effectiveTo) : null,
      stateCode:     stateCode ?? null,
      metadata:      metadata ?? undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "TAX_REGISTRATION_ADDED",
      resourceType: "tax_registration",
      resourceId:   reg.id,
      resourceName: `${type} ${number.trim()}`,
    },
  })

  return NextResponse.json(reg, { status: 201 })
}
