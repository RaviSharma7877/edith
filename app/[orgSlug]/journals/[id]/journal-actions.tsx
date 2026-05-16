"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

export function JournalActions({
  orgSlug,
  entryId,
  status,
  balanced,
}: {
  orgSlug: string
  entryId: string
  status: string
  balanced: boolean
}) {
  const router = useRouter()

  const [posting,     setPosting]     = useState(false)
  const [postError,   setPostError]   = useState<string | null>(null)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [reason,      setReason]      = useState("")
  const [reverseDate, setReverseDate] = useState(new Date().toISOString().slice(0, 10))
  const [reversing,   setReversing]   = useState(false)
  const [reverseErr,  setReverseErr]  = useState<string | null>(null)

  async function handlePost() {
    setPosting(true)
    setPostError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/journals/${entryId}/post`, {
      method: "POST",
    })
    if (res.ok) {
      router.refresh()
    } else {
      const body = await res.json()
      setPostError(body.error ?? "Post failed.")
    }
    setPosting(false)
  }

  async function handleReverse() {
    if (!reason.trim()) { setReverseErr("A reason is required."); return }
    setReversing(true)
    setReverseErr(null)
    const res = await fetch(`/api/organizations/${orgSlug}/journals/${entryId}/reverse`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason, date: reverseDate }),
    })
    if (res.ok) {
      const data = await res.json()
      setReverseOpen(false)
      router.push(`/${orgSlug}/journals/${data.id}`)
    } else {
      const body = await res.json()
      setReverseErr(body.error ?? "Reversal failed.")
      setReversing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Edit draft */}
      {status === "DRAFT" && (
        <>
          <Link href={`/${orgSlug}/journals/${entryId}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button
            size="sm"
            disabled={posting || !balanced}
            onClick={handlePost}
            title={!balanced ? "Journal must be balanced before posting" : undefined}
          >
            {posting ? "Posting…" : "Post"}
          </Button>
          {postError && (
            <span className="text-xs text-destructive max-w-xs">{postError}</span>
          )}
        </>
      )}

      {/* Review + post for pending approval */}
      {status === "PENDING_APPROVAL" && (
        <Button size="sm" disabled={posting || !balanced} onClick={handlePost}>
          {posting ? "Posting…" : "Approve & post"}
        </Button>
      )}

      {/* Reverse posted */}
      {status === "POSTED" && (
        <Button variant="outline" size="sm" onClick={() => setReverseOpen(true)}>
          Reverse
        </Button>
      )}

      {/* Reversal dialog */}
      <Dialog open={reverseOpen} onOpenChange={(o) => { setReverseOpen(o); setReverseErr(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse this journal entry</DialogTitle>
            <DialogDescription>
              A new draft entry will be created with all debits and credits flipped.
              The original entry will be marked as reversed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {reverseErr && (
              <p className="text-sm text-destructive">{reverseErr}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reverseDate">Reversal date</Label>
              <Input
                id="reverseDate"
                type="date"
                value={reverseDate}
                onChange={(e) => setReverseDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this entry is being reversed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseOpen(false)} disabled={reversing}>
              Cancel
            </Button>
            <Button onClick={handleReverse} disabled={reversing || !reason.trim()}>
              {reversing ? "Reversing…" : "Create reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
