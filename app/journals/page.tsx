import { MarketingPage } from "@/components/marketing-page"

export default function JournalsPage() {
  return (
    <MarketingPage
      badge="Journals & Vouchers"
      title="Double-entry records your ledger can trust."
      description="Create, review, and post journals and vouchers with full validation. Every correction goes through a reversal, not an edit — keeping audit history intact from day one."
      sections={[
        {
          title: "Voucher types",
          description: "Eight document types that map to every day-to-day accounting transaction.",
          items: ["Journal voucher", "Payment voucher", "Receipt voucher", "Sales invoice", "Purchase bill", "Credit note", "Debit note", "Contra entry"],
          href: "/journals/new",
          hrefLabel: "Create a journal entry",
        },
        {
          title: "Entry workflow",
          description: "Keyboard-friendly line grid with validation before anything touches the ledger.",
          items: ["Line-entry grid", "Debit / credit columns", "Dimensions per line", "Tax codes", "Attachments", "Entry notes"],
          href: "/journals/new",
          hrefLabel: "Start an entry",
        },
        {
          title: "States and controls",
          description: "A journal moves through explicit states — nothing posts without passing all checks.",
          items: ["Draft", "In review", "Posted", "Reversed", "Failed", "Queued"],
        },
        {
          title: "Corrections and audit",
          description: "Posted entries are immutable. All corrections create a traceable financial event.",
          items: ["Reversal flow", "Linked original", "Audit reason", "Hash chaining", "Tamper evidence", "Correction log"],
        },
      ]}
      deepDive={[
        {
          title: "Posting invariants",
          description: "Edith enforces double-entry correctness at the boundary where a journal transitions to posted state.",
          points: ["Debits equal credits", "Period must be open", "Account must be postable", "Dimension must be valid", "Tax code compatible", "Approval complete"],
        },
        {
          title: "Reversal model",
          description: "Corrections never overwrite ledger lines — they create an equal and opposite entry tied to the original.",
          points: ["Full reversal entry", "Partial reversal via credit/debit note", "Reversal reason required", "Original stays posted", "Both show on ledger", "Net impact visible"],
        },
      ]}
    />
  )
}
