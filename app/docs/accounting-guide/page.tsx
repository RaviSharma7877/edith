import { DetailPage } from "@/components/detail-page"

export default function AccountingGuidePage() {
  return (
    <DetailPage eyebrow="Docs" title="Accounting guide." description="A practical guide to setup, posting, reconciliation, reports, tax, close, and audit behavior in Edith." parentHref="/docs" parentLabel="Docs" blocks={[
      { title: "Setup", description: "Prepare the company before posting begins.", items: ["Company profile", "Fiscal year", "Tax mode", "COA", "Opening balances", "Users"] },
      { title: "Daily accounting", description: "Understand the core accounting transactions.", items: ["Journals", "Vouchers", "Invoices", "Bills", "Payments", "Allocations"] },
      { title: "Month end", description: "Move from daily work to trusted reporting.", items: ["Reconciliation", "Tax workpapers", "Trial balance", "P&L", "Close blockers", "Period close"] },
    ]} />
  )
}
