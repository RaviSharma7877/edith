import { DetailPage } from "@/components/detail-page"

export default function ProductAutomationPage() {
  return (
    <DetailPage
      eyebrow="AI and automation"
      title="Assistance that respects approvals."
      description="Edith can use AI and automations to draft, explain, suggest, and route work, but financial state changes stay controlled."
      parentHref="/product"
      parentLabel="Product"
      blocks={[
        { title: "AI assistance", description: "AI should operate with visible context and source references.", items: ["Report variance", "Reminder draft", "Bill extraction", "Document summary", "Import mapping", "Context chips"] },
        { title: "Automation", description: "Rules should move routine work forward without bypassing accounting controls.", items: ["Triggers", "Conditions", "Job runs", "Webhook events", "Task creation", "Follow-ups"] },
        { title: "Guardrails", description: "The AI layer should never own material business actions.", items: ["No auto-posting", "No auto-filing", "No auto-close", "Human approval", "Tool allowlist", "Audit log"] },
      ]}
    />
  )
}
