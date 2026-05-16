import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { PriceListForm } from "../../_components/master-forms"
import { createPriceList } from "../../actions"

export default async function NewPriceListPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <InventoryPageShell title="New Price List" description="Create a price level shell; line grid comes next">
      <PriceListForm orgSlug={orgSlug} action={createPriceList.bind(null, orgSlug)} />
    </InventoryPageShell>
  )
}

