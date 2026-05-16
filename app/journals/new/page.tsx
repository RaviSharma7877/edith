import { DetailPage } from "@/components/detail-page"

export default function NewJournalPage() {
  return (
    <DetailPage
      eyebrow="New journal entry"
      title="Build a balanced entry before it touches the ledger."
      description="Select a voucher type, fill the line grid, assign dimensions and tax codes, attach supporting documents, and save as draft. Nothing posts until every invariant passes review."
      parentHref="/journals"
      parentLabel="Journals"
      blocks={[
        {
          title: "Voucher type",
          description: "The type controls which accounts are available, which tax codes apply, and which review workflow fires.",
          items: ["Journal voucher", "Payment / receipt", "Sales / purchase", "Credit / debit note", "Contra entry", "Opening balance"],
        },
        {
          title: "Line entry grid",
          description: "Add as many lines as the transaction needs. Totals update live and must balance before posting.",
          items: ["Account selector", "Description per line", "Debit column", "Credit column", "Running total", "Balance indicator"],
        },
        {
          title: "Dimensions and tax",
          description: "Assign cost center, branch, project, or location per line. Attach the applicable tax code.",
          items: ["Cost center", "Branch", "Project", "Location", "Tax code", "Tax amount"],
        },
        {
          title: "Supporting documents",
          description: "Attach evidence at the header or line level so the journal is self-contained for audit.",
          items: ["File attachments", "Image capture", "Reference number", "External doc link", "Entry notes", "Preparer memo"],
        },
      ]}
    />
  )
}
