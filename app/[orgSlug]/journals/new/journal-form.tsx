"use client"

import { useState, useId } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Account = { id: string; code: string; name: string; type: string }

type Line = {
  key: string
  accountId: string
  direction: "DEBIT" | "CREDIT"
  amount: string
  description: string
}

const VOUCHER_TYPES = [
  { value: "JOURNAL_ENTRY",        label: "Journal Entry" },
  { value: "PAYMENT_RECEIPT",      label: "Receipt Voucher" },
  { value: "PAYMENT_DISBURSEMENT", label: "Payment Voucher" },
  { value: "SALES_INVOICE",        label: "Sales Invoice" },
  { value: "PURCHASE_BILL",        label: "Purchase Bill" },
  { value: "CREDIT_NOTE",          label: "Credit Note" },
  { value: "DEBIT_NOTE",           label: "Debit Note" },
  { value: "CONTRA",               label: "Contra Entry" },
  { value: "OPENING_BALANCE",      label: "Opening Balance" },
]

function emptyLine(key: string): Line {
  return { key, accountId: "", direction: "DEBIT", amount: "", description: "" }
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function JournalEntryForm({
  orgSlug,
  accounts,
}: {
  orgSlug: string
  accounts: Account[]
}) {
  const router = useRouter()
  const uid    = useId()

  const [voucherType, setVoucherType] = useState("JOURNAL_ENTRY")
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [narration,   setNarration]   = useState("")
  const [reference,   setReference]   = useState("")
  const [lines,       setLines]       = useState<Line[]>([
    emptyLine(`${uid}-0`),
    emptyLine(`${uid}-1`),
  ])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const totalDebit  = lines.filter((l) => l.direction === "DEBIT").reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const totalCredit = lines.filter((l) => l.direction === "CREDIT").reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0

  function addLine() {
    setLines((prev) => [...prev, emptyLine(`${uid}-${Date.now()}`)])
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  function updateLine(key: string, field: keyof Line, value: string) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!balanced) { setError("Debits must equal credits before saving."); return }

    setSaving(true)
    setError(null)

    const payload = {
      voucherType, date, description, narration, reference,
      lines: lines.map((l) => ({
        accountId:   l.accountId,
        direction:   l.direction,
        amount:      parseFloat(l.amount),
        description: l.description,
      })),
    }

    const res = await fetch(`/api/organizations/${orgSlug}/journals`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/${orgSlug}/journals/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to save journal entry.")
      setSaving(false)
    }
  }

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.code} – ${a.name}`,
  }))

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <Link href={`/${orgSlug}/journals`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Journals
        </Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New journal entry</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Header fields */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Entry details</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Voucher type *</Label>
                <Select value={voucherType} onValueChange={setVoucherType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Invoice #, cheque no., etc."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this entry"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narration">Narration</Label>
              <Textarea
                id="narration"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                rows={2}
                placeholder="Optional detailed narration"
              />
            </div>
          </div>

          {/* Lines grid */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <p className="text-sm font-semibold text-[#37322F]">Journal lines</p>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Account *</span>
              <span>Direction *</span>
              <span>Amount *</span>
              <span>Description</span>
              <span className="w-7" />
            </div>

            {/* Lines */}
            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2"
              >
                {/* Account selector */}
                <Select
                  value={line.accountId}
                  onValueChange={(v) => updateLine(line.key, "accountId", v)}
                  required
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {accountOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Direction */}
                <Select
                  value={line.direction}
                  onValueChange={(v) => updateLine(line.key, "direction", v as "DEBIT" | "CREDIT")}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Dr</SelectItem>
                    <SelectItem value="CREDIT">Cr</SelectItem>
                  </SelectContent>
                </Select>

                {/* Amount */}
                <Input
                  className="h-8 text-right font-mono text-sm"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(line.key, "amount", e.target.value)}
                  placeholder="0.00"
                  required
                />

                {/* Line description */}
                <Input
                  className="h-8 text-sm"
                  value={line.description}
                  onChange={(e) => updateLine(line.key, "description", e.target.value)}
                  placeholder="Optional"
                />

                {/* Remove */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-[#605A57] hover:text-destructive"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}

            {/* Totals row */}
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] items-center gap-3 border-t border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <span className="text-xs font-semibold text-[#37322F]">Total</span>
              <span />
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#605A57]">Dr</span>
                  <span className="font-mono font-medium text-[#37322F]">{fmt(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#605A57]">Cr</span>
                  <span className="font-mono font-medium text-[#37322F]">{fmt(totalCredit)}</span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                {totalDebit > 0 && (
                  <span className={`text-xs font-medium ${balanced ? "text-green-600" : "text-destructive"}`}>
                    {balanced ? "✓ Balanced" : `Out of balance by ${fmt(Math.abs(totalDebit - totalCredit))}`}
                  </span>
                )}
              </div>
            </div>

            {/* Add line */}
            <div className="px-4 py-2 border-t border-[rgba(55,50,47,0.06)]">
              <Button type="button" variant="ghost" size="sm" className="text-[#605A57] gap-1.5" onClick={addLine}>
                <Plus className="size-3.5" /> Add line
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || !balanced}>
              {saving ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
