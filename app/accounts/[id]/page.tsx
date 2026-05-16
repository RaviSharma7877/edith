import { DetailPage } from "@/components/detail-page"

export default function AccountDetailPage() {
  return (
    <DetailPage
      eyebrow="Account detail"
      title="Every ledger account, in full context."
      description="See the account's type, hierarchy position, normal balance, and all posted activity. Review dimension allocations, tax linkages, and the full audit trail of structural changes."
      parentHref="/accounts"
      parentLabel="Chart of Accounts"
      blocks={[
        {
          title: "Account identity",
          description: "The core fields that classify and position the account in the ledger hierarchy.",
          items: ["Account code", "Account name", "Account type", "Parent account", "Normal balance", "Posting status"],
        },
        {
          title: "Balances and activity",
          description: "Opening balances and live ledger totals broken out by period and dimension.",
          items: ["Opening balance", "Period balances", "YTD balance", "Cost center splits", "Branch splits", "Project splits"],
        },
        {
          title: "Tax and compliance",
          description: "Tax mapping and compliance flags applied at the account level.",
          items: ["Tax category", "GST/VAT linkage", "Withholding flag", "Tax-exempt status", "Compliance notes", "Tax audit log"],
        },
        {
          title: "Governance",
          description: "Controls and history that protect account integrity over time.",
          items: ["Change history", "Merge requests", "Delete protection", "Period lock status", "Approval log", "Last modified by"],
        },
      ]}
    />
  )
}
