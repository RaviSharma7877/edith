import { MarketingPage } from "@/components/marketing-page"

export default function PricingPage() {
  return (
    <MarketingPage
      badge="Pricing"
      title="Start small. Add controls as you grow."
      description="Begin with a workspace for clients and invoices, then add team workflows, accounting controls, integrations, and enterprise governance."
      sections={[
        {
          title: "Starter",
          description: "For founders and small teams getting organized.",
          items: ["Basic workspace", "CRM", "Invoices", "Documents", "Basic reports", "AI trial"],
          href: "/pricing/starter",
        },
        {
          title: "Team",
          description: "For teams connecting operations and client workflows.",
          items: ["Multi-user workspace", "Proposals", "Projects", "Client portal", "Automations", "Analytics"],
          href: "/pricing/team",
        },
        {
          title: "Accounting",
          description: "For teams that need a proper accounting core.",
          items: ["Chart of accounts", "Journals", "AR/AP", "Payments", "Reconciliation", "Audit trail"],
          href: "/pricing/accounting",
        },
        {
          title: "Enterprise",
          description: "For stronger governance, identity, and isolation needs.",
          items: ["SSO", "Advanced roles", "Tenant isolation", "Custom localization", "Priority support", "Advanced audit"],
          href: "/pricing/enterprise",
        },
      ]}
      deepDive={[
        {
          title: "Plan ladder",
          description: "Pricing should map to business maturity: workspace first, team workflows next, ledger controls when needed, enterprise isolation later.",
          points: ["Free evaluation", "Team collaboration", "Accounting controls", "Integration depth", "SSO later", "Tenant isolation later"],
        },
      ]}
    />
  )
}
