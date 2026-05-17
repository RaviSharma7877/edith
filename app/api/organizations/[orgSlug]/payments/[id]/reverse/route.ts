import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function POST(
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
      allocations: true,
    },
  })
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (payment.status !== "POSTED")
    return NextResponse.json({ error: "Only POSTED payments can be reversed." }, { status: 422 })
  if (payment.isReversal)
    return NextResponse.json({ error: "A reversal cannot itself be reversed." }, { status: 422 })

  // Check if already reversed
  const existingReversal = await prisma.payment.findFirst({
    where: { reversalOfId: id, status: { not: "VOID" } },
  })
  if (existingReversal)
    return NextResponse.json({ error: `Already reversed by ${existingReversal.paymentNumber}.` }, { status: 409 })

  // Verify open period for original payment date
  const payDate    = payment.date
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      fiscalYear: { companyId: ctx.company.id },
      startDate:  { lte: payDate },
      endDate:    { gte: payDate },
      status:     "OPEN",
    },
  })
  if (!openPeriod)
    return NextResponse.json({ error: "No open accounting period covers the payment date." }, { status: 422 })

  // Fetch original journal entry
  const originalJournal = payment.journalEntryId
    ? await prisma.journalEntry.findUnique({
        where: { id: payment.journalEntryId },
        include: { lines: true },
      })
    : null
  if (!originalJournal)
    return NextResponse.json({ error: "Original journal entry not found." }, { status: 422 })

  const amount = Number(payment.amount)

  // Generate reversal payment number
  const prefix = payment.type === "receipt" ? "REC" : payment.type === "disbursement" ? "DIS" : "CNT"
  const year   = new Date().getFullYear()
  const count  = await prisma.payment.count({
    where: { companyId: ctx.company.id, type: payment.type, paymentNumber: { startsWith: `${prefix}-${year}-` } },
  })
  const reversalPaymentNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`

  // Generate reversal voucher number
  const vPrefix      = payment.type === "receipt" ? "REC" : payment.type === "disbursement" ? "DIS" : "CNT"
  const jCount       = await prisma.journalEntry.count({
    where: { companyId: ctx.company.id, voucherNumber: { startsWith: `${vPrefix}-${year}-` } },
  })
  const voucherNumber = `${vPrefix}-${year}-${String(jCount + 1).padStart(4, "0")}`

  const now = new Date()

  // Flip journal lines for reversal
  const flippedLines = originalJournal.lines.map((l) => ({
    accountId:   l.accountId,
    direction:   l.direction === "DEBIT" ? "CREDIT" as const : "DEBIT" as const,
    amount:      Number(l.amount),
    description: `REV: ${l.description}`,
    ...(l.partyType ? { partyType: l.partyType, partyId: l.partyId ?? undefined } : {}),
  }))

  const voucherType = payment.type === "receipt" ? "PAYMENT_RECEIPT" : "PAYMENT_DISBURSEMENT"

  // Unwind allocations — restore amountPaid / amountDue on invoices and bills
  const allocationUpdates: Prisma.PrismaPromise<unknown>[] = payment.allocations.flatMap((a) => {
    const ops: Prisma.PrismaPromise<unknown>[] = []
    if (a.invoiceId) {
      ops.push(
        prisma.salesInvoice.update({
          where: { id: a.invoiceId },
          data:  {
            amountPaid: { decrement: Number(a.amount) },
            amountDue:  { increment: Number(a.amount) },
          },
        }),
      )
    }
    if (a.billId) {
      ops.push(
        prisma.purchaseBill.update({
          where: { id: a.billId },
          data:  {
            amountPaid: { decrement: Number(a.amount) },
            amountDue:  { increment: Number(a.amount) },
          },
        }),
      )
    }
    return ops
  })

  const txOps: Prisma.PrismaPromise<unknown>[] = [
    prisma.journalEntry.create({
      data: {
        companyId:    ctx.company.id,
        voucherType,
        voucherNumber,
        date:         payDate,
        status:       "POSTED",
        description:  `REV: ${originalJournal.description}`,
        totalDebit:   amount,
        totalCredit:  amount,
        postedById:   ctx.userId,
        postedAt:     now,
        periodId:     openPeriod.id,
        sourceType:   "payment",
        createdById:  ctx.userId,
        lines: { create: flippedLines },
      },
    }),
    prisma.payment.create({
      data: {
        companyId:     ctx.company.id,
        paymentNumber: reversalPaymentNumber,
        type:          payment.type,
        customerId:    payment.customerId,
        vendorId:      payment.vendorId,
        date:          payDate,
        amount,
        currency:      payment.currency,
        bankAccountId: payment.bankAccountId,
        paymentMethod: payment.paymentMethod,
        reference:     payment.reference,
        status:        "POSTED",
        isReversal:    true,
        reversalOfId:  id,
        notes:         `Reversal of ${payment.paymentNumber}`,
        postedById:    ctx.userId,
        postedAt:      now,
        createdById:   ctx.userId,
      },
    }),
    prisma.payment.update({
      where: { id },
      data:  { status: "REVERSED" },
    }),
    prisma.paymentAllocation.deleteMany({ where: { paymentId: id } }),
    ...allocationUpdates,
  ]
  const txResults = await prisma.$transaction(txOps) as [{ id: string }, { id: string }, ...unknown[]]
  const reversalJournal  = txResults[0]
  const reversalPayment  = txResults[1]

  // Link reversal payment to its journal
  await prisma.payment.update({
    where: { id: reversalPayment.id },
    data:  { journalEntryId: reversalJournal.id },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "PAYMENT_REVERSED",
      resourceType: "payment",
      resourceId:   id,
      resourceName: payment.paymentNumber,
      amount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ ok: true, reversalPaymentId: reversalPayment.id })
}
