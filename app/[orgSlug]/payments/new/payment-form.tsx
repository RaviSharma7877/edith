"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Customer { id: string; name: string; code: string | null }
interface Vendor   { id: string; name: string; code: string | null }
interface BankAcc  { id: string; bankName: string; maskedNumber: string; chartAccount: { name: string } }

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque",        label: "Cheque"        },
  { value: "cash",          label: "Cash"          },
  { value: "upi",           label: "UPI"           },
  { value: "neft",          label: "NEFT"          },
  { value: "rtgs",          label: "RTGS"          },
]

export function PaymentForm({
  orgSlug,
  customers,
  vendors,
  bankAccounts,
  prefillCustomerId,
  prefillVendorId,
}: {
  orgSlug:           string
  customers:         Customer[]
  vendors:           Vendor[]
  bankAccounts:      BankAcc[]
  prefillCustomerId?: string
  prefillVendorId?:   string
}) {
  const router = useRouter()

  const [type,          setType]          = useState("receipt")
  const [customerId,    setCustomerId]    = useState(prefillCustomerId ?? "")
  const [vendorId,      setVendorId]      = useState(prefillVendorId   ?? "")
  const [date,          setDate]          = useState(() => new Date().toISOString().split("T")[0])
  const [amount,        setAmount]        = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference,     setReference]     = useState("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [notes,         setNotes]         = useState("")

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/payments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          customerId:    type === "receipt"      ? customerId    : undefined,
          vendorId:      type === "disbursement" ? vendorId      : undefined,
          date,
          amount,
          paymentMethod: paymentMethod || undefined,
          reference:     reference.trim() || undefined,
          bankAccountId: bankAccountId   || undefined,
          notes:         notes.trim()    || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to save."); setSaving(false); return }
      router.push(`/${orgSlug}/payments/${data.id}`)
    } catch {
      setError("Network error. Please try again.")
      setSaving(false)
    }
  }

  const label = "block text-xs font-medium text-[#605A57] mb-1"
  const input = "w-full rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2 text-sm text-[#37322F] focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
      )}

      {/* Payment type */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[#37322F]">Payment type</p>
        <div className="flex gap-3">
          {[
            { value: "receipt",      label: "Receipt",      desc: "Money received from customer" },
            { value: "disbursement", label: "Disbursement", desc: "Payment made to vendor"        },
            { value: "contra",       label: "Contra",       desc: "Bank-to-bank transfer"         },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setType(opt.value); setCustomerId(""); setVendorId("") }}
              className={`flex-1 rounded-lg border px-3 py-3 text-left transition-colors ${
                type === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-[rgba(55,50,47,0.18)] hover:bg-[#F7F5F3]"
              }`}
            >
              <p className="text-sm font-medium text-[#37322F]">{opt.label}</p>
              <p className="text-[11px] text-[#605A57] mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Counterparty */}
      {type !== "contra" && (
        <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-[#37322F]">
            {type === "receipt" ? "Customer" : "Vendor"}
          </p>
          {type === "receipt" ? (
            <div>
              <label className={label}>Customer *</label>
              <select
                className={input}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={label}>Vendor *</label>
              <select
                className={input}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Payment details */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[#37322F]">Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Date *</label>
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={input}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Payment method</label>
            <select className={input} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">— Select —</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Reference / Cheque no.</label>
            <input
              type="text"
              className={input}
              placeholder="UTR / UPI ref / Cheque no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>

        {bankAccounts.length > 0 && (
          <div>
            <label className={label}>Bank account</label>
            <select className={input} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Default (from chart of accounts)</option>
              {bankAccounts.map((ba) => (
                <option key={ba.id} value={ba.id}>
                  {ba.bankName} ···{ba.maskedNumber} — {ba.chartAccount.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={label}>Notes</label>
          <textarea
            rows={2}
            className={input}
            placeholder="Internal notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a
          href={`/${orgSlug}/payments`}
          className="rounded-md border border-[rgba(55,50,47,0.18)] px-4 py-2 text-sm text-[#605A57] hover:bg-[#F7F5F3]"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save as Draft"}
        </button>
      </div>
    </form>
  )
}
