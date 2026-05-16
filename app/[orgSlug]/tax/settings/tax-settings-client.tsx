"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Pencil } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaxRegistration {
  id: string
  type: string
  number: string
  effectiveFrom: string
  stateCode: string | null
  isActive: boolean
}

interface TaxCode {
  id: string
  code: string
  name: string
  rate: number
  type: string
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  isDefault: boolean
}

const REG_TYPES = ["GST", "PAN", "TAN", "VAT", "IT"] as const
const CODE_TYPES = ["STANDARD", "REDUCED", "ZERO", "EXEMPT", "REVERSE_CHARGE"] as const

// ── Registrations section ─────────────────────────────────────────────────────

function RegistrationsSection({
  orgSlug,
  initial,
}: {
  orgSlug: string
  initial: TaxRegistration[]
}) {
  const [regs,    setRegs]    = useState(initial)
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form,    setForm]    = useState({
    type: "GST", number: "", effectiveFrom: "", stateCode: "",
  })

  function fv(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleAdd() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/tax/registrations`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type:          form.type,
        number:        form.number.trim(),
        effectiveFrom: form.effectiveFrom || undefined,
        stateCode:     form.stateCode.trim() || undefined,
      }),
    })
    if (res.ok) {
      const created = await res.json()
      setRegs((r) => [...r, created])
      setOpen(false)
      setForm({ type: "GST", number: "", effectiveFrom: "", stateCode: "" })
    } else {
      const body = await res.json()
      setError(body.error ?? "Save failed.")
    }
    setSaving(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/organizations/${orgSlug}/tax/registrations/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      setRegs((r) => r.map((x) => x.id === id ? { ...x, isActive: !isActive } : x))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this registration?")) return
    const res = await fetch(`/api/organizations/${orgSlug}/tax/registrations/${id}`, {
      method: "DELETE",
    })
    if (res.ok) setRegs((r) => r.filter((x) => x.id !== id))
  }

  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(55,50,47,0.08)]">
        <div>
          <h2 className="text-sm font-semibold text-[#37322F]">Tax Registrations</h2>
          <p className="text-xs text-[#605A57] mt-0.5">GSTIN, PAN, TAN, and other tax IDs for your company</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3.5 mr-1" /> Add registration
        </Button>
      </div>

      {regs.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#8B8580] text-center">No registrations yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9]">
              {["Type", "Number", "Effective from", "State code", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[#605A57]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id} className="border-b border-[rgba(55,50,47,0.06)] last:border-0 hover:bg-[#FAFAF9]">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs font-mono">{r.type}</Badge>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{r.number}</td>
                <td className="px-4 py-3 text-[#605A57]">
                  {r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3 text-[#605A57]">{r.stateCode ?? "—"}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={r.isActive}
                    onCheckedChange={() => handleToggle(r.id, r.isActive)}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-[#9B8E88] hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add tax registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="regType">Type</Label>
                <Select value={form.type} onValueChange={(v) => fv("type", v)}>
                  <SelectTrigger id="regType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="regNumber">Registration number</Label>
                <Input
                  id="regNumber"
                  value={form.number}
                  onChange={(e) => fv("number", e.target.value)}
                  placeholder={form.type === "GST" ? "27AABCU9603R1ZX" : "AABCU9603R"}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="regEffective">Effective from</Label>
                <Input
                  id="regEffective"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => fv("effectiveFrom", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="regState">State code (GST)</Label>
                <Input
                  id="regState"
                  value={form.stateCode}
                  onChange={(e) => fv("stateCode", e.target.value)}
                  placeholder="27"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.number.trim()}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Tax codes section ─────────────────────────────────────────────────────────

function TaxCodesSection({
  orgSlug,
  initial,
}: {
  orgSlug: string
  initial: TaxCode[]
}) {
  const [codes,   setCodes]  = useState(initial)
  const [open,    setOpen]   = useState(false)
  const [editing, setEditing] = useState<TaxCode | null>(null)
  const [saving,  setSaving] = useState(false)
  const [error,   setError]  = useState<string | null>(null)

  const blank = {
    code: "", name: "", rate: "", type: "STANDARD",
    effectiveFrom: "", effectiveTo: "", isDefault: false,
  }
  const [form, setForm] = useState<typeof blank>(blank)

  function fv(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function openAdd() {
    setEditing(null)
    setForm(blank)
    setError(null)
    setOpen(true)
  }

  function openEdit(c: TaxCode) {
    setEditing(c)
    setForm({
      code:          c.code,
      name:          c.name,
      rate:          String(c.rate),
      type:          c.type,
      effectiveFrom: c.effectiveFrom ? c.effectiveFrom.split("T")[0] : "",
      effectiveTo:   c.effectiveTo   ? c.effectiveTo.split("T")[0]   : "",
      isDefault:     c.isDefault,
    })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const payload = {
      code:          form.code.trim().toUpperCase(),
      name:          form.name.trim(),
      rate:          parseFloat(form.rate),
      type:          form.type,
      effectiveFrom: form.effectiveFrom || undefined,
      effectiveTo:   form.effectiveTo   || undefined,
      isDefault:     form.isDefault,
    }

    const url = editing
      ? `/api/organizations/${orgSlug}/tax/codes/${editing.id}`
      : `/api/organizations/${orgSlug}/tax/codes`

    const res = await fetch(url, {
      method:  editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const saved = await res.json()
      if (editing) {
        setCodes((c) => c.map((x) => x.id === saved.id ? saved : x))
      } else {
        setCodes((c) => [...c, saved])
      }
      setOpen(false)
    } else {
      const body = await res.json()
      setError(body.error ?? "Save failed.")
    }
    setSaving(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    const res = await fetch(`/api/organizations/${orgSlug}/tax/codes/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) setCodes((c) => c.map((x) => x.id === id ? { ...x, isActive: !isActive } : x))
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tax code?")) return
    const res = await fetch(`/api/organizations/${orgSlug}/tax/codes/${id}`, { method: "DELETE" })
    if (res.ok) setCodes((c) => c.filter((x) => x.id !== id))
  }

  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(55,50,47,0.08)]">
        <div>
          <h2 className="text-sm font-semibold text-[#37322F]">Tax Codes</h2>
          <p className="text-xs text-[#605A57] mt-0.5">GST rates and other tax codes applied to transactions</p>
        </div>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="size-3.5 mr-1" /> Add code
        </Button>
      </div>

      {codes.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#8B8580] text-center">No tax codes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9]">
              {["Code", "Name", "Rate", "Type", "Effective", "Active", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[#605A57]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-[rgba(55,50,47,0.06)] last:border-0 hover:bg-[#FAFAF9]">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold">{c.code}</span>
                  {c.isDefault && (
                    <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">default</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-[#37322F]">{c.name}</td>
                <td className="px-4 py-3 font-mono">{c.rate}%</td>
                <td className="px-4 py-3 text-[#605A57] text-xs">{c.type}</td>
                <td className="px-4 py-3 text-[#605A57] text-xs">
                  {c.effectiveFrom ? new Date(c.effectiveFrom).toLocaleDateString("en-IN") : "—"}
                  {c.effectiveTo && (
                    <span> – {new Date(c.effectiveTo).toLocaleDateString("en-IN")}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Switch checked={c.isActive} onCheckedChange={() => handleToggle(c.id, c.isActive)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="text-[#9B8E88] hover:text-[#37322F] transition-colors">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-[#9B8E88] hover:text-destructive transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tax code" : "Add tax code"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tcCode">Code</Label>
                <Input
                  id="tcCode"
                  value={form.code}
                  onChange={(e) => fv("code", e.target.value)}
                  placeholder="GST18"
                  className="font-mono"
                  disabled={!!editing}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="tcName">Name</Label>
                <Input
                  id="tcName"
                  value={form.name}
                  onChange={(e) => fv("name", e.target.value)}
                  placeholder="GST 18%"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tcRate">Rate (%)</Label>
                <Input
                  id="tcRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => fv("rate", e.target.value)}
                  placeholder="18"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tcType">Type</Label>
                <Select value={form.type} onValueChange={(v) => fv("type", v)}>
                  <SelectTrigger id="tcType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CODE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tcFrom">Effective from</Label>
                <Input
                  id="tcFrom"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => fv("effectiveFrom", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tcTo">Effective to (optional)</Label>
                <Input
                  id="tcTo"
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) => fv("effectiveTo", e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="tcDefault"
                checked={form.isDefault as boolean}
                onCheckedChange={(v) => fv("isDefault", v)}
              />
              <Label htmlFor="tcDefault" className="font-normal cursor-pointer">Set as default tax code</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.code.trim() || !form.name.trim()}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function TaxSettingsClient({
  orgSlug,
  initialRegistrations,
  initialTaxCodes,
}: {
  orgSlug: string
  initialRegistrations: TaxRegistration[]
  initialTaxCodes: TaxCode[]
}) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <RegistrationsSection orgSlug={orgSlug} initial={initialRegistrations} />
      <TaxCodesSection      orgSlug={orgSlug} initial={initialTaxCodes}      />
    </div>
  )
}
