import { DetailPage } from "@/components/detail-page"

export default function InvoicingPage() {
  return (
    <DetailPage
      eyebrow="Invoicing and AR/AP"
      title="Sales invoices, purchase bills, and allocations."
      description="Invoicing should connect commercial context to ledger posting, payment allocation, tax calculation, and customer/vendor history."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Sales flow", description: "Turn accepted work into controlled invoice records.", items: ["Customers", "Line items", "Discounts", "Tax", "Due dates", "Credit notes"] },
        { title: "Purchase flow", description: "Capture supplier obligations with duplicate and tax checks.", items: ["Vendors", "Expense accounts", "Bill attachments", "Debit notes", "Duplicate warning", "AP aging"] },
        { title: "Settlement", description: "Payments must allocate cleanly against invoices and bills.", items: ["Partial payments", "Unapplied amount", "Write-offs", "Fees", "Reversals", "Allocation audit"] },
      ]}
    />
  )
}
