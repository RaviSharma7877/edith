"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Invoice = {
  id: string; invoiceNumber: string; status: string; invoiceDate: string
  dueDate: string | null; totalAmount: string; amountDue: string; amountPaid: string
  isCreditNote: boolean; currency: string; createdAt: string
  customer: { id: string; name: string; code: string | null }
  _count: { lines: number }
}

type Customer = { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  POSTED:           "bg-green-100 text-green-700",
  REVERSED:         "bg-purple-100 text-purple-700",
  VOID:             "bg-red-100 text-red-700",
}

const STATUSES = ["DRAFT", "PENDING_APPROVAL", "POSTED", "REVERSED", "VOID"]

function fmt(v: string | null | undefined) {
  if (!v) return "—"
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function InvoicesClient({
  orgSlug, invoices, page, pages, total,
  statusFilter, customerIdFilter, isCreditNoteFilter, customers,
}: {
  orgSlug: string
  invoices: Invoice[]
  page: number
  pages: number
  total: number
  statusFilter?: string
  customerIdFilter?: string
  isCreditNoteFilter?: string
  customers: Customer[]
}) {
  const router   = useRouter()
  const pathname = usePathname()

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    if (key !== "status"       && statusFilter)       params.set("status",       statusFilter)
    if (key !== "customerId"   && customerIdFilter)   params.set("customerId",   customerIdFilter)
    if (key !== "isCreditNote" && isCreditNoteFilter) params.set("isCreditNote", isCreditNoteFilter)
    if (value) params.set(key, value)
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  function goPage(p: number) {
    const params = new URLSearchParams()
    if (statusFilter)       params.set("status",       statusFilter)
    if (customerIdFilter)   params.set("customerId",   customerIdFilter)
    if (isCreditNoteFilter) params.set("isCreditNote", isCreditNoteFilter)
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(v) => applyFilter("status", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-44 bg-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={customerIdFilter ?? "all"}
          onValueChange={(v) => applyFilter("customerId", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-52 bg-white">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={isCreditNoteFilter ?? "all"}
          onValueChange={(v) => applyFilter("isCreditNote", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="false">Invoices</SelectItem>
            <SelectItem value="true">Credit notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
        <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Number</span>
          <span>Customer</span>
          <span>Date</span>
          <span>Due date</span>
          <span>Status</span>
          <span className="text-right">Total</span>
          <span className="text-right">Due</span>
        </div>

        {invoices.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">
            No invoices found.{" "}
            <Link href={`/${orgSlug}/sales-invoices/new`} className="underline">Create one.</Link>
          </div>
        )}

        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/${orgSlug}/sales-invoices/${inv.id}`}
            className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-medium text-[#37322F]">{inv.invoiceNumber}</span>
              {inv.isCreditNote && (
                <span className="rounded bg-orange-100 px-1 py-0.5 text-[9px] font-semibold text-orange-700">CN</span>
              )}
            </div>
            <div>
              <p className="font-medium text-[#37322F] truncate">{inv.customer.name}</p>
              {inv.customer.code && <p className="text-[10px] text-[#605A57]">{inv.customer.code}</p>}
            </div>
            <span className="text-xs text-[#605A57]">{fmtDate(inv.invoiceDate)}</span>
            <span className="text-xs text-[#605A57]">{fmtDate(inv.dueDate)}</span>
            <span>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                {inv.status.replace(/_/g, " ")}
              </span>
            </span>
            <span className="text-right font-mono text-xs text-[#37322F]">
              ₹{fmt(inv.totalAmount)}
            </span>
            <span className="text-right font-mono text-xs">
              {Number(inv.amountDue) > 0
                ? <span className="text-destructive">₹{fmt(inv.amountDue)}</span>
                : <span className="text-green-600">—</span>
              }
            </span>
          </Link>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#605A57]">
          <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1}    onClick={() => goPage(page - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
