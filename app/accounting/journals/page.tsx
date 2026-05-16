import { DetailPage } from "@/components/detail-page"

export default function JournalsPage() {
  return (
    <DetailPage
      eyebrow="Journals and vouchers"
      title="Fast entry with controlled posting."
      description="Journals and vouchers are the core correctness boundary. Edith should support drafts, review, posting, reversals, attachments, and immutable ledger impact."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Entry workflow", description: "Bookkeepers and accountants need keyboard-friendly entry without sacrificing validation.", items: ["Voucher types", "Line grid", "Debit/credit totals", "Dimensions", "Tax codes", "Attachments"], href: "/journals/new", hrefLabel: "Create a journal entry" },
        { title: "Posting controls", description: "A journal should only post when accounting invariants pass.", items: ["Balanced lines", "Open period", "Active accounts", "Approval status", "Source document", "Posting timestamp"], href: "/journals", hrefLabel: "View journal list" },
        { title: "Corrections", description: "Posted records should be corrected through explicit financial actions.", items: ["Reversal entry", "Credit note", "Debit note", "Adjustment journal", "Audit reason", "Linked original"] },
      ]}
    />
  )
}
