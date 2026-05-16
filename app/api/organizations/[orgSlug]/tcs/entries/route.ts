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

  const url     = new URL(req.url)
  const quarter = url.searchParams.get("quarter")
  const status  = url.searchParams.get("status")

  const entries = await prisma.tCSEntry.findMany({
    where: {
      companyId: ctx.company.id,
      ...(quarter ? { quarterPeriod: quarter } : {}),
      ...(status  ? { status }               : {}),
    },
    include: {
      section: { select: { section: true, description: true } },
    },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(entries)
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
  const { sectionId, invoiceId, customerId, tcsAmount, baseAmount, date, quarterPeriod } = body

  if (!sectionId || tcsAmount == null || baseAmount == null || !date || !quarterPeriod)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  const entry = await prisma.tCSEntry.create({
    data: {
      companyId: ctx.company.id,
      sectionId,
      invoiceId:  invoiceId  ?? null,
      customerId: customerId ?? null,
      tcsAmount,
      baseAmount,
      date: new Date(date),
      quarterPeriod,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
