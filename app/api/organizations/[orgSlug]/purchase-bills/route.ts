import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

async function nextBillNumber(companyId: string, isDebitNote: boolean): Promise<string> {
  const prefix = isDebitNote ? "DN" : "BILL"
  const year   = new Date().getFullYear()
  const count  = await prisma.purchaseBill.count({
    where: { companyId, isDebitNote, billNumber: { startsWith: `${prefix}-${year}-` } },
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

  const url         = new URL(req.url)
  const status      = url.searchParams.get("status")       ?? ""
  const vendorId    = url.searchParams.get("vendorId")     ?? ""
  const isDebitNote = url.searchParams.get("isDebitNote")  ?? ""
  const page        = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit       = 20

  const where = {
    companyId: ctx.company.id,
    ...(status      ? { status: status as any }                                    : {}),
    ...(vendorId    ? { vendorId }                                                 : {}),
    ...(isDebitNote ? { isDebitNote: isDebitNote === "true" }                      : {}),
  }

  const [total, bills] = await Promise.all([
    prisma.purchaseBill.count({ where }),
    prisma.purchaseBill.findMany({
      where,
      orderBy: { billDate: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, billNumber: true, vendorBillRef: true, status: true, billDate: true,
        dueDate: true, totalAmount: true, amountDue: true, amountPaid: true,
        isDebitNote: true, currency: true, createdAt: true,
        vendor: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
  ])

  return NextResponse.json({ bills, pagination: { page, pages: Math.ceil(total / limit), total } })
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
    vendorId, billDate, dueDate, vendorBillRef, lines = [],
    notes, placeOfSupply, isDebitNote = false, debitNoteOfId,
  } = body

  if (!vendorId)   return NextResponse.json({ error: "Vendor is required."         }, { status: 400 })
  if (!billDate)   return NextResponse.json({ error: "Bill date is required."      }, { status: 400 })
  if (!lines.length) return NextResponse.json({ error: "At least one line is required." }, { status: 400 })

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, companyId: ctx.company.id, deletedAt: null },
  })
  if (!vendor)          return NextResponse.json({ error: "Vendor not found."   }, { status: 404 })
  if (!vendor.isActive) return NextResponse.json({ error: "Vendor is inactive." }, { status: 422 })

  // Duplicate bill detection by vendor + vendorBillRef
  if (vendorBillRef?.trim()) {
    const dup = await prisma.purchaseBill.findFirst({
      where: { companyId: ctx.company.id, vendorId, vendorBillRef: vendorBillRef.trim(), status: { not: "VOID" } },
    })
    if (dup) return NextResponse.json({
      error: `A bill with vendor reference "${vendorBillRef}" already exists (${dup.billNumber}).`,
    }, { status: 409 })
  }

  let subtotal = 0, taxAmount = 0
  for (const l of lines) {
    const qty  = parseFloat(l.quantity  ?? "1") || 0
    const rate = parseFloat(l.unitPrice ?? "0") || 0
    const taxR = parseFloat(l.taxRate   ?? "0") || 0
    const base = qty * rate
    const tax  = base * (taxR / 100)
    subtotal  += base
    taxAmount += tax
  }
  const totalAmount = subtotal + taxAmount

  const billNumber = await nextBillNumber(ctx.company.id, isDebitNote)

  const bill = await prisma.purchaseBill.create({
    data: {
      companyId:    ctx.company.id,
      billNumber,
      vendorId,
      vendorBillRef: vendorBillRef?.trim() || null,
      status:       "DRAFT",
      billDate:     new Date(billDate),
      dueDate:      dueDate ? new Date(dueDate) : null,
      subtotal,
      taxAmount,
      totalAmount,
      amountDue:    totalAmount,
      amountPaid:   0,
      notes:        notes ?? null,
      placeOfSupply: placeOfSupply ?? null,
      isDebitNote,
      debitNoteOfId: debitNoteOfId ?? null,
      createdById:  ctx.userId,
      lines: {
        create: lines.map((l: any, idx: number) => {
          const qty  = parseFloat(l.quantity  ?? "1") || 0
          const rate = parseFloat(l.unitPrice ?? "0") || 0
          const taxR = parseFloat(l.taxRate   ?? "0") || 0
          const base = qty * rate
          const tax  = base * (taxR / 100)
          return {
            lineNumber:  idx + 1,
            description: l.description ?? "",
            hsnCode:     l.hsnCode ?? null,
            quantity:    qty,
            unit:        l.unit ?? null,
            unitPrice:   rate,
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
      action:       "BILL_CREATED",
      resourceType: "bill",
      resourceId:   bill.id,
      resourceName: bill.billNumber,
      amount:       totalAmount,
      currency:     "INR",
    },
  })

  return NextResponse.json(bill, { status: 201 })
}
