import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockGroupForm } from "../../_components/master-forms"
import { createStockGroup } from "../../actions"

export default async function NewStockGroupPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const groups = await prisma.stockGroup.findMany({
    where: { companyId: ctx.company.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <InventoryPageShell title="New Stock Group" description="Create an inventory group with a default valuation method">
      <StockGroupForm orgSlug={orgSlug} groups={groups} action={createStockGroup.bind(null, orgSlug)} />
    </InventoryPageShell>
  )
}

