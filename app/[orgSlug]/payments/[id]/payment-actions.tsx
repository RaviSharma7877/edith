"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function PaymentActions({
  orgSlug,
  paymentId,
  status,
  isReversal,
}: {
  orgSlug:    string
  paymentId:  string
  status:     string
  isReversal: boolean
}) {
  const router = useRouter()
  const [loading,      setLoading]      = useState<string | null>(null)
  const [error,        setError]        = useState("")
  const [showReverse,  setShowReverse]  = useState(false)

  async function handlePost() {
    setLoading("post"); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/payments/${paymentId}/post`, { method: "POST" })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { setError(data.error ?? "Failed to post."); return }
    router.refresh()
  }

  async function handleReverse() {
    setLoading("reverse"); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/payments/${paymentId}/reverse`, { method: "POST" })
    const data = await res.json()
    setLoading(null)
    setShowReverse(false)
    if (!res.ok) { setError(data.error ?? "Failed to reverse."); return }
    router.push(`/${orgSlug}/payments/${data.reversalPaymentId}`)
  }

  const canPost    = status === "DRAFT" || status === "PENDING_APPROVAL"
  const canReverse = status === "POSTED" && !isReversal

  if (!canPost && !canReverse) return null

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}

      {canPost && (
        <button
          onClick={handlePost}
          disabled={loading === "post"}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === "post" ? "Posting…" : "Post"}
        </button>
      )}

      {canReverse && !showReverse && (
        <button
          onClick={() => setShowReverse(true)}
          className="rounded-md border border-[rgba(55,50,47,0.18)] px-3 py-1.5 text-sm text-[#605A57] hover:bg-[#F7F5F3]"
        >
          Reverse
        </button>
      )}

      {showReverse && (
        <div className="flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5">
          <span className="text-xs text-orange-700">Reverse this payment?</span>
          <button
            onClick={handleReverse}
            disabled={loading === "reverse"}
            className="rounded bg-orange-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading === "reverse" ? "…" : "Confirm"}
          </button>
          <button
            onClick={() => setShowReverse(false)}
            className="rounded px-2 py-0.5 text-xs text-orange-600 hover:bg-orange-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
