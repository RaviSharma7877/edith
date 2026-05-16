import { MarketingPage } from "@/components/marketing-page"

export default function AccountingPage() {
  return (
    <MarketingPage
      badge="Accounting"
      title="Ledger-grade accounting built into the operating system."
      description="Post journals, issue invoices, manage bills, allocate payments, reconcile banks, prepare tax workpapers, close periods, and audit every financial action."
      sections={[
        {
          title: "Setup and ledger",
          description: "Start with the structures that every reliable accounting system depends on.",
          items: ["Fiscal year", "Currency", "Tax mode", "COA templates", "Dimensions", "Opening balances"],
          href: "/accounting/setup",
        },
        {
          title: "Transactions",
          description: "Capture the daily accounting activity with review and posting controls.",
          items: ["Vouchers", "Journals", "Sales invoices", "Purchase bills", "Credit notes", "Debit notes"],
          href: "/accounting/journals",
        },
        {
          title: "Cash and tax",
          description: "Track money movement and compliance work without losing audit context.",
          items: ["Receipts", "Payments", "Allocations", "Bank reconciliation", "GST/VAT", "Tax returns"],
          href: "/accounting/reconciliation",
        },
        {
          title: "Close and reports",
          description: "Turn posted ledger lines into reports teams can actually trust.",
          items: ["P&L", "Balance sheet", "Trial balance", "Cash flow", "AR/AP aging", "Period close"],
          href: "/accounting/reports",
        },
      ]}
      deepDive={[
        {
          title: "Posting model",
          description: "The accounting core should treat posted journal lines as the durable record and make every document explain its ledger impact.",
          points: ["Debit equals credit", "Open period checks", "Immutable posted entries", "Reversal flow", "Source document linkage", "Audit metadata"],
        },
        {
          title: "Operational controls",
          description: "Financial workflows need explicit review surfaces instead of silent background changes.",
          points: ["Maker-checker approvals", "Close blockers", "Tax-impact warnings", "Bank detail masking", "Export audit", "Role escalation"],
        },
      ]}
    />
  )
}
