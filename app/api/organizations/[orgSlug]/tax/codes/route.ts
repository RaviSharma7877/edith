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

  const codes = await prisma.taxCode.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  })
  return NextResponse.json(codes)
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
  const { name, code, rate, type, jurisdiction, isDefault, effectiveFrom, effectiveTo, metadata } = body

  if (!name?.trim())   return NextResponse.json({ error: "Name is required."          }, { status: 400 })
  if (!code?.trim())   return NextResponse.json({ error: "Code is required."          }, { status: 400 })
  if (rate === undefined) return NextResponse.json({ error: "Rate is required."       }, { status: 400 })
  if (!type)           return NextResponse.json({ error: "Type is required."          }, { status: 400 })
  if (!effectiveFrom)  return NextResponse.json({ error: "Effective from is required."}, { status: 400 })

  // Effective date overlap check for same code in same workspace
  if (effectiveTo) {
    const from = new Date(effectiveFrom)
    const to   = new Date(effectiveTo)
    if (from >= to)
      return NextResponse.json({ error: "effectiveTo must be after effectiveFrom." }, { status: 400 })

    const overlap = await prisma.taxCode.findFirst({
      where: {
        workspaceId:  ctx.workspaceId,
        code:         code.trim(),
        effectiveFrom: { lte: to },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
      },
    })
    if (overlap)
      return NextResponse.json({ error: `Tax code "${code}" already has an active period overlapping these dates.` }, { status: 409 })
  }

  const taxCode = await prisma.taxCode.create({
    data: {
      workspaceId:  ctx.workspaceId,
      name:         name.trim(),
      code:         code.trim().toUpperCase(),
      rate:         parseFloat(rate),
      type,
      jurisdiction: jurisdiction ?? null,
      isDefault:    isDefault ?? false,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo:   effectiveTo ? new Date(effectiveTo) : null,
      metadata:      metadata ?? undefined,
    },
  })

  return NextResponse.json(taxCode, { status: 201 })
}
