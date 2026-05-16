import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function POST(
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
  if (payment.status !== "POSTED")
    return NextResponse.json({ error: "Only POSTED payments can be allocated." }, { status: 422 })

  const body = await req.json()
  const { invoiceId, billId, amount, discountAmount } = body

  if (!invoiceId && !billId)
    return NextResponse.json({ error: "Either invoiceId or billId is required." }, { status: 400 })
  if (invoiceId && billId)
    return NextResponse.json({ error: "Provide either invoiceId or billId, not both." }, { status: 400 })
  if (!amount || parseFloat(amount) <= 0)
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 })

  const allocAmt    = parseFloat(amount)
  const discountAmt = parseFloat(discountAmount ?? "0") || 0

  if (invoiceId) {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id: invoiceId, companyId: ctx.company.id },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 })
    if (invoice.status !== "POSTED")
      return NextResponse.json({ error: "Invoice is not POSTED." }, { status: 422 })
    if (Number(invoice.amountDue) < allocAmt - discountAmt - 0.001)
      return NextResponse.json({ error: "Allocation exceeds invoice balance due." }, { status: 422 })

    const [allocation] = await prisma.$transaction([
      prisma.paymentAllocation.create({
        data: {
          paymentId:     id,
          invoiceId,
          amount:        allocAmt,
          discountAmount: discountAmt,
        },
      }),
      prisma.salesInvoice.update({
        where: { id: invoiceId },
        data:  {
          amountPaid: { increment: allocAmt },
          amountDue:  { decrement: allocAmt - discountAmt },
        },
      }),
    ])
    return NextResponse.json(allocation, { status: 201 })
  }

  // Bill allocation
  const bill = await prisma.purchaseBill.findFirst({
    where: { id: billId, companyId: ctx.company.id },
  })
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 })
  if (bill.status !== "POSTED")
    return NextResponse.json({ error: "Bill is not POSTED." }, { status: 422 })
  if (Number(bill.amountDue) < allocAmt - discountAmt - 0.001)
    return NextResponse.json({ error: "Allocation exceeds bill balance due." }, { status: 422 })

  const [allocation] = await prisma.$transaction([
    prisma.paymentAllocation.create({
      data: {
        paymentId:     id,
        billId,
        amount:        allocAmt,
        discountAmount: discountAmt,
      },
    }),
    prisma.purchaseBill.update({
      where: { id: billId },
      data:  {
        amountPaid: { increment: allocAmt },
        amountDue:  { decrement: allocAmt - discountAmt },
      },
    }),
  ])
  return NextResponse.json(allocation, { status: 201 })
}

export async function DELETE(
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
  if (payment.status !== "POSTED")
    return NextResponse.json({ error: "Only allocations on POSTED payments can be removed." }, { status: 422 })

  const url            = new URL(req.url)
  const allocationId   = url.searchParams.get("allocationId")
  if (!allocationId) return NextResponse.json({ error: "allocationId query param required." }, { status: 400 })

  const allocation = await prisma.paymentAllocation.findFirst({
    where: { id: allocationId, paymentId: id },
  })
  if (!allocation) return NextResponse.json({ error: "Allocation not found." }, { status: 404 })

  const allocAmt    = Number(allocation.amount)
  const discountAmt = Number(allocation.discountAmount)

  const ops: Prisma.PrismaPromise<any>[] = [
    prisma.paymentAllocation.delete({ where: { id: allocationId } }),
  ]

  if (allocation.invoiceId) {
    ops.push(
      prisma.salesInvoice.update({
        where: { id: allocation.invoiceId },
        data:  {
          amountPaid: { decrement: allocAmt },
          amountDue:  { increment: allocAmt - discountAmt },
        },
      }),
    )
  }
  if (allocation.billId) {
    ops.push(
      prisma.purchaseBill.update({
        where: { id: allocation.billId },
        data:  {
          amountPaid: { decrement: allocAmt },
          amountDue:  { increment: allocAmt - discountAmt },
        },
      }),
    )
  }

  await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
