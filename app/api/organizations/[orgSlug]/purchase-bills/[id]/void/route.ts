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

  const bill = await prisma.purchaseBill.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { allocations: true },
  })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (bill.status === "VOID")
    return NextResponse.json({ error: "Bill is already void." }, { status: 422 })
  if (!["DRAFT", "POSTED"].includes(bill.status))
    return NextResponse.json({ error: "Only DRAFT or POSTED bills can be voided." }, { status: 422 })
  if (bill.allocations.length > 0)
    return NextResponse.json({ error: "Cannot void a bill with payment allocations." }, { status: 422 })

  await prisma.purchaseBill.update({ where: { id }, data: { status: "VOID" } })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "BILL_VOIDED",
      resourceType: "bill",
      resourceId:   id,
      resourceName: bill.billNumber,
    },
  })

  return NextResponse.json({ ok: true })
}
