import { DetailPage } from "@/components/detail-page"

export default function AuditPage() {
  return (
    <DetailPage
      eyebrow="Audit"
      title="Every sensitive action needs evidence."
      description="Audit should capture who did what, when, from where, and against which financial or operational object."
      parentHref="/security"
      parentLabel="Security"
      blocks={[
        { title: "Audit event", description: "Capture consistent metadata across product areas.", items: ["Actor", "Role", "Company", "Module", "Action", "Timestamp"] },
        { title: "Financial evidence", description: "Financial changes need source and reason.", items: ["Source document", "Before/after", "Reason", "Approval", "Period", "Export"] },
        { title: "Review experience", description: "Auditors need fast filtering and durable exports.", items: ["Filters", "Search", "Details drawer", "Copyable rows", "CSV export", "Retention"] },
      ]}
    />
  )
}
