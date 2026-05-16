"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  Webhook, Plus, Trash2, Play, Pause, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Copy, Check,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Badge }   from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Endpoint {
  id:            string
  url:           string
  events:        string[]
  status:        string
  failureCount:  number
  lastSuccessAt: string | null
  lastFailureAt: string | null
  createdAt:     string
}

interface Delivery {
  id:          string
  event:       string
  statusCode:  number | null
  attempts:    number
  deliveredAt: string | null
  failedAt:    string | null
  createdAt:   string
  responseBody: string | null
}

const AVAILABLE_EVENTS = [
  "invoice.created", "invoice.updated", "invoice.posted", "invoice.voided",
  "bill.created",    "bill.updated",    "bill.posted",
  "payment.created", "payment.reconciled",
  "journal.posted",
  "customer.created", "customer.updated",
  "vendor.created",   "vendor.updated",
  "period.locked",    "period.closed",   "period.reopened",
]

// ── Create endpoint dialog ────────────────────────────────────────────────────

function CreateEndpointDialog({
  orgSlug, open, onOpenChange, onCreated,
}: {
  orgSlug: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (ep: Endpoint & { secret: string }) => void
}) {
  const [url,    setUrl]    = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState("")

  function toggle(e: string) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])
  }

  function toggleAll() {
    setEvents((prev) => prev.length === AVAILABLE_EVENTS.length ? [] : [...AVAILABLE_EVENTS])
  }

  async function submit() {
    setBusy(true); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/settings/webhooks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ url, events }),
    })
    const data = await res.json()
    if (res.ok) { onCreated(data); setUrl(""); setEvents([]); onOpenChange(false) }
    else setError(data.error ?? "Failed")
    setBusy(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Webhook className="size-4" /> Add webhook endpoint
          </DialogTitle>
          <DialogDescription>The signing secret is shown once. Save it immediately.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Endpoint URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-service.com/webhook" className="mt-1.5" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Events to listen for</label>
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {events.length === AVAILABLE_EVENTS.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {AVAILABLE_EVENTS.map((e) => (
                <button
                  key={e}
                  onClick={() => toggle(e)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    events.includes(e)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-muted hover:border-primary/50",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !url.trim() || events.length === 0}>
            {busy ? "Adding…" : "Add endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Secret reveal dialog ──────────────────────────────────────────────────────

function SecretRevealDialog({ secret, open, onClose }: { secret: string; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Webhook signing secret</DialogTitle>
          <DialogDescription>Use this to verify webhook payloads. Shown only once.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 border p-3 flex items-center gap-2">
          <code className="flex-1 text-xs font-mono break-all">{secret}</code>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" onClick={copy}>
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <DialogFooter><Button onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Deliveries drawer ─────────────────────────────────────────────────────────

function DeliveriesRow({ orgSlug, endpointId }: { orgSlug: string; endpointId: string }) {
  const [open,      setOpen]      = useState(false)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading,   setLoading]   = useState(false)

  async function load() {
    setLoading(true)
    const res  = await fetch(`/api/organizations/${orgSlug}/settings/webhooks/${endpointId}/deliveries`)
    const data = await res.json()
    setDeliveries(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function toggle() {
    if (!open) load()
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Delivery log
      </button>

      {open && (
        <div className="mt-2 rounded-lg border divide-y text-xs">
          {loading && <div className="px-3 py-2 text-muted-foreground">Loading…</div>}
          {!loading && deliveries.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground italic">No deliveries yet.</div>
          )}
          {deliveries.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2">
              {d.statusCode && d.statusCode >= 200 && d.statusCode < 300
                ? <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                : <XCircle className="size-3.5 text-destructive shrink-0" />
              }
              <span className="font-mono text-muted-foreground">{d.event}</span>
              <span className={cn(
                "font-medium tabular-nums",
                d.statusCode && d.statusCode < 300 ? "text-emerald-600" : "text-destructive",
              )}>
                {d.statusCode ?? "—"}
              </span>
              <span className="text-muted-foreground">
                {d.attempts} attempt{d.attempts !== 1 ? "s" : ""}
              </span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {new Date(d.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const params   = useParams<{ orgSlug: string }>()
  const orgSlug  = params.orgSlug

  const [endpoints,   setEndpoints]   = useState<Endpoint[]>([])
  const [loading,     setLoading]     = useState(true)
  const [createOpen,  setCreateOpen]  = useState(false)
  const [newSecret,   setNewSecret]   = useState("")
  const [secretOpen,  setSecretOpen]  = useState(false)

  async function load() {
    const res  = await fetch(`/api/organizations/${orgSlug}/settings/webhooks`)
    const data = await res.json()
    setEndpoints(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(ep: Endpoint) {
    const newStatus = ep.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    await fetch(`/api/organizations/${orgSlug}/settings/webhooks/${ep.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return
    await fetch(`/api/organizations/${orgSlug}/settings/webhooks/${id}`, { method: "DELETE" })
    load()
  }

  function handleCreated(ep: Endpoint & { secret: string }) {
    setNewSecret(ep.secret)
    setSecretOpen(true)
    load()
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4 shrink-0">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">Webhooks</h1>
          <p className="text-xs text-[#605A57]">Real-time event delivery to your external services</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" /> Add endpoint
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl flex flex-col gap-4">
          {loading && <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>}

          {!loading && endpoints.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-12 gap-3">
                <Webhook className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No webhooks configured</p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Add an endpoint URL and choose which events to listen for.
                </p>
                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" /> Add first endpoint
                </Button>
              </CardContent>
            </Card>
          )}

          {endpoints.map((ep) => (
            <div key={ep.id} className="rounded-xl border bg-white p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "size-9 rounded-lg flex items-center justify-center shrink-0",
                  ep.status === "ACTIVE" ? "bg-emerald-50" : "bg-muted",
                )}>
                  <Webhook className={cn("size-4", ep.status === "ACTIVE" ? "text-emerald-600" : "text-muted-foreground")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono truncate max-w-xs">{ep.url}</code>
                    <Badge className={cn(
                      "text-[10px] border",
                      ep.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-600 border-zinc-200",
                    )}>
                      {ep.status}
                    </Badge>
                    {ep.failureCount > 0 && (
                      <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200">
                        {ep.failureCount} failures
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ep.events.map((e) => (
                      <span key={e} className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">{e}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[11px] text-muted-foreground">
                    {ep.lastSuccessAt && <span>Last ok: {new Date(ep.lastSuccessAt).toLocaleDateString("en-IN")}</span>}
                    {ep.lastFailureAt && <span className="text-destructive">Last fail: {new Date(ep.lastFailureAt).toLocaleDateString("en-IN")}</span>}
                    <span>Added {new Date(ep.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon" variant="ghost" className="size-7"
                    title={ep.status === "ACTIVE" ? "Pause" : "Resume"}
                    onClick={() => toggleStatus(ep)}
                  >
                    {ep.status === "ACTIVE"
                      ? <Pause className="size-3.5" />
                      : <Play className="size-3.5" />
                    }
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => remove(ep.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <DeliveriesRow orgSlug={orgSlug} endpointId={ep.id} />
            </div>
          ))}
        </div>
      </div>

      <CreateEndpointDialog orgSlug={orgSlug} open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <SecretRevealDialog secret={newSecret} open={secretOpen} onClose={() => setSecretOpen(false)} />
    </div>
  )
}
