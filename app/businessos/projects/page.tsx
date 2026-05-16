import { DetailPage } from "@/components/detail-page"

export default function ProjectsPage() {
  return (
    <DetailPage
      eyebrow="Projects"
      title="Delivery work connected to clients and invoices."
      description="Projects and tasks should show who owns the work, what is due, what is billable, and what has already been invoiced."
      parentHref="/businessos"
      parentLabel="BusinessOS"
      blocks={[
        { title: "Project structure", description: "Organize delivery around clients and commercial commitments.", items: ["Project owner", "Client", "Milestones", "Tasks", "Assignees", "Due dates"] },
        { title: "Execution", description: "Track the work that eventually affects billing and reporting.", items: ["Status", "Time logs", "Comments", "Files", "Dependencies", "Notifications"] },
        { title: "Financial link", description: "Keep delivery connected to money movement.", items: ["Proposal link", "Invoice link", "Payment status", "Unbilled work", "Billing profile", "Project health"] },
      ]}
    />
  )
}
