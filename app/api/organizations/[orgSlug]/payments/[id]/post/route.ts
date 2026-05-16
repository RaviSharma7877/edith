import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
  })
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (payment.status !== "DRAFT" && payment.status !== "PENDING_APPROVAL")
    return NextResponse.json({ error: "Only DRAFT or PENDING_APPROVAL payments can be posted." }, { status: 422 })

  // Verify open period
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

  // Resolve bank/cash account
  let bankChartAccountId: string
  if (payment.bankAccountId) {
    const ba = await prisma.bankAccount.findUnique({ where: { id: payment.bankAccountId } })
    if (!ba) return NextResponse.json({ error: "Bank account not found." }, { status: 422 })
    bankChartAccountId = ba.chartAccountId
  } else {
    const ba = await prisma.chartAccount.findFirst({
      where: { companyId: ctx.company.id, subtype: { in: ["BANK", "CASH"] as any }, isActive: true, isPosting: true },
    })
    if (!ba) return NextResponse.json({ error: "No active Bank or Cash account found." }, { status: 422 })
    bankChartAccountId = ba.id
  }

  const amount = Number(payment.amount)

  // Build journal lines
  type Line = { accountId: string; direction: "DEBIT" | "CREDIT"; amount: number; description: string; partyType?: string; partyId?: string }
  const lines: Line[] = []

  if (payment.type === "receipt") {
    // DR Bank/Cash, CR AR
    const arAccount = await prisma.chartAccount.findFirst({
      where: { companyId: ctx.company.id, subtype: "ACCOUNTS_RECEIVABLE", isActive: true, isPosting: true },
    })
    if (!arAccount) return NextResponse.json({ error: "No active Accounts Receivable account found." }, { status: 422 })

    lines.push({ accountId: bankChartAccountId, direction: "DEBIT",  amount, description: `Receipt – ${payment.paymentNumber}`, partyType: "customer", partyId: payment.customerId! })
    lines.push({ accountId: arAccount.id,        direction: "CREDIT", amount, description: `AR – ${payment.paymentNumber}`,      partyType: "customer", partyId: payment.customerId! })

  } else if (payment.type === "disbursement") {
    // DR AP, CR Bank/Cash
    const apAccount = await prisma.chartAccount.findFirst({
      where: { companyId: ctx.company.id, subtype: "ACCOUNTS_PAYABLE", isActive: true, isPosting: true },
    })
    if (!apAccount) return NextResponse.json({ error: "No active Accounts Payable account found." }, { status: 422 })

    lines.push({ accountId: apAccount.id,         direction: "DEBIT",  amount, description: `AP – ${payment.paymentNumber}`,       partyType: "vendor", partyId: payment.vendorId! })
    lines.push({ accountId: bankChartAccountId,   direction: "CREDIT", amount, description: `Disbursement – ${payment.paymentNumber}`, partyType: "vendor", partyId: payment.vendorId! })

  } else {
    // Contra — DR bank, CR bank (different accounts); simple single-sided entry for now
    lines.push({ accountId: bankChartAccountId, direction: "DEBIT",  amount, description: `Contra – ${payment.paymentNumber}` })
    lines.push({ accountId: bankChartAccountId, direction: "CREDIT", amount, description: `Contra – ${payment.paymentNumber}` })
  }

  const voucherType   = payment.type === "receipt" ? "PAYMENT_RECEIPT" : "PAYMENT_DISBURSEMENT"
  const year          = new Date().getFullYear()
  const prefix        = payment.type === "receipt" ? "REC" : payment.type === "disbursement" ? "DIS" : "CNT"
  const count         = await prisma.journalEntry.count({
    where: { companyId: ctx.company.id, voucherNumber: { startsWith: `${prefix}-${year}-` } },
  })
  const voucherNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`

  const now = new Date()
  const [journalEntry] = await prisma.$transaction([
    prisma.journalEntry.create({
      data: {
        companyId:    ctx.company.id,
        voucherType,
        voucherNumber,
        date:         payDate,
        status:       "POSTED",
        description:  `${payment.paymentNumber}${payment.reference ? ` – ${payment.reference}` : ""}`,
        totalDebit:   amount,
        totalCredit:  amount,
        postedById:   ctx.userId,
        postedAt:     now,
        periodId:     openPeriod.id,
        sourceType:   "payment",
        sourceId:     payment.id,
        createdById:  ctx.userId,
        lines: {
          create: lines.map((l) => ({
            accountId:   l.accountId,
            direction:   l.direction,
            amount:      l.amount,
            description: l.description,
            ...(l.partyType ? { partyType: l.partyType, partyId: l.partyId } : {}),
          })),
        },
      },
    }),
    prisma.payment.update({
      where: { id },
      data:  { status: "POSTED", postedById: ctx.userId, postedAt: now, journalEntryId: undefined },
    }),
  ])

  await prisma.payment.update({ where: { id }, data: { journalEntryId: journalEntry.id } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "PAYMENT_POSTED",
      resourceType: "payment",
      resourceId:   id,
      resourceName: payment.paymentNumber,
      amount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ ok: true, journalEntryId: journalEntry.id })
}
