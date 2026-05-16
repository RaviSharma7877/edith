import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../_components/phase5-ui"

export default async function PayrollRunsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const runs = await prisma.payrollRun.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })

  return (
    <Phase5Shell title="Payroll Runs" description="Monthly payroll processing and payout status" action={<Link href={`/${orgSlug}/payroll/runs/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New run</Link>}>
      {runs.length === 0 ? <EmptyState>No payroll runs yet.</EmptyState> : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            <span>Run</span><span>Period</span><span>Gross</span><span>Deductions</span><span>Net</span><span>Status</span>
          </div>
          {runs.map((run) => (
            <Link key={run.id} href={`/${orgSlug}/payroll/runs/${run.id}`} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{run.runNumber}</span>
              <span>{run.period}</span>
              <span>₹{Number(run.grossPay).toLocaleString("en-IN")}</span>
              <span>₹{Number(run.deductions).toLocaleString("en-IN")}</span>
              <span>₹{Number(run.netPay).toLocaleString("en-IN")}</span>
              <span>{run.status}</span>
            </Link>
          ))}
        </div>
      )}
    </Phase5Shell>
  )
}
