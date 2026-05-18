import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function StockCategoriesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const categories = await prisma.stockCategory.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  })
  type CategoryRow = {
    id: string
    name: string
    isActive: boolean
    _count: { items: number }
  }
  const typedCategories = categories as CategoryRow[]

  return (
    <InventoryPageShell title="Stock Categories" description="Optional cross-group item classification" action={<Link href={`/${orgSlug}/inventory/stock-categories/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New category</Link>}>
      {categories.length === 0 ? <EmptyTable>No stock categories yet.</EmptyTable> : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]"><span>Name</span><span className="text-right">Items</span><span className="text-center">Status</span></div>
          {typedCategories.map((category) => (
            <Link key={category.id} href={`/${orgSlug}/inventory/stock-categories/${category.id}`} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{category.name}</span><span className="text-right font-mono text-xs">{category._count.items}</span><span className="text-center text-xs text-[#605A57]">{category.isActive ? "Active" : "Inactive"}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}

