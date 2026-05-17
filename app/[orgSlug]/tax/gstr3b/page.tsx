"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface GSTR3BData {
  period: string
  section31: {
    outwardTaxableSupplies:    number
    outwardTaxableIGST:        number
    outwardTaxableCGST:        number
    outwardTaxableSGST:        number
    outwardZeroRated:          number
    outwardNilExempt:          number
    inwardReverseCharge:       number
    inwardReverseIGST:         number
    inwardReverseCGST:         number
    inwardReverseSGST:         number
  }
  section32: {
    interestateUnregistered:   number
    interestateIGST:           number
    interestateCompositionable: number
    interestateUINHolders:     number
  }
  section4: {
    itcIGST:  number
    itcCGST:  number
    itcSGST:  number
    itcTotal: number
  }
  netTax: {
    igstPayable:  number
    cgstPayable:  number
    sgstPayable:  number
    totalPayable: number
  }
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function Row({
  label,
  taxable,
  igst,
  cgst,
  sgst,
  bold,
}: {
  label:   string
  taxable?: number
  igst?:   number
  cgst?:   number
  sgst?:   number
  bold?:   boolean
}) {
  return (
    <tr className={`border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9] ${bold ? "font-semibold" : ""}`}>
      <td className="px-4 py-2.5 text-sm text-[#37322F]">{label}</td>
      <td className="px-4 py-2.5 text-right text-sm font-mono">{taxable != null ? `₹${fmt(taxable)}` : ""}</td>
      <td className="px-4 py-2.5 text-right text-sm font-mono">{igst  != null ? `₹${fmt(igst)}`  : ""}</td>
      <td className="px-4 py-2.5 text-right text-sm font-mono">{cgst  != null ? `₹${fmt(cgst)}`  : ""}</td>
      <td className="px-4 py-2.5 text-right text-sm font-mono">{sgst  != null ? `₹${fmt(sgst)}`  : ""}</td>
    </tr>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden mb-4">
      <div className="px-4 py-3 bg-[#FAFAF9] border-b border-[rgba(55,50,47,0.08)]">
        <h3 className="text-sm font-semibold text-[#37322F]">{title}</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F5F4F3]">
            {["Description", "Taxable value", "IGST", "CGST", "SGST/UTGST"].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[#605A57]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GSTR3BPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today     = new Date()
  const defPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

  const [period,  setPeriod]  = useState(defPeriod)
  const [data,    setData]    = useState<GSTR3BData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async (p: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/tax/gstr3b?period=${p}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(defPeriod) }, [load, defPeriod])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">GSTR-3B Workpaper</h1>
          <p className="text-xs text-[#605A57]">Monthly summary return — tax liability and ITC</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="period3b" className="text-xs">Period</Label>
          <Input
            id="period3b"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-8 w-36 text-sm"
          />
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
            {/* 3.1 — Outward & reverse charge */}
            <SectionCard title="3.1 — Details of outward supplies and inward supplies liable to reverse charge">
              <Row
                label="(a) Outward taxable supplies (other than zero rated, nil rated and exempted)"
                taxable={data.section31.outwardTaxableSupplies}
                igst={data.section31.outwardTaxableIGST}
                cgst={data.section31.outwardTaxableCGST}
                sgst={data.section31.outwardTaxableSGST}
              />
              <Row
                label="(b) Outward taxable supplies (zero rated)"
                taxable={data.section31.outwardZeroRated}
                igst={0}
                cgst={0}
                sgst={0}
              />
              <Row
                label="(c) Other outward supplies (nil rated, exempted)"
                taxable={data.section31.outwardNilExempt}
                igst={0}
                cgst={0}
                sgst={0}
              />
              <Row
                label="(d) Inward supplies (liable to reverse charge)"
                taxable={data.section31.inwardReverseCharge}
                igst={data.section31.inwardReverseIGST}
                cgst={data.section31.inwardReverseCGST}
                sgst={data.section31.inwardReverseSGST}
              />
            </SectionCard>

            {/* 3.2 — Interstate */}
            <SectionCard title="3.2 — Of the supplies shown in 3.1 (d), details of inter-state supplies">
              <Row
                label="Supplies made to unregistered persons"
                taxable={data.section32.interestateUnregistered}
                igst={data.section32.interestateIGST}
              />
              <Row
                label="Supplies made to composition taxable persons"
                taxable={data.section32.interestateCompositionable}
                igst={0}
              />
              <Row
                label="Supplies made to UIN holders"
                taxable={data.section32.interestateUINHolders}
                igst={0}
              />
            </SectionCard>

            {/* 4 — ITC */}
            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden mb-4">
              <div className="px-4 py-3 bg-[#FAFAF9] border-b border-[rgba(55,50,47,0.08)]">
                <h3 className="text-sm font-semibold text-[#37322F]">4 — Eligible ITC</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F4F3]">
                    {["Description", "IGST", "CGST", "SGST/UTGST", "Total"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[#605A57]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-2.5 text-sm text-[#37322F]">(A) ITC available — All other ITC</td>
                    <td className="px-4 py-2.5 text-right text-sm font-mono">₹{fmt(data.section4.itcIGST)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-mono">₹{fmt(data.section4.itcCGST)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-mono">₹{fmt(data.section4.itcSGST)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-mono font-semibold">₹{fmt(data.section4.itcTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net tax liability */}
            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
              <div className="px-4 py-3 bg-[#37322F]">
                <h3 className="text-sm font-semibold text-white">Net tax liability (after ITC)</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[rgba(55,50,47,0.08)]">
                {[
                  { label: "IGST payable", value: data.netTax.igstPayable  },
                  { label: "CGST payable", value: data.netTax.cgstPayable  },
                  { label: "SGST payable", value: data.netTax.sgstPayable  },
                  { label: "Total payable", value: data.netTax.totalPayable },
                ].map((t) => (
                  <div key={t.label} className="px-5 py-4">
                    <p className="text-xs text-[#8B8580] mb-1">{t.label}</p>
                    <p className="text-lg font-semibold font-mono text-[#37322F]">₹{fmt(t.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
