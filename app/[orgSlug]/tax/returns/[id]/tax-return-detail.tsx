"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react"

interface TaxReturn {
  id:        string
  type:      string
  period:    string
  status:    string
  filedAt:   string | null
  filedById: string | null
  ackNumber: string | null
  data:      Record<string, unknown>
  createdAt: string
  updatedAt: string
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SummaryGrid({ data, type }: { data: Record<string, unknown>; type: string }) {
  if (type === "GSTR1" && data.summary) {
    const s = data.summary as Record<string, number>
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Taxable value",   k: "totalTaxableValue"  },
          { label: "CGST",            k: "totalCGST"          },
          { label: "SGST",            k: "totalSGST"          },
          { label: "IGST",            k: "totalIGST"          },
          { label: "Total tax",       k: "totalTax"           },
          { label: "Invoice value",   k: "totalInvoiceValue"  },
        ].map((f) => (
          <div key={f.k} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-4 py-3">
            <p className="text-[10px] text-[#8B8580] mb-1">{f.label}</p>
            <p className="text-sm font-semibold font-mono text-[#37322F]">₹{fmt(s[f.k] ?? 0)}</p>
          </div>
        ))}
      </div>
    )
  }

  if (type === "GSTR3B" && data.netTax) {
    const t = data.netTax as Record<string, number>
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "IGST payable",  k: "igstPayable"  },
          { label: "CGST payable",  k: "cgstPayable"  },
          { label: "SGST payable",  k: "sgstPayable"  },
          { label: "Total payable", k: "totalPayable" },
        ].map((f) => (
          <div key={f.k} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white px-4 py-3">
            <p className="text-[10px] text-[#8B8580] mb-1">{f.label}</p>
            <p className="text-lg font-semibold font-mono text-[#37322F]">₹{fmt(t[f.k] ?? 0)}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md bg-[#FAFAF9] border border-[rgba(55,50,47,0.08)] px-4 py-3 mb-5">
      <pre className="text-xs text-[#605A57] overflow-auto max-h-60">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function TaxReturnDetail({
  orgSlug,
  taxReturn: initial,
}: {
  orgSlug: string
  taxReturn: TaxReturn
}) {
  const router = useRouter()
  const [tr, setTr] = useState(initial)

  const [regenerating, setRegenerating] = useState(false)
  const [regenError,   setRegenError]   = useState<string | null>(null)

  const [fileOpen,  setFileOpen]  = useState(false)
  const [ackNumber, setAckNumber] = useState("")
  const [filing,    setFiling]    = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  async function handleRegenerate() {
    setRegenerating(true)
    setRegenError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/tax/returns`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: tr.type, period: tr.period }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTr(updated)
    } else {
      const body = await res.json()
      setRegenError(body.error ?? "Regeneration failed.")
    }
    setRegenerating(false)
  }

  async function handleFile() {
    setFiling(true)
    setFileError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/tax/returns/${tr.id}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ackNumber: ackNumber.trim() || undefined }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTr(updated)
      setFileOpen(false)
      router.refresh()
    } else {
      const body = await res.json()
      setFileError(body.error ?? "Filing failed.")
    }
    setFiling(false)
  }

  const isFiled = tr.status === "filed"

  return (
    <div className="w-full min-w-0">
      {/* Status bar */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="flex items-center gap-3">
          <Badge
            variant={isFiled ? "default" : "secondary"}
            className="text-sm px-3 py-1 capitalize"
          >
            {isFiled && <CheckCircle2 className="size-3.5 mr-1.5" />}
            {tr.status}
          </Badge>
          {isFiled && tr.filedAt && (
            <span className="text-xs text-[#605A57]">
              Filed {new Date(tr.filedAt).toLocaleDateString("en-IN")}
              {tr.ackNumber && ` · Ack: ${tr.ackNumber}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isFiled && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Regenerating…</>
                ) : (
                  <><RefreshCw className="size-3.5 mr-1.5" />Regenerate</>
                )}
              </Button>
              <Button size="sm" onClick={() => { setFileOpen(true); setFileError(null) }}>
                Mark as filed
              </Button>
            </>
          )}
        </div>
      </div>

      {regenError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
          {regenError}
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
        {[
          { label: "Return type",  value: tr.type   },
          { label: "Period",       value: tr.period  },
          { label: "Generated",    value: new Date(tr.createdAt).toLocaleDateString("en-IN") },
          { label: "Last updated", value: new Date(tr.updatedAt).toLocaleDateString("en-IN") },
        ].map((m) => (
          <div key={m.label} className="rounded border border-[rgba(55,50,47,0.10)] bg-white px-3 py-2.5">
            <p className="text-[#8B8580] mb-0.5">{m.label}</p>
            <p className="font-medium text-[#37322F] font-mono">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Data */}
      <SummaryGrid data={tr.data} type={tr.type} />

      {/* Link to workpaper */}
      {(tr.type === "GSTR1" || tr.type === "GSTR3B") && (
        <div className="flex gap-2">
          <a
            href={`/${orgSlug}/tax/${tr.type.toLowerCase()}?period=${tr.period}`}
            className="text-xs text-[#37322F] underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Open {tr.type} workpaper →
          </a>
        </div>
      )}

      {/* File dialog */}
      <Dialog open={fileOpen} onOpenChange={(o) => { setFileOpen(o); setFileError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark return as filed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            <p className="text-sm text-[#605A57]">
              This will mark the return as <strong>filed</strong> and lock the corresponding
              accounting period. This action cannot be reversed.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="ackNo">Acknowledgement number (optional)</Label>
              <Input
                id="ackNo"
                value={ackNumber}
                onChange={(e) => setAckNumber(e.target.value)}
                placeholder="ARN/reference from GST portal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileOpen(false)} disabled={filing}>Cancel</Button>
            <Button onClick={handleFile} disabled={filing}>
              {filing ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Filing…</> : "Confirm filing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
