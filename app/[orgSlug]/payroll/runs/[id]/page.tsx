import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { deletePayrollRun, updatePayrollRun } from "../../actions"
import { PayrollRunForm, Phase5Shell } from "../../_components/phase5-ui"

export default async function EditPayrollRunPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const run = await prisma.payrollRun.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!run) notFound()

  return (
    <Phase5Shell title="Edit Payroll Run" description={run.runNumber}>
      <div className="space-y-5">
        <PayrollRunForm orgSlug={orgSlug} run={{ ...run, grossPay: run.grossPay?.toString() ?? null, deductions: run.deductions?.toString() ?? null, employerCost: run.employerCost?.toString() ?? null, netPay: run.netPay?.toString() ?? null }} action={updatePayrollRun.bind(null, orgSlug, id)} />
        <form action={deletePayrollRun.bind(null, orgSlug, id)} className="max-w-4xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Delete run</p>
          <p className="mt-1 text-sm text-[#605A57]">Remove this payroll run and its dependent register lines.</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Delete</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
