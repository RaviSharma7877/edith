import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../../../_components/phase5-ui"
import { deletePFEntry } from "../../../actions"

export default async function PFRunPage({ params }: { params: Promise<{ orgSlug: string; runId: string }> }) {
  const { orgSlug, runId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const run = await prisma.payrollRun.findFirst({ where: { id: runId, companyId: ctx.company.id } })
  if (!run) notFound()

  const entries = await prisma.pFRegister.findMany({
    where: { payrollRunId: runId },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true, uan: true } } },
    orderBy: { employee: { employeeCode: "asc" } },
  })

  const totalEmployeePF = entries.reduce((s, e) => s + Number(e.employeePfAmount), 0)
  const totalEmployerPF = entries.reduce((s, e) => s + Number(e.employerPfAmount), 0)

  return (
    <Phase5Shell
      title={`PF Register — ${run.runNumber}`}
      description={`Period ${run.period} · ${entries.length} employees`}
      action={
        <Link href={`/${orgSlug}/payroll/statutory/pf/${runId}/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          Add entry
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Employee PF Total</p>
            <p className="mt-2 text-2xl font-semibold text-[#37322F]">₹{totalEmployeePF.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-[#605A57]">12% of basic wage</p>
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Employer PF Total</p>
            <p className="mt-2 text-2xl font-semibold text-[#37322F]">₹{totalEmployerPF.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-[#605A57]">12% of basic wage</p>
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">Total PF Liability</p>
            <p className="mt-2 text-2xl font-semibold text-[#37322F]">₹{(totalEmployeePF + totalEmployerPF).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-[#605A57]">Employee + Employer</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState>No PF entries yet. Add entries for each employee.</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_0.6fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
              <span>Employee</span>
              <span>UAN</span>
              <span>Wage Base</span>
              <span>Employee PF</span>
              <span>Employer PF</span>
              <span></span>
            </div>
            {entries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_0.6fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
                <span>{entry.employee.firstName} {entry.employee.lastName ?? ""} <span className="text-xs text-[#605A57]">({entry.employee.employeeCode})</span></span>
                <span className="text-xs text-[#605A57]">{entry.employee.uan ?? "—"}</span>
                <span>₹{Number(entry.wageBase).toLocaleString("en-IN")}</span>
                <span>₹{Number(entry.employeePfAmount).toLocaleString("en-IN")}</span>
                <span>₹{Number(entry.employerPfAmount).toLocaleString("en-IN")}</span>
                <form action={deletePFEntry.bind(null, orgSlug, runId, entry.id)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline">Remove</button>
                </form>
              </div>
            ))}
            <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_0.6fr] gap-3 border-t border-[rgba(55,50,47,0.12)] bg-[#FAFAF9] px-4 py-3 text-sm font-semibold">
              <span className="text-[#37322F]">Total</span>
              <span></span>
              <span></span>
              <span>₹{totalEmployeePF.toLocaleString("en-IN")}</span>
              <span>₹{totalEmployerPF.toLocaleString("en-IN")}</span>
              <span></span>
            </div>
          </div>
        )}
      </div>
    </Phase5Shell>
  )
}
