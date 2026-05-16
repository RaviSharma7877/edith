"use client"

import { useState, useMemo } from "react"
import { Search, Building2, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Workspace {
  id:        string
  name:      string
  slug:      string
  planTier:  string
  status:    string
  members:   number
  companies: number
  createdAt: string
}

const PLAN_COLORS: Record<string, string> = {
  FREE:         "bg-zinc-100 text-zinc-600",
  STARTER:      "bg-blue-50 text-blue-700",
  PROFESSIONAL: "bg-purple-50 text-purple-700",
  ENTERPRISE:   "bg-amber-50 text-amber-700",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-600",
  TRIAL:     "bg-sky-50 text-sky-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
}

export function TenantsClient({ workspaces }: { workspaces: Workspace[] }) {
  const [search, setSearch]     = useState("")
  const [planFilter, setPlan]   = useState("")
  const [statusFilter, setStatus] = useState("")

  const filtered = useMemo(() => {
    return workspaces.filter((w) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.slug.toLowerCase().includes(search.toLowerCase())) return false
      if (planFilter   && w.planTier !== planFilter)   return false
      if (statusFilter && w.status   !== statusFilter) return false
      return true
    })
  }, [workspaces, search, planFilter, statusFilter])

  const inputCls = "h-8 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <a href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Admin
        </a>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">All tenants</span>
      </div>

      <div>
        <h1 className="text-xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground mt-1">{workspaces.length} workspaces registered</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(inputCls, "pl-8 w-full")}
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlan(e.target.value)}
          className={cn(inputCls, "w-36 appearance-none cursor-pointer")}
        >
          <option value="">All plans</option>
          {["FREE","STARTER","PROFESSIONAL","ENTERPRISE"].map((p) => (
            <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className={cn(inputCls, "w-36 appearance-none cursor-pointer")}
        >
          <option value="">All statuses</option>
          {["ACTIVE","TRIAL","SUSPENDED","CANCELLED"].map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
        {(search || planFilter || statusFilter) && (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSearch(""); setPlan(""); setStatus("") }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{filtered.length} workspace{filtered.length !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Slug</th>
                  <th className="text-left px-4 py-2.5 font-medium">Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Members</th>
                  <th className="text-right px-4 py-2.5 font-medium">Companies</th>
                  <th className="text-right px-4 py-2.5 font-medium">Created</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {w.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium truncate max-w-48">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{w.slug}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", PLAN_COLORS[w.planTier])}>
                        {w.planTier.charAt(0) + w.planTier.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", STATUS_COLORS[w.status])}>
                        {w.status.charAt(0) + w.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{w.members}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{w.companies}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/${w.slug}/dashboard`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      No workspaces match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
