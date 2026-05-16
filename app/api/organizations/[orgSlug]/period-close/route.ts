import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Returns all fiscal years with their periods, each period enriched with blocker counts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const fiscalYears = await prisma.fiscalYear.findMany({
    where:   { companyId: ctx.company.id },
    include: { periods: { orderBy: { startDate: "asc" } } },
    orderBy: { startDate: "desc" },
  })

  return NextResponse.json(fiscalYears)
}
