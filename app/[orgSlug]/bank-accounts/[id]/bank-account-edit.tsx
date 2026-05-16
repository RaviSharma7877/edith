"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Account {
  id:           string
  bankName:     string
  maskedNumber: string
  ifscCode:     string | null
  swiftCode:    string | null
  currency:     string
  isActive:     boolean
  currentBalance: string | number
  chartAccount: { id: string; name: string; code: string; subtype: string }
}

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BankAccountEdit({
  orgSlug,
  account,
}: {
  orgSlug: string
  account: Account
}) {
  const router = useRouter()

  const [bankName,     setBankName]     = useState(account.bankName)
  const [maskedNumber, setMaskedNumber] = useState(account.maskedNumber)
  const [ifscCode,     setIfscCode]     = useState(account.ifscCode ?? "")
  const [swiftCode,    setSwiftCode]    = useState(account.swiftCode ?? "")
  const [currency,     setCurrency]     = useState(account.currency)
  const [isActive,     setIsActive]     = useState(account.isActive)

  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState("")

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(""); setSaved(false)
    const res  = await fetch(`/api/organizations/${orgSlug}/bank-accounts/${account.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankName, maskedNumber, ifscCode, swiftCode, currency, isActive }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Failed to save."); return }
    setSaved(true)
    router.refresh()
  }

  const label = "block text-xs font-medium text-[#605A57] mb-1"
  const input = "w-full rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2 text-sm text-[#37322F] focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error  && <div className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>}
      {saved  && <div className="rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-700">Saved successfully.</div>}

      {/* Linked chart account — read-only */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-1">
        <p className="text-xs text-[#605A57]">Linked chart account</p>
        <p className="text-sm font-medium text-[#37322F]">{account.chartAccount.name}</p>
        <p className="font-mono text-xs text-[#605A57]">{account.chartAccount.code} — {account.chartAccount.subtype}</p>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[#37322F]">Account details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Bank name *</label>
            <input type="text" className={input} value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Account number (last 4)</label>
            <input type="text" className={input} value={maskedNumber} onChange={(e) => setMaskedNumber(e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>IFSC code</label>
            <input type="text" className={input} value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
          </div>
          <div>
            <label className={label}>SWIFT code</label>
            <input type="text" className={input} value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Currency</label>
            <input type="text" className={input} value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <div>
            <label className={label}>Current balance</label>
            <p className="mt-1 font-mono text-sm text-[#37322F]">₹{fmt(account.currentBalance)}</p>
            <p className="text-[11px] text-[#605A57]">Updated from posted journals</p>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-sm text-[#37322F]">Active</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <a href={`/${orgSlug}/bank-accounts`} className="rounded-md border border-[rgba(55,50,47,0.18)] px-4 py-2 text-sm text-[#605A57] hover:bg-[#F7F5F3]">
          Back
        </a>
        <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  )
}
