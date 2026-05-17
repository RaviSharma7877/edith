"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { SidebarTrigger } from "@/components/ui/sidebar"

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const

const SUBTYPES: Record<string, string[]> = {
  ASSET:     ["CURRENT_ASSET","FIXED_ASSET","INTANGIBLE_ASSET","BANK","CASH","ACCOUNTS_RECEIVABLE","INVENTORY","PREPAID_EXPENSE","OTHER_ASSET"],
  LIABILITY: ["CURRENT_LIABILITY","LONG_TERM_LIABILITY","ACCOUNTS_PAYABLE","TAX_PAYABLE","ACCRUED_LIABILITY"],
  EQUITY:    ["CAPITAL","RETAINED_EARNINGS","DRAWING"],
  REVENUE:   ["OPERATING_REVENUE","OTHER_REVENUE"],
  EXPENSE:   ["OPERATING_EXPENSE","COST_OF_GOODS_SOLD","TAX_EXPENSE","OTHER_EXPENSE"],
}

export default function NewAccountPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const router = useRouter()

  const [form, setForm] = useState({
    code: "", name: "", type: "", subtype: "", description: "",
    parentId: "", isPosting: true, openingBalance: "",
    isTaxAccount: false, isBankAccount: false, isCashAccount: false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/organizations/${orgSlug}/accounts`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : undefined,
        parentId:       form.parentId || undefined,
      }),
    })

    if (res.ok) {
      router.push(`/${orgSlug}/accounts`)
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to create account.")
      setSaving(false)
    }
  }

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <Link href={`/${orgSlug}/accounts`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Accounts
        </Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New account</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Account code *</Label>
              <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="1000" required />
            </div>
            <div className="space-y-1.5 col-span-1" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Account name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Cash at Bank" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Account type *</Label>
              <Select value={form.type} onValueChange={(v) => { set("type", v); set("subtype", "") }} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subtype *</Label>
              <Select
                value={form.subtype}
                onValueChange={(v) => set("subtype", v)}
                disabled={!form.type}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select subtype" /></SelectTrigger>
                <SelectContent>
                  {(SUBTYPES[form.type] ?? []).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentId">Parent account ID <span className="text-[#605A57] text-xs">(optional)</span></Label>
            <Input
              id="parentId"
              value={form.parentId}
              onChange={(e) => set("parentId", e.target.value)}
              placeholder="Paste parent account ID"
            />
            <p className="text-xs text-[#605A57]">Leave blank to create a root-level account.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="openingBalance">Opening balance</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              value={form.openingBalance}
              onChange={(e) => set("openingBalance", e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-3 rounded-md border border-[rgba(55,50,47,0.10)] p-4">
            <p className="text-sm font-medium text-[#37322F]">Account flags</p>
            {[
              { field: "isPosting",    label: "Posting account (can receive journal lines)" },
              { field: "isBankAccount", label: "Bank account" },
              { field: "isCashAccount", label: "Cash account" },
              { field: "isTaxAccount",  label: "Tax account" },
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center gap-2">
                <Checkbox
                  id={field}
                  checked={(form as Record<string, unknown>)[field] as boolean}
                  onCheckedChange={(v) => set(field, v)}
                />
                <Label htmlFor={field} className="font-normal cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create account"}
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
