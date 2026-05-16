import { DetailPage } from "@/components/detail-page"

export default function AutomationsPage() {
  return (
    <DetailPage
      eyebrow="Automations"
      title="Workflow automation with financial boundaries."
      description="Automations should save time on routine work while keeping posting, filing, closing, and reversing under human-approved controls."
      parentHref="/integrations"
      parentLabel="Integrations"
      blocks={[
        { title: "Triggers", description: "Business events can start workflow actions.", items: ["Invoice overdue", "Proposal accepted", "Payment received", "Task due", "Import failed", "Webhook received"] },
        { title: "Actions", description: "Actions should be useful but bounded.", items: ["Draft reminder", "Create task", "Notify owner", "Update stage", "Queue export", "Request document"] },
        { title: "Controls", description: "Sensitive actions need confirmation or approval.", items: ["Approval gate", "Audit log", "Retry policy", "Failure state", "Owner override", "No auto-posting"] },
      ]}
    />
  )
}
