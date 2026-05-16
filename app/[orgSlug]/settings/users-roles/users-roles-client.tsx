"use client"

import { useState, useCallback } from "react"
import {
  Users, UserPlus, MoreHorizontal, Shield, ShieldCheck, Eye, AlertCircle,
  AlertTriangle, CheckCircle2, Ban, UserCheck, ChevronDown, ChevronUp, Copy, Check,
  RefreshCw,
} from "lucide-react"

import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ASSIGNABLE_ROLES, MAKER_CHECKER_ELIGIBLE_ROLES, PLAN_SEAT_LIMITS } from "@/lib/permissions"
import type { SystemRole } from "@prisma/client"

// ── Role display helpers ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN:     { label: "Super admin",     color: "bg-purple-50 text-purple-700 border-purple-200" },
  ORG_OWNER:       { label: "Owner",           color: "bg-primary/10 text-primary border-primary/30"   },
  ORG_ADMIN:       { label: "Admin",           color: "bg-blue-50 text-blue-700 border-blue-200"        },
  ACCOUNTANT:      { label: "Accountant",      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BOOKKEEPER:      { label: "Bookkeeper",      color: "bg-teal-50 text-teal-700 border-teal-200"        },
  SALES:           { label: "Sales",           color: "bg-amber-50 text-amber-700 border-amber-200"     },
  PROJECT_MANAGER: { label: "Project manager", color: "bg-orange-50 text-orange-700 border-orange-200"  },
  ANALYST:         { label: "Analyst",         color: "bg-sky-50 text-sky-700 border-sky-200"           },
  AUDITOR:         { label: "Auditor",         color: "bg-zinc-100 text-zinc-700 border-zinc-200"       },
  CLIENT:          { label: "Client",          color: "bg-zinc-50 text-zinc-500 border-zinc-200"        },
  VIEWER:          { label: "Viewer",          color: "bg-zinc-50 text-zinc-400 border-zinc-200"        },
}

const ROLE_GUIDE = [
  { role: "ORG_OWNER",       access: "Full control. Cannot be removed."                                  },
  { role: "ORG_ADMIN",       access: "All features except billing and owner-level destructive actions."  },
  { role: "ACCOUNTANT",      access: "Full accounting: posting, period close, tax filing, approvals."    },
  { role: "BOOKKEEPER",      access: "Can draft & submit entries; cannot post, close, or approve."       },
  { role: "SALES",           access: "CRM, invoices, proposals, and client portal."                      },
  { role: "PROJECT_MANAGER", access: "Projects, tasks, files, and client portal."                        },
  { role: "ANALYST",         access: "Read-only analytics and reports — no write access."                },
  { role: "AUDITOR",         access: "Read-only financials and full audit log — cannot modify data."     },
  { role: "CLIENT",          access: "Client portal only — sees their own invoices."                     },
  { role: "VIEWER",          access: "General read-only access across modules."                          },
]

function RoleBadge({ role }: { role: string }) {
  const r = ROLE_LABELS[role] ?? { label: role, color: "bg-zinc-50 text-zinc-500 border-zinc-200" }
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", r.color)}>
      {r.label}
    </span>
  )
}

function InviteStatusBadge({ status }: { status: string }) {
  if (status === "ACCEPTED") return null
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:   { label: "Invite pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    EXPIRED:   { label: "Invite expired", cls: "bg-red-50 text-red-600 border-red-200"       },
    CANCELLED: { label: "Cancelled",      cls: "bg-zinc-50 text-zinc-500 border-zinc-200"    },
  }
  const info = map[status] ?? { label: status, cls: "bg-zinc-50 text-zinc-500 border-zinc-200" }
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", info.cls)}>
      {info.label}
    </span>
  )
}

// ── Invite form ───────────────────────────────────────────────────────────────

function InviteForm({
  orgSlug,
  onInvited,
}: {
  orgSlug: string
  onInvited: (inviteUrl: string) => void
}) {
  const [email,  setEmail]  = useState("")
  const [role,   setRole]   = useState("ACCOUNTANT")
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState("")

  const inputCls =
    "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"

  async function handleInvite() {
    if (!email.trim()) return
    setBusy(true); setError("")
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Invite failed"); return }
      setEmail("")
      onInvited(data.inviteUrl ?? "")
    } catch {
      setError("Network error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com"
          className={cn(inputCls, "flex-1")}
          onKeyDown={(e) => e.key === "Enter" && handleInvite()}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={cn(inputCls, "w-36 appearance-none cursor-pointer")}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]?.label ?? r}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleInvite} disabled={busy || !email.trim()} className="gap-1.5 h-9">
          <UserPlus className="size-3.5" />
          {busy ? "Sending…" : "Invite"}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3.5" /> {error}
        </div>
      )}
    </div>
  )
}

