"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { VoucherTypeRow } from "./voucher-types-client"

const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"

interface Props {
  open:     boolean
  onClose:  () => void
  onSaved:  (row: VoucherTypeRow) => void
  orgSlug:  string
  editing:  VoucherTypeRow | null
}

export function VoucherTypeDrawer({ open, onClose, onSaved, orgSlug, editing }: Props) {
  const isNew = editing === null

  const [label,     setLabel]     = useState("")
  const [prefix,    setPrefix]    = useState("")
  const [sortOrder, setSortOrder] = useState("100")
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState("")

  useEffect(() => {
    if (open) {
      setLabel(editing?.label     ?? "")
      setPrefix(editing?.prefix   ?? "")
      setSortOrder(String(editing?.sortOrder ?? 100))
      setError("")
    }
  }, [open, editing])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      const body = isNew
        ? { label: label.trim(), prefix: prefix.trim(), sortOrder: Number(sortOrder) }
        : {
            ...(editing?.isSystem ? {} : { label: label.trim() }),
            sortOrder: Number(sortOrder),
          }

      const url = isNew
        ? `/api/organizations/${orgSlug}/voucher-type-configs`
        : `/api/organizations/${orgSlug}/voucher-type-configs/${editing!.id}`

      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }

      onSaved({
        ...data,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      })
    } catch {
      setError("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {isNew ? "New Voucher Type" : `Edit — ${editing?.label}`}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
          {/* Label */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Label
              {editing?.isSystem && <span className="ml-1 text-xs text-muted-foreground">(read-only for system types)</span>}
            </span>
            <input
              className={inputCls}
              placeholder="e.g. Expense Claim"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={editing?.isSystem}
              required
            />
          </label>

          {/* Prefix — only for new types */}
          {isNew && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Prefix</span>
              <input
                className={inputCls}
                placeholder="e.g. EC"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
                Used in voucher numbers, e.g. EC-2026-0001. Cannot be changed later.
              </span>
            </label>
          )}

          {/* Sort order */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Sort order</span>
            <input
              type="number"
              className={inputCls}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              max={9999}
            />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">
              Lower numbers appear first in dropdowns.
            </span>
          </label>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="mt-auto flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create" : "Save changes"}
            </Button>
          </div>
        </form>
      </aside>
    </>
  )
}
