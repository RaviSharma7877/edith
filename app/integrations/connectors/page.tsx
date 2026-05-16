import { DetailPage } from "@/components/detail-page"

export default function ConnectorsPage() {
  return (
    <DetailPage
      eyebrow="Connectors"
      title="Connect systems around Edith."
      description="Connector categories should cover email, payments, banking, storage, analytics, BI, and import/export workflows."
      parentHref="/integrations"
      parentLabel="Integrations"
      blocks={[
        { title: "Business connectors", description: "Connect common operating tools around the workspace.", items: ["Email", "Payments", "Banking", "CRM import", "File storage", "Analytics"] },
        { title: "Reporting connectors", description: "Support business intelligence and export workflows.", items: ["Metabase", "CSV export", "Excel export", "PDF reports", "Scheduled reports", "Audit export"] },
        { title: "Future connectors", description: "Leave room for deeper platform growth.", items: ["Tax gateways", "Bank feeds", "Payment processors", "Support inbox", "Website forms", "Video assets"] },
      ]}
    />
  )
}
