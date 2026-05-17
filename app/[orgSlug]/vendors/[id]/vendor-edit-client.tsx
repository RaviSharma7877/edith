"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BillingAddress = { line1?: string; city?: string; state?: string; pincode?: string } | null

type Vendor = {
  id: string; name: string; code: string | null; email: string | null; phone: string | null
  gstin: string | null; pan: string | null; paymentTerms: number | null
  billingAddress: BillingAddress | unknown; isActive: boolean
}

export function VendorEditClient({ orgSlug, vendor }: { orgSlug: string; vendor: Vendor }) {
  const router = useRouter()
  const addr   = vendor.billingAddress as BillingAddress

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    name:         vendor.name,
    code:         vendor.code         ?? "",
    email:        vendor.email        ?? "",
    phone:        vendor.phone        ?? "",
    gstin:        vendor.gstin        ?? "",
    pan:          vendor.pan          ?? "",
    paymentTerms: vendor.paymentTerms?.toString() ?? "",
    isActive:     vendor.isActive,
    billingLine1: addr?.line1   ?? "",
    billingCity:  addr?.city    ?? "",
    billingState: addr?.state   ?? "",
    billingPin:   addr?.pincode ?? "",
  })

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const billingAddress = form.billingLine1 ? {
      line1: form.billingLine1, city: form.billingCity,
      state: form.billingState, pincode: form.billingPin,
    } : null

    const res = await fetch(`/api/organizations/${orgSlug}/vendors/${vendor.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:         form.name.trim(),
        code:         form.code.trim()  || null,
        email:        form.email.trim() || null,
        phone:        form.phone.trim() || null,
        gstin:        form.gstin.trim() || null,
        pan:          form.pan.trim()   || null,
        paymentTerms: form.paymentTerms || null,
        isActive:     form.isActive,
        billingAddress,
      }),
    })

    if (res.ok) {
      setSuccess(true)
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to save.")
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error   && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</div>}

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
        <p className="font-semibold text-[#37322F]">Basic info</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Vendor code</Label>
            <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} />
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="paymentTerms">Net days</Label>
            <Input id="paymentTerms" type="number" min="0" step="1" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder="30" />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <span>Active vendor</span>
            </label>
          </div>
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
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
