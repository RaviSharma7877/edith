import { DetailPage } from "@/components/detail-page"

export default function ImportsPage() {
  return (
    <DetailPage
      eyebrow="Imports"
      title="Bring old data in without damaging the ledger."
      description="Imports should use mapping, validation, preview, idempotency, and audit history before data becomes accounting state."
      parentHref="/integrations"
      parentLabel="Integrations"
      blocks={[
        { title: "Import types", description: "Support the most important migration and daily upload paths.", items: ["Opening balances", "Customers", "Vendors", "Invoices", "Bills", "Journal entries"] },
        { title: "Review", description: "Every import should be understandable before it applies.", items: ["Column mapping", "Validation preview", "Error rows", "Duplicate checks", "Tax checks", "Account checks"] },
        { title: "Apply safely", description: "Applied imports need recovery and evidence.", items: ["Idempotency", "Job status", "Retry", "Audit event", "Source file", "Rollback plan"] },
      ]}
    />
  )
}
