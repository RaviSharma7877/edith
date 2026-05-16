import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// EWB threshold: ₹50,000 for mandatory generation (consignment value)
const EWB_THRESHOLD = 50000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const invoice = await prisma.salesInvoice.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (invoice.status !== "POSTED")
    return NextResponse.json({ error: "Only POSTED invoices can have e-way bill generated." }, { status: 422 })
  if (invoice.eWayBillNumber)
    return NextResponse.json({ error: "E-way bill already generated." }, { status: 409 })

  const body = await req.json()
  const { transportMode, vehicleNo, transporter, distanceKm } = body

  const totalValue = Number(invoice.totalAmount)
  if (totalValue < EWB_THRESHOLD)
    return NextResponse.json({
      error: `E-way bill not required — consignment value ₹${totalValue.toLocaleString("en-IN")} is below ₹50,000 threshold.`,
    }, { status: 422 })

  // Generate EWB number (simulated — 12 digit)
  const ewbNumber = `EWB${Date.now().toString().slice(-9)}`

  // Validity: 1 day per 100 km (minimum 1 day), max 15 days
  const km       = Number(distanceKm ?? 100)
  const validDays = Math.min(Math.max(Math.ceil(km / 100), 1), 15)
  const expiry   = new Date()
  expiry.setDate(expiry.getDate() + validDays)

  const updated = await prisma.salesInvoice.update({
    where: { id },
    data:  {
      eWayBillNumber: ewbNumber,
      eWayBillExpiry: expiry,
    },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "EWAY_BILL_GENERATED",
      resourceType: "sales_invoice",
      resourceId:   id,
      resourceName: invoice.invoiceNumber,
    },
  })

  return NextResponse.json({
    ok:             true,
    eWayBillNumber: ewbNumber,
    expiry:         expiry.toISOString(),
    validDays,
    note:           "Simulated EWB. Connect to NIC API for production use.",
  })
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
  if (!invoice.eWayBillNumber)
    return NextResponse.json({ error: "No e-way bill to cancel." }, { status: 422 })

  if (invoice.eWayBillExpiry && new Date() > invoice.eWayBillExpiry)
    return NextResponse.json({ error: "E-way bill has already expired." }, { status: 422 })

  await prisma.salesInvoice.update({
    where: { id },
    data:  { eWayBillNumber: null, eWayBillExpiry: null },
  })

  return NextResponse.json({ ok: true })
}
