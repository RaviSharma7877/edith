import { DetailPage } from "@/components/detail-page"

export default function ReconciliationPage() {
  return (
    <DetailPage
      eyebrow="Bank reconciliation"
      title="Match statement activity to ledger truth."
      description="The reconciliation workspace should help accountants import bank statements, review suggested matches, create adjustments, and preserve evidence."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Statement intake", description: "Bring in bank activity safely and detect duplicates.", items: ["Bank accounts", "Statement import", "Feed readiness", "Duplicate detection", "Masked numbers", "Last sync"] },
        { title: "Matching workspace", description: "Review and resolve outstanding bank lines efficiently.", items: ["Suggested matches", "Confidence score", "One-to-one", "One-to-many", "Accept/reject", "Next unresolved"] },
        { title: "Audit result", description: "Every reconciliation action should explain what changed.", items: ["Adjustment posting", "Write-off approval", "Reconciled status", "Carryovers", "Run history", "Evidence trail"] },
      ]}
    />
  )
}
