import { createPayrollRun } from "../../actions"
import { PayrollRunForm, Phase5Shell } from "../../_components/phase5-ui"

export default async function NewPayrollRunPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <Phase5Shell title="New Payroll Run" description="Create a monthly payroll batch">
      <PayrollRunForm orgSlug={orgSlug} action={createPayrollRun.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
