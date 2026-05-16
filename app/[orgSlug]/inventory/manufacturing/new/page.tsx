import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { ManufacturingJournalForm } from "../../_components/master-forms"
import { createManufacturingJournal } from "../../actions"

export default async function NewManufacturingJournalPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [boms, godowns, items, batches] = await Promise.all([
    prisma.billOfMaterials.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.godown.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockItem.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.batch.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { batchNumber: "asc" }, select: { id: true, batchNumber: true, stockItemId: true } }),
  ])

  const mappedBatches = batches.map(b => ({ id: b.id, name: b.batchNumber }))

  const missingSetup = boms.length === 0 || godowns.length === 0 || items.length === 0

  return (
    <InventoryPageShell title="New Production Journal" description="Record a manufacturing process and material consumption">
      {missingSetup ? (
        <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Manufacturing setup needs at least one BOM, one Godown, and Stock Items.</p>
          <div className="mt-3 flex gap-2">
            {boms.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/bom/new`}>Create BOM</Link> : null}
            {godowns.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/godowns/new`}>Create godown</Link> : null}
          </div>
        </div>
      ) : (
        <ManufacturingJournalForm orgSlug={orgSlug} boms={boms} godowns={godowns} items={items} batches={mappedBatches} action={createManufacturingJournal.bind(null, orgSlug)} />
      )}
    </InventoryPageShell>
  )
}
