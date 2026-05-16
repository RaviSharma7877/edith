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

  const payment = await prisma.payment.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      vendor:   { select: { id: true, name: true, code: true } },
      allocations: {
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          bill:    { select: { id: true, billNumber: true,   totalAmount: true } },
        },
      },
      reversalOf: { select: { id: true, paymentNumber: true } },
      reversals:  { select: { id: true, paymentNumber: true, status: true } },
    },
  })
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(payment)
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

  const payment = await prisma.payment.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (payment.status !== "DRAFT")
    return NextResponse.json({ error: "Only DRAFT payments can be edited." }, { status: 422 })

  const body = await req.json()
  const ALLOWED = ["date","amount","paymentMethod","reference","bankAccountId","notes"] as const
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) {
      if (key === "date")   data.date   = new Date(body.date)
      else if (key === "amount") data.amount = parseFloat(body.amount)
      else data[key] = body[key] ?? null
    }
  }

  const updated = await prisma.payment.update({ where: { id }, data })
  return NextResponse.json(updated)
}
