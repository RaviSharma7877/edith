import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InvoiceActions } from "./invoice-actions"
import { SidebarTrigger } from "@/components/ui/sidebar"

function fmt(v: { toNumber?: () => number } | string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  const n = typeof v === "object" && v && "toNumber" in v ? (v as any).toNumber() : Number(v)
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  POSTED:           "bg-green-100 text-green-700",
  REVERSED:         "bg-purple-100 text-purple-700",
  VOID:             "bg-red-100 text-red-700",
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      customer:    { select: { id: true, name: true, code: true, email: true, gstin: true, creditDays: true } },
      lines:       { orderBy: { lineNumber: "asc" } },
      allocations: { select: { id: true, amount: true, discountAmount: true, paymentId: true } },
      creditNoteOf: { select: { id: true, invoiceNumber: true } },
      creditNotes:  { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
    },
  })
  if (!invoice) notFound()

  const subtotal    = Number(invoice.subtotal)
  const taxAmount   = Number(invoice.taxAmount)
  const totalAmount = Number(invoice.totalAmount)
  const amountPaid  = Number(invoice.amountPaid)
  const amountDue   = Number(invoice.amountDue)

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/sales-invoices`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Sales Invoices
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="font-mono text-sm font-medium text-[#37322F]">{invoice.invoiceNumber}</span>
          {invoice.isCreditNote && (
            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">CREDIT NOTE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[invoice.status] ?? "bg-gray-100 text-gray-700"}`}>
            {invoice.status.replace(/_/g, " ")}
          </span>
          <InvoiceActions
            orgSlug={orgSlug}
            invoiceId={id}
            status={invoice.status}
            isCreditNote={invoice.isCreditNote}
            eInvoiceStatus={(invoice as any).eInvoiceStatus ?? null}
            irnNumber={(invoice as any).irnNumber ?? null}
            eWayBillNumber={(invoice as any).eWayBillNumber ?? null}
            eWayBillExpiry={(invoice as any).eWayBillExpiry?.toISOString() ?? null}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">

          {/* Credit note banner */}
          {invoice.creditNoteOf && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Credit note for{" "}
              <Link href={`/${orgSlug}/sales-invoices/${invoice.creditNoteOf.id}`} className="font-medium underline">
                {invoice.creditNoteOf.invoiceNumber}
              </Link>
            </div>
          )}

          {invoice.creditNotes.length > 0 && (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              Credit notes:{" "}
              {invoice.creditNotes.map((cn, i) => (
                <span key={cn.id}>
                  {i > 0 && ", "}
                  <Link href={`/${orgSlug}/sales-invoices/${cn.id}`} className="font-medium underline">
                    {cn.invoiceNumber}
                  </Link>
                  {" "}
                  <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-medium ${STATUS_COLORS[cn.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {cn.status}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[#605A57]">Customer</p>
                <Link href={`/${orgSlug}/customers/${invoice.customer.id}`} className="mt-0.5 text-sm font-medium text-[#37322F] hover:underline block">
                  {invoice.customer.name}
                </Link>
                {invoice.customer.gstin && (
                  <p className="text-[10px] font-mono text-[#605A57]">{invoice.customer.gstin}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#605A57]">Invoice date</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{fmtDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs text-[#605A57]">Due date</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{fmtDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-[#605A57]">Place of supply</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{invoice.placeOfSupply ?? "—"}</p>
              </div>
              {invoice.notes && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs text-[#605A57]">Notes</p>
                  <p className="mt-0.5 text-sm text-[#37322F] whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs text-[#605A57]">Terms</p>
                  <p className="mt-0.5 text-sm text-[#37322F] whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="grid grid-cols-[2.5fr_0.7fr_0.7fr_0.8fr_0.7fr_0.8fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Description</span>
              <span>HSN</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Disc %</span>
              <span className="text-right">Tax %</span>
              <span className="text-right">Total</span>
            </div>

            {invoice.lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[2.5fr_0.7fr_0.7fr_0.8fr_0.7fr_0.8fr_1fr] items-start gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-[#37322F]">{line.description}</p>
                  {line.unit && <p className="text-[10px] text-[#605A57]">{line.unit}</p>}
                </div>
                <span className="font-mono text-xs text-[#605A57]">{line.hsnCode ?? "—"}</span>
                <span className="text-right font-mono text-xs text-[#37322F]">{fmt(line.quantity)}</span>
                <span className="text-right font-mono text-xs text-[#37322F]">{fmt(line.unitPrice)}</span>
                <span className="text-right font-mono text-xs text-[#605A57]">
                  {line.discountPct ? `${fmt(line.discountPct)}%` : "—"}
                </span>
                <span className="text-right font-mono text-xs text-[#605A57]">
                  {line.taxRate ? `${fmt(line.taxRate)}%` : "—"}
                </span>
                <span className="text-right font-mono text-sm font-medium text-[#37322F]">
                  ₹{fmt(line.lineTotal)}
                </span>
              </div>
            ))}

            {/* Summary */}
            <div className="flex justify-end border-t border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-3">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#605A57]">Subtotal</span>
                  <span className="font-mono text-[#37322F]">₹{fmt(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#605A57]">Tax</span>
                    <span className="font-mono text-[#37322F]">₹{fmt(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[rgba(55,50,47,0.10)] pt-1 font-semibold">
                  <span className="text-[#37322F]">Total</span>
                  <span className="font-mono text-[#37322F]">₹{fmt(totalAmount)}</span>
                </div>
                {amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#605A57]">Paid</span>
                      <span className="font-mono text-green-600">₹{fmt(amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[#37322F]">Balance due</span>
                      <span className={`font-mono ${amountDue > 0 ? "text-destructive" : "text-green-600"}`}>
                        ₹{fmt(amountDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment allocations */}
          {invoice.allocations.length > 0 && (
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
              <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
                <p className="text-sm font-semibold text-[#37322F]">Payment allocations</p>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
                <span>Payment ID</span>
                <span className="text-right">Allocated</span>
                <span className="text-right">Discount</span>
              </div>
              {invoice.allocations.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-[#605A57] truncate">{a.paymentId}</span>
                  <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(a.amount)}</span>
                  <span className="text-right font-mono text-xs text-[#605A57]">
                    {a.discountAmount ? `₹${fmt(a.discountAmount)}` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
