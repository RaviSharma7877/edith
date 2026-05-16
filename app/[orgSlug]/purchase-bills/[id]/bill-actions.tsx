"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function BillActions({
  orgSlug, billId, status, isDebitNote,
}: {
  orgSlug: string
  billId: string
  status: string
  isDebitNote: boolean
}) {
  const router = useRouter()

  const [posting,   setPosting]   = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const [voidOpen,  setVoidOpen]  = useState(false)
  const [voiding,   setVoiding]   = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  const [dnOpen,    setDnOpen]    = useState(false)
  const [dnReason,  setDnReason]  = useState("")
  const [dnning,    setDnning]    = useState(false)
  const [dnError,   setDnError]   = useState<string | null>(null)

  async function handlePost() {
    setPosting(true)
    setPostError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/purchase-bills/${billId}/post`, {
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

  async function handleVoid() {
    setVoiding(true)
    setVoidError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/purchase-bills/${billId}/void`, {
      method: "POST",
    })
    if (res.ok) {
      setVoidOpen(false)
      router.refresh()
    } else {
      const body = await res.json()
      setVoidError(body.error ?? "Void failed.")
    }
    setVoiding(false)
  }

  async function handleDebitNote() {
    setDnning(true)
    setDnError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/purchase-bills/${billId}/debit-note`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ reason: dnReason || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setDnOpen(false)
      router.push(`/${orgSlug}/purchase-bills/${data.id}`)
    } else {
      const body = await res.json()
      setDnError(body.error ?? "Debit note creation failed.")
      setDnning(false)
    }
  }

  const canPost = status === "DRAFT" || status === "PENDING_APPROVAL"
  const canVoid = status === "DRAFT" || status === "POSTED"
  const canDN   = status === "POSTED" && !isDebitNote

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canPost && (
        <>
          <Button size="sm" disabled={posting} onClick={handlePost}>
            {posting ? "Posting…" : status === "PENDING_APPROVAL" ? "Approve & post" : "Post"}
          </Button>
          {postError && <span className="text-xs text-destructive max-w-xs">{postError}</span>}
        </>
      )}

      {canDN && (
        <Button variant="outline" size="sm" onClick={() => setDnOpen(true)}>
          Debit note
        </Button>
      )}

      {canVoid && (
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setVoidOpen(true)}>
          Void
        </Button>
      )}

      {/* Void dialog */}
      <Dialog open={voidOpen} onOpenChange={(o) => { setVoidOpen(o); setVoidError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this bill?</DialogTitle>
            <DialogDescription>
              The bill will be permanently voided and cannot be posted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {voidError && <p className="text-sm text-destructive">{voidError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)} disabled={voiding}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
              {voiding ? "Voiding…" : "Void bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit note dialog */}
      <Dialog open={dnOpen} onOpenChange={(o) => { setDnOpen(o); setDnError(null); setDnReason("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create debit note</DialogTitle>
            <DialogDescription>
              A new draft debit note will be created for the full amount of this bill.
              You can adjust line items before posting it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {dnError && <p className="text-sm text-destructive">{dnError}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="dnReason">Reason (optional)</Label>
              <Textarea
                id="dnReason"
                value={dnReason}
                onChange={(e) => setDnReason(e.target.value)}
                rows={3}
                placeholder="Why is this debit note being issued?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDnOpen(false)} disabled={dnning}>Cancel</Button>
            <Button onClick={handleDebitNote} disabled={dnning}>
              {dnning ? "Creating…" : "Create debit note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
