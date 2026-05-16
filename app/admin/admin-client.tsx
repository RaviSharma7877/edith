"use client"

import { Building2, Users, LayoutGrid, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Workspace {
  id:        string
  name:      string
  slug:      string
  planTier:  string
  status:    string
  members:   number
  createdAt: string
}

interface Props {
  stats: { totalWorkspaces: number; totalUsers: number; totalCompanies: number }
  recentWorkspaces: Workspace[]
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

export function AdminDashboard({ stats, recentWorkspaces }: Props) {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Platform Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Super-admin overview of all tenants.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Building2, label: "Workspaces",  value: stats.totalWorkspaces },
          { icon: Users,     label: "Users",        value: stats.totalUsers      },
          { icon: LayoutGrid,label: "Companies",    value: stats.totalCompanies  },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <div className="flex items-center gap-2">
                <s.icon className="size-4 text-muted-foreground" />
                <CardTitle className="text-xs text-muted-foreground font-medium">{s.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <span className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent workspaces */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent workspaces</CardTitle>
            <a href="/admin/tenants" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ExternalLink className="size-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentWorkspaces.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {w.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.slug} · {w.members} member{w.members !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[w.planTier] ?? ""}`}>
                    {w.planTier.toLowerCase()}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[w.status] ?? ""}`}>
                    {w.status.toLowerCase()}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                  {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
            {recentWorkspaces.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No workspaces yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
