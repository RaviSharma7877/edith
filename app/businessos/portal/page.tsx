import { DetailPage } from "@/components/detail-page"

export default function PortalPage() {
  return (
    <DetailPage
      eyebrow="Client portal"
      title="Share the right work with the right client."
      description="The portal should let clients review proposals, invoices, payment status, files, comments, and project updates without entering the internal workspace."
      parentHref="/businessos"
      parentLabel="BusinessOS"
      blocks={[
        { title: "Client view", description: "Give clients a clean place to see their active business with you.", items: ["Shared proposals", "Shared invoices", "Files", "Comments", "Payment status", "Notifications"] },
        { title: "Access control", description: "Portal access must be scoped to client-safe records.", items: ["Client users", "Invite links", "Role scope", "File permissions", "Signed downloads", "Audit"] },
        { title: "Operational loop", description: "Client activity should update internal teams.", items: ["Viewed status", "Approval status", "Comment alerts", "Payment update", "Document request", "Timeline"] },
      ]}
    />
  )
}
