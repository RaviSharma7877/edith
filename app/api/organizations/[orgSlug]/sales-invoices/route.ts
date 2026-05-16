import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

async function nextInvoiceNumber(companyId: string, isCreditNote: boolean): Promise<string> {
  const prefix = isCreditNote ? "CN" : "INV"
  const year   = new Date().getFullYear()
  const count  = await prisma.salesInvoice.count({
    where: { companyId, isCreditNote, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
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

  const url          = new URL(req.url)
  const status       = url.searchParams.get("status") ?? ""
  const customerId   = url.searchParams.get("customerId") ?? ""
  const isCreditNote = url.searchParams.get("isCreditNote")
  const page         = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit        = 20

  const where = {
    companyId: ctx.company.id,
    ...(status       ? { status: status as any }          : {}),
    ...(customerId   ? { customerId }                      : {}),
    ...(isCreditNote !== null && isCreditNote !== ""
      ? { isCreditNote: isCreditNote === "true" } : {}),
  }

  const [total, invoices] = await Promise.all([
    prisma.salesInvoice.count({ where }),
    prisma.salesInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, invoiceNumber: true, status: true, invoiceDate: true,
        dueDate: true, totalAmount: true, amountDue: true, amountPaid: true,
        isCreditNote: true, currency: true, createdAt: true,
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
  ])

  return NextResponse.json({ invoices, pagination: { page, pages: Math.ceil(total / limit), total } })
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
    customerId, invoiceDate, dueDate, lines = [], notes, terms,
    placeOfSupply, isCreditNote = false, creditNoteOfId,
  } = body

  if (!customerId)    return NextResponse.json({ error: "Customer is required." },       { status: 400 })
  if (!invoiceDate)   return NextResponse.json({ error: "Invoice date is required." },   { status: 400 })
  if (!lines.length)  return NextResponse.json({ error: "At least one line is required." }, { status: 400 })

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: ctx.company.id, deletedAt: null },
  })
  if (!customer)            return NextResponse.json({ error: "Customer not found."   }, { status: 404 })
  if (!customer.isActive)   return NextResponse.json({ error: "Customer is inactive." }, { status: 422 })

  // Compute totals from lines
  let subtotal = 0, taxAmount = 0
  for (const l of lines) {
    const qty  = parseFloat(l.quantity  ?? "1") || 0
    const rate = parseFloat(l.unitPrice ?? "0") || 0
    const disc = parseFloat(l.discountPct ?? "0") || 0
    const taxR = parseFloat(l.taxRate ?? "0") || 0
    const base = qty * rate * (1 - disc / 100)
    const tax  = base * (taxR / 100)
    subtotal += base
    taxAmount += tax
  }
  const totalAmount = subtotal + taxAmount

  const invoiceNumber = await nextInvoiceNumber(ctx.company.id, isCreditNote)

  const invoice = await prisma.salesInvoice.create({
    data: {
      companyId:    ctx.company.id,
      invoiceNumber,
      customerId,
      status:       "DRAFT",
      invoiceDate:  new Date(invoiceDate),
      dueDate:      dueDate ? new Date(dueDate) : null,
      subtotal,
      taxAmount,
      totalAmount,
      amountDue:    totalAmount,
      amountPaid:   0,
      notes:        notes   ?? null,
      terms:        terms   ?? null,
      placeOfSupply: placeOfSupply ?? null,
      isCreditNote,
      creditNoteOfId: creditNoteOfId ?? null,
      createdById:  ctx.userId,
      lines: {
        create: lines.map((l: any, idx: number) => {
          const qty  = parseFloat(l.quantity  ?? "1") || 0
          const rate = parseFloat(l.unitPrice ?? "0") || 0
          const disc = parseFloat(l.discountPct ?? "0") || 0
          const taxR = parseFloat(l.taxRate ?? "0") || 0
          const base = qty * rate * (1 - disc / 100)
          const tax  = base * (taxR / 100)
          return {
            lineNumber:  idx + 1,
            description: l.description ?? "",
            hsnCode:     l.hsnCode ?? null,
            quantity:    qty,
            unit:        l.unit ?? null,
            unitPrice:   rate,
            discountPct: disc || null,
            discountAmt: base - (qty * rate) || null,
            taxRate:     taxR || null,
            taxAmount:   tax,
            lineTotal:   base + tax,
            accountId:   l.accountId ?? null,
          }
        }),
      },
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "INVOICE_CREATED",
      resourceType: "invoice",
      resourceId:   invoice.id,
      resourceName: invoice.invoiceNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
