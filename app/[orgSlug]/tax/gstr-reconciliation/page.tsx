"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Play, AlertCircle, CheckCircle2, XCircle, HelpCircle } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReconLine {
  invoiceNumber: string | null
  gstin:         string | null
  bookAmount:    number | null
  portalAmount:  number | null
  bookTax:       number | null
  portalTax:     number | null
  status:        "matched" | "mismatched" | "missing_in_books" | "missing_in_portal"
}

interface ReconRun {
  id:          string
  period:      string
  type:        string
  matched:     number
  mismatched:  number
  missing:     number
  totalBooks:  number
  totalPortal: number
  lines:       ReconLine[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null) {
  if (n == null) return "—"
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  matched:            { label: "Matched",           icon: CheckCircle2, cls: "text-green-700 bg-green-50"  },
  mismatched:         { label: "Mismatch",          icon: AlertCircle,  cls: "text-amber-700 bg-amber-50"  },
  missing_in_books:   { label: "Missing in books",  icon: XCircle,      cls: "text-red-700 bg-red-50"      },
  missing_in_portal:  { label: "Missing in portal", icon: HelpCircle,   cls: "text-slate-600 bg-slate-50"  },
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-[#605A57] bg-[#FAFAF9]">{children}</th>
}
function TD({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-3 py-2.5 text-xs ${right ? "text-right font-mono" : "text-[#37322F]"}`}>{children}</td>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GSTRReconciliationPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today   = new Date()
  const defPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  const [period,       setPeriod]       = useState(defPeriod)
  const [type,         setType]         = useState<"2A" | "2B">("2B")
  const [portalJson,   setPortalJson]   = useState("")
  const [run,          setRun]          = useState<ReconRun | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let portalEntries: unknown[]
      try {
        portalEntries = JSON.parse(portalJson || "[]")
      } catch {
        throw new Error("Portal JSON is invalid. Paste a JSON array of {invoiceNumber, gstin, amount, tax} objects.")
      }

      const res = await fetch(`/api/organizations/${orgSlug}/tax/gstr-reconciliation`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ period, type, portalEntries }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setRun(await res.json())
      setActiveFilter("all")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setLoading(false)
    }
  }, [orgSlug, period, type, portalJson])

  const filteredLines = run
    ? activeFilter === "all" ? run.lines : run.lines.filter((l) => l.status === activeFilter)
    : []

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">GSTR-2B Reconciliation</h1>
          <p className="text-xs text-[#605A57]">Match your purchase records against the GST portal</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {/* Input panel */}
        <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-5 mb-6">
          <h2 className="text-sm font-semibold text-[#37322F] mb-4">Run reconciliation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Period (YYYY-MM)</Label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <div className="flex gap-2">
                {(["2A", "2B"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${
                      type === t
                        ? "bg-[#37322F] text-white border-[#37322F]"
                        : "bg-white text-[#605A57] border-[rgba(55,50,47,0.2)] hover:border-[#37322F]"
                    }`}
                  >
                    GSTR-{t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5 mb-4">
            <Label className="text-xs">
              Portal data — paste JSON array from GSTN portal
              <span className="ml-1 text-[#8B8580] font-normal">
                (format: [{`{"invoiceNumber":"INV-001","gstin":"22AAAAA0000A1Z5","amount":10000,"tax":1800}`}])
              </span>
            </Label>
            <Textarea
              value={portalJson}
              onChange={(e) => setPortalJson(e.target.value)}
              placeholder='[{"invoiceNumber":"INV-001","gstin":"22AAAAA0000A1Z5","amount":10000,"tax":1800}]'
              className="font-mono text-xs h-28 resize-none"
            />
          </div>
          <Button onClick={handleRun} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Run reconciliation
          </Button>
        </div>

        {/* Results */}
        {run && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Books",            value: run.totalBooks,  cls: ""                        },
                { label: "Portal",           value: run.totalPortal, cls: ""                        },
                { label: "Matched",          value: run.matched,     cls: "text-green-700"           },
                { label: "Mismatch",         value: run.mismatched,  cls: run.mismatched  ? "text-amber-700" : "" },
                { label: "Missing",          value: run.missing,     cls: run.missing     ? "text-red-700"   : "" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-4 py-3">
                  <p className="text-[10px] text-[#8B8580] mb-1">{c.label}</p>
                  <p className={`text-xl font-semibold ${c.cls || "text-[#37322F]"}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 border-b border-[rgba(55,50,47,0.12)] mb-4">
              {[
                { id: "all",                label: "All",              count: run.lines.length      },
                { id: "matched",            label: "Matched",          count: run.matched           },
                { id: "mismatched",         label: "Mismatch",         count: run.mismatched        },
                { id: "missing_in_books",   label: "Missing in books", count: run.lines.filter((l) => l.status === "missing_in_books").length   },
                { id: "missing_in_portal",  label: "Missing in portal",count: run.lines.filter((l) => l.status === "missing_in_portal").length  },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveFilter(t.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeFilter === t.id
                      ? "border-[#37322F] text-[#37322F]"
                      : "border-transparent text-[#8B8580] hover:text-[#37322F]"
                  }`}
                >
                  {t.label} <span className="ml-1 text-[10px] font-normal opacity-70">({t.count})</span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {["Invoice No.", "GSTIN", "Books amt", "Portal amt", "Books tax", "Portal tax", "Status"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[#8B8580]">No records</td>
                    </tr>
                  ) : filteredLines.map((l, i) => {
                    const meta = STATUS_META[l.status]
                    const Icon = meta.icon
                    return (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD><span className="font-mono">{l.invoiceNumber ?? "—"}</span></TD>
                        <TD><span className="font-mono text-[10px]">{l.gstin ?? "—"}</span></TD>
                        <TD right>{fmt(l.bookAmount)}</TD>
                        <TD right>{fmt(l.portalAmount)}</TD>
                        <TD right>{fmt(l.bookTax)}</TD>
                        <TD right>{fmt(l.portalTax)}</TD>
                        <TD>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.cls}`}>
                            <Icon className="size-3" />
                            {meta.label}
                          </span>
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
