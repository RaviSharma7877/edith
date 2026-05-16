import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { GodownForm } from "../../_components/master-forms"
import { createGodown } from "../../actions"

export default async function NewGodownPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const godowns = await prisma.godown.findMany({
    where: { companyId: ctx.company.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <InventoryPageShell title="New Godown" description="Create a warehouse, store or sub-location">
      <GodownForm orgSlug={orgSlug} godowns={godowns} action={createGodown.bind(null, orgSlug)} />
    </InventoryPageShell>
  )
}

