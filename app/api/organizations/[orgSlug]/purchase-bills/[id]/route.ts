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

  const bill = await prisma.purchaseBill.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      vendor:      { select: { id: true, name: true, code: true, email: true, gstin: true, paymentTerms: true } },
      lines:       { orderBy: { lineNumber: "asc" } },
      attachments: { select: { id: true, name: true, mimeType: true, createdAt: true } },
      allocations: { select: { id: true, amount: true, discountAmount: true, paymentId: true } },
      debitNoteOf: { select: { id: true, billNumber: true } },
      debitNotes:  { select: { id: true, billNumber: true, status: true, totalAmount: true } },
    },
  })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(bill)
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

  const bill = await prisma.purchaseBill.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (bill.status !== "DRAFT")
    return NextResponse.json({ error: "Only DRAFT bills can be edited." }, { status: 422 })

  const body = await req.json()
  const { billDate, dueDate, notes, vendorBillRef, placeOfSupply, lines } = body

  const data: Record<string, unknown> = {}
  if (billDate)        data.billDate      = new Date(billDate)
  if (dueDate)         data.dueDate       = new Date(dueDate)
  if ("notes" in body) data.notes         = notes ?? null
  if (vendorBillRef !== undefined) data.vendorBillRef = vendorBillRef?.trim() || null
  if (placeOfSupply)   data.placeOfSupply = placeOfSupply

  if (lines && Array.isArray(lines)) {
    let subtotal = 0, taxAmount = 0
    type LineInput = { quantity?: string | number; unitPrice?: string | number; taxRate?: string | number; description?: string; hsnCode?: string | null; unit?: string | null; accountId?: string | null }
    const lineData = (lines as LineInput[]).map((l, idx: number) => {
      const qty  = parseFloat(String(l.quantity  ?? "1")) || 0
      const rate = parseFloat(String(l.unitPrice ?? "0")) || 0
      const taxR = parseFloat(String(l.taxRate   ?? "0")) || 0
      const base = qty * rate
      const tax  = base * (taxR / 100)
      subtotal  += base
      taxAmount += tax
      return {
        lineNumber: idx + 1, description: l.description ?? "", hsnCode: l.hsnCode ?? null,
        quantity: qty, unit: l.unit ?? null, unitPrice: rate,
        taxRate: taxR || null, taxAmount: tax, lineTotal: base + tax, accountId: l.accountId ?? null,
      }
    })
    const totalAmount = subtotal + taxAmount
    data.subtotal    = subtotal
    data.taxAmount   = taxAmount
    data.totalAmount = totalAmount
    data.amountDue   = totalAmount

    await prisma.$transaction([
      prisma.purchaseBillLine.deleteMany({ where: { billId: id } }),
      prisma.purchaseBill.update({
        where: { id },
        data:  { ...data, lines: { create: lineData } },
      }),
    ])
    return NextResponse.json({ ok: true })
  }

  const updated = await prisma.purchaseBill.update({ where: { id }, data })
  return NextResponse.json(updated)
}
