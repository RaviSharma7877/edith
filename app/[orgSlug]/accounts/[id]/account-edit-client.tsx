"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Account = {
  id: string; code: string; name: string; description: string | null
  type: string; subtype: string; parentId: string | null
  isPosting: boolean; isActive: boolean; isSystemAccount: boolean
  isBankAccount: boolean; isCashAccount: boolean; isTaxAccount: boolean
  openingBalance: string | null
  parent: { id: string; code: string; name: string } | null
  children: Array<{ id: string; code: string; name: string; isPosting: boolean; isActive: boolean }>
  _count: { journalLines: number }
}

export function AccountEditClient({
  orgSlug,
  account,
}: {
  orgSlug: string
  account: Account
}) {
  const router = useRouter()

  const [form, setForm] = useState({
    name:           account.name,
    description:    account.description ?? "",
    isPosting:      account.isPosting,
    isActive:       account.isActive,
    isTaxAccount:   account.isTaxAccount,
    isBankAccount:  account.isBankAccount,
    isCashAccount:  account.isCashAccount,
    openingBalance: account.openingBalance ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const res = await fetch(`/api/organizations/${orgSlug}/accounts/${account.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : null,
      }),
    })

    if (res.ok) {
      setSuccess(true)
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? "Save failed.")
    }
    setSaving(false)
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/accounts`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Accounts
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <div>
            <span className="font-mono text-sm text-[#605A57]">{account.code}</span>
            <span className="mx-2 text-[rgba(55,50,47,0.30)]">–</span>
            <span className="font-semibold text-[#37322F]">{account.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account.isActive ? "default" : "secondary"}>
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
          {account.isSystemAccount && (
            <Badge variant="outline" className="text-xs">System</Badge>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-8">

          {/* Read-only identity row */}
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
            <div>
              <p className="text-xs text-[#605A57]">Code</p>
              <p className="mt-0.5 font-mono font-medium text-[#37322F]">{account.code}</p>
            </div>
            <div>
              <p className="text-xs text-[#605A57]">Type</p>
              <p className="mt-0.5 text-sm font-medium text-[#37322F]">{account.type}</p>
            </div>
            <div>
              <p className="text-xs text-[#605A57]">Subtype</p>
              <p className="mt-0.5 text-sm text-[#37322F]">{account.subtype.replace(/_/g, " ")}</p>
            </div>
            {account.parent && (
              <div className="col-span-3">
                <p className="text-xs text-[#605A57]">Parent account</p>
                <Link
                  href={`/${orgSlug}/accounts/${account.parent.id}`}
                  className="mt-0.5 text-sm font-medium text-[#37322F] underline underline-offset-2"
                >
                  {account.parent.code} – {account.parent.name}
                </Link>
              </div>
            )}
            <div>
              <p className="text-xs text-[#605A57]">Journal lines</p>
              <p className="mt-0.5 text-sm text-[#37322F]">{account._count.journalLines}</p>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
            <p className="font-semibold text-[#37322F]">Edit account</p>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Saved.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Account name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
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
                disabled={account._count.journalLines > 0}
              />
              {account._count.journalLines > 0 && (
                <p className="text-xs text-[#605A57]">Opening balance is locked — this account has posted transactions.</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#37322F]">Flags</p>
              {[
                { field: "isPosting",     label: "Posting account" },
                { field: "isActive",      label: "Active" },
                { field: "isBankAccount", label: "Bank account" },
                { field: "isCashAccount", label: "Cash account" },
                { field: "isTaxAccount",  label: "Tax account" },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center gap-2">
                  <Checkbox
                    id={field}
                    checked={(form as any)[field]}
                    onCheckedChange={(v) => set(field, v)}
                    disabled={account.isSystemAccount && field === "isActive"}
                  />
                  <Label htmlFor={field} className="font-normal cursor-pointer">{label}</Label>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>

          {/* Children */}
          {account.children.length > 0 && (
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
              <p className="mb-3 font-semibold text-[#37322F]">Sub-accounts ({account.children.length})</p>
              <div className="divide-y divide-[rgba(55,50,47,0.06)]">
                {account.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between py-2">
                    <Link
                      href={`/${orgSlug}/accounts/${child.id}`}
                      className="text-sm font-medium text-[#37322F] hover:underline"
                    >
                      <span className="font-mono text-[#605A57] mr-2">{child.code}</span>
                      {child.name}
                    </Link>
                    <Badge variant={child.isActive ? "default" : "secondary"} className="text-[10px]">
                      {child.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
