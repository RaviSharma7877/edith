"use client"

import { useState } from "react"
import {
  Calendar, Lock, RotateCcw, CheckCircle2, AlertCircle, Clock,
  ChevronDown, XCircle, AlertTriangle,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button }  from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge }   from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodStatus = "OPEN" | "LOCKED" | "CLOSED" | "REOPENED"
type FYStatus     = "ACTIVE" | "LOCKED" | "CLOSED"

interface Period {
  id: string; name: string; startDate: string; endDate: string; status: PeriodStatus
}
interface FiscalYear {
  id: string; name: string; startDate: string; endDate: string
  isCurrent: boolean; status: FYStatus; periods: Period[]
}
interface Blockers {
  unpostedJournals: number
  draftInvoices:    number
  draftBills:       number
  unreconciledLines: number
  unfiledReturns:   number
  total:            number
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PeriodStatus, { label: string; icon: React.ElementType; className: string }> = {
  OPEN:     { label: "Open",     icon: Clock,        className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LOCKED:   { label: "Locked",   icon: Lock,         className: "bg-amber-50  text-amber-700  border-amber-200"    },
  CLOSED:   { label: "Closed",   icon: CheckCircle2, className: "bg-zinc-100  text-zinc-600   border-zinc-200"     },
  REOPENED: { label: "Reopened", icon: RotateCcw,    className: "bg-blue-50   text-blue-700   border-blue-200"     },
}

function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  const cfg  = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
      cfg.className,
    )}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}

// ── Reopen dialog ─────────────────────────────────────────────────────────────

function ReopenDialog({
  period, open, onOpenChange, onConfirm, busy,
}: {
  period: Period | null; open: boolean; onOpenChange: (v: boolean) => void
  onConfirm: (reason: string) => void; busy: boolean
}) {
  const [reason, setReason] = useState("")

  function handleClose(v: boolean) {
    if (!v) setReason("")
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-4 text-amber-500" />
            Reopen period
          </DialogTitle>
          <DialogDescription>
            Reopening <strong>{period?.name}</strong> allows new entries to be posted. This action is audited.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Reason for reopening</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Correction required for supplier invoice posted to wrong period"
            className="h-20 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={() => { onConfirm(reason); setReason("") }}
            disabled={busy || !reason.trim()}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            {busy ? "Reopening…" : "Reopen period"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Close period dialog (with blocker checklist) ───────────────────────────────

function BlockerRow({ label, count, isSoft }: { label: string; count: number; isSoft?: boolean }) {
  const ok = count === 0
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-sm">
        {ok
          ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
          : isSoft
            ? <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            : <XCircle className="size-4 text-destructive shrink-0" />
        }
        {label}
      </span>
      <span className={cn(
        "text-xs font-medium tabular-nums",
        ok ? "text-muted-foreground" : isSoft ? "text-amber-600" : "text-destructive",
      )}>
        {count === 0 ? "Clear" : count}
      </span>
    </div>
  )
}

function ClosePeriodDialog({
  period, open, onOpenChange, onConfirm, busy, orgSlug,
}: {
  period: Period | null; open: boolean; onOpenChange: (v: boolean) => void
  onConfirm: () => void; busy: boolean; orgSlug: string
}) {
  const [blockers, setBlockers]   = useState<Blockers | null>(null)
  const [loading,  setLoading]    = useState(false)

  async function fetchBlockers() {
    if (!period) return
    setLoading(true)
    setBlockers(null)
    const res  = await fetch(`/api/organizations/${orgSlug}/period-close/${period.id}`)
    const data = await res.json()
    setBlockers(data.blockers ?? null)
    setLoading(false)
  }

  function handleOpenChange(v: boolean) {
    if (v && period) fetchBlockers()
    if (!v) setBlockers(null)
    onOpenChange(v)
  }

  const hardBlockers = blockers
    ? blockers.unpostedJournals + blockers.draftInvoices + blockers.draftBills + blockers.unreconciledLines
    : 1

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="size-4 text-zinc-600" />
            Close period — {period?.name}
          </DialogTitle>
          <DialogDescription>
            Closing permanently prevents new entries. Check each item below before confirming.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Checking blockers…</div>
        )}

        {!loading && blockers && (
          <div className="rounded-lg border divide-y bg-muted/20">
            <div className="px-4 py-1 divide-y">
              <BlockerRow label="Unposted journals"         count={blockers.unpostedJournals}  />
              <BlockerRow label="Draft / pending invoices"  count={blockers.draftInvoices}     />
              <BlockerRow label="Draft / pending bills"     count={blockers.draftBills}        />
              <BlockerRow label="Unreconciled bank items"   count={blockers.unreconciledLines} />
              <BlockerRow label="Unfiled tax returns"       count={blockers.unfiledReturns} isSoft />
            </div>
          </div>
        )}

        {!loading && blockers && hardBlockers > 0 && (
          <p className="text-sm text-destructive flex gap-1.5 items-start">
            <XCircle className="size-4 shrink-0 mt-0.5" />
            Resolve {hardBlockers} blocker{hardBlockers !== 1 ? "s" : ""} before closing.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={busy || loading || hardBlockers > 0}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-3.5" />
            {busy ? "Closing…" : "Close period"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Period row ────────────────────────────────────────────────────────────────

function PeriodRow({
  period, orgSlug, onAction,
}: {
  period: Period
  orgSlug: string
  onAction: (id: string, action: "lock" | "close" | "reopen", reason?: string) => Promise<void>
}) {
  const [busy,        setBusy]        = useState(false)
  const [reopenOpen,  setReopenOpen]  = useState(false)
  const [closeOpen,   setCloseOpen]   = useState(false)

  const start = new Date(period.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  const end   = new Date(period.endDate).toLocaleDateString("en-IN",   { day: "numeric", month: "short", year: "numeric" })

  async function dispatch(action: "lock" | "close" | "reopen", reason?: string) {
    setBusy(true)
    await onAction(period.id, action, reason)
    setBusy(false)
    setReopenOpen(false)
    setCloseOpen(false)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{period.name}</span>
        <span className="ml-3 text-xs text-muted-foreground">{start} – {end}</span>
      </div>

      <PeriodStatusBadge status={period.status} />

      <div className="flex items-center gap-1.5 shrink-0">
        {(period.status === "OPEN" || period.status === "REOPENED") && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => dispatch("lock")} disabled={busy}>
            <Lock className="size-3" /> Lock
          </Button>
        )}
        {period.status === "LOCKED" && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setCloseOpen(true)} disabled={busy}>
            <CheckCircle2 className="size-3" /> Close
          </Button>
        )}
        {(period.status === "CLOSED" || period.status === "LOCKED") && (
          <Button
            size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => setReopenOpen(true)} disabled={busy}
          >
            <RotateCcw className="size-3" /> Reopen
          </Button>
        )}
      </div>

      <ReopenDialog
        period={period}
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        onConfirm={(reason) => dispatch("reopen", reason)}
        busy={busy}
      />
      <ClosePeriodDialog
        period={period}
        open={closeOpen}
        onOpenChange={setCloseOpen}
        onConfirm={() => dispatch("close")}
        busy={busy}
        orgSlug={orgSlug}
      />
    </div>
  )
}

