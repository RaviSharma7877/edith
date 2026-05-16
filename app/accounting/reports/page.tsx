import { DetailPage } from "@/components/detail-page"

export default function ReportsPage() {
  return (
    <DetailPage
      eyebrow="Financial reports"
      title="Reports that drill back to posted ledger lines."
      description="Reports should be generated from journal lines and read models, with drill-down, exports, saved views, and clear period warnings."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Core reports", description: "Cover the reports accountants and owners need every month.", items: ["P&L", "Balance sheet", "General ledger", "Trial balance", "Cash flow", "Tax workpapers"] },
        { title: "Working reports", description: "Support daily cash, receivables, payables, and registers.", items: ["AR aging", "AP aging", "Cash/bank books", "Sales register", "Purchase register", "Ledger report"] },
        { title: "Review controls", description: "Reports should show source, filters, and export evidence.", items: ["Date range", "Comparison period", "Saved views", "Scheduled exports", "Drill-down", "Export audit"] },
      ]}
    />
  )
}
