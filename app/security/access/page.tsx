import { DetailPage } from "@/components/detail-page"

export default function AccessPage() {
  return (
    <DetailPage
      eyebrow="Access"
      title="Roles and permissions for financial workflows."
      description="Edith should separate owners, accountants, bookkeepers, AR/AP clerks, tax managers, auditors, developers, and admins."
      parentHref="/security"
      parentLabel="Security"
      blocks={[
        { title: "Roles", description: "Different users need different access to financial state.", items: ["Owner", "Accountant", "Bookkeeper", "AR clerk", "AP clerk", "Tax manager"] },
        { title: "Approvals", description: "High-risk actions should require review.", items: ["Journal posting", "Payment threshold", "Period close", "Tax filing", "API keys", "Role changes"] },
        { title: "Sensitive data", description: "Financial data should be visible only when needed.", items: ["Bank masking", "Reveal audit", "Scoped portal", "Download rights", "Export rights", "Session revocation"] },
      ]}
    />
  )
}
