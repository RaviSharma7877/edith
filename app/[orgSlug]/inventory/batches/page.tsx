import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"
}

export default async function BatchesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const batches = await prisma.batch.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ expiryDate: "asc" }, { batchNumber: "asc" }],
    take: 100,
    include: { stockItem: { select: { name: true, code: true, primaryUnit: { select: { symbol: true } } } } },
  })

  return (
    <InventoryPageShell
      title="Batches"
      description="Batch cost, expiry and current quantity tracking"
      action={<Link href={`/${orgSlug}/inventory/batches/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New batch</Link>}
    >
      {batches.length === 0 ? (
        <EmptyTable>No batches yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[1.4fr_2fr_1fr_1fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Batch</span>
            <span>Item</span>
            <span>Mfg date</span>
            <span>Expiry</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Cost</span>
          </div>
          {batches.map((batch) => (
            <Link key={batch.id} href={`/${orgSlug}/inventory/batches/${batch.id}`} className="grid grid-cols-[1.4fr_2fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
              <span className="font-medium text-[#37322F]">{batch.batchNumber}</span>
              <span className="truncate text-[#605A57]">{batch.stockItem.name}</span>
              <span className="text-[#605A57]">{formatDate(batch.mfgDate)}</span>
              <span className="text-[#605A57]">{formatDate(batch.expiryDate)}</span>
              <span className="text-right font-mono text-xs">{Number(batch.currentQty).toLocaleString("en-IN")} {batch.stockItem.primaryUnit.symbol}</span>
              <span className="text-right font-mono text-xs">{Number(batch.costPrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}
