import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function StockUnitsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const units = await prisma.stockUnit.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { primaryItems: true, altItems: true } } },
  })

  return (
    <InventoryPageShell
      title="Stock Units"
      description="Units of measure used by stock items"
      action={<Link href={`/${orgSlug}/inventory/stock-units/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New unit</Link>}
    >
      {units.length === 0 ? (
        <EmptyTable>No stock units yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Name</span><span>Symbol</span><span className="text-right">Decimals</span><span className="text-right">Items</span><span className="text-center">Status</span>
          </div>
          {units.map((unit) => (
            <Link key={unit.id} href={`/${orgSlug}/inventory/stock-units/${unit.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{unit.name}</span>
              <span className="text-[#605A57]">{unit.symbol}</span>
              <span className="text-right font-mono text-xs">{unit.decimalPlaces}</span>
              <span className="text-right font-mono text-xs">{unit._count.primaryItems + unit._count.altItems}</span>
              <span className="text-center text-xs text-[#605A57]">{unit.isActive ? "Active" : "Inactive"}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}

