import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { BatchForm } from "../../_components/master-forms"
import { createBatch } from "../../actions"

export default async function NewBatchPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const items = await prisma.stockItem.findMany({
    where: { companyId: ctx.company.id, deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <InventoryPageShell title="New Batch" description="Create batch cost and expiry tracking">
      {items.length === 0 ? (
        <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Create a stock item before adding batches.</p>
          <Link className="mt-3 inline-flex rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-items/new`}>Create stock item</Link>
        </div>
      ) : (
        <BatchForm orgSlug={orgSlug} items={items} action={createBatch.bind(null, orgSlug)} />
      )}
    </InventoryPageShell>
  )
}