// ── Fiscal year card ──────────────────────────────────────────────────────────

function FiscalYearCard({
  fy, orgSlug, onAction,
}: {
  fy: FiscalYear
  orgSlug: string
  onAction: (periodId: string, action: "lock" | "close" | "reopen", reason?: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(fy.isCurrent)

  const openCount   = fy.periods.filter((p) => p.status === "OPEN"   || p.status === "REOPENED").length
  const lockedCount = fy.periods.filter((p) => p.status === "LOCKED").length
  const closedCount = fy.periods.filter((p) => p.status === "CLOSED").length

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Calendar className="size-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">{fy.name}</CardTitle>
                {fy.isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
              </div>
              <CardDescription className="text-xs mt-0.5">
                {new Date(fy.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {" — "}
                {new Date(fy.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 inline-block" />{openCount} open</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400  inline-block" />{lockedCount} locked</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-zinc-300   inline-block" />{closedCount} closed</span>
            </div>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-0">
          <div className="border-t divide-y">
            {fy.periods.map((p) => (
              <PeriodRow key={p.id} period={p} orgSlug={orgSlug} onAction={onAction} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

export function PeriodCloseClient({
  orgSlug,
  fiscalYears,
}: {
  orgSlug: string
  fiscalYears: FiscalYear[]
}) {
  const [fys,   setFys]   = useState(fiscalYears)
  const [error, setError] = useState("")

  async function handleAction(
    periodId: string,
    action: "lock" | "close" | "reopen",
    reason?: string,
  ) {
    setError("")
    const res = await fetch(`/api/organizations/${orgSlug}/period-close/${periodId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, reason }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Something went wrong.")
      return
    }

    const updated = await res.json()
    setFys((prev) =>
      prev.map((fy) => ({
        ...fy,
        periods: fy.periods.map((p) => (p.id === periodId ? { ...p, status: updated.status } : p)),
      })),
    )
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4 shrink-0">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div>
          <h1 className="text-lg font-semibold text-[#37322F]">Period Close</h1>
          <p className="text-xs text-[#605A57]">Manage accounting period states and period-end close</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl flex flex-col gap-6">

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex gap-2 items-start">
              <AlertCircle className="size-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex gap-3">
            <AlertCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p><span className="font-medium text-foreground">Open</span> — entries can be posted freely.</p>
              <p><span className="font-medium text-foreground">Locked</span> — no new entries; admin can reopen with a reason.</p>
              <p><span className="font-medium text-foreground">Closed</span> — permanent; only reversals possible. Requires all blockers cleared.</p>
            </div>
          </div>

          {fys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="size-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No fiscal years found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete onboarding to auto-create your first fiscal year and periods.
                </p>
              </CardContent>
            </Card>
          ) : (
            fys.map((fy) => (
              <FiscalYearCard key={fy.id} fy={fy} orgSlug={orgSlug} onAction={handleAction} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
