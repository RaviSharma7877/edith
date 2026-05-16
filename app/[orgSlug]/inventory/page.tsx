import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Package, Boxes, Warehouse, Tags, ClipboardList, BarChart2 } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell, StatCard } from "./_components/inventory-page-shell"

const modules = [
  { title: "Stock Items", href: "stock-items", icon: Package, copy: "Maintain SKU, HSN, barcode, unit and valuation setup." },
  { title: "Stock Groups", href: "stock-groups", icon: Boxes, copy: "Organize items into valuation-aware group hierarchies." },
  { title: "Stock Units", href: "stock-units", icon: Tags, copy: "Manage units of measure such as Nos, Kg, Box and Litre." },
  { title: "Stock Categories", href: "stock-categories", icon: Tags, copy: "Classify items across groups for reporting and pricing." },
  { title: "Godowns", href: "godowns", icon: Warehouse, copy: "Track locations, stores, warehouses and sub-godowns." },
  { title: "Price Lists", href: "price-lists", icon: Tags, copy: "Prepare customer-facing price levels and quantity slabs." },
  { title: "Stock Vouchers", href: "stock-vouchers", icon: ClipboardList, copy: "Receive, deliver, transfer, adjust and verify stock." },
  { title: "Reports", href: "reports", icon: BarChart2, copy: "Open stock summary, ledger, valuation and reorder reports." },
]

export default async function InventoryDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const today = new Date()
  const expiresBy = new Date(today)
  expiresBy.setDate(expiresBy.getDate() + 30)

  const [items, groups, godowns, batches, vouchers, expiringBatches] = await Promise.all([
    prisma.stockItem.count({ where: { companyId: ctx.company.id, deletedAt: null } }),
    prisma.stockGroup.count({ where: { companyId: ctx.company.id, isActive: true } }),
    prisma.godown.count({ where: { companyId: ctx.company.id, isActive: true } }),
    prisma.batch.count({ where: { companyId: ctx.company.id, isActive: true } }),
    prisma.stockVoucher.count({ where: { companyId: ctx.company.id } }),
    prisma.batch.count({
      where: {
        companyId: ctx.company.id,
        isActive: true,
        expiryDate: {
          gte: today,
          lte: expiresBy,
        },
      },
    }),
  ])

  return (
    <InventoryPageShell title="Inventory" description="Stock master data, movement, valuation and reports">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Stock items" value={items} hint={`${groups} active groups`} />
          <StatCard label="Godowns" value={godowns} hint="Locations ready for stock movement" />
          <StatCard label="Batches" value={batches} hint={`${expiringBatches} expiring in 30 days`} />
          <StatCard label="Stock vouchers" value={vouchers} hint="Drafts, orders and posted movements" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={`/${orgSlug}/inventory/${module.href}`}
              className="group rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-5 transition hover:border-[#37322F]/30 hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F7F5F3] text-[#37322F]">
                  <module.icon className="size-5" />
                </div>
                <div>
                  <p className="font-semibold text-[#37322F]">{module.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#605A57]">{module.copy}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </InventoryPageShell>
  )
}
