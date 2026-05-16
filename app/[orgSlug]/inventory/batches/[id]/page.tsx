import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { BatchForm } from "../../_components/master-forms"
import { updateBatch } from "../../actions"

export default async function EditBatchPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [batch, items] = await Promise.all([
    prisma.batch.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.stockItem.findMany({ where: { companyId: ctx.company.id, deletedAt: null, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  if (!batch) notFound()

  return (
    <InventoryPageShell title="Edit Batch" description={batch.batchNumber}>
      <BatchForm orgSlug={orgSlug} batch={batch} items={items} action={updateBatch.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

