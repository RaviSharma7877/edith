import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockUnitForm } from "../../_components/master-forms"
import { createStockUnit } from "../../actions"

export default async function NewStockUnitPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <InventoryPageShell title="New Stock Unit" description="Create a unit of measure">
      <StockUnitForm orgSlug={orgSlug} action={createStockUnit.bind(null, orgSlug)} />
    </InventoryPageShell>
  )
}

