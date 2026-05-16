import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// GET: list MSME vendors with outstanding bill age
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url = new URL(req.url)
  const onlyMsme = url.searchParams.get("msme") !== "false"

  const vendors = await prisma.vendor.findMany({
    where: {
      companyId: ctx.company.id,
      isActive:  true,
      ...(onlyMsme ? { isMSME: true } : {}),
    },
    include: {
      purchaseBills: {
        where:   { status: { in: ["POSTED", "DRAFT"] }, amountDue: { gt: 0 } },
        select:  { billDate: true, amountDue: true, billNumber: true },
        orderBy: { billDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const today = new Date()

  const result = vendors.map((v) => {
    const outstandingBills = v.purchaseBills.map((b) => {
      const ageDays = Math.floor((today.getTime() - new Date(b.billDate).getTime()) / 86_400_000)
      return {
        billNumber: b.billNumber,
        billDate:   b.billDate,
        amountDue:  Number(b.amountDue),
        ageDays,
        overdue45:  ageDays > 45,
      }
    })

    const totalDue    = outstandingBills.reduce((s, b) => s + b.amountDue, 0)
    const overdueAmt  = outstandingBills.filter((b) => b.overdue45).reduce((s, b) => s + b.amountDue, 0)

    return {
      id:          v.id,
      name:        v.name,
      pan:         v.pan,
      gstin:       v.gstin,
      isMSME:      v.isMSME,
      msmeRegNo:   v.msmeRegNo,
      msmeType:    v.msmeType,
      totalDue,
      overdueAmt,
      hasOverdue:  overdueAmt > 0,
      bills:       outstandingBills,
    }
  })

  return NextResponse.json(result)
}

// PATCH: tag/untag a vendor as MSME
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { vendorId, isMSME, msmeRegNo, msmeType } = body
  if (!vendorId) return NextResponse.json({ error: "vendorId is required" }, { status: 400 })

  const vendor = await prisma.vendor.update({
    where: { id: vendorId, companyId: ctx.company.id },
    data: {
      isMSME:   isMSME   ?? false,
      msmeRegNo: msmeRegNo ?? null,
      msmeType:  msmeType  ?? null,
    },
  })
  return NextResponse.json(vendor)
}
