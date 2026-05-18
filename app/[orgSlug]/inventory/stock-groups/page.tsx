import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function StockGroupsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const groups = await prisma.stockGroup.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { children: true, stockItems: true } },
    },
  })

  type GroupRow = {
    id: string
    name: string
    valuationMethod: string
    isActive: boolean
    parent: { name: string } | null
    _count: { children: number; stockItems: number }
  }
  const typedGroups = groups as GroupRow[]

  return (
    <InventoryPageShell
      title="Stock Groups"
      description="Hierarchical item groups with default valuation methods"
      action={<Link href={`/${orgSlug}/inventory/stock-groups/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New group</Link>}
    >
      {groups.length === 0 ? (
        <EmptyTable>No stock groups yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Name</span>
            <span>Parent</span>
            <span>Valuation</span>
            <span className="text-right">Items</span>
            <span className="text-center">Status</span>
          </div>
          {typedGroups.map((group) => (
            <Link key={group.id} href={`/${orgSlug}/inventory/stock-groups/${group.id}`} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{group.name}</span>
              <span className="text-[#605A57]">{group.parent?.name ?? "Root"}</span>
              <span className="text-[#605A57]">{group.valuationMethod}</span>
              <span className="text-right font-mono text-xs">{group._count.stockItems}</span>
              <span className="text-center text-xs text-[#605A57]">{group.isActive ? "Active" : "Inactive"}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}
