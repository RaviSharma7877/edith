import { createFixedAsset } from "../../payroll/actions"
import { FixedAssetForm, Phase5Shell } from "../../payroll/_components/phase5-ui"

export default async function NewFixedAssetPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <Phase5Shell title="New Fixed Asset" description="Create asset register entry">
      <FixedAssetForm orgSlug={orgSlug} action={createFixedAsset.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
