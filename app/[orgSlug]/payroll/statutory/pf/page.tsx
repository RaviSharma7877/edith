import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../../_components/phase5-ui"

export default async function PFRegisterPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pfRegisters: true } } },
  })

  type PFRunRow = { id: string; runNumber: string; period: string; status: string; _count: { pfRegisters: number } }
  const typedRuns = runs as PFRunRow[]

  return (
    <Phase5Shell title="PF Register" description="Provident Fund contribution register — view by payroll run">
      {runs.length === 0 ? (
        <EmptyState>No payroll runs yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            <span>Run / Period</span>
            <span>Employees</span>
            <span>Status</span>
            <span></span>
          </div>
          {typedRuns.map((run) => (
            <div key={run.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
              <span><span className="font-medium text-[#37322F]">{run.runNumber}</span> · {run.period}</span>
              <span>{run._count.pfRegisters} entries</span>
              <span>{run.status}</span>
              <Link href={`/${orgSlug}/payroll/statutory/pf/${run.id}`} className="text-xs font-medium text-primary hover:underline">
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </Phase5Shell>
  )
}
