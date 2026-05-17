import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../../_components/phase5-ui"
import { deletePayslipLine } from "../../actions"

export default async function PayslipRunPage({ params }: { params: Promise<{ orgSlug: string; runId: string }> }) {
  const { orgSlug, runId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const run = await prisma.payrollRun.findFirst({ where: { id: runId, companyId: ctx.company.id } })
  if (!run) notFound()

  const lines = await prisma.payslipLine.findMany({
    where: { payrollRunId: runId },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
    orderBy: [{ employee: { employeeCode: "asc" } }, { type: "asc" }, { component: "asc" }],
  })

  const earnings = lines.filter((l) => l.type === "earning")
  const deductions = lines.filter((l) => l.type === "deduction")
  const totalEarnings = earnings.reduce((s, l) => s + Number(l.amount), 0)
  const totalDeductions = deductions.reduce((s, l) => s + Number(l.amount), 0)

  return (
    <Phase5Shell
      title={`Payslip — ${run.runNumber}`}
      description={`Period ${run.period} · Status: ${run.status}`}
      action={
        <Link href={`/${orgSlug}/payroll/payslips/${runId}/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          Add line
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Total Earnings</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">₹{totalEarnings.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Total Deductions</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">₹{totalDeductions.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Net Pay</p>
            <p className="mt-2 text-2xl font-semibold text-[#37322F]">₹{Number(run.netPay).toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Lines table */}
        {lines.length === 0 ? (
          <EmptyState>No payslip lines yet. Add components like Basic, HRA, PF Deduction etc.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="grid grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr_0.6fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
              <span>Employee</span>
              <span>Component</span>
              <span>Type</span>
              <span>Taxable</span>
              <span>Amount</span>
              <span></span>
            </div>
            {lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr_0.6fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
                <span>{line.employee.firstName} {line.employee.lastName ?? ""} <span className="text-xs text-[#605A57]">({line.employee.employeeCode})</span></span>
                <span className="font-medium text-[#37322F]">{line.component}</span>
                <span className={line.type === "earning" ? "text-green-700" : "text-red-600"}>{line.type}</span>
                <span>{line.taxable ? "Yes" : "No"}</span>
                <span className={`font-medium ${line.type === "earning" ? "text-green-700" : "text-red-600"}`}>
                  {line.type === "deduction" ? "-" : ""}₹{Number(line.amount).toLocaleString("en-IN")}
                </span>
                <form action={deletePayslipLine.bind(null, orgSlug, runId, line.id)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline">Remove</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </Phase5Shell>
  )
}
