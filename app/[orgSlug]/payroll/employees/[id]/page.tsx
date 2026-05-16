import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { deleteEmployee, updateEmployee } from "../../actions"
import { EmployeeForm, Phase5Shell } from "../../_components/phase5-ui"

export default async function EditEmployeePage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const employee = await prisma.employee.findFirst({ where: { id, companyId: ctx.company.id, deletedAt: null } })
  if (!employee) notFound()

  return (
    <Phase5Shell title="Edit Employee" description={`${employee.employeeCode} - ${employee.firstName}`}>
      <div className="space-y-5">
        <EmployeeForm orgSlug={orgSlug} employee={employee} action={updateEmployee.bind(null, orgSlug, id)} />
        <form action={deleteEmployee.bind(null, orgSlug, id)} className="max-w-5xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Delete employee</p>
          <p className="mt-1 text-sm text-[#605A57]">Soft-delete this employee from active payroll lists.</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Delete</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
