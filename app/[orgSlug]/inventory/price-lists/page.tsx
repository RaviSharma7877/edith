import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

function fmtDate(date: Date | null) {
  return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"
}

export default async function PriceListsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const priceLists = await prisma.priceList.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { lines: true, customers: true } } },
  })

  type PriceListRow = {
    id: string
    name: string
    currency: string
    effectiveFrom: Date | null
    effectiveTo: Date | null
    isActive: boolean
    _count: { lines: number; customers: number }
  }
  const typedPriceLists = priceLists as PriceListRow[]

  return (
    <InventoryPageShell
      title="Price Lists"
      description="Customer price levels with item-wise slabs"
      action={<Link href={`/${orgSlug}/inventory/price-lists/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New price list</Link>}
    >
      {priceLists.length === 0 ? (
        <EmptyTable>No price lists yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Name</span>
            <span>Currency</span>
            <span>From</span>
            <span>To</span>
            <span className="text-right">Lines</span>
            <span className="text-center">Status</span>
          </div>
          {typedPriceLists.map((list) => (
            <Link key={list.id} href={`/${orgSlug}/inventory/price-lists/${list.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{list.name}</span>
              <span className="text-[#605A57]">{list.currency}</span>
              <span className="text-[#605A57]">{fmtDate(list.effectiveFrom)}</span>
              <span className="text-[#605A57]">{fmtDate(list.effectiveTo)}</span>
              <span className="text-right font-mono text-xs">{list._count.lines}</span>
              <span className="text-center text-xs text-[#605A57]">{list.isActive ? "Active" : "Inactive"}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}
