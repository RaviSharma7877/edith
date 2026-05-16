"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface OpenInvoice {
  id:            string
  invoiceNumber: string
  invoiceDate:   string
  totalAmount:   string | number
  amountDue:     string | number
  customer:      { name: string }
}

interface OpenBill {
  id:          string
  billNumber:  string
  billDate:    string
  totalAmount: string | number
  amountDue:   string | number
  vendor:      { name: string }
}

interface Allocation {
  id:             string
  amount:         string | number
  discountAmount: string | number
  invoiceId:      string | null
  billId:         string | null
  invoice:        { id: string; invoiceNumber: string; totalAmount: string | number } | null
  bill:           { id: string; billNumber: string; totalAmount: string | number } | null
}

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function AllocationsClient({
  orgSlug,
  paymentId,
  paymentType,
  paymentStatus,
  existingAllocations,
  openInvoices,
  openBills,
}: {
  orgSlug:             string
  paymentId:           string
  paymentType:         string
  paymentStatus:       string
  existingAllocations: Allocation[]
  openInvoices:        OpenInvoice[]
  openBills:           OpenBill[]
}) {
  const router = useRouter()

  const [allocating,    setAllocating]    = useState<string | null>(null)
  const [amounts,       setAmounts]       = useState<Record<string, string>>({})
  const [discounts,     setDiscounts]     = useState<Record<string, string>>({})
  const [saving,        setSaving]        = useState(false)
  const [removing,      setRemoving]      = useState<string | null>(null)
  const [error,         setError]         = useState("")

  const canAllocate = paymentStatus === "POSTED"

  async function allocate(invoiceId?: string, billId?: string) {
    const docId  = invoiceId ?? billId ?? ""
    const amount = amounts[docId]
    if (!amount || parseFloat(amount) <= 0) { setError("Enter an amount to allocate."); return }

    setSaving(true); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/payments/${paymentId}/allocate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        billId,
        amount,
        discountAmount: discounts[docId] || "0",
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Failed to allocate."); return }
    setAllocating(null)
    setAmounts((a) => { const n = { ...a }; delete n[docId]; return n })
    setDiscounts((d) => { const n = { ...d }; delete n[docId]; return n })
    router.refresh()
  }

  async function removeAllocation(allocationId: string) {
    setRemoving(allocationId); setError("")
    const res  = await fetch(
      `/api/organizations/${orgSlug}/payments/${paymentId}/allocate?allocationId=${allocationId}`,
      { method: "DELETE" },
    )
    const data = await res.json()
    setRemoving(null)
    if (!res.ok) { setError(data.error ?? "Failed to remove."); return }
    router.refresh()
  }

  const showInvoices = paymentType === "receipt"      && openInvoices.length > 0
  const showBills    = paymentType === "disbursement" && openBills.length > 0

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {/* Existing allocations */}
      {existingAllocations.length > 0 && (
        <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
          <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
            <p className="text-sm font-semibold text-[#37322F]">Allocations</p>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_auto] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Document</span>
            <span className="text-right">Doc Total</span>
            <span className="text-right">Allocated</span>
            <span className="text-right">Discount</span>
            <span />
          </div>
          {existingAllocations.map((a) => (
            <div key={a.id} className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-[#37322F]">
                {a.invoice?.invoiceNumber ?? a.bill?.billNumber ?? "—"}
              </span>
              <span className="text-right font-mono text-xs text-[#605A57]">
                ₹{fmt(a.invoice?.totalAmount ?? a.bill?.totalAmount)}
              </span>
              <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(a.amount)}</span>
              <span className="text-right font-mono text-xs text-[#605A57]">
                {Number(a.discountAmount) > 0 ? `₹${fmt(a.discountAmount)}` : "—"}
              </span>
              {canAllocate && (
                <button
                  onClick={() => removeAllocation(a.id)}
                  disabled={removing === a.id}
                  className="text-xs text-destructive hover:underline disabled:opacity-40"
                >
                  {removing === a.id ? "…" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add allocation */}
      {canAllocate && (showInvoices || showBills) && (
        <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
          <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
            <p className="text-sm font-semibold text-[#37322F]">
              Open {showInvoices ? "Invoices" : "Bills"}
            </p>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr_0.9fr_0.7fr_0.7fr_auto] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Number</span>
            <span>{showInvoices ? "Customer" : "Vendor"}</span>
            <span className="text-right">Due</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Discount</span>
            <span />
          </div>
          {showInvoices && openInvoices.map((inv) => (
            <div key={inv.id} className="grid grid-cols-[1.5fr_1fr_0.9fr_0.7fr_0.7fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-[#37322F]">{inv.invoiceNumber}</span>
              <span className="truncate text-xs text-[#605A57]">{inv.customer.name}</span>
              <span className="text-right font-mono text-xs text-destructive">₹{fmt(inv.amountDue)}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="rounded border border-[rgba(55,50,47,0.18)] px-2 py-1 text-right text-xs w-full"
                placeholder="0.00"
                value={amounts[inv.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [inv.id]: e.target.value }))}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded border border-[rgba(55,50,47,0.18)] px-2 py-1 text-right text-xs w-full"
                placeholder="0.00"
                value={discounts[inv.id] ?? ""}
                onChange={(e) => setDiscounts((d) => ({ ...d, [inv.id]: e.target.value }))}
              />
              <button
                onClick={() => allocate(inv.id, undefined)}
                disabled={saving}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-40 whitespace-nowrap"
              >
                Allocate
              </button>
            </div>
          ))}
          {showBills && openBills.map((bill) => (
            <div key={bill.id} className="grid grid-cols-[1.5fr_1fr_0.9fr_0.7fr_0.7fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-[#37322F]">{bill.billNumber}</span>
              <span className="truncate text-xs text-[#605A57]">{bill.vendor.name}</span>
              <span className="text-right font-mono text-xs text-destructive">₹{fmt(bill.amountDue)}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="rounded border border-[rgba(55,50,47,0.18)] px-2 py-1 text-right text-xs w-full"
                placeholder="0.00"
                value={amounts[bill.id] ?? ""}
                onChange={(e) => setAmounts((a) => ({ ...a, [bill.id]: e.target.value }))}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded border border-[rgba(55,50,47,0.18)] px-2 py-1 text-right text-xs w-full"
                placeholder="0.00"
                value={discounts[bill.id] ?? ""}
                onChange={(e) => setDiscounts((d) => ({ ...d, [bill.id]: e.target.value }))}
              />
              <button
                onClick={() => allocate(undefined, bill.id)}
                disabled={saving}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-40 whitespace-nowrap"
              >
                Allocate
              </button>
            </div>
          ))}
        </div>
      )}

      {canAllocate && !showInvoices && !showBills && existingAllocations.length === 0 && (
        <p className="text-sm text-[#605A57]">No open {paymentType === "receipt" ? "invoices" : "bills"} to allocate.</p>
      )}
    </div>
  )
}
