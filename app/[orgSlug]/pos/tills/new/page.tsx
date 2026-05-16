import { createPOSTill } from "../../../payroll/actions"
import { POSTillForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function NewPOSTillPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <Phase5Shell title="New POS Till" description="Create a retail billing counter">
      <POSTillForm orgSlug={orgSlug} action={createPOSTill.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
