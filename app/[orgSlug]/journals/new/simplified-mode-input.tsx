"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type SimplifiedLine = {
  debitAccountId:  string
  creditAccountId: string
  amount:          string
}

interface Account { id: string; code: string; name: string }

interface Props {
  value:       SimplifiedLine
  onChange:    (v: SimplifiedLine) => void
  accounts:    Account[]
  amountLabel: string
}

export function SimplifiedModeInput({ value, onChange, accounts, amountLabel }: Props) {
  const opts = accounts.map((a) => ({ value: a.id, label: `${a.code} – ${a.name}` }))

  function set(field: keyof SimplifiedLine, v: string) {
    onChange({ ...value, [field]: v })
  }

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
      <div className="space-y-1.5">
        <Label>Debit account *</Label>
        <Select value={value.debitAccountId} onValueChange={(v) => set("debitAccountId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Credit account *</Label>
        <Select value={value.creditAccountId} onValueChange={(v) => set("creditAccountId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 min-w-36">
        <Label>{amountLabel || "Amount"} *</Label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          className="text-right font-mono"
          placeholder="0.00"
          value={value.amount}
          onChange={(e) => set("amount", e.target.value)}
          required
        />
      </div>
    </div>
  )
}

/** Convert a simplified input into two balanced journal lines. */
export function simplifiedToLines(v: SimplifiedLine) {
  const amount = parseFloat(v.amount) || 0
  return [
    { accountId: v.debitAccountId,  direction: "DEBIT"  as const, amount, description: "" },
    { accountId: v.creditAccountId, direction: "CREDIT" as const, amount, description: "" },
  ]
}
