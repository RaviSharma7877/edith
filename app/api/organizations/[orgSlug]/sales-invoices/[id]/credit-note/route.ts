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

  const invoice = await prisma.salesInvoice.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { lines: true },
  })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invoice.status !== "POSTED")
    return NextResponse.json({ error: "Credit notes can only be raised against POSTED invoices." }, { status: 422 })
  if (invoice.isCreditNote)
    return NextResponse.json({ error: "Cannot raise a credit note against another credit note." }, { status: 422 })

  const { reason, lines: customLines } = await req.json()

  // Use original lines if no custom lines provided
  const sourceLines = (customLines?.length ? customLines : invoice.lines) as {
    description: string; hsnCode: string | null; quantity: number
    unit: string | null; unitPrice: number; discountPct: number | null
    taxRate: number | null; accountId: string | null
  }[]

  let subtotal = 0, taxAmount = 0
  const cnLines = sourceLines.map((l, idx) => {
    const qty  = Number(l.quantity  ?? 1)
    const rate = Number(l.unitPrice ?? 0)
    const disc = Number(l.discountPct ?? 0)
    const taxR = Number(l.taxRate ?? 0)
    const base = qty * rate * (1 - disc / 100)
    const tax  = base * (taxR / 100)
    subtotal  += base
    taxAmount += tax
    return {
      lineNumber: idx + 1, description: l.description,
      hsnCode: l.hsnCode ?? null, quantity: qty, unit: l.unit ?? null,
      unitPrice: rate, discountPct: disc || null, taxRate: taxR || null,
      taxAmount: tax, lineTotal: base + tax, accountId: l.accountId ?? null,
    }
  })
  const totalAmount = subtotal + taxAmount

  const year  = new Date().getFullYear()
  const count = await prisma.salesInvoice.count({
    where: { companyId: ctx.company.id, isCreditNote: true, invoiceNumber: { startsWith: `CN-${year}-` } },
  })
  const cnNumber = `CN-${year}-${String(count + 1).padStart(4, "0")}`

  const creditNote = await prisma.salesInvoice.create({
    data: {
      companyId:    ctx.company.id,
      invoiceNumber: cnNumber,
      customerId:   invoice.customerId,
      status:       "DRAFT",
      invoiceDate:  new Date(),
      subtotal,
      taxAmount,
      totalAmount,
      amountDue:    totalAmount,
      amountPaid:   0,
      isCreditNote: true,
      creditNoteOfId: invoice.id,
      notes:        reason ?? `Credit note for ${invoice.invoiceNumber}`,
      createdById:  ctx.userId,
      lines:        { create: cnLines },
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "CREDIT_NOTE_CREATED",
      resourceType: "invoice",
      resourceId:   creditNote.id,
      resourceName: creditNote.invoiceNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json({ id: creditNote.id, invoiceNumber: creditNote.invoiceNumber }, { status: 201 })
}
