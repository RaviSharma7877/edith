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
  if (!period)  return NextResponse.json({ error: "period (YYYY-MM) is required." }, { status: 400 })

  const [year, month] = period.split("-").map(Number)
  const from = new Date(year, month - 1, 1)
  const to   = new Date(year, month, 0, 23, 59, 59, 999)

  const companyReg = await prisma.taxRegistration.findFirst({
    where: { companyId: ctx.company.id, type: "GST", isActive: true },
    orderBy: { effectiveFrom: "desc" },
  })
  const sellerStateCode = companyReg ? companyReg.number.slice(0, 2) : null

  // Outward supplies (sales invoices posted in period)
  const salesInvoices = await prisma.salesInvoice.findMany({
    where: { companyId: ctx.company.id, status: "POSTED", invoiceDate: { gte: from, lte: to } },
    include: { customer: { select: { gstin: true } }, lines: true },
  })

  // Inward supplies (purchase bills posted in period) — for ITC
  const purchaseBills = await prisma.purchaseBill.findMany({
    where: { companyId: ctx.company.id, status: "POSTED", billDate: { gte: from, lte: to } },
    include: { vendor: { select: { gstin: true } } },
  })

  // ── 3.1 Outward taxable supplies ─────────────────────────────────────────

  let outTaxable = 0, outCgst = 0, outSgst = 0, outIgst = 0, outCess = 0
  let nilExemptTaxable = 0
  let rcTaxable = 0

  for (const inv of salesInvoices) {
    if (inv.reverseCharge) { rcTaxable += Number(inv.subtotal); continue }
    const taxable  = Number(inv.subtotal)
    const totalTax = Number(inv.taxAmount)
    const pos      = inv.placeOfSupply
    const isInterstate = pos && sellerStateCode ? pos !== sellerStateCode : false
    outTaxable += taxable
    if (totalTax === 0) { nilExemptTaxable += taxable; continue }
    if (isInterstate) outIgst += totalTax
    else { outCgst += totalTax / 2; outSgst += totalTax / 2 }
    const lCess = inv.lines.reduce((s, l) => s + ((l as any).cessRate ? Number((l as any).cessRate) / 100 * Number(l.lineTotal) : 0), 0)
    outCess += lCess
  }

  // ── 4. Eligible ITC ──────────────────────────────────────────────────────
  let itcCgst = 0, itcSgst = 0, itcIgst = 0, itcCess = 0

  for (const bill of purchaseBills) {
    const totalTax = Number(bill.taxAmount)
    if (!totalTax) continue
    const vendorGstin = bill.vendor.gstin
    if (!vendorGstin) continue  // can't claim ITC without supplier GSTIN

    // Determine if interstate based on vendor GSTIN state vs company state
    const vendorState = vendorGstin.slice(0, 2)
    const isInterstate = sellerStateCode ? vendorState !== sellerStateCode : false

    if (isInterstate) itcIgst += totalTax
    else { itcCgst += totalTax / 2; itcSgst += totalTax / 2 }
  }

  // ── 3.2 Interstate supplies ──────────────────────────────────────────────
  const interstateToUnreg = salesInvoices
    .filter((inv) => !inv.customer.gstin && inv.placeOfSupply && sellerStateCode && inv.placeOfSupply !== sellerStateCode)
    .reduce((s, inv) => s + Number(inv.subtotal), 0)

  // Net tax liability
  const netCgst = outCgst - itcCgst
  const netSgst = outSgst - itcSgst
  const netIgst = outIgst - itcIgst

  return NextResponse.json({
    period,
    sellerGstin: companyReg?.number ?? null,
    section31: {
      outwardTaxableSupplies:        { taxable: outTaxable - nilExemptTaxable - rcTaxable, cgst: outCgst, sgst: outSgst, igst: outIgst, cess: outCess },
      outwardTaxableReverseCharge:   { taxable: rcTaxable, cgst: 0, sgst: 0, igst: 0, cess: 0 },
      nilRatedExemptNonGst:          { taxable: nilExemptTaxable, cgst: 0, sgst: 0, igst: 0, cess: 0 },
    },
    section32: { interstateSuppliesUnregistered: interstateToUnreg },
    section4: {
      itcAvailable: { cgst: itcCgst, sgst: itcSgst, igst: itcIgst, cess: itcCess },
    },
    netTaxLiability: { cgst: Math.max(netCgst, 0), sgst: Math.max(netSgst, 0), igst: Math.max(netIgst, 0), cess: outCess - itcCess },
    totalInvoices:   salesInvoices.length,
    totalBills:      purchaseBills.length,
  })
}
