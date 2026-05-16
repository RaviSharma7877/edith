"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function NewCustomerPage() {
  const router = useRouter()
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "", code: "", email: "", phone: "",
    gstin: "", pan: "", creditLimit: "", creditDays: "",
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

    const res = await fetch(`/api/organizations/${orgSlug}/customers`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        form.name.trim(),
        code:        form.code.trim()  || null,
        email:       form.email.trim() || null,
        phone:       form.phone.trim() || null,
        gstin:       form.gstin.trim() || null,
        pan:         form.pan.trim()   || null,
        creditLimit: form.creditLimit  || null,
        creditDays:  form.creditDays   || null,
        billingAddress,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/${orgSlug}/customers/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to create customer.")
      setSaving(false)
    }
  }

  return (
    <div className="flex h-svh w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <Link href={`/${orgSlug}/customers`} className="text-sm text-[#605A57] hover:text-[#37322F]">← Customers</Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New customer</h1>
      </header>

      <div className="min-w-0 flex-1 overflow-auto p-6">
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
                <Label htmlFor="code">Customer code</Label>
                <Input id="code" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="e.g. CUST-001" />
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
            <p className="font-semibold text-[#37322F]">Credit terms</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">Credit limit (₹)</Label>
                <Input id="creditLimit" type="number" min="0" step="0.01" value={form.creditLimit} onChange={(e) => set("creditLimit", e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditDays">Payment terms (days)</Label>
                <Input id="creditDays" type="number" min="0" step="1" value={form.creditDays} onChange={(e) => set("creditDays", e.target.value)} placeholder="30" />
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
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create customer"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
