import { DetailPage } from "@/components/detail-page"

export default function TeamPricingPage() {
  return (
    <DetailPage eyebrow="Pricing" title="Team plan." description="For teams connecting sales, delivery, documents, client collaboration, and workflow automations." parentHref="/pricing" parentLabel="Pricing" blocks={[
      { title: "Included", description: "Collaboration features for multi-person teams.", items: ["Multi-user workspace", "Proposals", "Projects", "Client portal", "Automations", "Analytics"] },
      { title: "Best for", description: "Use Team when work crosses roles and clients.", items: ["Agencies", "Consultancies", "Service teams", "Client projects", "Proposal workflows", "Document sharing"] },
    ]} />
  )
}
