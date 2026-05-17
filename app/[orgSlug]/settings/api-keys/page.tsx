"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, Check, Clock, Shield,
  AlertTriangle, CheckCircle2,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Badge }   from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiKey {
  id:         string
  name:       string
  keyPrefix:  string
  scopes:     string[]
  lastUsedAt: string | null
  expiresAt:  string | null
  isActive:   boolean
  revokedAt:  string | null
  createdAt:  string
}

const ALL_SCOPES = [
  { value: "invoices:read",  group: "Invoices" },
  { value: "invoices:write", group: "Invoices" },
  { value: "bills:read",     group: "Bills"    },
  { value: "bills:write",    group: "Bills"    },
  { value: "journals:read",  group: "Journals" },
  { value: "journals:write", group: "Journals" },
  { value: "reports:read",   group: "Reports"  },
  { value: "contacts:read",  group: "Contacts" },
  { value: "contacts:write", group: "Contacts" },
  { value: "webhooks:read",  group: "Webhooks" },
  { value: "webhooks:write", group: "Webhooks" },
  { value: "imports:write",  group: "Imports"  },
]

// ── Create key dialog ─────────────────────────────────────────────────────────

function CreateKeyDialog({
  orgSlug, open, onOpenChange, onCreated,
}: {
  orgSlug: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (key: ApiKey & { rawKey: string }) => void
}) {
  const [name,       setName]       = useState("")
  const [scopes,     setScopes]     = useState<string[]>([])
  const [expiresAt,  setExpiresAt]  = useState("")
  const [busy,       setBusy]       = useState(false)
  const [error,      setError]      = useState("")

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function handleCreate() {
    setBusy(true)
    setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/settings/api-keys`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, scopes, expiresAt: expiresAt || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      onCreated(data)
      setName(""); setScopes([]); setExpiresAt("")
      onOpenChange(false)
    } else {
      setError(data.error ?? "Failed to create key")
    }
    setBusy(false)
  }

  const groups = Array.from(new Set(ALL_SCOPES.map((s) => s.group)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Key className="size-4" /> Create API key
          </DialogTitle>
          <DialogDescription>The key is shown once. Copy it immediately.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Key name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zapier integration" className="mt-1.5" />
          </div>

          <div>
            <label className="text-sm font-medium">Scopes</label>
            <div className="mt-2 flex flex-col gap-3">
              {groups.map((g) => (
                <div key={g}>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{g}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SCOPES.filter((s) => s.group === g).map((s) => (
                      <button
                        key={s.value}
                        onClick={() => toggleScope(s.value)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                          scopes.includes(s.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-muted hover:border-primary/50",
                        )}
                      >
                        {s.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Expires (optional)</label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1.5 w-48" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy || !name.trim() || scopes.length === 0}>
            {busy ? "Creating…" : "Create key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Raw key reveal dialog ─────────────────────────────────────────────────────

function RevealDialog({
  rawKey, open, onClose,
}: { rawKey: string; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="size-4 text-emerald-600" /> Your new API key
          </DialogTitle>
          <DialogDescription>
            This is shown only once. Copy and store it securely.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 border p-3 flex items-center gap-2">
          <code className="flex-1 text-xs font-mono break-all">{rawKey}</code>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={copy}>
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [keys,          setKeys]          = useState<ApiKey[]>([])
  const [loading,       setLoading]       = useState(true)
  const [createOpen,    setCreateOpen]    = useState(false)
  const [newRawKey,     setNewRawKey]     = useState("")
  const [revealOpen,    setRevealOpen]    = useState(false)
  const [revokingId,    setRevokingId]    = useState<string | null>(null)

  async function loadKeys() {
    const res  = await fetch(`/api/organizations/${orgSlug}/settings/api-keys`)
    const data = await res.json()
    setKeys(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadKeys() }, [])

  async function revoke(id: string) {
    setRevokingId(id)
    await fetch(`/api/organizations/${orgSlug}/settings/api-keys/${id}`, { method: "DELETE" })
    setRevokingId(null)
    loadKeys()
  }

  function handleCreated(key: ApiKey & { rawKey: string }) {
    setNewRawKey(key.rawKey)
    setRevealOpen(true)
    loadKeys()
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4 shrink-0">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">API Keys</h1>
          <p className="text-xs text-[#605A57]">Scoped keys for programmatic access to your accounting data</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> Create key
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl flex flex-col gap-4">
          {/* Info banner */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex gap-3 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
            API keys are shown only once at creation. Keys are hashed and cannot be retrieved.
            Revoke a key if it&apos;s compromised.
          </div>

          {loading && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}

          {!loading && keys.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-3">
                <Key className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No API keys yet</p>
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" /> Create first key
                </Button>
              </CardContent>
            </Card>
          )}

          {keys.map((key) => (
            <div key={key.id} className={cn(
              "rounded-xl border bg-white p-4 flex items-start gap-4",
              !key.isActive && "opacity-60",
            )}>
              <div className={cn(
                "size-9 rounded-lg flex items-center justify-center shrink-0",
                key.isActive ? "bg-emerald-50" : "bg-muted",
              )}>
                <Key className={cn("size-4", key.isActive ? "text-emerald-600" : "text-muted-foreground")} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{key.name}</span>
                  {key.isActive
                    ? <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                    : <Badge variant="secondary" className="text-xs">Revoked</Badge>
                  }
                </div>
                <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}•••••••••••••</code>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {key.scopes.map((s) => (
                    <span key={s} className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{s}</span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground">
                  <span>Created {new Date(key.createdAt).toLocaleDateString("en-IN")}</span>
                  {key.lastUsedAt && <span>Last used {new Date(key.lastUsedAt).toLocaleDateString("en-IN")}</span>}
                  {key.expiresAt && <span>Expires {new Date(key.expiresAt).toLocaleDateString("en-IN")}</span>}
                  {key.revokedAt && <span>Revoked {new Date(key.revokedAt).toLocaleDateString("en-IN")}</span>}
                </div>
              </div>

              {key.isActive && (
                <Button
                  size="sm" variant="ghost"
                  className="h-8 text-xs gap-1 text-destructive hover:text-destructive shrink-0"
                  onClick={() => revoke(key.id)}
                  disabled={revokingId === key.id}
                >
                  <Trash2 className="size-3" />
                  {revokingId === key.id ? "Revoking…" : "Revoke"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <CreateKeyDialog orgSlug={orgSlug} open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <RevealDialog rawKey={newRawKey} open={revealOpen} onClose={() => setRevealOpen(false)} />
    </div>
  )
}
