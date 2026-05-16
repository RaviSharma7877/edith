import { MarketingPage } from "@/components/marketing-page"

export default function IntegrationsPage() {
  return (
    <MarketingPage
      badge="Integrations"
      title="Connect the tools around your business."
      description="Use imports, API keys, webhooks, email, payment, analytics, BI, storage, and banking-ready workflows to keep Edith connected."
      sections={[
        {
          title: "Data in",
          description: "Bring existing records into the accounting and workflow system.",
          items: ["Opening balances", "Customers", "Vendors", "Invoices", "Bills", "Journal imports"],
          href: "/integrations/imports",
        },
        {
          title: "Developer access",
          description: "Expose controlled integration surfaces for internal teams and trusted tools.",
          items: ["API keys", "Scopes", "Webhooks", "Delivery logs", "JSON editors", "Revocation"],
          href: "/integrations/api",
        },
        {
          title: "Business systems",
          description: "Connect operational services around the core workspace.",
          items: ["Email", "Payments", "Banking", "Storage", "Analytics", "Embedded BI"],
          href: "/integrations/connectors",
        },
        {
          title: "Automation",
          description: "Let events move work forward without making financial actions unsafe.",
          items: ["Triggers", "Rules", "Job runs", "Invoice reminders", "Task creation", "Proposal follow-ups"],
          href: "/integrations/automations",
        },
      ]}
      deepDive={[
        {
          title: "Integration safety",
          description: "Connected tools should never bypass accounting validation, period locks, or approval requirements.",
          points: ["Scoped API keys", "Webhook signatures", "Idempotency", "Import previews", "Validation errors", "Revocation history"],
        },
        {
          title: "Operational reliability",
          description: "Every import, job, and webhook should have visible status so teams can recover from failures.",
          points: ["Job queue", "Retry history", "Delivery logs", "Mapping review", "Error rows", "Admin audit"],
        },
      ]}
    />
  )
}
