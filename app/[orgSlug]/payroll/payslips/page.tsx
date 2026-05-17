import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../_components/phase5-ui"

export default async function PayslipsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const runs = await prisma.payrollRun.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { payslipLines: true } } },
  })

  const statusBadge: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PROCESSED: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }

  return (
    <Phase5Shell title="Payslip Register" description="View payslip components broken down by employee per payroll run">
      {runs.length === 0 ? (
        <EmptyState>No payroll runs yet. Create a run first from Payroll Runs.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            <span>Run</span>
            <span>Period</span>
            <span>Net Pay</span>
            <span>Lines</span>
            <span>Status</span>
            <span></span>
          </div>
          {runs.map((run) => (
            <div key={run.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
              <span className="font-medium text-[#37322F]">{run.runNumber}</span>
              <span>{run.period}</span>
              <span>₹{Number(run.netPay).toLocaleString("en-IN")}</span>
              <span>{run._count.payslipLines} lines</span>
              <span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[run.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {run.status}
                </span>
              </span>
              <Link href={`/${orgSlug}/payroll/payslips/${run.id}`} className="text-xs font-medium text-primary hover:underline">
                View →
              </Link>
            </div>
          ))}
        </div>
      )}
    </Phase5Shell>
  )
}
