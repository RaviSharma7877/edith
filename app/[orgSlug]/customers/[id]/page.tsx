import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { CustomerEditClient } from "./customer-edit-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const customer = await prisma.customer.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      _count: { select: { salesInvoices: true, payments: true } },
      salesInvoices: {
        orderBy: { invoiceDate: "desc" },
        take: 10,
        select: {
          id: true, invoiceNumber: true, invoiceDate: true,
          status: true, totalAmount: true, amountDue: true, isCreditNote: true,
        },
      },
    },
  })
  if (!customer) notFound()

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }
  function fmt(v: { toNumber?: () => number } | string | number | null) {
    if (!v) return "—"
    const n = typeof v === "object" && v.toNumber ? v.toNumber() : Number(v)
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT:            "bg-gray-100 text-gray-700",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
    POSTED:           "bg-green-100 text-green-700",
    REVERSED:         "bg-purple-100 text-purple-700",
    CANCELLED:        "bg-red-100 text-red-700",
    VOID:             "bg-red-100 text-red-700",
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/customers`} className="text-sm text-[#605A57] hover:text-[#37322F]">← Customers</Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="font-medium text-sm text-[#37322F]">{customer.name}</span>
          {!customer.isActive && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">INACTIVE</span>
          )}
        </div>
        <Link href={`/${orgSlug}/sales-invoices/new?customerId=${customer.id}`}>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            + New invoice
          </span>
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">
          <CustomerEditClient orgSlug={orgSlug} customer={customer as any} />

          {/* Recent invoices */}
          {customer.salesInvoices.length > 0 && (
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
                <p className="text-sm font-semibold text-[#37322F]">Recent invoices</p>
                <Link href={`/${orgSlug}/sales-invoices?customerId=${customer.id}`} className="text-xs text-[#605A57] hover:underline">
                  View all
                </Link>
              </div>
              {customer.salesInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/${orgSlug}/sales-invoices/${inv.id}`}
                  className="flex items-center justify-between border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 hover:bg-[#FAFAF9] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#37322F]">{inv.invoiceNumber}</span>
                    {inv.isCreditNote && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">CN</span>
                    )}
                    <span className="text-xs text-[#605A57]">{fmtDate(inv.invoiceDate)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {inv.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-xs text-[#37322F]">₹{fmt(inv.totalAmount)}</span>
                    {Number(inv.amountDue) > 0 && (
                      <span className="text-[10px] text-destructive">due ₹{fmt(inv.amountDue)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
