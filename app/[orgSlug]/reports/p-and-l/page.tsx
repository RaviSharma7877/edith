"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"

interface AccountRow { id: string; code: string; name: string; subtype: string; balance: number }
interface Section    { accounts: AccountRow[]; total: number }

interface PLData {
  from: string; to: string
  revenue:      Section
  cogs:         Section
  grossProfit:  number
  opex:         Section
  ebit:         number
  otherExpense: Section
  taxExpense:   Section
  netProfit:    number
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SectionRows({ accounts }: { accounts: AccountRow[] }) {
  return (
    <>
      {accounts.map((a) => (
        <tr key={a.id} className="border-t border-[rgba(55,50,47,0.05)] hover:bg-[#FAFAF9]">
          <td className="pl-8 pr-4 py-2 text-sm text-[#37322F]">
            <span className="font-mono text-xs text-[#8B8580] mr-2">{a.code}</span>{a.name}
          </td>
          <td className="px-6 py-2 text-right font-mono text-sm">
            {a.balance !== 0 ? fmt(a.balance) : "—"}
          </td>
        </tr>
      ))}
    </>
  )
}

function SectionLabel({ label, total, indent }: { label: string; total: number; indent?: boolean }) {
  return (
    <tr className="border-t border-[rgba(55,50,47,0.10)] bg-[#FAFAF9]">
      <td className={`${indent ? "pl-8" : "px-4"} py-2.5 text-xs font-semibold text-[#605A57] uppercase tracking-wide`}>
        {label}
      </td>
      <td className="px-6 py-2.5 text-right font-mono text-sm font-semibold text-[#37322F]">
        {fmt(total)}
      </td>
    </tr>
  )
}

function SubtotalRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <tr className={`border-t-2 border-[rgba(55,50,47,0.15)] ${highlight ? "bg-[#37322F]" : "bg-[#F5F4F3]"}`}>
      <td className={`px-4 py-3 font-semibold text-sm ${highlight ? "text-white" : "text-[#37322F]"}`}>
        {label}
      </td>
      <td className={`px-6 py-3 text-right font-mono font-bold text-base ${
        highlight ? "text-white" : value < 0 ? "text-destructive" : "text-[#37322F]"
      }`}>
        {value < 0 ? `(${fmt(value)})` : fmt(value)}
      </td>
    </tr>
  )
}

export default function PandLPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today   = new Date()
  const defFrom = `${today.getFullYear()}-01-01`
  const defTo   = today.toISOString().split("T")[0]

  const [from,    setFrom]    = useState(defFrom)
  const [to,      setTo]      = useState(defTo)
  const [data,    setData]    = useState<PLData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/reports/p-and-l?from=${f}&to=${t}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally { setLoading(false) }
  }, [orgSlug])

  useEffect(() => { load(defFrom, defTo) }, [load, defFrom, defTo])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">Profit & Loss</h1>
          <a href={`/${orgSlug}/reports`} className="text-xs text-[#8B8580] hover:text-[#37322F]">← Reports</a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="plFrom" className="text-xs">From</Label>
            <Input id="plFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="plTo" className="text-xs">To</Label>
            <Input id="plTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-sm" />
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
            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
              <div className="px-4 py-3 bg-[#37322F] text-white flex justify-between items-baseline">
                <span className="font-semibold">Profit & Loss</span>
                <span className="text-xs opacity-70">
                  {new Date(data.from).toLocaleDateString("en-IN")} – {new Date(data.to).toLocaleDateString("en-IN")}
                </span>
              </div>

              <table className="w-full">
                <colgroup><col className="w-[65%]" /><col className="w-[35%]" /></colgroup>
                <tbody>
                  {/* Revenue */}
                  <SectionLabel label="Revenue" total={data.revenue.total} />
                  <SectionRows accounts={data.revenue.accounts} />

                  {/* COGS */}
                  {data.cogs.accounts.length > 0 && (
                    <>
                      <SectionLabel label="Cost of goods sold" total={data.cogs.total} />
                      <SectionRows accounts={data.cogs.accounts} />
                    </>
                  )}

                  <SubtotalRow label="Gross profit" value={data.grossProfit} />

                  {/* OPEX */}
                  {data.opex.accounts.length > 0 && (
                    <>
                      <SectionLabel label="Operating expenses" total={data.opex.total} />
                      <SectionRows accounts={data.opex.accounts} />
                    </>
                  )}

                  <SubtotalRow label="EBIT (Operating profit)" value={data.ebit} />

                  {/* Other expenses */}
                  {data.otherExpense.accounts.length > 0 && (
                    <>
                      <SectionLabel label="Other expenses" total={data.otherExpense.total} />
                      <SectionRows accounts={data.otherExpense.accounts} />
                    </>
                  )}

                  {/* Tax */}
                  {data.taxExpense.accounts.length > 0 && (
                    <>
                      <SectionLabel label="Tax expense" total={data.taxExpense.total} />
                      <SectionRows accounts={data.taxExpense.accounts} />
                    </>
                  )}

                  <SubtotalRow label="Net profit / (loss)" value={data.netProfit} highlight />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
