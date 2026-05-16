"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Payment {
  id:            string
  paymentNumber: string
  type:          string
  date:          string
  amount:        string | number
  currency:      string
  status:        string
  paymentMethod: string | null
  reference:     string | null
  isReversal:    boolean
  customer:      { id: string; name: string } | null
  vendor:        { id: string; name: string } | null
  _count:        { allocations: number }
}

interface Pagination {
  page:  number
  pages: number
  total: number
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

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function PaymentsClient({
  orgSlug,
  initialPayments,
  initialPagination,
  customers,
  vendors,
}: {
  orgSlug:            string
  initialPayments:    Payment[]
  initialPagination:  Pagination
  customers:          { id: string; name: string }[]
  vendors:            { id: string; name: string }[]
}) {
  const router = useRouter()

  const [type,       setType]       = useState("")
  const [status,     setStatus]     = useState("")
  const [customerId, setCustomerId] = useState("")
  const [vendorId,   setVendorId]   = useState("")
  const [page,       setPage]       = useState(1)

  const [payments,   setPayments]   = useState(initialPayments)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading,    setLoading]    = useState(false)

  async function load(overrides: Record<string, unknown> = {}) {
    setLoading(true)
    const p = new URLSearchParams()
    if (overrides.type       ?? type)       p.set("type",       String(overrides.type       ?? type))
    if (overrides.status     ?? status)     p.set("status",     String(overrides.status     ?? status))
    if (overrides.customerId ?? customerId) p.set("customerId", String(overrides.customerId ?? customerId))
    if (overrides.vendorId   ?? vendorId)   p.set("vendorId",   String(overrides.vendorId   ?? vendorId))
    p.set("page", String(overrides.page ?? page))

    const res  = await fetch(`/api/organizations/${orgSlug}/payments?${p}`)
    const data = await res.json()
    setPayments(data.payments)
    setPagination(data.pagination)
    setLoading(false)
  }

  function handleType(v: string)       { setType(v);       setPage(1); load({ type: v,       page: 1 }) }
  function handleStatus(v: string)     { setStatus(v);     setPage(1); load({ status: v,     page: 1 }) }
  function handleCustomer(v: string)   { setCustomerId(v); setPage(1); load({ customerId: v, page: 1 }) }
  function handleVendor(v: string)     { setVendorId(v);   setPage(1); load({ vendorId: v,   page: 1 }) }
  function handlePage(p: number)       { setPage(p);                   load({ page: p       }) }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-1.5 text-sm text-[#37322F] focus:outline-none"
          value={type}
          onChange={(e) => handleType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="receipt">Receipt</option>
          <option value="disbursement">Disbursement</option>
          <option value="contra">Contra</option>
        </select>

        <select
          className="rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-1.5 text-sm text-[#37322F] focus:outline-none"
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["DRAFT","PENDING_APPROVAL","POSTED","REVERSED","VOID"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>

        {customers.length > 0 && (
          <select
            className="rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-1.5 text-sm text-[#37322F] focus:outline-none"
            value={customerId}
            onChange={(e) => handleCustomer(e.target.value)}
          >
            <option value="">All customers</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {vendors.length > 0 && (
          <select
            className="rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-1.5 text-sm text-[#37322F] focus:outline-none"
            value={vendorId}
            onChange={(e) => handleVendor(e.target.value)}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.9fr_1.2fr_0.9fr_1fr_0.7fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Number</span>
          <span>Type</span>
          <span>Counterparty</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">No payments found.</div>
        ) : (
          payments.map((p) => (
            <Link
              key={p.id}
              href={`/${orgSlug}/payments/${p.id}`}
              className="grid grid-cols-[1.4fr_0.9fr_1.2fr_0.9fr_1fr_0.7fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm hover:bg-[#F7F5F3] transition-colors"
            >
              <span className="flex items-center gap-1.5 font-mono text-xs font-medium text-[#37322F]">
                {p.paymentNumber}
                {p.isReversal && (
                  <span className="rounded bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700">REV</span>
                )}
              </span>
              <span className="text-xs text-[#605A57]">{TYPE_LABELS[p.type] ?? p.type}</span>
              <span className="truncate text-xs text-[#37322F]">
                {p.customer?.name ?? p.vendor?.name ?? "—"}
              </span>
              <span className="text-xs text-[#605A57]">{fmtDate(p.date)}</span>
              <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(p.amount)}</span>
              <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                {p.status.replace(/_/g, " ")}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#605A57]">
          <span>{pagination.total} total</span>
          <div className="flex gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePage(p)}
                className={`rounded px-2.5 py-1 ${p === pagination.page ? "bg-primary text-primary-foreground" : "hover:bg-[#F7F5F3]"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
