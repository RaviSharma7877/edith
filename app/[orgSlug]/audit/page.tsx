"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  Search, Filter, ChevronDown, ChevronRight, Download,
  User, Clock, FileText, AlertCircle,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button }  from "@/components/ui/button"
import { Input }   from "@/components/ui/input"
import { Badge }   from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Actor {
  id: string
  name: string | null
  email: string
}

interface AuditLog {
  id:            string
  action:        string
  severity:      string
  resourceType:  string | null
  resourceId:    string | null
  resourceName:  string | null
  description:   string | null
  previousValues: unknown
  newValues:      unknown
  changedFields:  string[]
  ipAddress:     string | null
  createdAt:     string
  actor:         Actor | null
}

// ── Severity badge ────────────────────────────────────────────────────────────

const SEVERITY_CLASS: Record<string, string> = {
  INFO:     "bg-zinc-100 text-zinc-600 border-zinc-200",
  LOW:      "bg-blue-50  text-blue-700  border-blue-200",
  MEDIUM:   "bg-amber-50 text-amber-700 border-amber-200",
  HIGH:     "bg-orange-50 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-50   text-red-700   border-red-200",
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      SEVERITY_CLASS[severity] ?? SEVERITY_CLASS.INFO,
    )}>
      {severity}
    </span>
  )
}

// ── Action label (prettify snake_case) ────────────────────────────────────────

function ActionLabel({ action }: { action: string }) {
  const pretty = action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  return <span className="text-sm font-medium">{pretty}</span>
}

// ── Diff viewer ───────────────────────────────────────────────────────────────

