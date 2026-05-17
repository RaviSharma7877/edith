"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Entry = {
  id: string; voucherNumber: string; voucherType: string; date: string
  status: string; description: string | null; totalDebit: string; totalCredit: string
  isReversal: boolean; postedAt: string | null; createdAt: string
  configLabel: string | null
  _count: { lines: number }
}

type ConfigRef = { id: string; label: string }

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  POSTED:           "bg-green-100 text-green-700",
  REVERSED:         "bg-purple-100 text-purple-700",
  CANCELLED:        "bg-red-100 text-red-700",
  VOID:             "bg-red-100 text-red-700",
}

const STATUSES = ["DRAFT","PENDING_APPROVAL","POSTED","REVERSED","CANCELLED","VOID"]

function fmt(v: string) {
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function JournalsClient({
  orgSlug, entries, page, pages, total,
  statusFilter, configIdFilter, configs,
}: {
  orgSlug: string
  entries: Entry[]
  page: number
  pages: number
  total: number
  statusFilter?: string
  configIdFilter?: string
  configs: ConfigRef[]
}) {
  const router   = useRouter()
  const pathname = usePathname()

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    if (key !== "status"   && statusFilter)   params.set("status",   statusFilter)
    if (key !== "configId" && configIdFilter) params.set("configId", configIdFilter)
    if (value) params.set(key, value)
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  function goPage(p: number) {
    const params = new URLSearchParams()
    if (statusFilter)   params.set("status",   statusFilter)
    if (configIdFilter) params.set("configId", configIdFilter)
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3">
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
          value={configIdFilter ?? "all"}
          onValueChange={(v) => applyFilter("configId", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-52 bg-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {configs.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1fr_1.5fr_1fr_1fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Voucher</span>
          <span>Description</span>
          <span>Date</span>
          <span>Type</span>
          <span>Status</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
        </div>

        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">
            No journal entries found.{" "}
            <Link href={`/${orgSlug}/journals/new`} className="underline">
              Create one.
            </Link>
          </div>
        )}

        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/${orgSlug}/journals/${entry.id}`}
            className="grid grid-cols-[1fr_2fr_1fr_1.5fr_1fr_1fr_1fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9] transition-colors"
          >
            <span className="font-mono text-xs font-medium text-[#37322F]">
              {entry.voucherNumber}
              {entry.isReversal && <span className="ml-1 text-[10px] text-purple-500">REV</span>}
            </span>
            <span className="truncate text-[#605A57]">{entry.description ?? "—"}</span>
            <span className="text-xs text-[#605A57]">{fmtDate(entry.date)}</span>
            <span className="text-xs text-[#605A57]">
              {entry.configLabel ?? entry.voucherType.replace(/_/g, " ")}
            </span>
            <span>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-700"}`}>
                {entry.status.replace(/_/g, " ")}
              </span>
            </span>
            <span className="text-right font-mono text-xs text-[#37322F]">{fmt(entry.totalDebit)}</span>
            <span className="text-right font-mono text-xs text-[#37322F]">{fmt(entry.totalCredit)}</span>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#605A57]">
          <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1}  onClick={() => goPage(page - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
