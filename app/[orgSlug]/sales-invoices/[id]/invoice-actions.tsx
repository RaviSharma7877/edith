"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export function InvoiceActions({
  orgSlug,
  invoiceId,
  status,
  isCreditNote,
  eInvoiceStatus,
  irnNumber,
  eWayBillNumber,
  eWayBillExpiry,
}: {
  orgSlug: string
  invoiceId: string
  status: string
  isCreditNote: boolean
  eInvoiceStatus?: string | null
  irnNumber?: string | null
  eWayBillNumber?: string | null
  eWayBillExpiry?: string | null
}) {
  const router = useRouter()

  const [posting,    setPosting]    = useState(false)
  const [postError,  setPostError]  = useState<string | null>(null)

  const [voidOpen,   setVoidOpen]   = useState(false)
  const [voiding,    setVoiding]    = useState(false)
  const [voidError,  setVoidError]  = useState<string | null>(null)

  const [cnOpen,     setCnOpen]     = useState(false)
  const [cnReason,   setCnReason]   = useState("")
  const [cnning,     setCnning]     = useState(false)
  const [cnError,    setCnError]    = useState<string | null>(null)

  // E-invoice state
  const [eInvStatus, setEInvStatus] = useState(eInvoiceStatus ?? null)
  const [irn,        setIrn]        = useState(irnNumber ?? null)
  const [eInvBusy,   setEInvBusy]  = useState(false)
  const [eInvError,  setEInvError] = useState<string | null>(null)

  // E-way bill state
  const [ewbOpen,    setEwbOpen]   = useState(false)
  const [ewbNumber,  setEwbNumber] = useState(eWayBillNumber ?? null)
  const [ewbExpiry,  setEwbExpiry] = useState(eWayBillExpiry ?? null)
  const [ewbBusy,    setEwbBusy]  = useState(false)
  const [ewbError,   setEwbError] = useState<string | null>(null)
  const [ewbForm,    setEwbForm]  = useState({
    transportMode: "ROAD", vehicleNo: "", transporter: "", distanceKm: "100",
  })

  async function handlePost() {
    setPosting(true)
    setPostError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/post`, {
      method: "POST",
    })
    if (res.ok) {
      router.refresh()
    } else {
      const body = await res.json()
      setPostError(body.error ?? "Post failed.")
    }
    setPosting(false)
  }

  async function handleVoid() {
    setVoiding(true)
    setVoidError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/void`, {
      method: "POST",
    })
    if (res.ok) {
      setVoidOpen(false)
      router.refresh()
    } else {
      const body = await res.json()
      setVoidError(body.error ?? "Void failed.")
    }
    setVoiding(false)
  }

  async function handleCreditNote() {
    setCnning(true)
    setCnError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/credit-note`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason: cnReason || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setCnOpen(false)
      router.push(`/${orgSlug}/sales-invoices/${data.id}`)
    } else {
      const body = await res.json()
      setCnError(body.error ?? "Credit note creation failed.")
      setCnning(false)
    }
  }

  async function handleGenEInvoice() {
    setEInvBusy(true)
    setEInvError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/einvoice`, {
      method: "POST",
    })
    if (res.ok) {
      const body = await res.json()
      setEInvStatus("generated")
      setIrn(body.irnNumber)
      router.refresh()
    } else {
      const body = await res.json()
      setEInvError(body.error ?? "E-invoice generation failed.")
    }
    setEInvBusy(false)
  }

  async function handleCancelEInvoice() {
    if (!confirm("Cancel this e-invoice? The IRN will be marked cancelled.")) return
    setEInvBusy(true)
    setEInvError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/einvoice`, {
      method: "DELETE",
    })
    if (res.ok) {
      setEInvStatus("cancelled")
      setIrn(null)
      router.refresh()
    } else {
      const body = await res.json()
      setEInvError(body.error ?? "Cancellation failed.")
    }
    setEInvBusy(false)
  }

  async function handleGenEWB() {
    setEwbBusy(true)
    setEwbError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/ewaybill`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        transportMode: ewbForm.transportMode,
        vehicleNo:     ewbForm.vehicleNo.trim()     || undefined,
        transporter:   ewbForm.transporter.trim()   || undefined,
        distanceKm:    ewbForm.distanceKm           || 100,
      }),
    })
    if (res.ok) {
      const body = await res.json()
      setEwbNumber(body.eWayBillNumber)
      setEwbExpiry(body.expiry)
      setEwbOpen(false)
      router.refresh()
    } else {
      const body = await res.json()
      setEwbError(body.error ?? "E-way bill generation failed.")
    }
    setEwbBusy(false)
  }

  async function handleCancelEWB() {
    if (!confirm("Cancel this e-way bill?")) return
    setEwbBusy(true)
    setEwbError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/sales-invoices/${invoiceId}/ewaybill`, {
      method: "DELETE",
    })
    if (res.ok) {
      setEwbNumber(null)
      setEwbExpiry(null)
      router.refresh()
    } else {
      const body = await res.json()
      setEwbError(body.error ?? "Cancellation failed.")
    }
    setEwbBusy(false)
  }

  const canPost       = status === "DRAFT" || status === "PENDING_APPROVAL"
  const canVoid       = status === "DRAFT" || status === "POSTED"
  const canCN         = status === "POSTED" && !isCreditNote
  const canEInvoice   = status === "POSTED" && eInvStatus !== "generated"
  const hasEInvoice   = eInvStatus === "generated"
  const canEWB        = status === "POSTED" && !ewbNumber
  const hasEWB        = !!ewbNumber

  return (
    <div className="flex flex-col gap-3">
      {/* E-invoice status strip */}
      {hasEInvoice && irn && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 flex items-center gap-2">
          <Badge variant="default" className="text-[10px] bg-blue-600">E-Invoice</Badge>
          <span className="text-xs font-mono text-blue-800 truncate">{irn}</span>
        </div>
      )}

      {/* E-way bill status strip */}
      {hasEWB && ewbNumber && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 flex items-center gap-2">
          <Badge variant="default" className="text-[10px] bg-green-600">E-Way Bill</Badge>
          <span className="text-xs font-mono text-green-800">{ewbNumber}</span>
          {ewbExpiry && (
            <span className="text-[10px] text-green-700 ml-auto">
              Expires {new Date(ewbExpiry).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>
      )}

    <div className="flex items-center gap-2 flex-wrap">
      {/* Post */}
      {canPost && (
        <>
          <Button size="sm" disabled={posting} onClick={handlePost}>
            {posting ? "Posting…" : status === "PENDING_APPROVAL" ? "Approve & post" : "Post"}
          </Button>
          {postError && <span className="text-xs text-destructive max-w-xs">{postError}</span>}
        </>
      )}

      {/* Credit note */}
      {canCN && (
        <Button variant="outline" size="sm" onClick={() => setCnOpen(true)}>
          Credit note
        </Button>
      )}

      {/* Void */}
      {canVoid && (
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setVoidOpen(true)}>
          Void
        </Button>
      )}

      {/* E-invoice */}
      {canEInvoice && (
        <Button variant="outline" size="sm" onClick={handleGenEInvoice} disabled={eInvBusy}>
          {eInvBusy ? "Generating…" : "Generate e-invoice"}
        </Button>
      )}
      {hasEInvoice && (
        <Button variant="outline" size="sm" className="text-amber-700 hover:text-amber-700 border-amber-300" onClick={handleCancelEInvoice} disabled={eInvBusy}>
          Cancel e-invoice
        </Button>
      )}
      {eInvError && <span className="text-xs text-destructive max-w-xs">{eInvError}</span>}

      {/* E-way bill */}
      {canEWB && (
        <Button variant="outline" size="sm" onClick={() => { setEwbOpen(true); setEwbError(null) }}>
          Generate e-way bill
        </Button>
      )}
      {hasEWB && (
        <Button variant="outline" size="sm" className="text-amber-700 hover:text-amber-700 border-amber-300" onClick={handleCancelEWB} disabled={ewbBusy}>
          Cancel e-way bill
        </Button>
      )}
      {ewbError && !ewbOpen && <span className="text-xs text-destructive max-w-xs">{ewbError}</span>}
    </div>

      {/* E-way bill dialog */}
      <Dialog open={ewbOpen} onOpenChange={(o) => { setEwbOpen(o); setEwbError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate E-Way Bill</DialogTitle>
            <DialogDescription>
              Required for consignments ≥ ₹50,000. Validity is 1 day per 100 km.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {ewbError && <p className="text-sm text-destructive">{ewbError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ewbMode">Transport mode</Label>
                <select
                  id="ewbMode"
                  value={ewbForm.transportMode}
                  onChange={(e) => setEwbForm((f) => ({ ...f, transportMode: e.target.value }))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["ROAD", "RAIL", "AIR", "SHIP"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ewbDist">Distance (km)</Label>
                <Input
                  id="ewbDist"
                  type="number"
                  min="1"
                  value={ewbForm.distanceKm}
                  onChange={(e) => setEwbForm((f) => ({ ...f, distanceKm: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ewbVehicle">Vehicle number (optional)</Label>
              <Input
                id="ewbVehicle"
                value={ewbForm.vehicleNo}
                onChange={(e) => setEwbForm((f) => ({ ...f, vehicleNo: e.target.value }))}
                placeholder="MH12AB1234"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ewbTransporter">Transporter ID (optional)</Label>
              <Input
                id="ewbTransporter"
                value={ewbForm.transporter}
                onChange={(e) => setEwbForm((f) => ({ ...f, transporter: e.target.value }))}
                placeholder="Transporter GSTIN or name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEwbOpen(false)} disabled={ewbBusy}>Cancel</Button>
            <Button onClick={handleGenEWB} disabled={ewbBusy}>
              {ewbBusy ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void dialog */}
      <Dialog open={voidOpen} onOpenChange={(o) => { setVoidOpen(o); setVoidError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>
              The invoice will be permanently voided and cannot be posted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {voidError && <p className="text-sm text-destructive">{voidError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)} disabled={voiding}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
              {voiding ? "Voiding…" : "Void invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit note dialog */}
      <Dialog open={cnOpen} onOpenChange={(o) => { setCnOpen(o); setCnError(null); setCnReason("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create credit note</DialogTitle>
            <DialogDescription>
              A new draft credit note will be created for the full amount of this invoice.
              You can adjust line items before posting it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {cnError && <p className="text-sm text-destructive">{cnError}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="cnReason">Reason (optional)</Label>
              <Textarea
                id="cnReason"
                value={cnReason}
                onChange={(e) => setCnReason(e.target.value)}
                rows={3}
                placeholder="Why is this credit note being issued?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCnOpen(false)} disabled={cnning}>Cancel</Button>
            <Button onClick={handleCreditNote} disabled={cnning}>
              {cnning ? "Creating…" : "Create credit note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
