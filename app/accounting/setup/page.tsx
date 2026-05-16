import { DetailPage } from "@/components/detail-page"

export default function AccountingSetupPage() {
  return (
    <DetailPage
      eyebrow="Accounting setup"
      title="Company, fiscal, tax, and ledger setup."
      description="The setup flow creates the accounting foundation: company identity, fiscal periods, currency, tax mode, chart templates, dimensions, and opening balances."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Company profile", description: "Capture legal and operational identity before any ledger activity begins.", items: ["Legal name", "Display name", "Tax IDs", "Addresses", "Locale", "Base currency"] },
        { title: "Fiscal configuration", description: "Define the reporting boundaries that control posting and period close.", items: ["Fiscal year", "Accounting periods", "Open status", "Lock status", "Reopen request", "Close checklist"] },
        { title: "Ledger structure", description: "Install the starting chart and dimensions that reports depend on.", items: ["COA template", "Account groups", "Posting accounts", "Cost centers", "Projects", "Branches"], href: "/accounts", hrefLabel: "Manage chart of accounts" },
      ]}
    />
  )
}
