import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../_components/phase5-ui"

export default async function EmployeesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const employees = await prisma.employee.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { employeeCode: "asc" } })

  return (
    <Phase5Shell title="Employees" description="Employee master with statutory and payroll setup" action={<Link href={`/${orgSlug}/payroll/employees/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New employee</Link>}>
      {employees.length === 0 ? <EmptyState>No employees yet.</EmptyState> : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
          <div className="grid grid-cols-[1fr_2fr_1.2fr_1.2fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            <span>Code</span><span>Name</span><span>Department</span><span>Designation</span><span>CTC</span><span>Status</span>
          </div>
          {employees.map((employee) => (
            <Link key={employee.id} href={`/${orgSlug}/payroll/employees/${employee.id}`} className="grid grid-cols-[1fr_2fr_1.2fr_1.2fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{employee.employeeCode}</span>
              <span>{employee.firstName} {employee.lastName}</span>
              <span>{employee.department ?? "-"}</span>
              <span>{employee.designation ?? "-"}</span>
              <span>₹{Number(employee.monthlyCtc).toLocaleString("en-IN")}</span>
              <span>{employee.status.replaceAll("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
    </Phase5Shell>
  )
}
