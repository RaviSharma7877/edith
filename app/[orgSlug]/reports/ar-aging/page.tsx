"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react"

interface InvoiceRow {
  id: string; invoiceNumber: string; invoiceDate: string
  dueDate: string | null; amountDue: number; daysOverdue: number; bucket: string
}
interface CustomerRow {
  customerId: string; customerName: string; customerCode: string | null
  current: number; "1_30": number; "31_60": number; "61_90": number; over_90: number
  total: number; invoices: InvoiceRow[]
}
interface ARData {
  asOf: string
  rows: CustomerRow[]
  summary: { current: number; "1_30": number; "31_60": number; "61_90": number; over_90: number; total: number }
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const BUCKET_LABELS = ["Current", "1–30 days", "31–60 days", "61–90 days", "Over 90 days"]
const BUCKET_KEYS   = ["current", "1_30", "31_60", "61_90", "over_90"] as const
const BUCKET_COLORS = [
  "text-green-700", "text-yellow-700", "text-orange-600", "text-red-600", "text-red-800",
]

function bucketColor(b: string) {
  const idx = BUCKET_KEYS.indexOf(b as typeof BUCKET_KEYS[number])
  return idx >= 0 ? BUCKET_COLORS[idx] : ""
}

export default function ARAgingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const defAsOf = new Date().toISOString().split("T")[0]
  const [asOf,     setAsOf]     = useState(defAsOf)
  const [data,     setData]     = useState<ARData | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async (d: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/reports/ar-aging?asOf=${d}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally { setLoading(false) }
  }, [orgSlug])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(defAsOf) }, [load, defAsOf])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">AR Aging</h1>
          <a href={`/${orgSlug}/reports`} className="text-xs text-[#8B8580] hover:text-[#37322F]">← Reports</a>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="arAsOf" className="text-xs">As of</Label>
          <Input id="arAsOf" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-8 w-36 text-sm" />
          <Button size="sm" variant="outline" onClick={() => load(asOf)} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">{error}</div>
        )}
        {loading && !data && (
          <div className="flex items-center justify-center h-40 text-[#8B8580] gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        )}

        {data && (
          <div className="w-full min-w-0">
            {/* Summary strip */}
            <div className="grid grid-cols-6 gap-3 mb-5">
              {BUCKET_KEYS.map((k, i) => (
                <div key={k} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-3 py-3">
                  <p className="text-[10px] text-[#8B8580] mb-1">{BUCKET_LABELS[i]}</p>
                  <p className={`text-sm font-semibold font-mono ${BUCKET_COLORS[i]}`}>
                    ₹{fmt(data.summary[k])}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-[rgba(55,50,47,0.20)] bg-[#37322F] px-3 py-3">
                <p className="text-[10px] text-white/60 mb-1">Total outstanding</p>
                <p className="text-sm font-semibold font-mono text-white">₹{fmt(data.summary.total)}</p>
              </div>
            </div>

            {data.rows.length === 0 ? (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-5 py-8 text-center text-sm text-[#8B8580]">
                No outstanding receivables
              </div>
            ) : (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#37322F] text-white">
                      <th className="px-4 py-3 text-left text-xs font-medium">Customer</th>
                      {BUCKET_LABELS.map((l) => (
                        <th key={l} className="px-3 py-3 text-right text-xs font-medium">{l}</th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <>
                        <tr
                          key={row.customerId}
                          className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9] cursor-pointer"
                          onClick={() => toggle(row.customerId)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {expanded.has(row.customerId)
                                ? <ChevronDown className="size-3.5 text-[#8B8580] shrink-0" />
                                : <ChevronRight className="size-3.5 text-[#8B8580] shrink-0" />
                              }
                              <span className="font-medium text-[#37322F]">{row.customerName}</span>
                              {row.customerCode && (
                                <span className="text-[10px] text-[#8B8580] font-mono">{row.customerCode}</span>
                              )}
                            </div>
                          </td>
                          {BUCKET_KEYS.map((k, i) => (
                            <td key={k} className={`px-3 py-2.5 text-right font-mono text-xs ${row[k] > 0 ? BUCKET_COLORS[i] : "text-[#C5BFB8]"}`}>
                              {row[k] > 0 ? fmt(row[k]) : "—"}
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#37322F]">
                            {fmt(row.total)}
                          </td>
                        </tr>

                        {/* Drill-down invoices */}
                        {expanded.has(row.customerId) && row.invoices.map((inv) => (
                          <tr key={inv.id} className="bg-[#FAFAF9] border-t border-[rgba(55,50,47,0.04)]">
                            <td className="pl-10 pr-4 py-2">
                              <a href={`/${orgSlug}/sales-invoices/${inv.id}`}
                                className="font-mono text-xs text-[#605A57] hover:text-[#37322F] hover:underline">
                                {inv.invoiceNumber}
                              </a>
                              <span className="text-[10px] text-[#8B8580] ml-2">
                                Due {inv.dueDate
                                  ? new Date(inv.dueDate).toLocaleDateString("en-IN")
                                  : new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                              </span>
                            </td>
                            {BUCKET_KEYS.map((k) => (
                              <td key={k} className={`px-3 py-2 text-right font-mono text-xs ${inv.bucket === k ? bucketColor(k) : "text-[#C5BFB8]"}`}>
                                {inv.bucket === k ? fmt(inv.amountDue) : "—"}
                              </td>
                            ))}
                            <td className="px-4 py-2 text-right font-mono text-xs text-[#37322F]">
                              {fmt(inv.amountDue)}
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}

                    {/* Grand total */}
                    <tr className="border-t-2 border-[rgba(55,50,47,0.15)] bg-[#F5F4F3] font-semibold">
                      <td className="px-4 py-3 text-sm">Total</td>
                      {BUCKET_KEYS.map((k, i) => (
                        <td key={k} className={`px-3 py-3 text-right font-mono text-sm ${data.summary[k] > 0 ? BUCKET_COLORS[i] : ""}`}>
                          {data.summary[k] > 0 ? fmt(data.summary[k]) : "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono font-bold text-base text-[#37322F]">
                        {fmt(data.summary.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {data.rows.length > 0 && (
              <p className="text-xs text-[#8B8580] mt-2">
                Click a customer row to expand individual invoices. Overdue days calculated as of {new Date(data.asOf).toLocaleDateString("en-IN")}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
