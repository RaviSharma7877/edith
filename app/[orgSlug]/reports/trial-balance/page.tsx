"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

interface TBRow {
  id: string; code: string; name: string
  type: string; subtype: string
  debit: number; credit: number
  closingBalance: number; isDebitNormal: boolean
}

interface TBData {
  from: string; to: string
  rows: TBRow[]
  totalDebit: number; totalCredit: number; balanced: boolean
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
const TYPE_LABELS: Record<string, string> = {
  ASSET: "Assets", LIABILITY: "Liabilities", EQUITY: "Equity",
  REVENUE: "Revenue", EXPENSE: "Expenses",
}

export default function TrialBalancePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today     = new Date()
  const defFrom   = `${today.getFullYear()}-01-01`
  const defTo     = today.toISOString().split("T")[0]

  const [from,    setFrom]    = useState(defFrom)
  const [to,      setTo]      = useState(defTo)
  const [data,    setData]    = useState<TBData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/reports/trial-balance?from=${f}&to=${t}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally { setLoading(false) }
  }, [orgSlug])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(defFrom, defTo) }, [load, defFrom, defTo])

  const grouped = data
    ? TYPE_ORDER.map((type) => ({
        type,
        label: TYPE_LABELS[type],
        rows:  data.rows.filter((r) => r.type === type),
      })).filter((g) => g.rows.length > 0)
    : []

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">Trial Balance</h1>
          <a href={`/${orgSlug}/reports`} className="text-xs text-[#8B8580] hover:text-[#37322F]">← Reports</a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="tbFrom" className="text-xs">From</Label>
            <Input id="tbFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="tbTo" className="text-xs">To</Label>
            <Input id="tbTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
          <Button size="sm" variant="outline" onClick={() => load(from, to)} disabled={loading}>
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
            {/* Balance check */}
            <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-md border ${
              data.balanced
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {data.balanced
                ? <><CheckCircle2 className="size-4" /> Trial balance is balanced</>
                : <><AlertCircle className="size-4" /> Out of balance — check journal entries</>
              }
            </div>

            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#37322F] text-white">
                    <th className="px-4 py-3 text-left text-xs font-medium w-24">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Account name</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-36">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-36">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-40">Closing balance</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <>
                      <tr key={`group-${group.type}`} className="bg-[#F5F4F3] border-t-2 border-[rgba(55,50,47,0.12)]">
                        <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-[#605A57] uppercase tracking-wide">
                          {group.label}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.id} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                          <td className="px-4 py-2.5 font-mono text-xs text-[#605A57]">{row.code}</td>
                          <td className="px-4 py-2.5 text-[#37322F]">{row.name}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {row.debit > 0 ? fmt(row.debit) : ""}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {row.credit > 0 ? fmt(row.credit) : ""}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            <span className={row.closingBalance < 0 ? "text-destructive" : ""}>
                              {row.closingBalance !== 0
                                ? `${row.closingBalance < 0 ? "(" : ""}${fmt(row.closingBalance)}${row.closingBalance < 0 ? ")" : ""}`
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}

                  {/* Totals */}
                  <tr className="border-t-2 border-[rgba(55,50,47,0.15)] bg-[#F5F4F3] font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.totalCredit)}</td>
                    <td className="px-4 py-3 text-right">
                      {!data.balanced && (
                        <Badge variant="destructive" className="text-xs">
                          Diff: {fmt(Math.abs(data.totalDebit - data.totalCredit))}
                        </Badge>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
