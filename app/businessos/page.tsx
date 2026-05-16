import { MarketingPage } from "@/components/marketing-page"

export default function BusinessOSPage() {
  return (
    <MarketingPage
      badge="BusinessOS"
      title="The workspace around your accounting source of truth."
      description="Capture demand, manage clients, send proposals, track work, share documents, and convert accepted work into invoices without rebuilding context."
      sections={[
        {
          title: "CRM",
          description: "Manage prospects and customers before they become invoices.",
          items: ["Leads", "Contacts", "Accounts", "Deals", "Activities", "Pipeline views"],
          href: "/businessos/crm",
        },
        {
          title: "Commercial workflows",
          description: "Move from proposal to work to invoice in one connected motion.",
          items: ["Proposal editor", "Versions", "Pricing blocks", "Contracts", "Approvals", "Convert to invoice"],
          href: "/businessos/proposals",
        },
        {
          title: "Work execution",
          description: "Keep delivery and billing context together.",
          items: ["Projects", "Tasks", "Assignees", "Due dates", "Time logs", "Linked invoices"],
          href: "/businessos/projects",
        },
        {
          title: "Client collaboration",
          description: "Share the right records with clients without exposing the whole workspace.",
          items: ["Client portal", "Shared files", "Comments", "Payment status", "Notifications", "Document search"],
          href: "/businessos/portal",
        },
      ]}
      deepDive={[
        {
          title: "Workflow continuity",
          description: "BusinessOS modules should preserve context as work moves from demand capture to invoicing and collection.",
          points: ["Lead source", "Deal amount", "Proposal version", "Project delivery", "Invoice status", "Payment follow-up"],
        },
        {
          title: "Shared records",
          description: "Every object should show its relationship to clients, work, documents, billing, and accounting outcomes.",
          points: ["Client timeline", "Linked documents", "Related invoices", "Open tasks", "Portal visibility", "AI context chips"],
        },
      ]}
    />
  )
}
