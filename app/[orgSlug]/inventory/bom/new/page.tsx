import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { BomForm } from "../../_components/master-forms"
import { createBom } from "../../actions"

export default async function NewBOMPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [items, units] = await Promise.all([
    prisma.stockItem.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockUnit.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const missingSetup = items.length === 0 || units.length === 0

  return (
    <InventoryPageShell title="New Bill of Materials" description="Create a recipe for manufacturing finished goods">
      {missingSetup ? (
        <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">BOM setup needs at least one stock item and one unit.</p>
          <div className="mt-3 flex gap-2">
            {items.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-items/new`}>Create stock item</Link> : null}
            {units.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-units/new`}>Create unit</Link> : null}
          </div>
        </div>
      ) : (
        <BomForm orgSlug={orgSlug} items={items} units={units} action={createBom.bind(null, orgSlug)} />
      )}
    </InventoryPageShell>
  )
}
