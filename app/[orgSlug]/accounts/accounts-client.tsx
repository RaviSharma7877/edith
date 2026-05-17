"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronDown, MoreHorizontal, Pencil, Trash2, ToggleLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Account = {
  id: string; code: string; name: string; type: string; subtype: string
  parentId: string | null; isPosting: boolean; isActive: boolean
  isSystemAccount: boolean; openingBalance: string | null
  _count: { journalLines: number; children: number }
}

type TreeNode = Account & { depth: number; children: TreeNode[] }

const TYPE_ORDER = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
const TYPE_LABEL: Record<string, string> = {
  ASSET: "Assets", LIABILITY: "Liabilities", EQUITY: "Equity",
  REVENUE: "Revenue", EXPENSE: "Expenses",
}

function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  accounts.forEach((a) => map.set(a.id, { ...a, depth: 0, children: [] }))

  const roots: TreeNode[] = []
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  function setDepth(node: TreeNode, d: number) {
    node.depth = d
    node.children.forEach((c) => setDepth(c, d + 1))
    node.children.sort((a, b) => a.code.localeCompare(b.code))
  }
  roots.forEach((r) => setDepth(r, 0))
  roots.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.code.localeCompare(b.code))
  return roots
}

function flattenTree(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = []
  function walk(node: TreeNode) {
    result.push(node)
    if (expanded.has(node.id)) node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return result
}

export function AccountsClient({
  orgSlug,
  accounts,
}: {
  orgSlug: string
  accounts: Account[]
}) {
  const router = useRouter()
  const [expanded, setExpanded]         = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const tree    = buildTree(accounts)
  const visible = flattenTree(tree, expanded)

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/organizations/${orgSlug}/accounts/${deleteTarget.id}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? "Delete failed.")
        setDeleting(false)
        return
      }
      setDeleteTarget(null)
      router.refresh()
    } catch {
      setError("Network error.")
      setDeleting(false)
    }
  }

  async function handleToggleActive(account: Account) {
    await fetch(`/api/organizations/${orgSlug}/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !account.isActive }),
    })
    router.refresh()
  }

  const sectionStarts = useMemo(() => {
    const starts = new Set<string>()
    let prevType = ""
    for (const row of visible) {
      if (row.depth === 0 && row.type !== prevType) {
        starts.add(row.id)
        prevType = row.type
      }
    }
    return starts
  }, [visible])

  return (
    <>
      <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_3fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Code</span>
          <span>Name</span>
          <span>Type</span>
          <span>Posting?</span>
          <span>Status</span>
          <span>Txns</span>
          <span className="w-8" />
        </div>

        {visible.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">
            No accounts yet.{" "}
            <Link href={`/${orgSlug}/accounts/new`} className="underline">
              Create the first one.
            </Link>
          </div>
        )}

        {visible.map((row) => {
          const showSection = sectionStarts.has(row.id)
          const hasChildren = row._count.children > 0
          const isOpen      = expanded.has(row.id)

          return (
            <div key={row.id}>
              {showSection && (
                <div className="bg-[#F7F5F3] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#605A57] border-b border-[rgba(55,50,47,0.08)]">
                  {TYPE_LABEL[row.type] ?? row.type}
                </div>
              )}

              <div
                className="grid grid-cols-[2fr_3fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm hover:bg-[#FAFAF9] transition-colors"
              >
                {/* Code + expand toggle */}
                <div className="flex items-center gap-1 font-mono text-xs text-[#605A57]">
                  <span style={{ width: row.depth * 16 }} className="shrink-0" />
                  {hasChildren ? (
                    <button
                      onClick={() => toggle(row.id)}
                      className="flex size-5 items-center justify-center rounded text-[#605A57] hover:bg-[rgba(55,50,47,0.08)]"
                    >
                      {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                  ) : (
                    <span className="size-5" />
                  )}
                  {row.code}
                </div>

                {/* Name */}
                <Link
                  href={`/${orgSlug}/accounts/${row.id}`}
                  className="font-medium text-[#37322F] hover:underline truncate"
                >
                  {row.name}
                </Link>

                {/* Type badge */}
                <span className="text-xs text-[#605A57]">{row.subtype.replace(/_/g, " ")}</span>

                {/* Posting */}
                <span className="text-xs text-[#605A57]">{row.isPosting ? "Yes" : "No"}</span>

                {/* Status */}
                <Badge
                  variant={row.isActive ? "default" : "secondary"}
                  className="w-fit text-[10px] px-1.5 py-0"
                >
                  {row.isActive ? "Active" : "Inactive"}
                </Badge>

                {/* Txn count */}
                <span className="text-xs text-[#605A57]">{row._count.journalLines}</span>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link href={`/${orgSlug}/accounts/${row.id}`}>
                        <Pencil className="size-3.5 mr-2" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(row)}>
                      <ToggleLeft className="size-3.5 mr-2" />
                      {row.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    {!row.isSystemAccount && row._count.journalLines === 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setError(null) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.code} – {deleteTarget?.name}</strong>.
              This cannot be undone.
              {error && <span className="mt-2 block text-destructive text-sm">{error}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
