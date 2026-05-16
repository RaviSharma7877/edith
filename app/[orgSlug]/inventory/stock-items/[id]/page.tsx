import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockItemForm } from "../../_components/master-forms"
import { deleteStockItem, updateStockItem } from "../../actions"

export default async function EditStockItemPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [item, groups, categories, units] = await Promise.all([
    prisma.stockItem.findFirst({ where: { id, companyId: ctx.company.id, deletedAt: null } }),
    prisma.stockGroup.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockCategory.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockUnit.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  if (!item) notFound()

  return (
    <InventoryPageShell title="Edit Stock Item" description={item.name}>
      <div className="space-y-6">
        <StockItemForm orgSlug={orgSlug} item={item} groups={groups} categories={categories} units={units} action={updateStockItem.bind(null, orgSlug, id)} />
        <form action={deleteStockItem.bind(null, orgSlug, id)} className="rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Danger zone</p>
          <p className="mt-1 text-sm text-[#605A57]">Soft-delete this stock item from active inventory master lists.</p>
          <button type="submit" className="mt-3 h-9 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700">
            Delete stock item
          </button>
        </form>
      </div>
    </InventoryPageShell>
  )
}

