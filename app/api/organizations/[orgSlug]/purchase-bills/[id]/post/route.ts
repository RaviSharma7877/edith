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

  const bill = await prisma.purchaseBill.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { lines: true, vendor: true },
  })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (bill.status !== "DRAFT" && bill.status !== "PENDING_APPROVAL")
    return NextResponse.json({ error: "Only DRAFT or PENDING_APPROVAL bills can be posted." }, { status: 422 })
  if (!bill.lines.length)
    return NextResponse.json({ error: "Bill has no lines." }, { status: 422 })

  // Verify open accounting period
  const billDate   = bill.billDate
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      fiscalYear: { companyId: ctx.company.id },
      startDate:  { lte: billDate },
      endDate:    { gte: billDate },
      status:     "OPEN",
    },
  })
  if (!openPeriod)
    return NextResponse.json({ error: "No open accounting period covers the bill date." }, { status: 422 })

  // Find AP account
  const apAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, subtype: "ACCOUNTS_PAYABLE", isActive: true, isPosting: true },
  })
  if (!apAccount)
    return NextResponse.json({ error: "No active Accounts Payable account found. Please set up your chart of accounts." }, { status: 422 })

  // Find default expense account
  const expenseAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, type: "EXPENSE", subtype: "OPERATING_EXPENSE", isActive: true, isPosting: true },
  })
  if (!expenseAccount)
    return NextResponse.json({ error: "No active Operating Expense account found." }, { status: 422 })

  // Find input tax account (optional)
  const taxAccount = await prisma.chartAccount.findFirst({
    where: { companyId: ctx.company.id, isTaxAccount: true, isActive: true, isPosting: true },
  })

  const totalAmount = Number(bill.totalAmount)
  const taxAmount   = Number(bill.taxAmount)
  const subtotal    = Number(bill.subtotal)

  // Build journal: DR Expense for subtotal, DR Tax Input for tax (if any), CR AP for total
  const journalLines: {
    accountId: string; direction: "DEBIT" | "CREDIT"; amount: number; description: string
    partyType: string; partyId: string
  }[] = []

  if (taxAmount > 0 && taxAccount) {
    journalLines.push({
      accountId: expenseAccount.id, direction: "DEBIT", amount: subtotal,
      description: `Expense – ${bill.billNumber}`,
      partyType: "vendor", partyId: bill.vendorId,
    })
    journalLines.push({
      accountId: taxAccount.id, direction: "DEBIT", amount: taxAmount,
      description: `Input Tax – ${bill.billNumber}`,
      partyType: "vendor", partyId: bill.vendorId,
    })
  } else {
    journalLines.push({
      accountId: expenseAccount.id, direction: "DEBIT", amount: totalAmount,
      description: `Expense – ${bill.billNumber}`,
      partyType: "vendor", partyId: bill.vendorId,
    })
  }

  journalLines.push({
    accountId: apAccount.id, direction: "CREDIT", amount: totalAmount,
    description: `AP – ${bill.billNumber}`,
    partyType: "vendor", partyId: bill.vendorId,
  })

  // Auto-generate voucher number
  const year  = new Date().getFullYear()
  const count = await prisma.journalEntry.count({
    where: { companyId: ctx.company.id, voucherNumber: { startsWith: `PB-${year}-` } },
  })
  const voucherNumber = `PB-${year}-${String(count + 1).padStart(4, "0")}`

  const now = new Date()
  const [journalEntry] = await prisma.$transaction([
    prisma.journalEntry.create({
      data: {
        companyId:    ctx.company.id,
        voucherType:  "PURCHASE_BILL",
        voucherNumber,
        date:         billDate,
        status:       "POSTED",
        description:  `Purchase bill ${bill.billNumber} – ${bill.vendor.name}`,
        totalDebit:   totalAmount,
        totalCredit:  totalAmount,
        postedById:   ctx.userId,
        postedAt:     now,
        periodId:     openPeriod.id,
        sourceType:   "bill",
        sourceId:     bill.id,
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
    prisma.purchaseBill.update({
      where: { id },
      data:  { status: "POSTED", postedById: ctx.userId, postedAt: now },
    }),
  ])

  await prisma.purchaseBill.update({ where: { id }, data: { journalEntryId: journalEntry.id } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "BILL_POSTED",
      resourceType: "bill",
      resourceId:   id,
      resourceName: bill.billNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ ok: true, journalEntryId: journalEntry.id })
}
