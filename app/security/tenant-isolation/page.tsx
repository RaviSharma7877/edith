import { DetailPage } from "@/components/detail-page"

export default function TenantIsolationPage() {
  return (
    <DetailPage
      eyebrow="Tenant isolation"
      title="Keep each company boundary clear."
      description="Accounting data benefits from stronger tenant boundaries than ordinary workflow data, especially for export, restore, support, and compliance needs."
      parentHref="/security"
      parentLabel="Security"
      blocks={[
        { title: "Control plane", description: "Shared tenant services can manage identity and plans.", items: ["Workspaces", "Memberships", "Plans", "Usage", "Support", "Billing"] },
        { title: "Ledger boundary", description: "Ledger data should be easy to isolate for larger customers.", items: ["Schema per tenant", "Database per tenant", "Tenant exports", "Tenant restores", "Backups", "Region choice"] },
        { title: "Access boundary", description: "All reads and writes need tenant-scoped enforcement.", items: ["Scoped queries", "RLS-ready tables", "Admin audit", "Support scopes", "API scopes", "Object prefixes"] },
      ]}
    />
  )
}
