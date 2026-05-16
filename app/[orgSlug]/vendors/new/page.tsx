"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function NewVendorPage() {
  const router = useRouter()
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "", code: "", email: "", phone: "",
    gstin: "", pan: "", paymentTerms: "",
    billingLine1: "", billingCity: "", billingState: "", billingPin: "",
  })

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Name is required."); return }

    setSaving(true)
    setError(null)

    const billingAddress = form.billingLine1 ? {
      line1: form.billingLine1, city: form.billingCity,
      state: form.billingState, pincode: form.billingPin,
    } : null

    const res = await fetch(`/api/organizations/${orgSlug}/vendors`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:         form.name.trim(),
        code:         form.code.trim()  || null,
        email:        form.email.trim() || null,
        phone:        form.phone.trim() || null,
        gstin:        form.gstin.trim() || null,
        pan:          form.pan.trim()   || null,
        paymentTerms: form.paymentTerms || null,
        billingAddress,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/${orgSlug}/vendors/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to create vendor.")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <Link href={`/${orgSlug}/vendors`} className="text-sm text-[#605A57] hover:text-[#37322F]">← Vendors</Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New vendor</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Basic info</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Vendor code</Label>
                <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="e.g. VEN-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input id="gstin" value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pan">PAN</Label>
                <Input id="pan" value={form.pan} onChange={(e) => set("pan", e.target.value)} placeholder="AAAAA0000A" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Payment terms</p>
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="paymentTerms">Net days</Label>
              <Input
                id="paymentTerms" type="number" min="0" step="1"
                value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)}
                placeholder="30"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Billing address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="billingLine1">Address line</Label>
                <Input id="billingLine1" value={form.billingLine1} onChange={(e) => set("billingLine1", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingCity">City</Label>
                <Input id="billingCity" value={form.billingCity} onChange={(e) => set("billingCity", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingState">State</Label>
                <Input id="billingState" value={form.billingState} onChange={(e) => set("billingState", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billingPin">PIN code</Label>
                <Input id="billingPin" value={form.billingPin} onChange={(e) => set("billingPin", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create vendor"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
