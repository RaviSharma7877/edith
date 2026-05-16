import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { PaymentActions } from "./payment-actions"
import { AllocationsClient } from "./allocations-client"
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

const TYPE_LABELS: Record<string, string> = {
  receipt:      "Receipt",
  disbursement: "Disbursement",
  contra:       "Contra",
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cheque:        "Cheque",
  cash:          "Cash",
  upi:           "UPI",
  neft:          "NEFT",
  rtgs:          "RTGS",
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const payment = await prisma.payment.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      vendor:   { select: { id: true, name: true, code: true } },
      allocations: {
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          bill:    { select: { id: true, billNumber: true,   totalAmount: true } },
        },
      },
      reversalOf: { select: { id: true, paymentNumber: true } },
      reversals:  { select: { id: true, paymentNumber: true, status: true } },
    },
  })
  if (!payment) notFound()

  // Load open invoices/bills for allocation panel
  const [openInvoices, openBills] = await Promise.all([
    payment.type === "receipt"
      ? prisma.salesInvoice.findMany({
          where: {
            companyId:  ctx.company.id,
            customerId: payment.customerId ?? undefined,
            status:     "POSTED",
            amountDue:  { gt: 0 },
          },
          select: {
            id: true, invoiceNumber: true, invoiceDate: true,
            totalAmount: true, amountDue: true,
            customer: { select: { name: true } },
          },
          orderBy: { invoiceDate: "asc" },
          take: 20,
        })
      : Promise.resolve([]),
    payment.type === "disbursement"
      ? prisma.purchaseBill.findMany({
          where: {
            companyId: ctx.company.id,
            vendorId:  payment.vendorId ?? undefined,
            status:    "POSTED",
            amountDue: { gt: 0 },
          },
          select: {
            id: true, billNumber: true, billDate: true,
            totalAmount: true, amountDue: true,
            vendor: { select: { name: true } },
          },
          orderBy: { billDate: "asc" },
          take: 20,
        })
      : Promise.resolve([]),
  ])

  const amount = Number(payment.amount)

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/payments`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Payments
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="font-mono text-sm font-medium text-[#37322F]">{payment.paymentNumber}</span>
          {payment.isReversal && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">REVERSAL</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[payment.status] ?? "bg-gray-100 text-gray-700"}`}>
            {payment.status.replace(/_/g, " ")}
          </span>
          <PaymentActions
            orgSlug={orgSlug}
            paymentId={id}
            status={payment.status}
            isReversal={payment.isReversal}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">

          {/* Reversal banners */}
          {payment.reversalOf && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Reversal of{" "}
              <Link href={`/${orgSlug}/payments/${payment.reversalOf.id}`} className="font-medium underline">
                {payment.reversalOf.paymentNumber}
              </Link>
            </div>
          )}
          {payment.reversals.length > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Reversed by{" "}
              {payment.reversals.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <Link href={`/${orgSlug}/payments/${r.id}`} className="font-medium underline">
                    {r.paymentNumber}
                  </Link>
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[#605A57]">Type</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{TYPE_LABELS[payment.type] ?? payment.type}</p>
              </div>
              <div>
                <p className="text-xs text-[#605A57]">{payment.customer ? "Customer" : "Vendor"}</p>
                {payment.customer ? (
                  <Link href={`/${orgSlug}/customers/${payment.customer.id}`} className="mt-0.5 text-sm font-medium text-[#37322F] hover:underline block">
                    {payment.customer.name}
                  </Link>
                ) : payment.vendor ? (
                  <Link href={`/${orgSlug}/vendors/${payment.vendor.id}`} className="mt-0.5 text-sm font-medium text-[#37322F] hover:underline block">
                    {payment.vendor.name}
                  </Link>
                ) : (
                  <p className="mt-0.5 text-sm text-[#605A57]">—</p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#605A57]">Date</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{fmtDate(payment.date)}</p>
              </div>
              <div>
                <p className="text-xs text-[#605A57]">Amount</p>
                <p className="mt-0.5 text-sm font-semibold text-[#37322F]">₹{fmt(amount)}</p>
              </div>
              {payment.paymentMethod && (
                <div>
                  <p className="text-xs text-[#605A57]">Method</p>
                  <p className="mt-0.5 text-sm text-[#37322F]">{METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</p>
                </div>
              )}
              {payment.reference && (
                <div>
                  <p className="text-xs text-[#605A57]">Reference</p>
                  <p className="mt-0.5 font-mono text-sm text-[#37322F]">{payment.reference}</p>
                </div>
              )}
              {payment.journalEntryId && (
                <div>
                  <p className="text-xs text-[#605A57]">Journal entry</p>
                  <Link href={`/${orgSlug}/journals/${payment.journalEntryId}`} className="mt-0.5 text-sm font-medium text-primary hover:underline block">
                    View journal
                  </Link>
                </div>
              )}
              {payment.notes && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-xs text-[#605A57]">Notes</p>
                  <p className="mt-0.5 text-sm text-[#37322F] whitespace-pre-wrap">{payment.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Allocations */}
          <AllocationsClient
            orgSlug={orgSlug}
            paymentId={id}
            paymentType={payment.type}
            paymentStatus={payment.status}
            existingAllocations={payment.allocations as any}
            openInvoices={openInvoices as any}
            openBills={openBills as any}
          />

        </div>
      </div>
    </div>
  )
}
