import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Derive state code from GSTIN (first 2 digits)
function gstinStateCode(gstin: string | null | undefined): string | null {
  if (!gstin || gstin.length < 2) return null
  return gstin.slice(0, 2)
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

  const url    = new URL(req.url)
  const period = url.searchParams.get("period") // "YYYY-MM"
  if (!period)  return NextResponse.json({ error: "period (YYYY-MM) is required." }, { status: 400 })

  const [year, month] = period.split("-").map(Number)
  const from = new Date(year, month - 1, 1)
  const to   = new Date(year, month, 0, 23, 59, 59, 999)

  // Company GSTIN for state code
  const companyReg = await prisma.taxRegistration.findFirst({
    where: { companyId: ctx.company.id, type: "GST", isActive: true },
    orderBy: { effectiveFrom: "desc" },
  })
  const sellerStateCode = companyReg ? companyReg.number.slice(0, 2) : null

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId: ctx.company.id,
      status:    "POSTED",
      invoiceDate: { gte: from, lte: to },
    },
    include: {
      customer: { select: { id: true, name: true, gstin: true } },
      lines:    true,
    },
    orderBy: { invoiceDate: "asc" },
  })

  // Separate into B2B (registered) and B2C (unregistered)
  interface B2BEntry { gstin: string; name: string; invoiceNumber: string; date: Date; taxable: number; cgst: number; sgst: number; igst: number; cess: number; total: number; reverseCharge: boolean; invoiceId: string }
  interface B2CEntry { placeOfSupply: string | null; taxable: number; cgst: number; sgst: number; igst: number; cess: number }
  interface CDNREntry { gstin: string; name: string; noteNumber: string; date: Date; taxable: number; cgst: number; sgst: number; igst: number; cess: number; invoiceId: string }
  interface HSNRow   { hsn: string; description: string; uqc: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number }

  const b2b:  B2BEntry[]  = []
  const b2cL: B2CEntry[]  = []  // large (interstate > 2.5L)
  const b2cS: B2CEntry[]  = []  // small
  const cdnr: CDNREntry[] = []
  const cdnur: CDNREntry[] = []
  const hsnMap = new Map<string, HSNRow>()

  for (const inv of invoices) {
    const taxable = Number(inv.subtotal)
    // Use per-line tax breakdown
    const linesCgst   = inv.lines.reduce((s, l) => s + Number((l as any).cgstRate  ? Number((l as any).cgstRate)  / 100 * Number(l.lineTotal) : 0), 0)
    const linesSgst   = inv.lines.reduce((s, l) => s + Number((l as any).sgstRate  ? Number((l as any).sgstRate)  / 100 * Number(l.lineTotal) : 0), 0)
    const linesIgst   = inv.lines.reduce((s, l) => s + Number((l as any).igstRate  ? Number((l as any).igstRate)  / 100 * Number(l.lineTotal) : 0), 0)
    const linesCess   = inv.lines.reduce((s, l) => s + Number((l as any).cessRate  ? Number((l as any).cessRate)  / 100 * Number(l.lineTotal) : 0), 0)

    // Fallback: if no line-level split, derive from taxAmount and placeOfSupply
    const totalTax = Number(inv.taxAmount)
    const pos      = inv.placeOfSupply
    const isInterstate = pos && sellerStateCode ? pos !== sellerStateCode : false

    const cgst = linesCgst || (!isInterstate ? totalTax / 2 : 0)
    const sgst = linesSgst || (!isInterstate ? totalTax / 2 : 0)
    const igst = linesIgst || (isInterstate  ? totalTax     : 0)
    const cess = linesCess

    const total = Number(inv.totalAmount)

    // B2B or B2C
    const custGstin = inv.customer.gstin
    if (custGstin) {
      if (inv.isCreditNote) {
        cdnr.push({ gstin: custGstin, name: inv.customer.name, noteNumber: inv.invoiceNumber, date: inv.invoiceDate, taxable, cgst, sgst, igst, cess, invoiceId: inv.id })
      } else {
        b2b.push({ gstin: custGstin, name: inv.customer.name, invoiceNumber: inv.invoiceNumber, date: inv.invoiceDate, taxable, cgst, sgst, igst, cess, total, reverseCharge: inv.reverseCharge, invoiceId: inv.id })
      }
    } else {
      // B2C
      if (inv.isCreditNote) {
        cdnur.push({ gstin: "", name: inv.customer.name, noteNumber: inv.invoiceNumber, date: inv.invoiceDate, taxable, cgst, sgst, igst, cess, invoiceId: inv.id })
      } else if (isInterstate && total > 250000) {
        // B2C Large
        const key = pos ?? "UN"
        const existing = b2cL.find((r) => r.placeOfSupply === key)
        if (existing) {
          existing.taxable += taxable; existing.igst += igst; existing.cess += cess
        } else {
          b2cL.push({ placeOfSupply: key, taxable, cgst: 0, sgst: 0, igst, cess })
        }
      } else {
        const existing = b2cS.find((r) => r.placeOfSupply === (pos ?? null))
        if (existing) {
          existing.taxable += taxable; existing.cgst += cgst; existing.sgst += sgst; existing.igst += igst; existing.cess += cess
        } else {
          b2cS.push({ placeOfSupply: pos ?? null, taxable, cgst, sgst, igst, cess })
        }
      }
    }

    // HSN summary
    for (const line of inv.lines) {
      const hsn = line.hsnCode ?? "MISC"
      const qty = Number(line.quantity)
      const lt  = Number(line.lineTotal)
      const lTaxable = Number((line as any).unitPrice) * qty * (1 - (Number((line as any).discountPct ?? 0)) / 100)
      const lTax = Number(line.taxAmount ?? 0)
      const lCgst = (line as any).cgstRate ? lTaxable * Number((line as any).cgstRate) / 100 : (!isInterstate ? lTax / 2 : 0)
      const lSgst = (line as any).sgstRate ? lTaxable * Number((line as any).sgstRate) / 100 : (!isInterstate ? lTax / 2 : 0)
      const lIgst = (line as any).igstRate ? lTaxable * Number((line as any).igstRate) / 100 : (isInterstate ? lTax : 0)
      const lCess = (line as any).cessRate ? lTaxable * Number((line as any).cessRate) / 100 : 0

      const existing = hsnMap.get(hsn)
      if (existing) {
        existing.qty += qty; existing.taxable += lTaxable; existing.cgst += lCgst; existing.sgst += lSgst; existing.igst += lIgst; existing.cess += lCess
      } else {
        hsnMap.set(hsn, { hsn, description: line.description, uqc: line.unit ?? "NOS", qty, taxable: lTaxable, cgst: lCgst, sgst: lSgst, igst: lIgst, cess: lCess })
      }
    }
  }

  // Totals
  const totalTaxable = b2b.reduce((s, r) => s + r.taxable, 0) + b2cL.reduce((s, r) => s + r.taxable, 0) + b2cS.reduce((s, r) => s + r.taxable, 0)
  const totalCgst    = b2b.reduce((s, r) => s + r.cgst, 0)   + b2cS.reduce((s, r) => s + r.cgst, 0)
  const totalSgst    = b2b.reduce((s, r) => s + r.sgst, 0)   + b2cS.reduce((s, r) => s + r.sgst, 0)
  const totalIgst    = b2b.reduce((s, r) => s + r.igst, 0)   + b2cL.reduce((s, r) => s + r.igst, 0)

  return NextResponse.json({
    period,
    sellerGstin:    companyReg?.number ?? null,
    sellerStateCode,
    b2b,
    b2cLarge:       b2cL,
    b2cSmall:       b2cS,
    cdnr,
    cdnur,
    hsnSummary:     Array.from(hsnMap.values()),
    totals:         { taxable: totalTaxable, cgst: totalCgst, sgst: totalSgst, igst: totalIgst },
  })
}
