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

  const invoice = await prisma.salesInvoice.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { lines: true, customer: true },
  })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invoice.status !== "DRAFT" && invoice.status !== "PENDING_APPROVAL")
    return NextResponse.json({ error: "Only DRAFT or PENDING_APPROVAL invoices can be posted." }, { status: 422 })
  if (!invoice.lines.length)
    return NextResponse.json({ error: "Invoice has no lines." }, { status: 422 })

  // Verify period is open
  const invoiceDate = invoice.invoiceDate
  const openPeriod  = await prisma.accountingPeriod.findFirst({
    where: {
      fiscalYear: { companyId: ctx.company.id },
      startDate:  { lte: invoiceDate },
      endDate:    { gte: invoiceDate },
      status:     "OPEN",
    },
  })
  if (!openPeriod)
    return NextResponse.json({ error: "No open accounting period covers the invoice date." }, { status: 422 })

  // Find AR account (ACCOUNTS_RECEIVABLE subtype)
  const arAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, subtype: "ACCOUNTS_RECEIVABLE", isActive: true, isPosting: true },
  })
  if (!arAccount)
    return NextResponse.json({ error: "No active Accounts Receivable account found. Please set up your chart of accounts." }, { status: 422 })

  // Find default revenue account
  const revenueAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, type: "REVENUE", subtype: "OPERATING_REVENUE", isActive: true, isPosting: true },
  })
  if (!revenueAccount)
    return NextResponse.json({ error: "No active Operating Revenue account found." }, { status: 422 })

  // Find tax payable account (optional)
  const taxAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, isTaxAccount: true, isActive: true, isPosting: true },
  })

  const totalAmount = Number(invoice.totalAmount)
  const taxAmount   = Number(invoice.taxAmount)
  const subtotal    = Number(invoice.subtotal)

  // Build journal lines: DR AR for total, CR Revenue for subtotal, CR Tax for tax
  const journalLines: {
    accountId: string; direction: "DEBIT" | "CREDIT"; amount: number; description: string
    partyType: string; partyId: string
  }[] = []

  journalLines.push({
    accountId: arAccount.id, direction: "DEBIT", amount: totalAmount,
    description: `AR – ${invoice.invoiceNumber}`,
    partyType: "customer", partyId: invoice.customerId,
  })

  if (taxAmount > 0 && taxAccount) {
    journalLines.push({
      accountId: revenueAccount.id, direction: "CREDIT", amount: subtotal,
      description: `Revenue – ${invoice.invoiceNumber}`,
      partyType: "customer", partyId: invoice.customerId,
    })
    journalLines.push({
      accountId: taxAccount.id, direction: "CREDIT", amount: taxAmount,
      description: `Tax – ${invoice.invoiceNumber}`,
      partyType: "customer", partyId: invoice.customerId,
    })
  } else {
    journalLines.push({
      accountId: revenueAccount.id, direction: "CREDIT", amount: totalAmount,
      description: `Revenue – ${invoice.invoiceNumber}`,
      partyType: "customer", partyId: invoice.customerId,
    })
  }

  // Auto-generate voucher number for the journal
  const year  = new Date().getFullYear()
  const count = await prisma.journalEntry.count({
    where: { companyId: ctx.company.id, voucherNumber: { startsWith: `SI-${year}-` } },
  })
  const voucherNumber = `SI-${year}-${String(count + 1).padStart(4, "0")}`

  const now = new Date()
  const [journalEntry] = await prisma.$transaction([
    prisma.journalEntry.create({
      data: {
        companyId:    ctx.company.id,
        voucherType:  "SALES_INVOICE",
        voucherNumber,
        date:         invoiceDate,
        status:       "POSTED",
        description:  `Sales invoice ${invoice.invoiceNumber} – ${invoice.customer.name}`,
        totalDebit:   totalAmount,
        totalCredit:  totalAmount,
        postedById:   ctx.userId,
        postedAt:     now,
        periodId:     openPeriod.id,
        sourceType:   "invoice",
        sourceId:     invoice.id,
        createdById:  ctx.userId,
        lines: {
          create: journalLines.map((l) => ({
            accountId:   l.accountId,
            direction:   l.direction,
            amount:      l.amount,
            description: l.description,
            partyType:   l.partyType,
            partyId:     l.partyId,
          })),
        },
      },
    }),
    prisma.salesInvoice.update({
      where: { id },
      data:  { status: "POSTED", postedById: ctx.userId, postedAt: now },
    }),
  ])

  // Link journal to invoice
  await prisma.salesInvoice.update({ where: { id }, data: { journalEntryId: journalEntry.id } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "INVOICE_POSTED",
      resourceType: "invoice",
      resourceId:   id,
      resourceName: invoice.invoiceNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ ok: true, journalEntryId: journalEntry.id })
}
