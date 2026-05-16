"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw, Download, Plus } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TCSEntry {
  id:            string
  tcsAmount:     number | string
  baseAmount:    number | string
  date:          string
  quarterPeriod: string
  status:        string
  challanNumber: string | null
  section:       { section: string; description: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function currentQuarter(): string {
  const now   = new Date()
  const month = now.getMonth() + 1
  const fy    = month >= 4 ? now.getFullYear() : now.getFullYear() - 1
  const q     = month >= 4 && month <= 6 ? "Q1"
              : month >= 7 && month <= 9 ? "Q2"
              : month >= 10              ? "Q3"
              : "Q4"
  return `${q}-${fy}-${String(fy + 1).slice(2)}`
}

function statusColor(s: string) {
  if (s === "filed")     return "bg-green-100 text-green-800"
  if (s === "deposited") return "bg-blue-100 text-blue-800"
  return "bg-amber-100 text-amber-800"
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-[#605A57] bg-[#FAFAF9]">{children}</th>
}
function TD({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-3 py-2.5 text-xs ${right ? "text-right font-mono" : "text-[#37322F]"}`}>{children}</td>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TCSEntriesPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [quarter,   setQuarter]   = useState(currentQuarter())
  const [status,    setStatus]    = useState("all")
  const [entries,   setEntries]   = useState<TCSEntry[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async (q: string, s: string) => {
    setLoading(true)
    setError(null)
    try {
      const p = new URLSearchParams({ quarter: q })
      if (s !== "all") p.set("status", s)
      const res = await fetch(`/api/organizations/${orgSlug}/tcs/entries?${p}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setEntries(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => { load(quarter, status) }, [load, quarter, status])

  async function handleExport() {
    setExporting(true)
    try {
      const res  = await fetch(`/api/organizations/${orgSlug}/tcs/entries/export?quarter=${quarter}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `Form27EQ-${quarter}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const totalBase = entries.reduce((s, e) => s + Number(e.baseAmount), 0)
  const totalTCS  = entries.reduce((s, e) => s + Number(e.tcsAmount), 0)
  const pending   = entries.filter((e) => e.status === "collected").reduce((s, e) => s + Number(e.tcsAmount), 0)

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">TCS — Tax Collected at Source</h1>
          <p className="text-xs text-[#605A57]">Form 27EQ quarterly filing</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Quarter</Label>
          <Input
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            placeholder="Q1-2025-26"
            className="h-8 w-28 text-sm"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="deposited">Deposited</SelectItem>
              <SelectItem value="filed">Filed</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => load(quarter, status)} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting || entries.length === 0}>
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5 mr-1" />}
            Form 27EQ
          </Button>
          <Button size="sm">
            <Plus className="size-3.5 mr-1" /> New Entry
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Base amount",     value: `₹${fmt(totalBase)}` },
            { label: "TCS collected",   value: `₹${fmt(totalTCS)}`  },
            { label: "Pending deposit", value: `₹${fmt(pending)}`, warn: pending > 0 },
          ].map((c) => (
            <div key={c.label} className={`rounded-lg border px-4 py-3 bg-white ${c.warn ? "border-amber-300" : "border-[rgba(55,50,47,0.12)]"}`}>
              <p className="text-[10px] text-[#8B8580] mb-1">{c.label}</p>
              <p className={`text-sm font-semibold font-mono ${c.warn ? "text-amber-700" : "text-[#37322F]"}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {loading && !entries.length ? (
          <div className="flex items-center justify-center h-40 text-[#8B8580] gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {["Date", "Section", "Base amount", "TCS amount", "Challan", "Status"].map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[#8B8580]">
                      No TCS entries for {quarter}
                    </td>
                  </tr>
                ) : entries.map((e) => (
                  <tr key={e.id} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                    <TD>{new Date(e.date).toLocaleDateString("en-IN")}</TD>
                    <TD>
                      <span className="font-mono font-medium">{e.section.section}</span>
                      <span className="ml-1 text-[#8B8580]">— {e.section.description}</span>
                    </TD>
                    <TD right>₹{fmt(Number(e.baseAmount))}</TD>
                    <TD right>₹{fmt(Number(e.tcsAmount))}</TD>
                    <TD><span className="font-mono">{e.challanNumber ?? "—"}</span></TD>
                    <TD>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(e.status)}`}>
                        {e.status}
                      </span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
