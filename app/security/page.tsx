import { MarketingPage } from "@/components/marketing-page"

export default function SecurityPage() {
  return (
    <MarketingPage
      badge="Security"
      title="Built for financial trust from day one."
      description="Edith is planned around tenant isolation, role-based access, maker-checker approvals, period locks, audit trails, and human-approved AI actions."
      sections={[
        {
          title: "Financial controls",
          description: "Protect the ledger from accidental or unauthorized changes.",
          items: ["Period locks", "Reversals", "Maker-checker", "Close checklist", "Approval roles", "Export audit"],
          href: "/security/audit",
        },
        {
          title: "Tenant safety",
          description: "Keep company data scoped and recoverable.",
          items: ["Tenant isolation", "Scoped queries", "Ledger isolation", "Backups", "Exports", "Admin audit"],
          href: "/security/tenant-isolation",
        },
        {
          title: "Access",
          description: "Make sensitive operations explicit and controlled.",
          items: ["Users", "Roles", "Bank masking", "API scopes", "Webhook signing", "Session controls"],
          href: "/security/access",
        },
        {
          title: "AI guardrails",
          description: "AI assists the work but does not own financial state.",
          items: ["Tool allowlists", "Context chips", "Used sources", "Human approval", "No auto-posting", "No auto-close"],
          href: "/security/ai-guardrails",
        },
      ]}
      deepDive={[
        {
          title: "Security posture",
          description: "Financial security is not just login protection; it is a product behavior across every sensitive action.",
          points: ["Review-confirm-reverse", "Role separation", "Audit evidence", "Export logging", "Bank masking", "Admin escalation"],
        },
        {
          title: "AI safety posture",
          description: "AI should operate with limited tools, explicit context, and no direct authority over ledger state.",
          points: ["No autonomous posting", "No autonomous filing", "Tool allowlists", "Source citations", "PII-aware retrieval", "Human approval"],
        },
      ]}
    />
  )
}
