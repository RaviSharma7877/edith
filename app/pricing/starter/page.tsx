import { DetailPage } from "@/components/detail-page"

export default function StarterPricingPage() {
  return (
    <DetailPage eyebrow="Pricing" title="Starter plan." description="For early teams that need a clean workspace for clients, invoices, documents, and basic visibility." parentHref="/pricing" parentLabel="Pricing" blocks={[
      { title: "Included", description: "The first useful workspace layer.", items: ["CRM basics", "Invoices", "Documents", "Basic reports", "AI trial", "Email notifications"] },
      { title: "Best for", description: "Use Starter before deep accounting controls are required.", items: ["Founders", "Solo consultants", "Small agencies", "Early service teams", "Simple billing", "Client records"] },
    ]} />
  )
}