function DiffViewer({ prev, next, fields }: { prev: unknown; next: unknown; fields: string[] }) {
  if (!prev && !next) return <p className="text-xs text-muted-foreground italic">No diff recorded.</p>

  const allKeys = fields.length
    ? fields
    : Array.from(new Set([
        ...Object.keys((prev as Record<string, unknown>) ?? {}),
        ...Object.keys((next as Record<string, unknown>) ?? {}),
      ]))

  if (allKeys.length === 0) return null

  return (
    <div className="overflow-x-auto rounded border bg-muted/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="px-3 py-1.5 text-left font-medium w-1/4">Field</th>
            <th className="px-3 py-1.5 text-left font-medium w-5/12 text-red-600">Before</th>
            <th className="px-3 py-1.5 text-left font-medium w-5/12 text-emerald-700">After</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {allKeys.map((k) => {
            const before = (prev as Record<string, unknown>)?.[k]
            const after  = (next as Record<string, unknown>)?.[k]
            return (
              <tr key={k}>
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{k}</td>
                <td className="px-3 py-1.5 font-mono text-red-700 break-all">
                  {before != null ? String(before) : <span className="italic text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-1.5 font-mono text-emerald-700 break-all">
                  {after != null ? String(after) : <span className="italic text-muted-foreground">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasDiff = log.previousValues || log.newValues || log.changedFields.length > 0

  const ts = new Date(log.createdAt)
  const dateStr = ts.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors",
          hasDiff ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/20",
          expanded && "bg-muted/20",
        )}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <td className="w-8 px-2 py-3 text-muted-foreground">
          {hasDiff
            ? expanded
              ? <ChevronDown className="size-3.5" />
              : <ChevronRight className="size-3.5" />
            : null
          }
        </td>

        {/* Timestamp */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="text-xs font-medium tabular-nums">{dateStr}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">{timeStr}</div>
        </td>

        {/* Actor */}
        <td className="px-3 py-3">
          {log.actor ? (
            <div className="flex items-center gap-1.5">
              <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="size-3 text-primary" />
              </div>
              <div>
                <div className="text-xs font-medium">{log.actor.name ?? log.actor.email.split("@")[0]}</div>
                <div className="text-[11px] text-muted-foreground">{log.actor.email}</div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">System</span>
          )}
        </td>

        {/* Action + severity */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-1">
            <ActionLabel action={log.action} />
            <SeverityBadge severity={log.severity} />
          </div>
        </td>

        {/* Resource */}
        <td className="px-3 py-3">
          {log.resourceType && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {log.resourceType.replace(/_/g, " ")}
              </div>
              {log.resourceName && (
                <div className="text-xs font-medium truncate max-w-[180px]">{log.resourceName}</div>
              )}
            </div>
          )}
        </td>

        {/* Description */}
        <td className="px-3 py-3 text-xs text-muted-foreground max-w-[200px]">
          <span className="line-clamp-2">{log.description ?? "—"}</span>
        </td>
      </tr>

      {/* Expanded diff row */}
      {expanded && (
        <tr className="bg-muted/10 border-b">
          <td colSpan={6} className="px-6 py-3">
            <DiffViewer
              prev={log.previousValues}
              next={log.newValues}
              fields={log.changedFields}
            />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const params  = useParams<{ orgSlug: string }>()
  const orgSlug = params.orgSlug

  const [logs,      setLogs]      = useState<AuditLog[]>([])
  const [actors,    setActors]    = useState<Actor[]>([])
  const [cursor,    setCursor]    = useState<string | null>(null)
  const [hasMore,   setHasMore]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error,     setError]     = useState("")

  // Filters
  const [search,       setSearch]       = useState("")
  const [action,       setAction]       = useState("")
  const [severity,     setSeverity]     = useState("")
  const [resourceType, setResourceType] = useState("")
  const [actorId,      setActorId]      = useState("")
  const [from,         setFrom]         = useState("")
  const [to,           setTo]           = useState("")
  const [showFilters,  setShowFilters]  = useState(false)

  const buildQuery = useCallback((cursorVal?: string | null) => {
    const q = new URLSearchParams()
    if (search)       q.set("search",       search)
    if (action)       q.set("action",       action)
    if (severity)     q.set("severity",     severity)
    if (resourceType) q.set("resourceType", resourceType)
    if (actorId)      q.set("actorId",      actorId)
    if (from)         q.set("from",         from)
    if (to)           q.set("to",           to)
    if (cursorVal)    q.set("cursor",       cursorVal)
    return q.toString()
  }, [search, action, severity, resourceType, actorId, from, to])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch(`/api/organizations/${orgSlug}/audit?${buildQuery()}`)
      const data = await res.json()
      setLogs(data.items ?? [])
      setCursor(data.nextCursor ?? null)
      setHasMore(!!data.nextCursor)
      setActors(data.actors ?? [])
    } catch {
      setError("Failed to load audit log.")
    } finally {
      setLoading(false)
    }
  }, [orgSlug, buildQuery])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  async function loadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const res  = await fetch(`/api/organizations/${orgSlug}/audit?${buildQuery(cursor)}`)
      const data = await res.json()
      setLogs((prev) => [...prev, ...(data.items ?? [])])
      setCursor(data.nextCursor ?? null)
      setHasMore(!!data.nextCursor)
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Unique resource types from loaded logs ────────────────────────────────
  const resourceTypes = Array.from(new Set(logs.map((l) => l.resourceType).filter(Boolean))) as string[]

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4 shrink-0">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">Audit Log</h1>
          <p className="text-xs text-[#605A57]">System-wide event stream with actor, action, and diff tracking</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Download className="size-3.5" /> Export
        </Button>
      </header>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-3 flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search resource name or description…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            />
          </div>
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="size-3.5" />
            Filters
            {(action || severity || resourceType || actorId || from || to) && (
              <span className="size-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Button>
          <Button size="sm" className="h-8" onClick={fetchLogs}>Search</Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All severities</SelectItem>
                {["INFO","LOW","MEDIUM","HIGH","CRITICAL"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceType} onValueChange={setResourceType}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Resource type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {resourceTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Actor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actors</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name ?? a.email.split("@")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground shrink-0">From</label>
              <Input type="date" className="h-8 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-muted-foreground shrink-0">To</label>
              <Input type="date" className="h-8 text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>

            <Button
              variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setSeverity(""); setResourceType(""); setActorId("")
                setFrom(""); setTo(""); setAction("")
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-6 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex gap-2 items-center">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
            <Clock className="size-4 animate-spin" /> Loading audit log…
          </div>
        )}

        {!loading && logs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
            <FileText className="size-8" />
            <div>
              <p className="text-sm font-medium">No audit events found</p>
              <p className="text-xs mt-1">Try adjusting your filters or date range.</p>
            </div>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="w-8" />
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Actor</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Action</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Resource</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => <LogRow key={log.id} log={log} />)}
            </tbody>
          </table>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center py-6">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
