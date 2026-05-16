import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockGroupForm } from "../../_components/master-forms"
import { updateStockGroup } from "../../actions"

export default async function EditStockGroupPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [group, groups] = await Promise.all([
    prisma.stockGroup.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.stockGroup.findMany({
      where: { companyId: ctx.company.id, isActive: true, NOT: { id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])
  if (!group) notFound()

  return (
    <InventoryPageShell title="Edit Stock Group" description={group.name}>
      <StockGroupForm orgSlug={orgSlug} groups={groups} group={group} action={updateStockGroup.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

