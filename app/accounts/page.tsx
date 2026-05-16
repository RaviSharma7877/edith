import { MarketingPage } from "@/components/marketing-page"

export default function AccountsPage() {
  return (
    <MarketingPage
      badge="Chart of Accounts"
      title="The account structure every reliable ledger depends on."
      description="Define account codes, groups, types, and dimensions. Set opening balances, map tax accounts, and control which accounts can post — all from a single tree-table view."
      sections={[
        {
          title: "Account structure",
          description: "Build the hierarchy that reports, journals, and dimensions will reference.",
          items: ["Account groups", "Account hierarchy", "Account codes", "Account types", "Parent accounts", "Normal balance"],
          href: "/accounting/setup",
        },
        {
          title: "Posting controls",
          description: "Separate structural accounts from posting accounts to keep ledger integrity intact.",
          items: ["Posting accounts", "Non-posting accounts", "Opening balances", "Tax-linked accounts", "Period-safe changes", "Account drawer"],
        },
        {
          title: "Dimensions",
          description: "Slice any account balance by cost center, branch, project, or location.",
          items: ["Cost centers", "Branches", "Projects", "Locations", "Dimension mapping", "Dimension reports"],
        },
        {
          title: "Import and governance",
          description: "Load accounts from a template or spreadsheet and enforce structural integrity over time.",
          items: ["CSV import", "Excel import", "COA templates", "Code uniqueness", "Merge approval", "Delete protection"],
        },
      ]}
      deepDive={[
        {
          title: "Account hierarchy",
          description: "A tree of posting and non-posting accounts controls both journal entry and financial report structure.",
          points: ["Root group accounts", "Posting leaf accounts", "Parent-child type rules", "Balance aggregation", "Indented tree view", "Drag-to-reorder"],
        },
        {
          title: "Structural safeguards",
          description: "Changes to live accounts need explicit checks to prevent corruption of historical reports.",
          points: ["No delete with posted entries", "Merge approval required", "Period-safe renames", "Audit trail on changes", "Reversal impact warnings", "Account lock after close"],
        },
      ]}
    />
  )
}
