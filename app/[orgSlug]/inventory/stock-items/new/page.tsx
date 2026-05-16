import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockItemForm } from "../../_components/master-forms"
import { createStockItem } from "../../actions"

export default async function NewStockItemPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [groups, categories, units] = await Promise.all([
    prisma.stockGroup.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockCategory.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockUnit.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const missingSetup = groups.length === 0 || units.length === 0

  return (
    <InventoryPageShell title="New Stock Item" description="Create SKU, unit, barcode and valuation setup">
      {missingSetup ? (
        <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Stock item setup needs at least one group and one unit.</p>
          <div className="mt-3 flex gap-2">
            {groups.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-groups/new`}>Create group</Link> : null}
            {units.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-units/new`}>Create unit</Link> : null}
          </div>
        </div>
      ) : (
        <StockItemForm orgSlug={orgSlug} groups={groups} categories={categories} units={units} action={createStockItem.bind(null, orgSlug)} />
      )}
    </InventoryPageShell>
  )
}

