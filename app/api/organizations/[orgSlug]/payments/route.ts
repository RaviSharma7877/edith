import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

const PREFIXES: Record<string, string> = {
  receipt:      "REC",
  disbursement: "DIS",
  contra:       "CNT",
}

async function nextPaymentNumber(companyId: string, type: string): Promise<string> {
  const prefix = PREFIXES[type] ?? "PAY"
  const year   = new Date().getFullYear()
  const count  = await prisma.payment.count({
    where: { companyId, type, paymentNumber: { startsWith: `${prefix}-${year}-` } },
  })
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url        = new URL(req.url)
  const type       = url.searchParams.get("type")       ?? ""
  const status     = url.searchParams.get("status")     ?? ""
  const customerId = url.searchParams.get("customerId") ?? ""
  const vendorId   = url.searchParams.get("vendorId")   ?? ""
  const page       = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit      = 20

  const where = {
    companyId: ctx.company.id,
    ...(type       ? { type }                      : {}),
    ...(status     ? { status: status as any }     : {}),
    ...(customerId ? { customerId }                : {}),
    ...(vendorId   ? { vendorId }                  : {}),
  }

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, paymentNumber: true, type: true, date: true,
        amount: true, currency: true, status: true,
        paymentMethod: true, reference: true, isReversal: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
        vendor:   { select: { id: true, name: true } },
        _count:   { select: { allocations: true } },
      },
    }),
  ])

  return NextResponse.json({ payments, pagination: { page, pages: Math.ceil(total / limit), total } })
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
  const {
    type, customerId, vendorId, date, amount,
    paymentMethod, reference, bankAccountId, notes,
  } = body

  if (!type)   return NextResponse.json({ error: "Payment type is required." }, { status: 400 })
  if (!date)   return NextResponse.json({ error: "Date is required."         }, { status: 400 })
  if (!amount || parseFloat(amount) <= 0)
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 })

  if (type === "receipt"      && !customerId)
    return NextResponse.json({ error: "Customer is required for a receipt."      }, { status: 400 })
  if (type === "disbursement" && !vendorId)
    return NextResponse.json({ error: "Vendor is required for a disbursement."   }, { status: 400 })

  // Validate counterparty exists
  if (customerId) {
    const c = await prisma.customer.findFirst({ where: { id: customerId, companyId: ctx.company.id, deletedAt: null } })
    if (!c) return NextResponse.json({ error: "Customer not found." }, { status: 404 })
  }
  if (vendorId) {
    const v = await prisma.vendor.findFirst({ where: { id: vendorId, companyId: ctx.company.id, deletedAt: null } })
    if (!v) return NextResponse.json({ error: "Vendor not found." }, { status: 404 })
  }
  if (bankAccountId) {
    const ba = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, companyId: ctx.company.id, isActive: true } })
    if (!ba) return NextResponse.json({ error: "Bank account not found." }, { status: 404 })
  }

  const paymentNumber = await nextPaymentNumber(ctx.company.id, type)

  const payment = await prisma.payment.create({
    data: {
      companyId:     ctx.company.id,
      paymentNumber,
      type,
      customerId:    customerId ?? null,
      vendorId:      vendorId   ?? null,
      date:          new Date(date),
      amount:        parseFloat(amount),
      paymentMethod: paymentMethod ?? null,
      reference:     reference?.trim() || null,
      bankAccountId: bankAccountId ?? null,
      notes:         notes?.trim()  || null,
      status:        "DRAFT",
      createdById:   ctx.userId,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "PAYMENT_CREATED",
      resourceType: "payment",
      resourceId:   payment.id,
      resourceName: payment.paymentNumber,
      amount:       parseFloat(amount),
      currency:     "INR",
    },
  })

  return NextResponse.json(payment, { status: 201 })
}
