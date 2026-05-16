"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface B2BRecord {
  gstin: string
  name:  string
  invoiceNumber: string
  invoiceDate: string
  totalValue: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
}

interface B2CRecord {
  invoiceNumber: string
  invoiceDate: string
  place: string
  totalValue: number
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
}

interface CDNRecord {
  gstin: string
  noteNumber: string
  noteDate: string
  noteType: "C" | "D"
  originalInvoice: string
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
}

interface HSNRow {
  hsnCode: string
  description: string
  quantity: number
  unit: string
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
}

interface GSTR1Data {
  period: string
  b2b:    B2BRecord[]
  b2cl:   B2CRecord[]
  b2cs: {
    place: string
    taxableValue: number
    cgst: number
    sgst: number
    igst: number
  }[]
  cdnr: CDNRecord[]
  cdnur: B2CRecord[]
  hsn: HSNRow[]
  summary: {
    totalTaxableValue: number
    totalCGST: number
    totalSGST: number
    totalIGST: number
    totalTax: number
    totalInvoiceValue: number
  }
}

// ── Money formatting ──────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Sub-tables ────────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-sm font-semibold text-[#37322F]">{title}</h3>
      <Badge variant="secondary" className="text-xs">{count}</Badge>
    </div>
  )
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-4 text-center text-xs text-[#8B8580]">No records</td>
    </tr>
  )
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-[#605A57] bg-[#FAFAF9]">{children}</th>
}

