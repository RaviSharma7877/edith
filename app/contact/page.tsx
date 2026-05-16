import { MarketingPage } from "@/components/marketing-page"

export default function ContactPage() {
  return (
    <MarketingPage
      badge="Contact"
      title="Book a demo for an accounting-first workspace."
      description="Talk through accounting scope, workflow needs, integrations, AI guardrails, localization, and team controls."
      sections={[
        {
          title: "Good demo topics",
          description: "Use the call to map your current business process into Edith's product areas.",
          items: ["Accounting flow", "CRM flow", "Reconciliation", "Reports", "Imports", "Approvals"],
        },
        {
          title: "Bring context",
          description: "The best demos start from real operational friction.",
          items: ["Current tools", "Invoice process", "Close process", "Banking needs", "Tax region", "Team roles"],
        },
      ]}
    />
  )
}
