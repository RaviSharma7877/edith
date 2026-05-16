import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../../_components/inventory-page-shell"
import { StockVoucherForm } from "../../_components/master-forms"
import { createStockVoucher } from "../../actions"

export default async function NewStockVoucherPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [items, godowns, batches] = await Promise.all([
    prisma.stockItem.findMany({
      where: { companyId: ctx.company.id, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.godown.findMany({
      where: { companyId: ctx.company.id, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.batch.findMany({
      where: { companyId: ctx.company.id, isActive: true },
      orderBy: { batchNumber: "asc" },
      select: { id: true, batchNumber: true },
    }),
  ])

  const missingSetup = items.length === 0 || godowns.length === 0

  return (
    <InventoryPageShell title="New Stock Voucher" description="Create a draft stock movement or order voucher">
      {missingSetup ? (
        <div className="max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Stock vouchers need at least one stock item and one godown.</p>
          <div className="mt-3 flex gap-2">
            {items.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/stock-items/new`}>Create stock item</Link> : null}
            {godowns.length === 0 ? <Link className="rounded-md bg-white px-3 py-2 text-xs font-medium" href={`/${orgSlug}/inventory/godowns/new`}>Create godown</Link> : null}
          </div>
        </div>
      ) : (
        <StockVoucherForm
          orgSlug={orgSlug}
          items={items}
          godowns={godowns}
          batches={batches.map((batch) => ({ id: batch.id, name: batch.batchNumber }))}
          action={createStockVoucher.bind(null, orgSlug)}
        />
      )}
    </InventoryPageShell>
  )
}

