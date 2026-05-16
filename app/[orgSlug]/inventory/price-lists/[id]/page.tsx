import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { PriceListForm } from "../../_components/master-forms"
import { updatePriceList } from "../../actions"

export default async function EditPriceListPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const priceList = await prisma.priceList.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!priceList) notFound()

  return (
    <InventoryPageShell title="Edit Price List" description={priceList.name}>
      <PriceListForm orgSlug={orgSlug} priceList={priceList} action={updatePriceList.bind(null, orgSlug, id)} />
    </InventoryPageShell>
  )
}

