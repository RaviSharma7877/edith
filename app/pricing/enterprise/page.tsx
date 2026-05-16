import { DetailPage } from "@/components/detail-page"

export default function EnterprisePricingPage() {
  return (
    <DetailPage eyebrow="Pricing" title="Enterprise plan." description="For organizations that need stronger identity, isolation, localization, audit, and support controls." parentHref="/pricing" parentLabel="Pricing" blocks={[
      { title: "Included", description: "Governance and operational controls for larger teams.", items: ["SSO", "Advanced roles", "Tenant isolation", "Custom localization", "Priority support", "Advanced audit"] },
      { title: "Best for", description: "Use Enterprise when governance is part of the buying decision.", items: ["Multi-entity teams", "Procurement", "Auditors", "Regional controls", "Custom tax packs", "Dedicated support"] },
    ]} />
  )
}
