import { DetailPage } from "@/components/detail-page"

export default function CrmPage() {
  return (
    <DetailPage
      eyebrow="CRM"
      title="Client relationships connected to financial outcomes."
      description="CRM should capture leads, contacts, accounts, deals, activity, and tags while staying connected to proposals, invoices, payments, and client history."
      parentHref="/businessos"
      parentLabel="BusinessOS"
      blocks={[
        { title: "Records", description: "Keep core relationship objects clean and deduplicated.", items: ["Leads", "Contacts", "Accounts", "Deals", "Activities", "Tags"] },
        { title: "Commercial context", description: "Connect CRM work to revenue and delivery.", items: ["Deal amount", "Expected close", "Proposal link", "Invoice link", "Payment status", "Owner"] },
        { title: "Daily workflow", description: "Make next actions visible and easy to follow.", items: ["Tasks", "Notes", "Stage changes", "Follow-ups", "Search", "Saved views"] },
      ]}
    />
  )
}
