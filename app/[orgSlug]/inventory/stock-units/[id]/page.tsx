import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockUnitForm } from "../../_components/master-forms"
import { updateStockUnit } from "../../actions"

export default async function EditStockUnitPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const unit = await prisma.stockUnit.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!unit) notFound()
  return (
    <InventoryPageShell title="Edit Stock Unit" description={unit.name}>
      <StockUnitForm orgSlug={orgSlug} unit={unit} action={updateStockUnit.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

