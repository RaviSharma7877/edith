import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function StockItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const { search = "" } = await searchParams
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const items = await prisma.stockItem.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 100,
    include: {
      group: { select: { name: true, valuationMethod: true } },
      category: { select: { name: true } },
      primaryUnit: { select: { symbol: true } },
      _count: { select: { batches: true, serialNumbers: true } },
    },
  })

  type ItemRow = {
    id: string
    name: string
    code: string | null
    barcode: string | null
    reorderLevel: unknown
    isActive: boolean
    group: { name: string; valuationMethod: string }
    category: { name: string } | null
    primaryUnit: { symbol: string }
    _count: { batches: number; serialNumbers: number }
  }
  const typedItems = items as ItemRow[]

  return (
    <InventoryPageShell
      title="Stock Items"
      description="SKU, barcode, units, reorder levels and valuation methods"
      action={
        <Link href={`/${orgSlug}/inventory/stock-items/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          New stock item
        </Link>
      }
    >
      <div className="space-y-4">
        <form className="flex max-w-sm gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search item, code or barcode"
            className="h-9 flex-1 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm outline-none"
          />
          <button className="h-9 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F]">Search</button>
        </form>

        {items.length === 0 ? (
          <EmptyTable>No stock items found.</EmptyTable>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
            <div className="grid grid-cols-[1.8fr_1.2fr_1fr_1fr_1fr_0.8fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Item</span>
              <span>Group</span>
              <span>Category</span>
              <span>Unit</span>
              <span>Reorder</span>
              <span className="text-center">Status</span>
            </div>
            {typedItems.map((item) => (
              <Link key={item.id} href={`/${orgSlug}/inventory/stock-items/${item.id}`} className="grid grid-cols-[1.8fr_1.2fr_1fr_1fr_1fr_0.8fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#37322F]">{item.name}</p>
                  <p className="truncate text-xs text-[#605A57]">{item.code ?? item.barcode ?? "No code"}</p>
                </div>
                <span className="truncate text-[#605A57]">{item.group.name}</span>
                <span className="truncate text-[#605A57]">{item.category?.name ?? "-"}</span>
                <span className="text-[#605A57]">{item.primaryUnit.symbol}</span>
                <span className="font-mono text-xs text-[#37322F]">{item.reorderLevel ? Number(item.reorderLevel).toLocaleString("en-IN") : "-"}</span>
                <span className="text-center text-xs text-[#605A57]">{item.isActive ? "Active" : "Inactive"}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </InventoryPageShell>
  )
}
