"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Customer = {
  id: string; name: string; code: string | null; email: string | null
  phone: string | null; gstin: string | null; pan: string | null
  creditLimit: string | null; creditDays: number | null; isActive: boolean
  billingAddress: Record<string, string> | null
  _count: { salesInvoices: number }
}

export function CustomerEditClient({
  orgSlug,
  customer,
}: {
  orgSlug: string
  customer: Customer
}) {
  const router  = useRouter()
  const ba      = customer.billingAddress as Record<string, string> | null

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name:         customer.name,
    email:        customer.email   ?? "",
    phone:        customer.phone   ?? "",
    gstin:        customer.gstin   ?? "",
    pan:          customer.pan     ?? "",
    creditLimit:  customer.creditLimit  ? String(Number(customer.creditLimit)) : "",
    creditDays:   customer.creditDays   ? String(customer.creditDays)          : "",
    isActive:     customer.isActive,
    billingLine1: ba?.line1   ?? "",
    billingCity:  ba?.city    ?? "",
    billingState: ba?.state   ?? "",
    billingPin:   ba?.pincode ?? "",
  })

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }))
    setSuccess(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const billingAddress = form.billingLine1 ? {
      line1: form.billingLine1, city: form.billingCity,
      state: form.billingState, pincode: form.billingPin,
    } : null

    const res = await fetch(`/api/organizations/${orgSlug}/customers/${customer.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        form.name.trim(),
        email:       form.email.trim()  || null,
        phone:       form.phone.trim()  || null,
        gstin:       form.gstin.trim()  || null,
        pan:         form.pan.trim()    || null,
        creditLimit: form.creditLimit   || null,
        creditDays:  form.creditDays    || null,
        isActive:    form.isActive,
        billingAddress,
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
    <div className="space-y-4">
      {/* Identity */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[#605A57]">Customer code</p>
          <p className="mt-0.5 font-mono text-sm text-[#37322F]">{customer.code ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-[#605A57]">Total invoices</p>
          <p className="mt-0.5 text-sm text-[#37322F]">{customer._count.salesInvoices}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
        <p className="font-semibold text-[#37322F]">Details</p>

        {error   && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-green-600">Saved.</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PAN</Label>
            <Input value={form.pan} onChange={(e) => set("pan", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Credit limit (₹)</Label>
            <Input type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment terms (days)</Label>
            <Input type="number" min="0" step="1" value={form.creditDays} onChange={(e) => set("creditDays", e.target.value)} />
          </div>
        </div>

        <p className="font-semibold text-[#37322F] pt-2">Billing address</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Address line</Label>
            <Input value={form.billingLine1} onChange={(e) => set("billingLine1", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.billingCity} onChange={(e) => set("billingCity", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={form.billingState} onChange={(e) => set("billingState", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PIN code</Label>
            <Input value={form.billingPin} onChange={(e) => set("billingPin", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isActive">Active</Label>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </div>
  )
}
