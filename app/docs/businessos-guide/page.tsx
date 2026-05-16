import { DetailPage } from "@/components/detail-page"

export default function BusinessOSGuidePage() {
  return (
    <DetailPage eyebrow="Docs" title="BusinessOS guide." description="A guide to CRM, proposals, projects, documents, portal workflows, and how they connect to invoices and reporting." parentHref="/docs" parentLabel="Docs" blocks={[
      { title: "Client flow", description: "Start with client and sales context.", items: ["Lead", "Contact", "Account", "Deal", "Activity", "Proposal"] },
      { title: "Delivery flow", description: "Track the work that creates billable value.", items: ["Project", "Task", "Assignee", "Due date", "Time log", "Document"] },
      { title: "Billing flow", description: "Convert accepted work into financial records.", items: ["Proposal accepted", "Invoice draft", "Review", "Send", "Payment", "Report"] },
    ]} />
  )
}
