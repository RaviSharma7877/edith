import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

  const bill = await prisma.purchaseBill.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { lines: true },
  })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (bill.status !== "POSTED")
    return NextResponse.json({ error: "Debit notes can only be raised against POSTED bills." }, { status: 422 })
  if (bill.isDebitNote)
    return NextResponse.json({ error: "Cannot raise a debit note against another debit note." }, { status: 422 })

  const { reason, lines: customLines } = await req.json()

  const sourceLines = (customLines?.length ? customLines : bill.lines) as {
    description: string; hsnCode: string | null; quantity: number
    unit: string | null; unitPrice: number; taxRate: number | null; accountId: string | null
  }[]

  let subtotal = 0, taxAmount = 0
  const dnLines = sourceLines.map((l, idx) => {
    const qty  = Number(l.quantity  ?? 1)
    const rate = Number(l.unitPrice ?? 0)
    const taxR = Number(l.taxRate   ?? 0)
    const base = qty * rate
    const tax  = base * (taxR / 100)
    subtotal  += base
    taxAmount += tax
    return {
      lineNumber: idx + 1, description: l.description,
      hsnCode: l.hsnCode ?? null, quantity: qty, unit: l.unit ?? null,
      unitPrice: rate, taxRate: taxR || null, taxAmount: tax,
      lineTotal: base + tax, accountId: l.accountId ?? null,
    }
  })
  const totalAmount = subtotal + taxAmount

  const year  = new Date().getFullYear()
  const count = await prisma.purchaseBill.count({
    where: { companyId: ctx.company.id, isDebitNote: true, billNumber: { startsWith: `DN-${year}-` } },
  })
  const dnNumber = `DN-${year}-${String(count + 1).padStart(4, "0")}`

  const debitNote = await prisma.purchaseBill.create({
    data: {
      companyId:    ctx.company.id,
      billNumber:   dnNumber,
      vendorId:     bill.vendorId,
      status:       "DRAFT",
      billDate:     new Date(),
      subtotal,
      taxAmount,
      totalAmount,
      amountDue:    totalAmount,
      amountPaid:   0,
      isDebitNote:  true,
      debitNoteOfId: bill.id,
      notes:        reason ?? `Debit note for ${bill.billNumber}`,
      createdById:  ctx.userId,
      lines:        { create: dnLines },
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "DEBIT_NOTE_CREATED",
      resourceType: "bill",
      resourceId:   debitNote.id,
      resourceName: debitNote.billNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ id: debitNote.id, billNumber: debitNote.billNumber }, { status: 201 })
}
