"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function NewBankAccountPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()

  const [accounts,      setAccounts]      = useState<{ id: string; name: string; code: string; subtype: string }[]>([])
  const [loadedAccts,   setLoadedAccts]   = useState(false)

  const [chartAccountId, setChartAccountId] = useState("")
  const [bankName,       setBankName]       = useState("")
  const [maskedNumber,   setMaskedNumber]   = useState("")
  const [ifscCode,       setIfscCode]       = useState("")
  const [swiftCode,      setSwiftCode]      = useState("")
  const [currency,       setCurrency]       = useState("INR")

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  async function loadAccounts() {
    if (loadedAccts) return
    const res  = await fetch(`/api/organizations/${orgSlug}/accounts?subtype=BANK,CASH&isPosting=true`)
    const data = await res.json()
    setAccounts((data.accounts ?? data).filter((a: any) => ["BANK", "CASH"].includes(a.subtype)))
    setLoadedAccts(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/bank-accounts`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chartAccountId, bankName, maskedNumber, ifscCode, swiftCode, currency }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Failed to save."); return }
    router.push(`/${orgSlug}/bank-accounts/${data.id}`)
  }

  const label = "block text-xs font-medium text-[#605A57] mb-1"
  const input = "w-full rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2 text-sm text-[#37322F] focus:outline-none focus:ring-1 focus:ring-primary"

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <a href={`/${orgSlug}/bank-accounts`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Bank Accounts
        </a>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <span className="text-sm font-medium text-[#37322F]">Link Bank Account</span>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
          )}

          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-[#37322F]">Account details</p>

            <div>
              <label className={label}>Chart account (Bank / Cash) *</label>
              <select
                className={input}
                value={chartAccountId}
                onClick={loadAccounts}
                onChange={(e) => setChartAccountId(e.target.value)}
                required
              >
                <option value="">— Select chart account —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.code}) — {a.subtype}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-[#605A57]">Only Bank and Cash type accounts are shown.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>Bank name *</label>
                <input type="text" className={input} placeholder="e.g. HDFC Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              </div>
              <div>
                <label className={label}>Account number (last 4 digits) *</label>
                <input type="text" className={input} placeholder="e.g. 4321" maxLength={20} value={maskedNumber} onChange={(e) => setMaskedNumber(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>IFSC code</label>
                <input type="text" className={input} placeholder="e.g. HDFC0001234" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
              </div>
              <div>
                <label className={label}>SWIFT code</label>
                <input type="text" className={input} placeholder="e.g. HDFCINBB" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={label}>Currency</label>
              <input type="text" className={input} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <a href={`/${orgSlug}/bank-accounts`} className="rounded-md border border-[rgba(55,50,47,0.18)] px-4 py-2 text-sm text-[#605A57] hover:bg-[#F7F5F3]">
              Cancel
            </a>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Saving…" : "Link Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
