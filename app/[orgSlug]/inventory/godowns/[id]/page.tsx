import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { GodownForm } from "../../_components/master-forms"
import { updateGodown } from "../../actions"

export default async function EditGodownPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [godown, godowns] = await Promise.all([
    prisma.godown.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.godown.findMany({
      where: { companyId: ctx.company.id, isActive: true, NOT: { id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])
  if (!godown) notFound()

  return (
    <InventoryPageShell title="Edit Godown" description={godown.name}>
      <GodownForm orgSlug={orgSlug} godowns={godowns} godown={godown} action={updateGodown.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