// ── Invite link reveal dialog ─────────────────────────────────────────────────

function InviteLinkDialog({
  inviteUrl,
  open,
  onClose,
}: {
  inviteUrl: string
  open: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${inviteUrl}` : inviteUrl

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite sent</DialogTitle>
          <DialogDescription>
            Share this link with the invitee. It expires in 7 days and can only be used once.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <code className="flex-1 truncate text-xs">{fullUrl}</code>
          <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={handleCopy}>
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Role change dialog ────────────────────────────────────────────────────────

function ChangeRoleDialog({
  member,
  orgSlug,
  open,
  onClose,
  onDone,
}: {
  member: Member
  orgSlug: string
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [role,  setRole]  = useState(member.systemRole)
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (role === member.systemRole) { onClose(); return }
    setBusy(true); setError("")
    try {
      const res = await fetch(`/api/organizations/${orgSlug}/members/${member.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "change_role", role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed"); return }
      onDone()
    } catch {
      setError("Network error")
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Changing {member.name}&apos;s access level takes effect immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as SystemRole)}
            className={inputCls}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]?.label ?? r}</option>
            ))}
          </select>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Remove / suspend confirmation dialog ─────────────────────────────────────

function ConfirmActionDialog({
  member,
  action,
  orgSlug,
  open,
  onClose,
  onDone,
}: {
  member: Member
  action: "remove" | "suspend" | "reactivate"
  orgSlug: string
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState("")

  const labels = {
    remove:     { title: "Remove member",    cta: "Remove",     variant: "destructive" as const },
    suspend:    { title: "Suspend member",   cta: "Suspend",    variant: "destructive" as const },
    reactivate: { title: "Reactivate member",cta: "Reactivate", variant: "default" as const     },
  }
  const { title, cta, variant } = labels[action]

  async function handleConfirm() {
    setBusy(true); setError("")
    try {
      if (action === "remove") {
        const res = await fetch(`/api/organizations/${orgSlug}/members/${member.id}`, { method: "DELETE" })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Failed"); return }
      } else {
        const res = await fetch(`/api/organizations/${orgSlug}/members/${member.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: action === "reactivate" ? "reactivate" : "suspend" }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Failed"); return }
      }
      onDone()
    } catch {
      setError("Network error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {action === "remove" && `${member.name} will lose all access to this organisation immediately.`}
            {action === "suspend" && `${member.name}'s access will be temporarily blocked. You can reactivate later.`}
            {action === "reactivate" && `${member.name} will regain access with their current role.`}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-xs text-destructive px-1">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={variant} onClick={handleConfirm} disabled={busy}>
            {busy ? "…" : cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────

export interface Member {
  id:             string
  userId:         string
  email:          string
  name:           string
  systemRole:     string
  inviteStatus:   string
  inviteExpiresAt: string | null
  isActive:       boolean
  suspendedAt:    string | null
  canApprove:     boolean
  joinedAt:       string | null
  lastActive:     string | null
}

function MemberRow({
  member,
  isCurrentUser,
  orgSlug,
  onRefresh,
}: {
  member: Member
  isCurrentUser: boolean
  orgSlug: string
  onRefresh: () => void
}) {
  const [changeRoleOpen, setChangeRoleOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"remove" | "suspend" | "reactivate" | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  const initials = member.name
    .split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || member.email[0].toUpperCase()

  const isSuspended  = !member.isActive && member.suspendedAt
  const isPending    = member.inviteStatus === "PENDING"
  const isEligible   = MAKER_CHECKER_ELIGIBLE_ROLES.includes(member.systemRole as SystemRole)

  async function toggleApprove() {
    setApproveLoading(true)
    await fetch(`/api/organizations/${orgSlug}/members/${member.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "toggle_approve" }),
    })
    setApproveLoading(false)
    onRefresh()
  }

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
        isSuspended && "opacity-50",
      )}>
        <Avatar className="size-8 rounded-lg shrink-0">
          <AvatarFallback className={cn(
            "rounded-lg text-xs font-medium",
            isSuspended ? "bg-zinc-200 text-zinc-400" : "bg-muted",
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{member.name}</span>
            {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
            {isSuspended && (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <Ban className="size-3" /> Suspended
              </span>
            )}
            {member.canApprove && (
              <span className="inline-flex items-center gap-1 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0.5 text-xs">
                <ShieldCheck className="size-3" /> Approver
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground truncate block">{member.email}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <RoleBadge role={member.systemRole} />
          <InviteStatusBadge status={member.inviteStatus} />
        </div>

        <div className="w-20 text-right shrink-0">
          <span className="text-xs text-muted-foreground">
            {isPending
              ? `Expires ${member.inviteExpiresAt ? new Date(member.inviteExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}`
              : member.lastActive
              ? new Date(member.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              : member.joinedAt
              ? `Joined ${new Date(member.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
              : "—"
            }
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" disabled={isCurrentUser}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="gap-2" onClick={() => setChangeRoleOpen(true)}>
              <Shield className="size-3.5" /> Change role
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" asChild>
              <a href={`/${orgSlug}/audit?actorId=${member.userId}`}>
                <Eye className="size-3.5" /> View activity
              </a>
            </DropdownMenuItem>
            {isEligible && (
              <DropdownMenuItem
                className="gap-2"
                onClick={toggleApprove}
                disabled={approveLoading}
              >
                <CheckCircle2 className="size-3.5" />
                {member.canApprove ? "Remove approver" : "Make approver"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isSuspended ? (
              <DropdownMenuItem className="gap-2 text-emerald-600" onClick={() => setConfirmAction("reactivate")}>
                <UserCheck className="size-3.5" /> Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-2 text-amber-600 focus:text-amber-600" onClick={() => setConfirmAction("suspend")}>
                <Ban className="size-3.5" /> Suspend
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => setConfirmAction("remove")}
            >
              Remove from org
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangeRoleDialog
        member={member}
        orgSlug={orgSlug}
        open={changeRoleOpen}
        onClose={() => setChangeRoleOpen(false)}
        onDone={() => { setChangeRoleOpen(false); onRefresh() }}
      />
      {confirmAction && (
        <ConfirmActionDialog
          member={member}
          action={confirmAction}
          orgSlug={orgSlug}
          open={true}
          onClose={() => setConfirmAction(null)}
          onDone={() => { setConfirmAction(null); onRefresh() }}
        />
      )}
    </>
  )
}

// ── Seat usage bar ────────────────────────────────────────────────────────────

function SeatUsageBar({ active, limit }: { active: number; limit: number }) {
  if (limit === Infinity) return null
  const pct     = Math.min((active / limit) * 100, 100)
  const isNear  = pct >= 80
  const isFull  = active >= limit

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Seat usage</span>
        <span className={cn("font-medium", isFull && "text-destructive", isNear && !isFull && "text-amber-600")}>
          {active} / {limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isFull ? "bg-destructive" : isNear ? "bg-amber-500" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="size-3" /> Seat limit reached — upgrade your plan to invite more members.
        </p>
      )}
      {isNear && !isFull && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="size-3" /> Approaching seat limit.
        </p>
      )}
    </div>
  )
}

// ── Role permission matrix ────────────────────────────────────────────────────

const PERMISSION_MATRIX = [
  { label: "Post journal entries",        roles: ["ORG_ADMIN","ACCOUNTANT"] },
  { label: "Close accounting period",     roles: ["ORG_ADMIN","ACCOUNTANT"] },
  { label: "Approve high-risk actions",   roles: ["ORG_ADMIN","ACCOUNTANT"] },
  { label: "File tax returns",            roles: ["ORG_ADMIN","ACCOUNTANT"] },
  { label: "Reconcile bank accounts",     roles: ["ORG_ADMIN","ACCOUNTANT","BOOKKEEPER"] },
  { label: "Write accounting entries",    roles: ["ORG_ADMIN","ACCOUNTANT","BOOKKEEPER"] },
  { label: "Write invoices & bills",      roles: ["ORG_ADMIN","ACCOUNTANT","BOOKKEEPER","SALES"] },
  { label: "Import data",                 roles: ["ORG_ADMIN","ACCOUNTANT","BOOKKEEPER"] },
  { label: "Export reports",              roles: ["ORG_ADMIN","ACCOUNTANT","ANALYST","AUDITOR"] },
  { label: "View audit log",              roles: ["ORG_ADMIN","ACCOUNTANT","AUDITOR"] },
  { label: "Manage members",              roles: ["ORG_ADMIN"] },
  { label: "Manage API keys & webhooks",  roles: ["ORG_ADMIN"] },
]

function RoleMatrix({ expanded }: { expanded: boolean }) {
  if (!expanded) return null
  const cols = ["ORG_ADMIN","ACCOUNTANT","BOOKKEEPER","SALES","ANALYST","AUDITOR","CLIENT","VIEWER"]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground w-48">Permission</th>
            {cols.map((r) => (
              <th key={r} className="py-2 px-2 text-center font-medium text-muted-foreground min-w-[70px]">
                {ROLE_LABELS[r]?.label ?? r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_MATRIX.map((p) => (
            <tr key={p.label} className="border-t hover:bg-muted/20">
              <td className="py-2 px-3 text-muted-foreground">{p.label}</td>
              {cols.map((r) => (
                <td key={r} className="py-2 px-2 text-center">
                  {p.roles.includes(r)
                    ? <CheckCircle2 className="size-3.5 text-emerald-600 mx-auto" />
                    : <span className="text-muted-foreground/30">—</span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

interface Props {
  orgSlug:       string
  currentUserId: string
  activeCount:   number
  planTier:      string
  members:       Member[]
}

export function UsersRolesClient({
  orgSlug, currentUserId, activeCount, planTier, members: initialMembers,
}: Props) {
  const [members,     setMembers]     = useState(initialMembers)
  const [showInvite,  setShowInvite]  = useState(false)
  const [inviteUrl,   setInviteUrl]   = useState("")
  const [matrixOpen,  setMatrixOpen]  = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)

  const seatLimit  = PLAN_SEAT_LIMITS[planTier] ?? 3
  const active     = members.filter((m) => m.isActive && m.inviteStatus === "ACCEPTED")
  const pending    = members.filter((m) => m.inviteStatus === "PENDING")
  const suspended  = members.filter((m) => !m.isActive && !!m.suspendedAt)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res  = await fetch(`/api/organizations/${orgSlug}/members`)
      const data = await res.json()
      if (Array.isArray(data)) setMembers(data as Member[])
    } finally {
      setRefreshing(false)
    }
  }, [orgSlug])

  function handleInvited(url: string) {
    setShowInvite(false)
    setInviteUrl(url)
    refresh()
  }

  return (
    <SidebarInset>
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <a href={`/${orgSlug}/settings/company`} className="text-muted-foreground hover:text-foreground text-sm">Settings</a>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="font-medium">Users & Roles</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost" size="icon" className="size-8"
            onClick={refresh} disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          </Button>
          <Button
            size="sm" className="h-8 gap-1.5"
            onClick={() => setShowInvite((v) => !v)}
            disabled={active.length >= seatLimit}
          >
            <UserPlus className="size-3.5" />
            Invite member
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6 max-w-3xl">
        <div>
          <h1 className="text-lg font-semibold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to this organisation and what they can do.
          </p>
        </div>

        {/* Seat usage */}
        <SeatUsageBar active={activeCount} limit={seatLimit} />

        {/* Invite form */}
        {showInvite && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <UserPlus className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Invite a team member</CardTitle>
                  <CardDescription className="text-xs">They will receive an email invite or you can share the link manually.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <InviteForm orgSlug={orgSlug} onInvited={handleInvited} />
            </CardContent>
          </Card>
        )}

        {/* Active members */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Users className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Team members</CardTitle>
                  <CardDescription className="text-xs">
                    {active.length} active member{active.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {active.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isCurrentUser={m.userId === currentUserId}
                  orgSlug={orgSlug}
                  onRefresh={refresh}
                />
              ))}
              {active.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No active members yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending invites */}
        {pending.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-amber-100">
                  <AlertCircle className="size-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Pending invites</CardTitle>
                  <CardDescription className="text-xs">{pending.length} invite{pending.length !== 1 ? "s" : ""} awaiting acceptance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pending.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    isCurrentUser={false}
                    orgSlug={orgSlug}
                    onRefresh={refresh}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suspended members */}
        {suspended.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Ban className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Suspended</CardTitle>
                  <CardDescription className="text-xs">{suspended.length} suspended member{suspended.length !== 1 ? "s" : ""}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {suspended.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    isCurrentUser={m.userId === currentUserId}
                    orgSlug={orgSlug}
                    onRefresh={refresh}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role reference + permission matrix */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Role reference</CardTitle>
                  <CardDescription className="text-xs">What each system role can access.</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost" size="sm" className="h-7 gap-1 text-xs"
                onClick={() => setMatrixOpen((v) => !v)}
              >
                {matrixOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                {matrixOpen ? "Hide matrix" : "Show matrix"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {ROLE_GUIDE.map((r) => (
                <div key={r.role} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="w-36 shrink-0"><RoleBadge role={r.role} /></div>
                  <span className="text-sm text-muted-foreground">{r.access}</span>
                </div>
              ))}
            </div>
            {matrixOpen && (
              <div className="border-t pt-2 pb-4">
                <RoleMatrix expanded={matrixOpen} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maker-checker info */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                <CheckCircle2 className="size-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Maker-checker</CardTitle>
                <CardDescription className="text-xs">
                  High-risk actions (posting journals, filing taxes, closing periods) can require a second approver.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Owners and Admins can grant <strong>Approver</strong> status to Accountants and ORG_ADMINs.
              Approvers cannot approve their own actions — the system will always require a different approver
              when maker-checker is active.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invite link dialog */}
      <InviteLinkDialog
        inviteUrl={inviteUrl}
        open={!!inviteUrl}
        onClose={() => setInviteUrl("")}
      />
    </SidebarInset>
  )
}
