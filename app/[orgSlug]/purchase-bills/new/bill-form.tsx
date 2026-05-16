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

type Vendor  = { id: string; name: string; code: string | null; paymentTerms: number | null }
type Account = { id: string; code: string; name: string }

type Line = {
  key: string
  description: string
  hsnCode: string
  quantity: string
  unit: string
  unitPrice: string
  taxRate: string
  accountId: string
}

function emptyLine(key: string): Line {
  return { key, description: "", hsnCode: "", quantity: "1", unit: "", unitPrice: "", taxRate: "", accountId: "" }
}

function lineTotal(l: Line) {
  const qty  = parseFloat(l.quantity)  || 0
  const rate = parseFloat(l.unitPrice) || 0
  const taxR = parseFloat(l.taxRate)   || 0
  const base = qty * rate
  const tax  = base * (taxR / 100)
  return { base, tax, total: base + tax }
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function defaultDueDate(terms: number | null) {
  const d = new Date()
  d.setDate(d.getDate() + (terms ?? 30))
  return d.toISOString().slice(0, 10)
}

export function BillForm({
  orgSlug, vendors, accounts, prefillVendorId,
}: {
  orgSlug: string
  vendors: Vendor[]
  accounts: Account[]
  prefillVendorId?: string
}) {
  const router = useRouter()
  const uid    = useId()

  const initial = vendors.find((v) => v.id === prefillVendorId) ?? null

  const [vendorId,      setVendorId]     = useState(prefillVendorId ?? "")
  const [billDate,      setBillDate]     = useState(new Date().toISOString().slice(0, 10))
  const [dueDate,       setDueDate]      = useState(defaultDueDate(initial?.paymentTerms ?? null))
  const [vendorBillRef, setVendorBillRef] = useState("")
  const [placeOfSupply, setPlaceOfSupply] = useState("")
  const [notes,         setNotes]        = useState("")
  const [lines,         setLines]        = useState<Line[]>([emptyLine(`${uid}-0`)])
  const [saving,        setSaving]       = useState(false)
  const [error,         setError]        = useState<string | null>(null)

  const totals = lines.reduce(
    (acc, l) => {
      const { base, tax, total } = lineTotal(l)
      acc.subtotal  += base
      acc.taxAmount += tax
      acc.total     += total
      return acc
    },
    { subtotal: 0, taxAmount: 0, total: 0 },
  )

  function addLine() { setLines((p) => [...p, emptyLine(`${uid}-${Date.now()}`)]) }
  function removeLine(key: string) { setLines((p) => p.filter((l) => l.key !== key)) }
  function updateLine(key: string, field: keyof Line, value: string) {
    setLines((p) => p.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }

  function onVendorChange(id: string) {
    setVendorId(id)
    const v = vendors.find((x) => x.id === id)
    if (v) setDueDate(defaultDueDate(v.paymentTerms))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vendorId) { setError("Please select a vendor."); return }
    if (!lines.some((l) => l.description.trim())) { setError("At least one line with a description is required."); return }

    setSaving(true)
    setError(null)

    const payload = {
      vendorId,
      billDate,
      dueDate:      dueDate || null,
      vendorBillRef: vendorBillRef || null,
      placeOfSupply: placeOfSupply || null,
      notes:        notes || null,
      lines: lines.map((l) => ({
        description: l.description,
        hsnCode:     l.hsnCode || null,
        quantity:    parseFloat(l.quantity)  || 1,
        unit:        l.unit || null,
        unitPrice:   parseFloat(l.unitPrice) || 0,
        taxRate:     parseFloat(l.taxRate)   || 0,
        accountId:   l.accountId || null,
      })),
    }

    const res = await fetch(`/api/organizations/${orgSlug}/purchase-bills`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/${orgSlug}/purchase-bills/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to create bill.")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <Link href={`/${orgSlug}/purchase-bills`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Purchase Bills
        </Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New bill</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Header */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Bill details</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label>Vendor *</Label>
                <Select value={vendorId} onValueChange={onVendorChange} required>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.code ? ` (${v.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billDate">Bill date *</Label>
                <Input id="billDate" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendorBillRef">Vendor bill ref</Label>
                <Input
                  id="vendorBillRef"
                  value={vendorBillRef}
                  onChange={(e) => setVendorBillRef(e.target.value)}
                  placeholder="Supplier's invoice number"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="placeOfSupply">Place of supply</Label>
                <Input
                  id="placeOfSupply"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes" />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <p className="text-sm font-semibold text-[#37322F]">Line items</p>
            </div>

            <div className="grid grid-cols-[2.5fr_0.8fr_0.7fr_0.8fr_0.7fr_0.7fr_1.2fr_1fr_auto] gap-2 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Description *</span>
              <span>HSN / SAC</span>
              <span>Qty</span>
              <span>Unit</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Tax %</span>
              <span>Account</span>
              <span className="text-right">Total</span>
              <span className="w-7" />
            </div>

            {lines.map((line) => {
              const { total } = lineTotal(line)
              return (
                <div
                  key={line.key}
                  className="grid grid-cols-[2.5fr_0.8fr_0.7fr_0.8fr_0.7fr_0.7fr_1.2fr_1fr_auto] items-center gap-2 border-b border-[rgba(55,50,47,0.06)] px-4 py-2"
                >
                  <Input className="h-8 text-sm" value={line.description} onChange={(e) => updateLine(line.key, "description", e.target.value)} placeholder="Description" required />
                  <Input className="h-8 text-sm font-mono" value={line.hsnCode} onChange={(e) => updateLine(line.key, "hsnCode", e.target.value)} placeholder="HSN" />
                  <Input className="h-8 text-right font-mono text-sm" type="number" min="0" step="0.0001" value={line.quantity} onChange={(e) => updateLine(line.key, "quantity", e.target.value)} placeholder="1" />
                  <Input className="h-8 text-sm" value={line.unit} onChange={(e) => updateLine(line.key, "unit", e.target.value)} placeholder="pcs" />
                  <Input className="h-8 text-right font-mono text-sm" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateLine(line.key, "unitPrice", e.target.value)} placeholder="0.00" required />
                  <Input className="h-8 text-right font-mono text-sm" type="number" min="0" max="100" step="0.01" value={line.taxRate} onChange={(e) => updateLine(line.key, "taxRate", e.target.value)} placeholder="0" />

                  {/* Expense account selector */}
                  <Select value={line.accountId} onValueChange={(v) => updateLine(line.key, "accountId", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.code} – {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-right font-mono text-sm text-[#37322F] pr-1">
                    {total > 0 ? fmt(total) : "—"}
                  </span>

                  <Button type="button" variant="ghost" size="icon" className="size-7 text-[#605A57] hover:text-destructive" onClick={() => removeLine(line.key)} disabled={lines.length <= 1}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            })}

            {/* Totals */}
            <div className="grid grid-cols-[2.5fr_0.8fr_0.7fr_0.8fr_0.7fr_0.7fr_1.2fr_1fr_auto] gap-2 border-t border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <span className="text-xs font-semibold text-[#37322F]">Totals</span>
              <span className="col-span-6" />
              <div className="space-y-0.5 text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-[#605A57]">Subtotal</span>
                  <span className="font-mono font-medium text-[#37322F]">{fmt(totals.subtotal)}</span>
                </div>
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[#605A57]">Tax</span>
                    <span className="font-mono font-medium text-[#37322F]">{fmt(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[rgba(55,50,47,0.10)] pt-0.5 text-xs">
                  <span className="font-semibold text-[#37322F]">Total</span>
                  <span className="font-mono font-bold text-[#37322F]">₹{fmt(totals.total)}</span>
                </div>
              </div>
              <span className="w-7" />
            </div>

            <div className="px-4 py-2 border-t border-[rgba(55,50,47,0.06)]">
              <Button type="button" variant="ghost" size="sm" className="text-[#605A57] gap-1.5" onClick={addLine}>
                <Plus className="size-3.5" /> Add line
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save as draft"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