function TD({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-3 py-2.5 text-xs ${right ? "text-right font-mono" : "text-[#37322F]"}`}>{children}</td>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GSTR1Page() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  // Default to current month
  const today   = new Date()
  const defPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  const [period,   setPeriod]   = useState(defPeriod)
  const [data,     setData]     = useState<GSTR1Data | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [tab,      setTab]      = useState<"b2b" | "b2cl" | "b2cs" | "cdnr" | "hsn">("b2b")

  const load = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/tax/gstr1?period=${p}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => { load(defPeriod) }, [load, defPeriod])

  const tabs = [
    { id: "b2b",  label: "B2B",       count: data?.b2b.length  ?? 0 },
    { id: "b2cl", label: "B2C Large",  count: data?.b2cl.length ?? 0 },
    { id: "b2cs", label: "B2C Small",  count: data?.b2cs.length ?? 0 },
    { id: "cdnr", label: "CDNR",       count: data?.cdnr.length ?? 0 },
    { id: "hsn",  label: "HSN",        count: data?.hsn.length  ?? 0 },
  ] as const

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">GSTR-1 Workpaper</h1>
          <p className="text-xs text-[#605A57]">Outward supply details for GST return filing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="period" className="text-xs">Period</Label>
            <Input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 w-36 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => load(period)} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center h-40 text-[#8B8580] gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        )}

        {data && (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: "Taxable value",   value: data.summary.totalTaxableValue  },
                { label: "CGST",            value: data.summary.totalCGST          },
                { label: "SGST",            value: data.summary.totalSGST          },
                { label: "IGST",            value: data.summary.totalIGST          },
                { label: "Total tax",       value: data.summary.totalTax           },
                { label: "Invoice value",   value: data.summary.totalInvoiceValue  },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-4 py-3">
                  <p className="text-[10px] text-[#8B8580] mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-[#37322F] font-mono">₹{fmt(s.value)}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[rgba(55,50,47,0.12)] mb-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t.id
                      ? "border-[#37322F] text-[#37322F]"
                      : "border-transparent text-[#8B8580] hover:text-[#37322F]"
                  }`}
                >
                  {t.label} <span className="ml-1 text-[10px] font-normal opacity-70">({t.count})</span>
                </button>
              ))}
            </div>

            {/* B2B */}
            {tab === "b2b" && (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <SectionHeader title="B2B — Supplies to registered persons" count={data.b2b.length} />
                <table className="w-full text-xs">
                  <thead><tr>
                    {["GSTIN", "Receiver", "Invoice No.", "Date", "Total", "Taxable", "CGST", "SGST", "IGST"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.b2b.length === 0 ? <EmptyRow cols={9} /> : data.b2b.map((r, i) => (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD><span className="font-mono">{r.gstin}</span></TD>
                        <TD>{r.name}</TD>
                        <TD><span className="font-mono">{r.invoiceNumber}</span></TD>
                        <TD>{new Date(r.invoiceDate).toLocaleDateString("en-IN")}</TD>
                        <TD right>₹{fmt(r.totalValue)}</TD>
                        <TD right>₹{fmt(r.taxableValue)}</TD>
                        <TD right>₹{fmt(r.cgst)}</TD>
                        <TD right>₹{fmt(r.sgst)}</TD>
                        <TD right>₹{fmt(r.igst)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* B2C Large */}
            {tab === "b2cl" && (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <SectionHeader title="B2C Large — Interstate unregistered > ₹2.5L" count={data.b2cl.length} />
                <table className="w-full text-xs">
                  <thead><tr>
                    {["Invoice No.", "Date", "Place of supply", "Total", "Taxable", "IGST"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.b2cl.length === 0 ? <EmptyRow cols={6} /> : data.b2cl.map((r, i) => (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD><span className="font-mono">{r.invoiceNumber}</span></TD>
                        <TD>{new Date(r.invoiceDate).toLocaleDateString("en-IN")}</TD>
                        <TD>{r.place}</TD>
                        <TD right>₹{fmt(r.totalValue)}</TD>
                        <TD right>₹{fmt(r.taxableValue)}</TD>
                        <TD right>₹{fmt(r.igst)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* B2C Small */}
            {tab === "b2cs" && (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <SectionHeader title="B2C Small — consolidated by place of supply" count={data.b2cs.length} />
                <table className="w-full text-xs">
                  <thead><tr>
                    {["Place of supply", "Taxable value", "CGST", "SGST", "IGST"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.b2cs.length === 0 ? <EmptyRow cols={5} /> : data.b2cs.map((r, i) => (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD>{r.place}</TD>
                        <TD right>₹{fmt(r.taxableValue)}</TD>
                        <TD right>₹{fmt(r.cgst)}</TD>
                        <TD right>₹{fmt(r.sgst)}</TD>
                        <TD right>₹{fmt(r.igst)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CDNR */}
            {tab === "cdnr" && (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <SectionHeader title="CDNR — Credit/Debit notes to registered" count={data.cdnr.length} />
                <table className="w-full text-xs">
                  <thead><tr>
                    {["GSTIN", "Note No.", "Date", "Type", "Original Inv.", "Taxable", "CGST", "SGST", "IGST"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.cdnr.length === 0 ? <EmptyRow cols={9} /> : data.cdnr.map((r, i) => (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD><span className="font-mono">{r.gstin}</span></TD>
                        <TD><span className="font-mono">{r.noteNumber}</span></TD>
                        <TD>{new Date(r.noteDate).toLocaleDateString("en-IN")}</TD>
                        <TD>
                          <Badge variant={r.noteType === "C" ? "default" : "secondary"} className="text-[10px]">
                            {r.noteType === "C" ? "Credit" : "Debit"}
                          </Badge>
                        </TD>
                        <TD><span className="font-mono">{r.originalInvoice}</span></TD>
                        <TD right>₹{fmt(r.taxableValue)}</TD>
                        <TD right>₹{fmt(r.cgst)}</TD>
                        <TD right>₹{fmt(r.sgst)}</TD>
                        <TD right>₹{fmt(r.igst)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* HSN */}
            {tab === "hsn" && (
              <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
                <SectionHeader title="HSN Summary" count={data.hsn.length} />
                <table className="w-full text-xs">
                  <thead><tr>
                    {["HSN Code", "Description", "Qty", "Unit", "Taxable", "CGST", "SGST", "IGST", "Total tax"].map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.hsn.length === 0 ? <EmptyRow cols={9} /> : data.hsn.map((r, i) => (
                      <tr key={i} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <TD><span className="font-mono">{r.hsnCode}</span></TD>
                        <TD>{r.description}</TD>
                        <TD right>{r.quantity}</TD>
                        <TD>{r.unit}</TD>
                        <TD right>₹{fmt(r.taxableValue)}</TD>
                        <TD right>₹{fmt(r.cgst)}</TD>
                        <TD right>₹{fmt(r.sgst)}</TD>
                        <TD right>₹{fmt(r.igst)}</TD>
                        <TD right>₹{fmt(r.totalTax)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
