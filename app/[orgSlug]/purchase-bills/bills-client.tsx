"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Bill = {
  id: string; billNumber: string; vendorBillRef: string | null
  status: string; billDate: string; dueDate: string | null
  totalAmount: string; amountDue: string; isDebitNote: boolean; currency: string
  vendor: { id: string; name: string; code: string | null }
  _count: { lines: number }
}
type Vendor = { id: string; name: string }

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

export function BillsClient({
  orgSlug, bills, page, pages, total,
  statusFilter, vendorIdFilter, isDebitNoteFilter, vendors,
}: {
  orgSlug: string
  bills: Bill[]
  page: number
  pages: number
  total: number
  statusFilter?: string
  vendorIdFilter?: string
  isDebitNoteFilter?: string
  vendors: Vendor[]
}) {
  const router   = useRouter()
  const pathname = usePathname()

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    if (key !== "status"       && statusFilter)       params.set("status",       statusFilter)
    if (key !== "vendorId"     && vendorIdFilter)     params.set("vendorId",     vendorIdFilter)
    if (key !== "isDebitNote"  && isDebitNoteFilter)  params.set("isDebitNote",  isDebitNoteFilter)
    if (value) params.set(key, value)
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  function goPage(p: number) {
    const params = new URLSearchParams()
    if (statusFilter)      params.set("status",      statusFilter)
    if (vendorIdFilter)    params.set("vendorId",    vendorIdFilter)
    if (isDebitNoteFilter) params.set("isDebitNote", isDebitNoteFilter)
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(v) => applyFilter("status", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={vendorIdFilter ?? "all"}
          onValueChange={(v) => applyFilter("vendorId", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-52 bg-white"><SelectValue placeholder="All vendors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={isDebitNoteFilter ?? "all"}
          onValueChange={(v) => applyFilter("isDebitNote", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="false">Bills</SelectItem>
            <SelectItem value="true">Debit notes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
        <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Number</span>
          <span>Vendor</span>
          <span>Bill date</span>
          <span>Due date</span>
          <span>Status</span>
          <span className="text-right">Total</span>
          <span className="text-right">Due</span>
        </div>

        {bills.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">
            No bills found.{" "}
            <Link href={`/${orgSlug}/purchase-bills/new`} className="underline">Create one.</Link>
          </div>
        )}

        {bills.map((bill) => (
          <Link
            key={bill.id}
            href={`/${orgSlug}/purchase-bills/${bill.id}`}
            className="grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-medium text-[#37322F]">{bill.billNumber}</span>
              {bill.isDebitNote && (
                <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold text-blue-700">DN</span>
              )}
            </div>
            <div>
              <p className="font-medium text-[#37322F] truncate">{bill.vendor.name}</p>
              {bill.vendorBillRef && <p className="text-[10px] text-[#605A57]">{bill.vendorBillRef}</p>}
            </div>
            <span className="text-xs text-[#605A57]">{fmtDate(bill.billDate)}</span>
            <span className="text-xs text-[#605A57]">{fmtDate(bill.dueDate)}</span>
            <span>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[bill.status] ?? "bg-gray-100 text-gray-700"}`}>
                {bill.status.replace(/_/g, " ")}
              </span>
            </span>
            <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(bill.totalAmount)}</span>
            <span className="text-right font-mono text-xs">
              {Number(bill.amountDue) > 0
                ? <span className="text-destructive">₹{fmt(bill.amountDue)}</span>
                : <span className="text-green-600">—</span>}
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
