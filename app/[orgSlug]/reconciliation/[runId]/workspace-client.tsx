"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StmtLine {
  id:                   string
  date:                 string
  description:          string
  reference:            string | null
  debitAmount:          string | number | null
  creditAmount:         string | number | null
  balance:              string | number | null
  reconciliationStatus: string
  matches:              Match[]
}

interface Match {
  id:             string
  status:         string
  matchType:      string
  confidenceScore: string | number | null
  journalLineId:  string | null
  paymentId:      string | null
}

interface JLine {
  id:        string
  direction: string
  amount:    string | number
  description: string
  journalEntry: {
    id:            string
    date:          string
    voucherNumber: string
    description:   string
  }
}

interface RunData {
  run: {
    id:           string
    completedAt:  string | null
    totalMatched: number
    totalUnmatched: number
    statement: {
      id:         string
      startDate:  string
      endDate:    string
      isLocked:   boolean
      bankAccount: { id: string; bankName: string; maskedNumber: string; chartAccountId: string }
      lines:      StmtLine[]
    }
  }
  unmatchedJLines: JLine[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—"
  const n = Number(v)
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}
function confLabel(score: string | number | null) {
  const n = Number(score ?? 0)
  if (n >= 0.95) return { label: "Exact", color: "text-green-600" }
  if (n >= 0.80) return { label: "High",  color: "text-green-500" }
  if (n >= 0.65) return { label: "Med",   color: "text-yellow-600" }
  return { label: "Low", color: "text-red-500" }
}

const STATUS_DOT: Record<string, string> = {
  UNRECONCILED:      "bg-gray-300",
  MATCHED:           "bg-yellow-400",
  CLEARED:           "bg-green-500",
  DISPUTED:          "bg-red-400",
  PARTIALLY_MATCHED: "bg-orange-400",
}

// ─── Adjust dialog ────────────────────────────────────────────────────────────

function AdjustDialog({
  orgSlug,
  runId,
  stmtLine,
  accounts,
  onClose,
  onDone,
}: {
  orgSlug:   string
  runId:     string
  stmtLine:  StmtLine
  accounts:  { id: string; name: string; code: string }[]
  onClose:   () => void
  onDone:    () => void
}) {
  const [accountId,   setAccountId]   = useState("")
  const [description, setDescription] = useState(stmtLine.description)
  const [notes,       setNotes]       = useState("")
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/adjust`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statementLineId: stmtLine.id, adjustAccountId: accountId, description, notes }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Failed."); return }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={submit} className="w-[460px] rounded-xl bg-white p-6 shadow-2xl space-y-4">
        <p className="text-sm font-semibold text-[#37322F]">Create adjustment entry</p>
        <p className="text-xs text-[#605A57]">
          {fmtDate(stmtLine.date)} · {stmtLine.description} ·{" "}
          {stmtLine.creditAmount ? `+₹${fmt(stmtLine.creditAmount)}` : `-₹${fmt(stmtLine.debitAmount)}`}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-[#605A57] mb-1">Offset account *</label>
          <select
            className="w-full rounded border border-[rgba(55,50,47,0.18)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Select account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#605A57] mb-1">Description</label>
          <input
            className="w-full rounded border border-[rgba(55,50,47,0.18)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#605A57] mb-1">Notes</label>
          <textarea rows={2} className="w-full rounded border border-[rgba(55,50,47,0.18)] px-3 py-2 text-sm focus:outline-none" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded border border-[rgba(55,50,47,0.18)] px-3 py-1.5 text-sm text-[#605A57]">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {saving ? "Creating…" : "Create & Accept"}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Workspace ────────────────────────────────────────────────────────────────

export function ReconciliationWorkspace({
  orgSlug,
  runId,
  initialData,
  adjustAccounts,
}: {
  orgSlug:        string
  runId:          string
  initialData:    RunData
  adjustAccounts: { id: string; name: string; code: string }[]
}) {
  const router = useRouter()

  const [data,       setData]       = useState(initialData)
  const [focusPanel, setFocusPanel] = useState<"left" | "right">("left")
  const [leftIdx,    setLeftIdx]    = useState(0)
  const [rightIdx,   setRightIdx]   = useState(0)
  const [loading,    setLoading]    = useState<string | null>(null)
  const [error,      setError]      = useState("")
  const [adjustLine, setAdjustLine] = useState<StmtLine | null>(null)
  const [completing, setCompleting] = useState(false)

  const leftRef  = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  const run      = data.run
  const stmt     = run.statement
  const stmtLines  = stmt.lines
  const jLines     = data.unmatchedJLines
  const isComplete = !!run.completedAt
  const isLocked   = stmt.isLocked

  const unreconciled = stmtLines.filter((l) => l.reconciliationStatus === "UNRECONCILED")
  const cleared      = stmtLines.filter((l) => l.reconciliationStatus === "CLEARED")
  const disputed     = stmtLines.filter((l) => l.reconciliationStatus === "DISPUTED")

  async function reload() {
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}`)
    const data = await res.json()
    setData(data)
  }

  async function accept(matchId: string) {
    setLoading(matchId); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/accept`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    })
    const d = await res.json()
    setLoading(null)
    if (!res.ok) { setError(d.error ?? "Failed to accept."); return }
    await reload()
  }

  async function removeMatch(matchId: string) {
    setLoading(matchId); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/match?matchId=${matchId}`, { method: "DELETE" })
    const d = await res.json()
    setLoading(null)
    if (!res.ok) { setError(d.error ?? "Failed."); return }
    await reload()
  }

  async function reject(matchId?: string, statementLineId?: string) {
    const key = matchId ?? statementLineId ?? "rej"
    setLoading(key); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/reject`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, statementLineId }),
    })
    const d = await res.json()
    setLoading(null)
    if (!res.ok) { setError(d.error ?? "Failed."); return }
    await reload()
  }

  async function createMatch(statementLineId: string, journalLineId: string) {
    setLoading("match"); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/match`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statementLineId, journalLineId }),
    })
    const d = await res.json()
    setLoading(null)
    if (!res.ok) { setError(d.error ?? "Failed."); return }
    await reload()
  }

  async function complete() {
    setCompleting(true)
    const res  = await fetch(`/api/organizations/${orgSlug}/reconciliation/${runId}/complete`, { method: "POST" })
    const d    = await res.json()
    setCompleting(false)
    if (!res.ok) { setError(d.error ?? "Failed."); return }
    await reload()
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't hijack when typing in inputs/selects
    if (["INPUT","TEXTAREA","SELECT"].includes((e.target as HTMLElement)?.tagName)) return

    if (e.key === "Tab") {
      e.preventDefault()
      setFocusPanel((p) => p === "left" ? "right" : "left")
      return
    }
    if (e.key === "ArrowDown" || e.key === "j") {
      e.preventDefault()
      if (focusPanel === "left")  setLeftIdx((i)  => Math.min(i + 1, stmtLines.length - 1))
      if (focusPanel === "right") setRightIdx((i) => Math.min(i + 1, jLines.length - 1))
    }
    if (e.key === "ArrowUp" || e.key === "k") {
      e.preventDefault()
      if (focusPanel === "left")  setLeftIdx((i)  => Math.max(i - 1, 0))
      if (focusPanel === "right") setRightIdx((i) => Math.max(i - 1, 0))
    }
    if ((e.key === "Enter" || e.key === " ") && !isComplete && !isLocked) {
      e.preventDefault()
      const stmtLine = stmtLines[leftIdx]
      const jLine    = jLines[rightIdx]
      if (stmtLine && jLine && focusPanel === "right") {
        createMatch(stmtLine.id, jLine.id)
      }
    }
    if (e.key === "a" && focusPanel === "left" && !isComplete) {
      const stmtLine = stmtLines[leftIdx]
      if (stmtLine) {
        const suggestion = stmtLine.matches.find((m) => m.status === "MATCHED")
        if (suggestion) accept(suggestion.id)
      }
    }
    if (e.key === "r" && focusPanel === "left" && !isComplete) {
      const stmtLine = stmtLines[leftIdx]
      if (stmtLine) {
        const suggestion = stmtLine.matches.find((m) => m.status === "MATCHED")
        if (suggestion) reject(suggestion.id)
        else if (stmtLine.reconciliationStatus === "UNRECONCILED") reject(undefined, stmtLine.id)
      }
    }
  }, [focusPanel, leftIdx, rightIdx, stmtLines, jLines, isComplete, isLocked])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // Scroll focused rows into view
  useEffect(() => {
    leftRef.current?.children[leftIdx]?.scrollIntoView({ block: "nearest" })
  }, [leftIdx])
  useEffect(() => {
    rightRef.current?.children[rightIdx]?.scrollIntoView({ block: "nearest" })
  }, [rightIdx])

  const selectedStmtLine = stmtLines[leftIdx]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-[#605A57]">
          <span className="font-medium text-[#37322F]">
            {stmt.bankAccount.bankName} ···{stmt.bankAccount.maskedNumber}
          </span>
          <span>{fmtDate(stmt.startDate)} – {fmtDate(stmt.endDate)}</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> {cleared.length} cleared
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-300" /> {unreconciled.length} unreconciled
          </span>
          {disputed.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" /> {disputed.length} disputed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive max-w-xs truncate">{error}</span>}
          {!isComplete && !isLocked && (
            <button
              onClick={complete}
              disabled={completing}
              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {completing ? "…" : "Complete run"}
            </button>
          )}
          {isComplete && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>
          )}
        </div>
      </div>

      {/* Keyboard hint bar */}
      {!isComplete && (
        <div className="flex items-center gap-4 border-b border-[rgba(55,50,47,0.08)] bg-white px-4 py-1.5 text-[10px] text-[#605A57]">
          <span><kbd className="rounded border px-1 font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded border px-1 font-mono">Tab</kbd> Switch panel</span>
          <span><kbd className="rounded border px-1 font-mono">A</kbd> Accept suggestion</span>
          <span><kbd className="rounded border px-1 font-mono">R</kbd> Reject / dispute</span>
          <span><kbd className="rounded border px-1 font-mono">Enter</kbd> Match selected</span>
        </div>
      )}

      {/* Two-panel workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — statement lines */}
        <div
          className={`flex w-[52%] flex-col border-r border-[rgba(55,50,47,0.10)] ${focusPanel === "left" ? "bg-white" : "bg-[#FAFAF9]"}`}
          onClick={() => setFocusPanel("left")}
        >
          <div className="grid grid-cols-[0.6fr_1.6fr_0.7fr_0.7fr_auto] gap-2 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-3 py-1.5 text-[10px] font-medium text-[#605A57]">
            <span>Date</span>
            <span>Description</span>
            <span className="text-right">Debit</span>
            <span className="text-right">Credit</span>
            <span className="w-16 text-center">Status</span>
          </div>
          <div ref={leftRef} className="flex-1 overflow-y-auto">
            {stmtLines.map((line, i) => {
              const isFocused   = focusPanel === "left" && i === leftIdx
              const suggestion  = line.matches.find((m) => m.status === "MATCHED")
              const conf        = suggestion ? confLabel(suggestion.confidenceScore) : null
              return (
                <div
                  key={line.id}
                  onClick={() => setLeftIdx(i)}
                  className={`grid grid-cols-[0.6fr_1.6fr_0.7fr_0.7fr_auto] gap-2 items-center border-b border-[rgba(55,50,47,0.05)] px-3 py-2 text-xs cursor-pointer select-none ${
                    isFocused ? "bg-primary/8 ring-1 ring-inset ring-primary/30" : "hover:bg-[#F7F5F3]"
                  }`}
                >
                  <span className="font-mono text-[10px] text-[#605A57]">{fmtDate(line.date)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[#37322F]">{line.description}</p>
                    {line.reference && <p className="font-mono text-[9px] text-[#605A57]">{line.reference}</p>}
                    {suggestion && (
                      <p className={`text-[9px] ${conf?.color}`}>
                        {conf?.label} match · {suggestion.matchType}
                        {!isComplete && (
                          <span className="ml-1.5 text-[#605A57]">
                            <button onClick={(e) => { e.stopPropagation(); accept(suggestion.id) }} disabled={!!loading} className="mr-1 text-green-600 hover:underline">A</button>
                            <button onClick={(e) => { e.stopPropagation(); removeMatch(suggestion.id) }} disabled={!!loading} className="text-[#605A57] hover:underline">✕</button>
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-right font-mono text-[10px] text-destructive">
                    {line.debitAmount ? `₹${fmt(line.debitAmount)}` : "—"}
                  </span>
                  <span className="text-right font-mono text-[10px] text-green-600">
                    {line.creditAmount ? `₹${fmt(line.creditAmount)}` : "—"}
                  </span>
                  <div className="flex w-16 items-center justify-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[line.reconciliationStatus] ?? "bg-gray-300"}`} />
                    {!isComplete && line.reconciliationStatus === "UNRECONCILED" && isFocused && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAdjustLine(line) }}
                        className="text-[9px] text-[#605A57] hover:text-primary"
                        title="Create adjustment"
                      >
                        ±
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — unmatched journal lines */}
        <div
          className={`flex flex-1 flex-col ${focusPanel === "right" ? "bg-white" : "bg-[#FAFAF9]"}`}
          onClick={() => setFocusPanel("right")}
        >
          <div className="grid grid-cols-[0.6fr_1.6fr_0.5fr_0.8fr] gap-2 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-3 py-1.5 text-[10px] font-medium text-[#605A57]">
            <span>Date</span>
            <span>Description</span>
            <span>Dir</span>
            <span className="text-right">Amount</span>
          </div>
          {jLines.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#605A57]">All journal entries matched.</div>
          ) : (
            <div ref={rightRef} className="flex-1 overflow-y-auto">
              {jLines.map((jl, i) => {
                const isFocused = focusPanel === "right" && i === rightIdx
                return (
                  <div
                    key={jl.id}
                    onClick={() => setRightIdx(i)}
                    onDoubleClick={() => {
                      if (selectedStmtLine && !isComplete) createMatch(selectedStmtLine.id, jl.id)
                    }}
                    className={`grid grid-cols-[0.6fr_1.6fr_0.5fr_0.8fr] gap-2 items-center border-b border-[rgba(55,50,47,0.05)] px-3 py-2 text-xs cursor-pointer select-none ${
                      isFocused ? "bg-primary/8 ring-1 ring-inset ring-primary/30" : "hover:bg-[#F7F5F3]"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#605A57]">{fmtDate(jl.journalEntry.date)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[#37322F]">{jl.journalEntry.description || jl.description}</p>
                      <p className="font-mono text-[9px] text-[#605A57]">{jl.journalEntry.voucherNumber}</p>
                    </div>
                    <span className={`text-[10px] font-medium ${jl.direction === "DEBIT" ? "text-green-600" : "text-destructive"}`}>
                      {jl.direction === "DEBIT" ? "CR" : "DR"}
                    </span>
                    <span className="text-right font-mono text-[10px] text-[#37322F]">₹{fmt(jl.amount)}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Match button when both panels have a selection */}
          {!isComplete && selectedStmtLine && jLines[rightIdx] && focusPanel === "right" && (
            <div className="border-t border-[rgba(55,50,47,0.10)] bg-white px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-[#605A57] flex-1 truncate">
                Match: {selectedStmtLine.description} ↔ {jLines[rightIdx].journalEntry.voucherNumber}
              </span>
              <button
                onClick={() => createMatch(selectedStmtLine.id, jLines[rightIdx].id)}
                disabled={!!loading}
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {loading === "match" ? "…" : "Match ↵"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Adjust dialog */}
      {adjustLine && (
        <AdjustDialog
          orgSlug={orgSlug}
          runId={runId}
          stmtLine={adjustLine}
          accounts={adjustAccounts}
          onClose={() => setAdjustLine(null)}
          onDone={() => { setAdjustLine(null); reload() }}
        />
      )}
    </div>
  )
}
