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

  const taxReturn = await prisma.taxReturn.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(taxReturn)
}

// POST /[id]/file — mark return as filed, lock accounting period
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const taxReturn = await prisma.taxReturn.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!taxReturn) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (taxReturn.status === "filed")
    return NextResponse.json({ error: "Already filed." }, { status: 422 })

  const body      = await req.json()
  const ackNumber = body.ackNumber?.trim() || null
  const now       = new Date()

  // Determine the accounting period to lock based on return period
  const [year, month] = taxReturn.period.split("-").map(Number)
  if (!month) return NextResponse.json({ error: "Cannot determine period from return." }, { status: 422 })

  const periodStart = new Date(year, month - 1, 1)
  const periodEnd   = new Date(year, month, 0, 23, 59, 59, 999)

  const accountingPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      fiscalYear: { companyId: ctx.company.id },
      startDate:  { lte: periodEnd },
      endDate:    { gte: periodStart },
    },
  })

  const ops = [
    prisma.taxReturn.update({
      where: { id },
      data:  { status: "filed", filedAt: now, filedById: ctx.userId, ackNumber },
    }),
  ]

  // Lock the accounting period (set to CLOSED)
  if (accountingPeriod && accountingPeriod.status === "OPEN") {
    ops.push(
      prisma.accountingPeriod.update({
        where: { id: accountingPeriod.id },
        data:  { status: "CLOSED" as any },
      }) as any,
    )
  }

  const [updated] = await prisma.$transaction(ops)

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "TAX_RETURN_FILED",
      resourceType: "tax_return",
      resourceId:   id,
      resourceName: `${taxReturn.type} ${taxReturn.period}`,
    },
  })

  return NextResponse.json(updated)
}
