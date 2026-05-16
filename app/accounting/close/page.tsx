import { DetailPage } from "@/components/detail-page"

export default function ClosePage() {
  return (
    <DetailPage
      eyebrow="Period close"
      title="Close periods with blockers, evidence, and approval."
      description="Close is a sensitive accounting workflow. Edith should surface unresolved items, require confirmation, and preserve reopen history."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Close checklist", description: "Make close readiness visible before the action is allowed.", items: ["Unposted drafts", "Unreconciled lines", "Open allocations", "Tax warnings", "Missing approvals", "Backup step"] },
        { title: "Close action", description: "Closing a period should be explicit and role-controlled.", items: ["Review summary", "Typed confirmation", "Owner approval", "Close timestamp", "Export audit", "Lock period"] },
        { title: "Reopen flow", description: "Reopening needs stronger evidence than ordinary edits.", items: ["Reopen reason", "Role escalation", "Audit trail", "Restatement warning", "Linked entries", "New close run"] },
      ]}
    />
  )
}
