import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmployeeForm, Phase5Shell } from "../../_components/phase5-ui"
import { createEmployee } from "../../actions"

export default async function NewEmployeePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  return (
    <Phase5Shell title="New Employee" description="Create payroll master data">
      <EmployeeForm orgSlug={orgSlug} action={createEmployee.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
