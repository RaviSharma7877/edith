import { DetailPage } from "@/components/detail-page"

export default function SecurityGuidePage() {
  return (
    <DetailPage eyebrow="Docs" title="Security guide." description="How Edith should document roles, approvals, audit, tenant isolation, data export, and AI guardrails." parentHref="/docs" parentLabel="Docs" blocks={[
      { title: "People controls", description: "Document role boundaries and approval flows.", items: ["Owners", "Accountants", "Bookkeepers", "AR/AP", "Tax managers", "Auditors"] },
      { title: "Data controls", description: "Document how sensitive records are protected.", items: ["Tenant isolation", "Bank masking", "Export rights", "Audit log", "Backups", "Retention"] },
      { title: "AI controls", description: "Document how AI stays bounded.", items: ["Allowed tools", "Disallowed actions", "Used sources", "Approval gates", "Prompt versions", "Logs"] },
    ]} />
  )
}
