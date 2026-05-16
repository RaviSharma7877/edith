"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

interface BSRow { id: string; code: string; name: string; subtype: string; balance: number }
interface BSSection { items: BSRow[]; total: number }

interface BSData {
  asOf: string
  assets:               BSSection
  liabilities:          BSSection
  equity:               BSSection
  retainedEarnings:     number
  equityTotal:          number
  liabilitiesAndEquity: number
  balanced:             boolean
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const SUBTYPE_LABELS: Record<string, string> = {
  CURRENT_ASSET: "Current assets", FIXED_ASSET: "Fixed assets",
  INTANGIBLE_ASSET: "Intangible assets", OTHER_ASSET: "Other assets",
  BANK: "Bank accounts", CASH: "Cash", ACCOUNTS_RECEIVABLE: "Accounts receivable",
  INVENTORY: "Inventory", PREPAID_EXPENSE: "Prepaid expenses",
  CURRENT_LIABILITY: "Current liabilities", LONG_TERM_LIABILITY: "Long-term liabilities",
  ACCOUNTS_PAYABLE: "Accounts payable", TAX_PAYABLE: "Tax payable",
  ACCRUED_LIABILITY: "Accrued liabilities",
  CAPITAL: "Paid-in capital", RETAINED_EARNINGS: "Retained earnings",
  DRAWING: "Owner drawings",
}

function BSColumn({
  title,
  section,
  extra,
  total,
  totalLabel,
}: {
  title: string
  section: BSSection
  extra?: { label: string; value: number }
  total: number
  totalLabel: string
}) {
  // Group by subtype
  const groups: Record<string, BSRow[]> = {}
  for (const item of section.items) {
    if (!groups[item.subtype]) groups[item.subtype] = []
    groups[item.subtype].push(item)
  }

  return (
    <div className="flex-1 min-w-0 rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
      <div className="px-4 py-3 bg-[#37322F] text-white">
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(groups).map(([subtype, rows]) => (
            <>
              <tr key={`sub-${subtype}`} className="bg-[#FAFAF9] border-t border-[rgba(55,50,47,0.08)]">
                <td colSpan={2} className="px-4 py-1.5 text-[10px] font-semibold text-[#8B8580] uppercase tracking-wide">
                  {SUBTYPE_LABELS[subtype] ?? subtype.replace(/_/g, " ")}
                </td>
              </tr>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[rgba(55,50,47,0.04)] hover:bg-[#FAFAF9]">
                  <td className="px-4 py-2">
                    <span className="font-mono text-xs text-[#8B8580] mr-2">{r.code}</span>
                    <span className="text-[#37322F]">{r.name}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">
                    {r.balance !== 0 ? fmt(r.balance) : "—"}
                  </td>
                </tr>
              ))}
            </>
          ))}

          {extra && (
            <tr className="border-t border-[rgba(55,50,47,0.08)] bg-[#FAFAF9]">
              <td className="px-4 py-2 text-sm text-[#37322F] italic">{extra.label}</td>
              <td className={`px-4 py-2 text-right font-mono text-sm ${extra.value < 0 ? "text-destructive" : ""}`}>
                {extra.value < 0 ? `(${fmt(extra.value)})` : fmt(extra.value)}
              </td>
            </tr>
          )}

          <tr className="border-t-2 border-[rgba(55,50,47,0.15)] bg-[#F5F4F3]">
            <td className="px-4 py-3 font-bold text-sm text-[#37322F]">{totalLabel}</td>
            <td className="px-4 py-3 text-right font-mono font-bold text-base text-[#37322F]">
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function BalanceSheetPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const defAsOf = new Date().toISOString().split("T")[0]
  const [asOf,    setAsOf]    = useState(defAsOf)
  const [data,    setData]    = useState<BSData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/reports/balance-sheet?asOf=${d}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally { setLoading(false) }
  }, [orgSlug])

  useEffect(() => { load(defAsOf) }, [load, defAsOf])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">Balance Sheet</h1>
          <a href={`/${orgSlug}/reports`} className="text-xs text-[#8B8580] hover:text-[#37322F]">← Reports</a>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="bsAsOf" className="text-xs">As of</Label>
          <Input id="bsAsOf" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="h-8 w-36 text-sm" />
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
          <>
            <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-md border ${
              data.balanced
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {data.balanced
                ? <><CheckCircle2 className="size-4" /> Assets = Liabilities + Equity (balanced)</>
                : <><AlertCircle className="size-4" /> Balance sheet is out of balance</>
              }
            </div>

            <div className="flex gap-4 items-start flex-wrap lg:flex-nowrap">
              <BSColumn
                title="Assets"
                section={data.assets}
                total={data.assets.total}
                totalLabel="Total assets"
              />
              <BSColumn
                title="Liabilities & Equity"
                section={{ items: data.liabilities.items, total: data.liabilities.total }}
                extra={{ label: "Retained earnings (current period P&L)", value: data.retainedEarnings }}
                total={data.liabilitiesAndEquity}
                totalLabel="Total liabilities & equity"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
