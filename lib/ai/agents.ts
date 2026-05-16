import type { LanguageModel } from "ai"
import { geminiFlash, geminiPro } from "./models"
import {
  fetchARContext,
  fetchImportContext,
  fetchReconContext,
  fetchReminderContext,
  fetchReportContext,
  fetchTaxContext,
} from "./context-fetchers"

export type Agent = {
  id: string
  name: string
  description: string
  model: LanguageModel
  pages: string[]
  systemPrompt: string
  fetchContext: (
    companyId: string,
    hints?: Record<string, string>,
  ) => Promise<string>
}

export const AGENT_REGISTRY: Record<string, Agent> = {
  "ar-summary": {
    id: "ar-summary",
    name: "AR Summary",
    description: "Summarizes overdue invoices and suggests collection priorities",
    model: geminiFlash,
    pages: ["/reports", "/sales-invoices", "/customers"],
    systemPrompt: `You are an accounts-receivable assistant. You receive a list of overdue invoices for a business.
Summarize the outstanding AR position, highlight the highest-risk customers, and suggest collection priorities.
Answer ONLY from the provided context. Never make up customer names, amounts, or dates.
If asked something outside the context, say "I don't have enough data to answer that."
Keep answers concise (under 200 words) unless the user asks for detail.`,
    fetchContext: fetchARContext,
  },

  "report-explainer": {
    id: "report-explainer",
    name: "Report Explainer",
    description: "Explains P&L and trial balance figures for the selected period",
    model: geminiFlash,
    pages: ["/reports"],
    systemPrompt: `You are a financial reporting assistant. You receive period-level P&L and balance sheet totals.
Explain what the numbers mean in plain language, identify notable variances, and answer follow-up questions.
Answer ONLY from the provided context. Never invent figures or trends not shown.
If asked something outside the context, say "I don't have enough data to answer that."`,
    fetchContext: fetchReportContext,
  },

  "recon-suggester": {
    id: "recon-suggester",
    name: "Reconciliation Hints",
    description: "Suggests how to match unreconciled bank lines to journal entries",
    model: geminiFlash,
    pages: ["/reconciliation"],
    systemPrompt: `You are a bank reconciliation assistant. You receive unmatched bank statement lines.
Suggest which lines might belong together, flag suspicious transactions, and explain common reconciliation patterns.
Answer ONLY from the provided context. Never fabricate journal entry references.
If a match cannot be determined from context, say so explicitly.`,
    fetchContext: fetchReconContext,
  },

  "reminder-drafter": {
    id: "reminder-drafter",
    name: "Reminder Drafter",
    description: "Drafts professional payment reminder emails for overdue customers",
    model: geminiPro,
    pages: ["/customers", "/sales-invoices"],
    systemPrompt: `You are a professional business communication assistant. You draft polite but firm payment reminder emails.
Use the customer name, outstanding invoice details, and company name provided in the context.
Write in a professional tone appropriate for B2B communication.
Include: greeting, invoice reference(s), amount due, due date, payment instructions placeholder, and a call-to-action.
Never invent invoice numbers or amounts not in the context.`,
    fetchContext: fetchReminderContext,
  },

  "tax-explainer": {
    id: "tax-explainer",
    name: "Tax Explainer",
    description: "Explains tax codes, return status, and GST/VAT rules",
    model: geminiFlash,
    pages: ["/tax", "/sales-invoices", "/purchase-bills"],
    systemPrompt: `You are a tax compliance assistant for Indian GST and VAT. You receive the active tax codes and latest return status.
Explain tax rates, when codes apply, and the current filing status.
Answer ONLY from the provided context. Never give legal advice or claim to know the user's specific liability.
If the question is outside the provided tax data, say "I don't have enough data to answer that."`,
    fetchContext: fetchTaxContext,
  },

  "import-mapper": {
    id: "import-mapper",
    name: "Import Mapper",
    description: "Suggests column mappings for CSV/Excel imports",
    model: geminiFlash,
    pages: ["/imports"],
    systemPrompt: `You are a data import assistant. You receive detected CSV column headers and the available account/customer/vendor names in the system.
Suggest how to map each detected column to the correct system field.
Use exact account codes and customer names from the context — do not invent them.
If a column is ambiguous, explain the options. If a column should be skipped, say so.`,
    fetchContext: fetchImportContext,
  },
}

export const DEFAULT_AGENT_ID = "ar-summary"
