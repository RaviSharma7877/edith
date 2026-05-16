import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const invoice = await prisma.salesInvoice.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { allocations: true },
  })
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (invoice.status === "VOID")
    return NextResponse.json({ error: "Invoice is already void." }, { status: 422 })
  if (!["DRAFT", "POSTED"].includes(invoice.status))
    return NextResponse.json({ error: "Only DRAFT or POSTED invoices can be voided." }, { status: 422 })
  if (invoice.allocations.length > 0)
    return NextResponse.json({ error: "Cannot void an invoice with payment allocations." }, { status: 422 })

  await prisma.salesInvoice.update({ where: { id }, data: { status: "VOID" } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "INVOICE_VOIDED",
      resourceType: "invoice",
      resourceId:   id,
      resourceName: invoice.invoiceNumber,
    },
  })

  return NextResponse.json({ ok: true })
}
