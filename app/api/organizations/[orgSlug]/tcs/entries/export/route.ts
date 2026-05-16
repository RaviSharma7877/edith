import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Returns Form 27EQ-ready JSON grouped by quarter
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url     = new URL(req.url)
  const quarter = url.searchParams.get("quarter")
  if (!quarter) return NextResponse.json({ error: "quarter is required" }, { status: 400 })

  const entries = await prisma.tCSEntry.findMany({
    where:   { companyId: ctx.company.id, quarterPeriod: quarter },
    include: { section: true },
    orderBy: { date: "asc" },
  })

  const tanReg = await prisma.taxRegistration.findFirst({
    where: { companyId: ctx.company.id, type: "TAN", isActive: true },
  })

  const rows = entries.map((e) => ({
    sectionCode:   e.section.section,
    baseAmount:    Number(e.baseAmount),
    tcsAmount:     Number(e.tcsAmount),
    date:          e.date.toISOString().slice(0, 10),
    challanNumber: e.challanNumber ?? "",
    status:        e.status,
  }))

  return NextResponse.json({
    form:         "27EQ",
    quarter,
    collectorPAN: ctx.company.panNumber ?? "",
    collectorTAN: tanReg?.number ?? "",
    collectorName: ctx.company.name,
    entries:       rows,
    totals: {
      baseAmount: rows.reduce((s, r) => s + r.baseAmount, 0),
      tcsAmount:  rows.reduce((s, r) => s + r.tcsAmount, 0),
    },
  })
}
