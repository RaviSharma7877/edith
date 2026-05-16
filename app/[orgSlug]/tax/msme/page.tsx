"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw, AlertTriangle, Tag } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OutstandingBill {
  billNumber: string
  billDate:   string
  amountDue:  number
  ageDays:    number
  overdue45:  boolean
}

interface MSMEVendor {
  id:         string
  name:       string
  pan:        string | null
  gstin:      string | null
  isMSME:     boolean
  msmeRegNo:  string | null
  msmeType:   string | null
  totalDue:   number
  overdueAmt: number
  hasOverdue: boolean
  bills:      OutstandingBill[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function msmeTypeBadge(t: string | null) {
  if (!t) return null
  const map: Record<string, string> = { micro: "bg-purple-100 text-purple-800", small: "bg-blue-100 text-blue-800", medium: "bg-teal-100 text-teal-800" }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${map[t] ?? "bg-slate-100 text-slate-700"}`}>{t}</span>
}

function TH({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-[#605A57] bg-[#FAFAF9]">{children}</th>
}
function TD({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-3 py-2.5 text-xs align-top ${right ? "text-right font-mono" : "text-[#37322F]"}`}>{children}</td>
}

// ── Tag dialog ────────────────────────────────────────────────────────────────

function TagDialog({
  vendor,
  onClose,
  onSave,
}: {
  vendor: MSMEVendor
  onClose: () => void
  onSave: (vendorId: string, isMSME: boolean, msmeRegNo: string, msmeType: string) => Promise<void>
}) {
  const [isMSME,    setIsMSME]    = useState(vendor.isMSME)
  const [msmeRegNo, setMsmeRegNo] = useState(vendor.msmeRegNo ?? "")
  const [msmeType,  setMsmeType]  = useState(vendor.msmeType ?? "micro")
  const [saving,    setSaving]    = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(vendor.id, isMSME, msmeRegNo, msmeType)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>MSME Classification — {vendor.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <input
              id="isMsme"
              type="checkbox"
              checked={isMSME}
              onChange={(e) => setIsMSME(e.target.checked)}
              className="size-4 rounded"
            />
            <Label htmlFor="isMsme" className="text-sm cursor-pointer">Mark as MSME supplier</Label>
          </div>
          {isMSME && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">MSME Registration No. (Udyam No.)</Label>
                <Input
                  value={msmeRegNo}
                  onChange={(e) => setMsmeRegNo(e.target.value)}
                  placeholder="UDYAM-XX-00-0000000"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Enterprise type</Label>
                <Select value={msmeType} onValueChange={setMsmeType}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MSMEPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [vendors,  setVendors]  = useState<MSMEVendor[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [onlyMsme, setOnlyMsme] = useState(true)
  const [tagging,  setTagging]  = useState<MSMEVendor | null>(null)

  const load = useCallback(async (msmeOnly: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/tax/msme?msme=${msmeOnly}`)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setVendors(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  useEffect(() => { load(onlyMsme) }, [load, onlyMsme])

  async function handleSave(vendorId: string, isMSME: boolean, msmeRegNo: string, msmeType: string) {
    await fetch(`/api/organizations/${orgSlug}/tax/msme`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ vendorId, isMSME, msmeRegNo: msmeRegNo || null, msmeType: isMSME ? msmeType : null }),
    })
    await load(onlyMsme)
  }

  const overdueVendors = vendors.filter((v) => v.hasOverdue).length
  const totalOverdue   = vendors.reduce((s, v) => s + v.overdueAmt, 0)

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">MSME Compliance</h1>
          <p className="text-xs text-[#605A57]">Track 45-day payment obligations to MSME suppliers (Form 1)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyMsme}
              onChange={(e) => setOnlyMsme(e.target.checked)}
              className="size-3.5 rounded"
            />
            MSME only
          </label>
          <Button size="sm" variant="outline" onClick={() => load(onlyMsme)} disabled={loading}>
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

        {overdueVendors > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-6">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <span className="font-semibold">{overdueVendors} MSME supplier{overdueVendors > 1 ? "s" : ""}</span> have outstanding payments beyond 45 days — total ₹{fmt(totalOverdue)}.
              {" "}These must be disclosed in Form 1 (half-yearly filing to MCA).
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "MSME vendors",      value: vendors.filter((v) => v.isMSME).length },
            { label: "With overdue (>45d)", value: overdueVendors, warn: overdueVendors > 0 },
            { label: "Total overdue amt", value: `₹${fmt(totalOverdue)}`, warn: totalOverdue > 0 },
          ].map((c) => (
            <div key={c.label} className={`rounded-lg border px-4 py-3 bg-white ${c.warn ? "border-amber-300" : "border-[rgba(55,50,47,0.12)]"}`}>
              <p className="text-[10px] text-[#8B8580] mb-1">{c.label}</p>
              <p className={`text-lg font-semibold ${c.warn ? "text-amber-700" : "text-[#37322F]"}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {loading && !vendors.length ? (
          <div className="flex items-center justify-center h-40 text-[#8B8580] gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {["Vendor", "Type", "Reg. No.", "Total due", "Overdue (>45d)", "Oldest bill age", "Actions"].map((h) => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[#8B8580]">
                      {onlyMsme ? "No MSME vendors tagged yet." : "No vendors found."}
                    </td>
                  </tr>
                ) : vendors.map((v) => {
                  const oldestAge = v.bills.length ? Math.max(...v.bills.map((b) => b.ageDays)) : 0
                  return (
                    <tr key={v.id} className={`border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9] ${v.hasOverdue ? "bg-amber-50/40" : ""}`}>
                      <TD>
                        <div className="font-medium">{v.name}</div>
                        {v.pan && <div className="text-[10px] font-mono text-[#8B8580]">{v.pan}</div>}
                      </TD>
                      <TD>{msmeTypeBadge(v.msmeType)}</TD>
                      <TD><span className="font-mono text-[10px]">{v.msmeRegNo ?? "—"}</span></TD>
                      <TD right>₹{fmt(v.totalDue)}</TD>
                      <TD right>
                        {v.overdueAmt > 0
                          ? <span className="text-amber-700 font-semibold">₹{fmt(v.overdueAmt)}</span>
                          : <span className="text-[#8B8580]">—</span>
                        }
                      </TD>
                      <TD right>
                        {oldestAge > 0
                          ? <span className={oldestAge > 45 ? "text-red-700 font-semibold" : ""}>{oldestAge}d</span>
                          : "—"
                        }
                      </TD>
                      <TD>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] px-2"
                          onClick={() => setTagging(v)}
                        >
                          <Tag className="size-3 mr-1" />
                          {v.isMSME ? "Edit" : "Tag MSME"}
                        </Button>
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tagging && (
        <TagDialog
          vendor={tagging}
          onClose={() => setTagging(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
