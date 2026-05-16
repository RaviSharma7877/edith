import { DetailPage } from "@/components/detail-page"

export default function ProposalsPage() {
  return (
    <DetailPage
      eyebrow="Proposals"
      title="Proposal to invoice without losing context."
      description="Proposal workflows should support versions, pricing, approvals, client review, and conversion into invoice records."
      parentHref="/businessos"
      parentLabel="BusinessOS"
      blocks={[
        { title: "Editor", description: "Build proposals with reusable content and pricing sections.", items: ["Sections", "Pricing blocks", "Terms", "Attachments", "Version history", "Preview"] },
        { title: "Approval", description: "Commercial documents need approval before client-facing send.", items: ["Review drawer", "Amount threshold", "Approver", "Send package", "Expiry", "Audit"] },
        { title: "Conversion", description: "Accepted work should become billing context.", items: ["Client acceptance", "Convert to invoice", "Linked deal", "Linked project", "Timeline", "Status"] },
      ]}
    />
  )
}
