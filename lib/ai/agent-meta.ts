// Client-safe agent metadata — no Prisma, no server imports.
// Import this in client components. Import lib/ai/agents.ts only in server code.

export type AgentMeta = {
  id: string
  name: string
  description: string
  pages: string[]
}

export const AGENT_META: AgentMeta[] = [
  {
    id: "ar-summary",
    name: "AR Summary",
    description: "Summarizes overdue invoices and suggests collection priorities",
    pages: ["/reports", "/sales-invoices", "/customers"],
  },
  {
    id: "report-explainer",
    name: "Report Explainer",
    description: "Explains P&L and trial balance figures for the selected period",
    pages: ["/reports"],
  },
  {
    id: "recon-suggester",
    name: "Reconciliation Hints",
    description: "Suggests how to match unreconciled bank lines to journal entries",
    pages: ["/reconciliation"],
  },
  {
    id: "reminder-drafter",
    name: "Reminder Drafter",
    description: "Drafts professional payment reminder emails for overdue customers",
    pages: ["/customers", "/sales-invoices"],
  },
  {
    id: "tax-explainer",
    name: "Tax Explainer",
    description: "Explains tax codes, return status, and GST/VAT rules",
    pages: ["/tax", "/sales-invoices", "/purchase-bills"],
  },
  {
    id: "import-mapper",
    name: "Import Mapper",
    description: "Suggests column mappings for CSV/Excel imports",
    pages: ["/imports"],
  },
]

export const AGENT_META_MAP: Record<string, AgentMeta> = Object.fromEntries(
  AGENT_META.map((a) => [a.id, a]),
)

export const DEFAULT_AGENT_ID = "ar-summary"

export function eligibleAgentsForPath(pathname: string): AgentMeta[] {
  return AGENT_META.filter((agent) =>
    agent.pages.some((prefix) => pathname.includes(prefix)),
  )
}

export function hasEligibleAgent(pathname: string): boolean {
  return eligibleAgentsForPath(pathname).length > 0
}
