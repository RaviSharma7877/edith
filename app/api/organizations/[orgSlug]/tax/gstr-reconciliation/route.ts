import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url    = new URL(req.url)
  const period = url.searchParams.get("period") // "YYYY-MM"

  const runs = await prisma.gSTRReconciliationRun.findMany({
    where: {
      companyId: ctx.company.id,
      ...(period ? { period } : {}),
    },
    orderBy: { runAt: "desc" },
  })
  return NextResponse.json(runs)
}

// POST: upload portal GSTR-2B data and run matching
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
  const { period, type, portalEntries } = body  // portalEntries: {invoiceNumber, gstin, amount, tax}[]

  if (!period || !type || !Array.isArray(portalEntries))
    return NextResponse.json({ error: "period, type, and portalEntries are required" }, { status: 400 })

  // Fetch books data for the period
  const [year, month] = period.split("-").map(Number)
  const from = new Date(year, month - 1, 1)
  const to   = new Date(year, month, 0, 23, 59, 59, 999)

  const bills = await prisma.purchaseBill.findMany({
    where: {
      companyId: ctx.company.id,
      status:    "POSTED",
      billDate:  { gte: from, lte: to },
    },
    include: { vendor: { select: { gstin: true } } },
  })

  // Build books map keyed by billNumber
  const booksMap = new Map<string, { gstin: string | null; amount: number; tax: number }>()
  for (const b of bills) {
    booksMap.set(b.billNumber, {
      gstin:  b.vendor.gstin,
      amount: Number(b.totalAmount),
      tax:    Number(b.taxAmount),
    })
  }

  const lines: {
    invoiceNumber: string | null
    gstin: string | null
    bookAmount: number | null
    portalAmount: number | null
    bookTax: number | null
    portalTax: number | null
    status: string
  }[] = []

  const seenPortal = new Set<string>()

  for (const pe of portalEntries as { invoiceNumber: string; gstin: string; amount: number; tax: number }[]) {
    seenPortal.add(pe.invoiceNumber)
    const book = booksMap.get(pe.invoiceNumber)

    if (!book) {
      lines.push({ invoiceNumber: pe.invoiceNumber, gstin: pe.gstin, bookAmount: null, portalAmount: pe.amount, bookTax: null, portalTax: pe.tax, status: "missing_in_books" })
    } else {
      const amtMatch = Math.abs(book.amount - pe.amount) < 1
      const taxMatch = Math.abs(book.tax   - pe.tax)    < 0.5
      lines.push({
        invoiceNumber: pe.invoiceNumber,
        gstin:         pe.gstin,
        bookAmount:    book.amount,
        portalAmount:  pe.amount,
        bookTax:       book.tax,
        portalTax:     pe.tax,
        status:        amtMatch && taxMatch ? "matched" : "mismatched",
      })
    }
  }

  // Books invoices not in portal
  for (const [invNo, book] of booksMap.entries()) {
    if (!seenPortal.has(invNo)) {
      lines.push({ invoiceNumber: invNo, gstin: book.gstin, bookAmount: book.amount, portalAmount: null, bookTax: book.tax, portalTax: null, status: "missing_in_portal" })
    }
  }

  const matched    = lines.filter((l) => l.status === "matched").length
  const mismatched = lines.filter((l) => l.status === "mismatched").length
  const missing    = lines.filter((l) => l.status !== "matched" && l.status !== "mismatched").length

  const run = await prisma.gSTRReconciliationRun.create({
    data: {
      companyId:   ctx.company.id,
      period,
      type,
      status:      "completed",
      totalBooks:  booksMap.size,
      totalPortal: portalEntries.length,
      matched,
      mismatched,
      missing,
      lines: {
        create: lines.map((l) => ({
          invoiceNumber: l.invoiceNumber,
          gstin:         l.gstin,
          bookAmount:    l.bookAmount,
          portalAmount:  l.portalAmount,
          bookTax:       l.bookTax,
          portalTax:     l.portalTax,
          status:        l.status,
        })),
      },
    },
    include: { lines: true },
  })

  return NextResponse.json(run, { status: 201 })
}
