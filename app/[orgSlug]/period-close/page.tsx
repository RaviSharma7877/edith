import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { PeriodCloseClient } from "./period-close-client"

export default async function PeriodClosePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const fiscalYears = await prisma.fiscalYear.findMany({
    where:   { companyId: ctx.company.id },
    include: { periods: { orderBy: { startDate: "asc" } } },
    orderBy: { startDate: "desc" },
  })

  return (
    <PeriodCloseClient
      orgSlug={orgSlug}
      fiscalYears={fiscalYears.map((fy) => ({
        id:        fy.id,
        name:      fy.name,
        startDate: fy.startDate.toISOString(),
        endDate:   fy.endDate.toISOString(),
        isCurrent: fy.isCurrent,
        status:    fy.status,
        periods:   fy.periods.map((p) => ({
          id:        p.id,
          name:      p.name,
          startDate: p.startDate.toISOString(),
          endDate:   p.endDate.toISOString(),
          status:    p.status,
        })),
      }))}
    />
  )
}
