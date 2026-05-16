import { MarketingPage } from "@/components/marketing-page"

export default function DocsPage() {
  return (
    <MarketingPage
      badge="Docs"
      title="Guides for building trustworthy business workflows."
      description="Documentation should help teams understand accounting setup, workflow objects, integrations, security controls, and AI guardrails."
      sections={[
        {
          title: "Accounting guide",
          description: "Understand the ledger, posting flow, reports, reconciliation, and close process.",
          items: ["Company setup", "COA", "Journals", "Invoices", "Reconciliation", "Reports"],
          href: "/docs/accounting-guide",
        },
        {
          title: "BusinessOS guide",
          description: "Learn how client and delivery workflows connect to financial records.",
          items: ["CRM", "Deals", "Proposals", "Projects", "Documents", "Portal"],
          href: "/docs/businessos-guide",
        },
        {
          title: "Integration guide",
          description: "Connect external systems through imports, APIs, and webhooks.",
          items: ["Imports", "API keys", "Scopes", "Webhooks", "Events", "Errors"],
          href: "/docs/api",
        },
        {
          title: "Security guide",
          description: "Review trust controls for teams handling financial data.",
          items: ["Roles", "Approvals", "Audit", "Tenant safety", "AI controls", "Data export"],
          href: "/docs/security-guide",
        },
      ]}
      deepDive={[
        {
          title: "Documentation model",
          description: "Docs should teach workflows, not just list screens.",
          points: ["Setup checklists", "Posting examples", "Reconciliation scenarios", "API examples", "Security controls", "Troubleshooting"],
        },
      ]}
    />
  )
}
