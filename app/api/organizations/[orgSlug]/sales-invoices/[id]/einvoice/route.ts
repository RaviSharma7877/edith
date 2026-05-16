import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"
import { createHash } from "crypto"

// Generates a deterministic IRN hash (sha256 of GSTIN+invoice+period+docType)
// In production this would call the NIC IRP API.
function generateIRN(gstin: string, invoiceNumber: string, invoiceDate: Date): string {
  const fy   = invoiceDate.getMonth() >= 3
    ? `${invoiceDate.getFullYear()}-${invoiceDate.getFullYear() + 1}`
    : `${invoiceDate.getFullYear() - 1}-${invoiceDate.getFullYear()}`
  const payload = `${gstin}|${invoiceNumber}|${fy}|INV`
  return createHash("sha256").update(payload).digest("hex").toUpperCase()
}

function generateQRPayload(irn: string, invoice: { invoiceNumber: string; totalAmount: unknown; invoiceDate: Date }, gstin: string): string {
  return JSON.stringify({
    IRN:    irn,
    DocNo:  invoice.invoiceNumber,
    DocDt:  invoice.invoiceDate.toISOString().split("T")[0],
    TotInvVal: Number(invoice.totalAmount),
    SellerGSTIN: gstin,
  })
}

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
    where: { id, companyId: ctx.company.id },
    include: { customer: { select: { gstin: true } } },
  })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invoice.status !== "POSTED")
    return NextResponse.json({ error: "Only POSTED invoices can have e-invoice generated." }, { status: 422 })
  if (invoice.eInvoiceStatus === "generated")
    return NextResponse.json({ error: "E-invoice already generated." }, { status: 409 })
  if (!invoice.customer.gstin)
    return NextResponse.json({ error: "Customer does not have a GSTIN — e-invoice is not applicable." }, { status: 422 })

  const companyReg = await prisma.taxRegistration.findFirst({
    where: { companyId: ctx.company.id, type: "GST", isActive: true },
    orderBy: { effectiveFrom: "desc" },
  })
  if (!companyReg)
    return NextResponse.json({ error: "Company does not have an active GST registration." }, { status: 422 })

  const irn     = generateIRN(companyReg.number, invoice.invoiceNumber, invoice.invoiceDate)
  const qrCode  = generateQRPayload(irn, invoice, companyReg.number)

  const updated = await prisma.salesInvoice.update({
    where: { id },
    data:  { eInvoiceStatus: "generated", irnNumber: irn, qrCode },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "EINVOICE_GENERATED",
      resourceType: "sales_invoice",
      resourceId:   id,
      resourceName: invoice.invoiceNumber,
    },
  })

  return NextResponse.json({ ok: true, irnNumber: irn, qrCode })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const invoice = await prisma.salesInvoice.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invoice.eInvoiceStatus !== "generated")
    return NextResponse.json({ error: "No active e-invoice to cancel." }, { status: 422 })

  await prisma.salesInvoice.update({
    where: { id },
    data:  { eInvoiceStatus: "cancelled" },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "EINVOICE_CANCELLED",
      resourceType: "sales_invoice",
      resourceId:   id,
      resourceName: invoice.invoiceNumber,
    },
  })

  return NextResponse.json({ ok: true })
}
