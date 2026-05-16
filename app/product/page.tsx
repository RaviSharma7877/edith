import { MarketingPage } from "@/components/marketing-page"

export default function ProductPage() {
  return (
    <MarketingPage
      badge="Product"
      title="One business workspace around the books."
      description="Edith connects accounting, clients, proposals, documents, payments, reports, and controlled AI assistance in one audit-ready workspace."
      sections={[
        {
          title: "Accounting core",
          description: "Treat ledgers, invoices, bills, payments, reconciliation, tax, and reports as the system of record.",
          items: ["Company setup", "Chart of accounts", "Journals", "AR/AP", "Payments", "Reports"],
          href: "/accounting",
        },
        {
          title: "Workflow layer",
          description: "Keep sales and operations connected to the financial context that matters.",
          items: ["CRM", "Proposals", "Projects", "Documents", "Client portal", "Forms"],
          href: "/businessos",
        },
        {
          title: "Controlled AI",
          description: "Let AI explain, draft, summarize, and suggest while financial actions stay behind approvals.",
          items: ["Report explanations", "Reminder drafts", "Match suggestions", "Import mapping"],
          href: "/product/automation",
        },
        {
          title: "Platform controls",
          description: "Build on tenant-safe workflows, user roles, approvals, audit history, APIs, and webhooks.",
          items: ["Roles", "Approvals", "Audit trails", "API keys", "Webhooks", "Imports"],
          href: "/security",
        },
      ]}
      deepDive={[
        {
          title: "Product architecture",
          description: "Edith should feel like one product, but accounting remains the source of truth while BusinessOS modules create operational context.",
          points: ["Accounting-first system of record", "BusinessOS engagement layer", "Shared tenant control plane", "Connected object timeline", "Audit-aware actions", "Role-based workflows"],
        },
        {
          title: "Main user paths",
          description: "The product should guide teams through daily work without separating financial and client context.",
          points: ["Lead to proposal", "Proposal to invoice", "Invoice to payment", "Payment to reconciliation", "Journal to report", "Report to close"],
        },
      ]}
    />
  )
}
