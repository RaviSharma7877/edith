import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockCategoryForm } from "../../_components/master-forms"
import { createStockCategory } from "../../actions"

export default async function NewStockCategoryPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  return (
    <InventoryPageShell title="New Stock Category" description="Create an optional item classification">
      <StockCategoryForm orgSlug={orgSlug} action={createStockCategory.bind(null, orgSlug)} />
    </InventoryPageShell>
  )
}

