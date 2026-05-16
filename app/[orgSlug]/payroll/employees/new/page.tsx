import { EmployeeForm, Phase5Shell } from "../../_components/phase5-ui"
import { createEmployee } from "../../actions"

export default async function NewEmployeePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <Phase5Shell title="New Employee" description="Create payroll master data">
      <EmployeeForm orgSlug={orgSlug} action={createEmployee.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
