import { DetailPage } from "@/components/detail-page"

export default function JournalReviewPage() {
  return (
    <DetailPage
      eyebrow="Review and post"
      title="Every check, in one place, before the ledger moves."
      description="The review screen surfaces every validation result — balance, period, accounts, dimensions, tax — and lets the approver post or return the entry with a reason. Once posted, only a reversal can undo it."
      parentHref="/journals"
      parentLabel="Journals"
      blocks={[
        {
          title: "Pre-post validation",
          description: "All invariants are evaluated and surfaced before the approver acts.",
          items: ["Debits equal credits", "Period open check", "Account postable check", "Dimension valid check", "Tax code compatible", "Approval status"],
        },
        {
          title: "Review actions",
          description: "The reviewer can approve and post, request changes, or escalate — each action is recorded.",
          items: ["Post entry", "Return with reason", "Escalate for approval", "Add review comment", "Request attachment", "Mark reviewed"],
        },
        {
          title: "Reversal flow",
          description: "After posting, corrections go through a reversal — never a direct edit of ledger lines.",
          items: ["Initiate reversal", "Reversal reason", "Full or partial", "Auto-date or manual date", "Linked to original", "Both entries visible"],
        },
        {
          title: "Audit and tamper evidence",
          description: "Every state change is timestamped, attributed, and optionally hash-chained to the previous entry.",
          items: ["Posted by / at", "Reviewed by / at", "State transition log", "Hash of entry lines", "Previous entry hash", "Immutable after post"],
        },
      ]}
    />
  )
}
