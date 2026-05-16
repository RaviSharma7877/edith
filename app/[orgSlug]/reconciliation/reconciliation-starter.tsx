"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function ReconciliationStarter({
  orgSlug,
  bankAccountId,
  statementId,
}: {
  orgSlug:       string
  bankAccountId: string
  statementId:   string
}) {
  const router  = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading")
  const [error,  setError]  = useState("")

  useEffect(() => {
    async function start() {
      const res  = await fetch(
        `/api/organizations/${orgSlug}/bank-accounts/${bankAccountId}/statements/${statementId}/reconcile`,
        { method: "POST" },
      )
      const data = await res.json()
      if (!res.ok) { setStatus("error"); setError(data.error ?? "Failed to start."); return }
      router.push(`/${orgSlug}/reconciliation/${data.runId}`)
    }
    start()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "error")
    return <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>

  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white px-4 py-6 text-center">
      <p className="text-sm text-[#605A57]">Starting reconciliation…</p>
    </div>
  )
}
