import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function StockVouchersPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const vouchers = await prisma.stockVoucher.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { date: "desc" },
    take: 100,
    include: { _count: { select: { lines: true, ledgerRows: true } } },
  })

  type VoucherRow = {
    id: string
    voucherNumber: string
    voucherType: string
    date: Date
    status: string
    sourceType: string | null
    sourceId: string | null
    _count: { lines: number; ledgerRows: number }
  }
  const typedVouchers = vouchers as VoucherRow[]

  return (
    <InventoryPageShell
      title="Stock Vouchers"
      description="Receipts, deliveries, orders, transfers, rejections and physical verification"
      action={
        <Link href={`/${orgSlug}/inventory/stock-vouchers/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          New voucher
        </Link>
      }
    >
      {vouchers.length === 0 ? (
        <EmptyTable>No stock vouchers yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[1.4fr_1.3fr_1fr_1fr_1fr_2fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Voucher</span>
            <span>Type</span>
            <span>Date</span>
            <span>Status</span>
            <span className="text-right">Lines</span>
            <span>Source</span>
          </div>
          {typedVouchers.map((voucher) => (
            <div key={voucher.id} className="grid grid-cols-[1.4fr_1.3fr_1fr_1fr_1fr_2fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
              <span className="font-medium text-[#37322F]">{voucher.voucherNumber}</span>
              <span className="text-[#605A57]">{voucher.voucherType}</span>
              <span className="text-[#605A57]">{fmtDate(voucher.date)}</span>
              <span className="text-xs text-[#605A57]">{voucher.status}</span>
              <span className="text-right font-mono text-xs">{voucher._count.lines}</span>
              <span className="truncate text-[#605A57]">{voucher.sourceType ? `${voucher.sourceType}: ${voucher.sourceId}` : "-"}</span>
            </div>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}

