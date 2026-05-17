"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Receipt, ToggleLeft, ToggleRight, Shield } from "lucide-react"
import { AppShell, type OrgItem } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { VoucherTypeDrawer } from "./voucher-type-drawer"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoucherTypeRow {
  id:              string
  key:             string
  label:           string
  prefix:          string
  isSystem:        boolean
  isActive:        boolean
  sortOrder:       number
  baseVoucherType: string
  formConfig:      unknown
  createdAt:       string
  updatedAt:       string
}

interface Props {
  orgSlug:   string
  orgName:   string
  orgs:      OrgItem[]
  userName?: string
  userEmail?: string
  configs:   VoucherTypeRow[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VoucherTypesClient({ orgSlug, orgName, orgs, userName, userEmail, configs: initial }: Props) {
  const [configs, setConfigs] = useState<VoucherTypeRow[]>(initial)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<VoucherTypeRow | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]           = useState("")

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(row: VoucherTypeRow) {
    setEditing(row)
    setDrawerOpen(true)
  }

  function handleSaved(saved: VoucherTypeRow) {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setDrawerOpen(false)
  }

  async function toggleActive(row: VoucherTypeRow) {
    setTogglingId(row.id)
    setError("")
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/voucher-type-configs/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to update")
        return
      }
      const updated = await res.json()
      setConfigs((prev) => prev.map((c) => c.id === row.id ? { ...c, isActive: updated.isActive } : c))
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteConfig(row: VoucherTypeRow) {
    if (!confirm(`Delete "${row.label}"? This cannot be undone.`)) return
    setDeletingId(row.id)
    setError("")
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/voucher-type-configs/${row.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to delete")
        return
      }
      setConfigs((prev) => prev.filter((c) => c.id !== row.id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AppShell orgSlug={orgSlug} orgName={orgName} orgs={orgs} userName={userName} userEmail={userEmail}>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><span className="text-muted-foreground text-sm">Settings</span></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Voucher Types</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="p-6 max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Receipt className="size-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Voucher Types</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Customise the types of journal entries your team can create.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
              <Plus className="size-4" />
              New type
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Label</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prefix</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {configs.map((row) => (
                  <tr key={row.id} className={cn("transition-colors hover:bg-muted/20", !row.isActive && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.label}</span>
                        {row.isSystem && (
                          <Shield className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.prefix}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.key}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.isActive ? "default" : "secondary"} className="text-xs">
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="size-8"
                          title={row.isActive ? "Deactivate" : "Activate"}
                          disabled={togglingId === row.id}
                          onClick={() => toggleActive(row)}
                        >
                          {row.isActive
                            ? <ToggleRight className="size-4 text-primary" />
                            : <ToggleLeft className="size-4 text-muted-foreground" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="size-8"
                          title="Edit"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {!row.isSystem && (
                          <Button
                            variant="ghost" size="icon"
                            className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            disabled={deletingId === row.id}
                            onClick={() => deleteConfig(row)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {configs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No voucher types yet. Click "New type" to add one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SidebarInset>

      <VoucherTypeDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        orgSlug={orgSlug}
        editing={editing}
      />
    </AppShell>
  )
}
