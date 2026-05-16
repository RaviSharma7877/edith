import { DetailPage } from "@/components/detail-page"

export default function AccountingPricingPage() {
  return (
    <DetailPage eyebrow="Pricing" title="Accounting plan." description="For teams that need ledger-grade workflows, reconciliation, tax reports, period close, and audit history." parentHref="/pricing" parentLabel="Pricing" blocks={[
      { title: "Included", description: "Controls for finance teams and accounting-heavy operations.", items: ["Chart of accounts", "Journals", "AR/AP", "Payments", "Reconciliation", "Audit trail"] },
      { title: "Best for", description: "Use Accounting when reports and controls matter.", items: ["Accountants", "Bookkeepers", "Finance owners", "GST/VAT work", "Month close", "Bank reconciliation"] },
    ]} />
  )
}
