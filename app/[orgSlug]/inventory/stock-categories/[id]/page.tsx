import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockCategoryForm } from "../../_components/master-forms"
import { updateStockCategory } from "../../actions"

export default async function EditStockCategoryPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const category = await prisma.stockCategory.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!category) notFound()
  return (
    <InventoryPageShell title="Edit Stock Category" description={category.name}>
      <StockCategoryForm orgSlug={orgSlug} category={category} action={updateStockCategory.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

