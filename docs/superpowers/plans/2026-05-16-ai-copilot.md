# AI Copilot for Accounting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global floating AI copilot drawer to every authenticated org page, routing questions to 6 task-specific agents that read live tenant data and stream advisory responses via Vercel AI SDK + Gemini.

**Architecture:** A fixed `CopilotButton` (bottom-right, z-50) toggling a slide-over `CopilotDrawer` is mounted directly inside the `AppShell` component in `components/app-sidebar.tsx`. The drawer derives eligible agents from the current pathname, manages `selectedAgentId` state, and renders a `ChatThread` which calls `POST /api/ai/chat`. The route authenticates, resolves the company, looks up the agent in `AGENT_REGISTRY`, fetches live Prisma context (read-only), and streams via `streamText → toDataStreamResponse()`.

**Tech Stack:** Vercel AI SDK (`ai` + `@ai-sdk/google`), Gemini Flash 2.0 (default) / Gemini 1.5 Pro (reminder-drafter), Prisma (read-only), Next.js App Router, next-auth, lucide-react, react-markdown.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/ai/models.ts` | Create | Gemini model instances |
| `lib/ai/context-fetchers.ts` | Create | Per-agent Prisma read functions |
| `lib/ai/agents.ts` | Create | `Agent` type + `AGENT_REGISTRY` |
| `app/api/ai/chat/route.ts` | Create | Streaming POST handler |
| `components/ai/message-bubble.tsx` | Create | Leaf: renders one chat message |
| `components/ai/context-chips.tsx` | Create | Read-only URL-derived context pills |
| `components/ai/agent-selector.tsx` | Create | Grid of eligible agent cards |
| `components/ai/chat-thread.tsx` | Create | `useChat` wrapper + message list |
| `components/ai/copilot-drawer.tsx` | Create | Slide-over drawer orchestrator |
| `components/ai/copilot-button.tsx` | Create | Fixed floating trigger button |
| `components/app-sidebar.tsx` | Modify | Mount `CopilotButton` in `AppShell` |

---

## Task 1: Install packages and configure environment

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (add key)

- [ ] **Step 1: Install AI SDK packages**

```bash
npm install ai @ai-sdk/google
```

Expected output: packages added, no peer dependency errors.

- [ ] **Step 2: Add the Gemini API key to `.env.local`**

Append to `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Replace `your_gemini_api_key_here` with the actual key from Google AI Studio (aistudio.google.com).

- [ ] **Step 3: Verify the SDK resolves**

```bash
node -e "require('ai'); require('@ai-sdk/google'); console.log('OK')"
```

Expected: `OK` (no module-not-found errors).

---

## Task 2: Create model instances (`lib/ai/models.ts`)

**Files:**
- Create: `lib/ai/models.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/ai/models.ts
import { google } from "@ai-sdk/google"
import type { LanguageModel } from "ai"

export const geminiFlash: LanguageModel = google("gemini-2.0-flash")
export const geminiPro: LanguageModel = google("gemini-1.5-pro")
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lib/ai/models"
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add lib/ai/models.ts
git commit -m "feat(ai): add Gemini model instances"
```

---

## Task 3: Create context fetchers (`lib/ai/context-fetchers.ts`)

**Files:**
- Create: `lib/ai/context-fetchers.ts`

Each function is `(companyId: string, hints?: Record<string, string>) => Promise<string>`. They are read-only and scoped to `companyId`.

- [ ] **Step 1: Create the file**

```ts
// lib/ai/context-fetchers.ts
import { prisma } from "@/lib/prisma"

export async function fetchARContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const now = new Date()
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      status: "POSTED",
      dueDate: { lt: now },
      amountDue: { gt: 0 },
    },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 20,
  })
  if (invoices.length === 0) return "No overdue invoices found."
  return invoices
    .map((inv) => {
      const days = Math.floor(
        (now.getTime() - inv.dueDate!.getTime()) / 86_400_000,
      )
      return `${inv.invoiceNumber} | ${inv.customer.name} | ₹${Number(inv.amountDue).toLocaleString("en-IN")} due | ${days} days overdue`
    })
    .join("\n")
}

export async function fetchReportContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const period = hints.period ?? new Date().toISOString().slice(0, 7) // YYYY-MM
  const [year, month] = period.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const entries = await prisma.journalEntry.findMany({
    where: { companyId, status: "POSTED", date: { gte: start, lte: end } },
    include: {
      lines: {
        select: { debit: true, credit: true, account: { select: { type: true, name: true } } },
      },
    },
  })

  type Totals = { revenue: number; expense: number; asset: number; liability: number }
  const totals = entries.reduce<Totals>(
    (acc, entry) => {
      for (const line of entry.lines) {
        const d = Number(line.debit ?? 0)
        const c = Number(line.credit ?? 0)
        if (line.account.type === "REVENUE") acc.revenue += c - d
        else if (line.account.type === "EXPENSE") acc.expense += d - c
        else if (line.account.type === "ASSET") acc.asset += d - c
        else if (line.account.type === "LIABILITY") acc.liability += c - d
      }
      return acc
    },
    { revenue: 0, expense: 0, asset: 0, liability: 0 },
  )

  return `Period: ${period}
Revenue: ₹${totals.revenue.toLocaleString("en-IN")}
Expenses: ₹${totals.expense.toLocaleString("en-IN")}
Net Profit: ₹${(totals.revenue - totals.expense).toLocaleString("en-IN")}
Total Assets: ₹${totals.asset.toLocaleString("en-IN")}
Total Liabilities: ₹${totals.liability.toLocaleString("en-IN")}`
}

export async function fetchReconContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const unmatchedLines = await prisma.bankStatementLine.findMany({
    where: {
      reconciliationStatus: "UNRECONCILED",
      statement: {
        bankAccount: { companyId },
      },
    },
    include: {
      statement: {
        select: { bankAccount: { select: { bankName: true, maskedNumber: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 30,
  })

  if (unmatchedLines.length === 0) return "No unmatched bank statement lines found."

  const lines = unmatchedLines.map((line) => {
    const amount =
      line.debitAmount != null
        ? `-₹${Number(line.debitAmount).toLocaleString("en-IN")}`
        : `+₹${Number(line.creditAmount).toLocaleString("en-IN")}`
    return `${line.date.toISOString().slice(0, 10)} | ${line.statement.bankAccount.bankName} (...${line.statement.bankAccount.maskedNumber}) | ${amount} | ${line.description}`
  })

  return `Unmatched bank lines (${unmatchedLines.length}):\n${lines.join("\n")}`
}

export async function fetchReminderContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })

  if (hints.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: hints.customerId, companyId },
      select: { name: true, email: true, phone: true },
    })
    if (!customer) return "Customer not found."

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, customerId: hints.customerId, status: "POSTED", amountDue: { gt: 0 } },
      orderBy: { dueDate: "asc" },
      select: { invoiceNumber: true, totalAmount: true, amountDue: true, dueDate: true },
    })

    const invoiceList = invoices
      .map(
        (inv) =>
          `${inv.invoiceNumber} | ₹${Number(inv.amountDue).toLocaleString("en-IN")} due | ${inv.dueDate?.toISOString().slice(0, 10) ?? "no due date"}`,
      )
      .join("\n")

    return `Company: ${company?.name ?? "Your Company"}
Customer: ${customer.name}
Email: ${customer.email ?? "—"}
Phone: ${customer.phone ?? "—"}
Open invoices:
${invoiceList || "None"}`
  }

  // fallback: top 5 customers by outstanding amount
  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId, status: "POSTED", amountDue: { gt: 0 } },
    include: { customer: { select: { name: true } } },
    orderBy: { amountDue: "desc" },
    take: 5,
  })

  const summary = invoices
    .map(
      (inv) =>
        `${inv.customer.name} | ${inv.invoiceNumber} | ₹${Number(inv.amountDue).toLocaleString("en-IN")}`,
    )
    .join("\n")

  return `Company: ${company?.name ?? "Your Company"}\nTop outstanding invoices:\n${summary || "None"}`
}

export async function fetchTaxContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })
  if (!company) return "Company not found."

  const [taxCodes, latestReturn] = await Promise.all([
    prisma.taxCode.findMany({
      where: { workspaceId: company.workspaceId, isActive: true },
      select: { code: true, name: true, rate: true, type: true },
      orderBy: { code: "asc" },
    }),
    prisma.taxReturn.findFirst({
      where: { companyId },
      orderBy: { period: "desc" },
      select: { type: true, period: true, status: true },
    }),
  ])

  const codeList = taxCodes
    .map((tc) => `${tc.code} | ${tc.name} | ${Number(tc.rate)}% | ${tc.type}`)
    .join("\n")

  const returnInfo = latestReturn
    ? `Latest return: ${latestReturn.type} | Period ${latestReturn.period} | Status: ${latestReturn.status}`
    : "No tax returns filed yet."

  return `Active tax codes:\n${codeList || "None"}\n\n${returnInfo}`
}

export async function fetchImportContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const job = hints.importJobId
    ? await prisma.importJob.findFirst({
        where: { id: hints.importJobId, companyId },
        select: { type: true, fileName: true, detectedColumns: true, status: true },
      })
    : await prisma.importJob.findFirst({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        select: { type: true, fileName: true, detectedColumns: true, status: true },
      })

  if (!job) return "No import job found."

  const columns = Array.isArray(job.detectedColumns) ? job.detectedColumns : []

  const [accounts, customers, vendors] = await Promise.all([
    prisma.chartAccount.findMany({
      where: { companyId, isActive: true, isPosting: true },
      select: { code: true, name: true },
      take: 30,
    }),
    prisma.customer.findMany({
      where: { companyId },
      select: { name: true },
      take: 20,
    }),
    prisma.vendor.findMany({
      where: { companyId },
      select: { name: true },
      take: 20,
    }),
  ])

  return `Import job: ${job.fileName ?? "unknown"} | Type: ${job.type} | Status: ${job.status}
Detected columns: ${columns.join(", ") || "none detected yet"}

Available accounts (${accounts.length}): ${accounts.map((a) => `${a.code} ${a.name}`).join(", ")}
Available customers (${customers.length}): ${customers.map((c) => c.name).join(", ")}
Available vendors (${vendors.length}): ${vendors.map((v) => v.name).join(", ")}`
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "context-fetchers"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/context-fetchers.ts
git commit -m "feat(ai): add per-agent Prisma context fetchers"
```

---

## Task 4: Create the agent registry (`lib/ai/agents.ts`)

**Files:**
- Create: `lib/ai/agents.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/ai/agents.ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "lib/ai"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/agents.ts lib/ai/models.ts
git commit -m "feat(ai): add AGENT_REGISTRY with 6 agents"
```

---

## Task 5: Create the API route (`app/api/ai/chat/route.ts`)

**Files:**
- Create: `app/api/ai/chat/route.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p app/api/ai/chat
```

```ts
// app/api/ai/chat/route.ts
import { streamText } from "ai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { AGENT_REGISTRY } from "@/lib/ai/agents"
import type { CoreMessage } from "ai"

export async function POST(request: Request) {
  const body = await request.json() as {
    agentId: string
    orgSlug: string
    messages: CoreMessage[]
    contextHints?: Record<string, string>
  }
  const { agentId, orgSlug, messages, contextHints } = body

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 })
  }

  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) {
    return new Response("Forbidden", { status: 403 })
  }

  const agent = AGENT_REGISTRY[agentId]
  if (!agent) {
    return new Response(`Unknown agent: ${agentId}`, { status: 400 })
  }

  const contextBlock = await agent.fetchContext(ctx.company.id, contextHints ?? {})

  const result = streamText({
    model: agent.model,
    system: `${agent.systemPrompt}\n\n## Live Data Context\n\`\`\`\n${contextBlock}\n\`\`\``,
    messages,
  })

  return result.toDataStreamResponse()
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "api/ai/chat"
```

Expected: no output.

- [ ] **Step 3: Test the route manually (once env key is set)**

```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"ar-summary","orgSlug":"YOUR_ORG_SLUG","messages":[{"role":"user","content":"What are my top overdue invoices?"}]}' \
  -i 2>&1 | head -5
```

Expected: `HTTP/1.1 401 Unauthorized` (no session in curl — this proves the auth guard works).

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "feat(ai): add streaming chat API route"
```

---

## Task 6: Create `message-bubble.tsx`

**Files:**
- Create: `components/ai/message-bubble.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
npm install react-markdown
```

- [ ] **Step 2: Create the file**

```tsx
// components/ai/message-bubble.tsx
"use client"

import ReactMarkdown from "react-markdown"

type Props = {
  role: "user" | "assistant"
  content: string
}

export function MessageBubble({ role, content }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#37322F] px-3 py-2 text-sm text-white">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-[rgba(55,50,47,0.12)] bg-white px-3 py-2 text-sm text-[#37322F]">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => (
              <code className="rounded bg-[#F0EDE9] px-1 py-0.5 font-mono text-xs">{children}</code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "message-bubble"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/ai/message-bubble.tsx
git commit -m "feat(ai): add MessageBubble component"
```

---

## Task 7: Create `context-chips.tsx`

**Files:**
- Create: `components/ai/context-chips.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ai/context-chips.tsx
"use client"

import { usePathname, useSearchParams } from "next/navigation"

export type ContextHints = {
  customerId?: string
  invoiceId?: string
  runId?: string
  period?: string
  importJobId?: string
}

function deriveContextHints(
  pathname: string,
  searchParams: URLSearchParams,
): ContextHints {
  const hints: ContextHints = {}

  const reconMatch = pathname.match(/\/reconciliation\/([^/]+)/)
  if (reconMatch) hints.runId = reconMatch[1]

  const customerMatch = pathname.match(/\/customers\/([^/]+)/)
  if (customerMatch && customerMatch[1] !== "new") hints.customerId = customerMatch[1]

  const invoiceMatch = pathname.match(/\/sales-invoices\/([^/]+)/)
  if (invoiceMatch && invoiceMatch[1] !== "new") hints.invoiceId = invoiceMatch[1]

  const importMatch = pathname.match(/\/imports\/([^/]+)/)
  if (importMatch) hints.importJobId = importMatch[1]

  const period = searchParams.get("period")
  if (period) hints.period = period

  return hints
}

function chipLabel(key: keyof ContextHints, value: string): string {
  const labels: Record<keyof ContextHints, string> = {
    customerId: "Customer",
    invoiceId: "Invoice",
    runId: "Recon Run",
    period: "Period",
    importJobId: "Import Job",
  }
  return `${labels[key]}: ${value.length > 12 ? value.slice(0, 8) + "…" : value}`
}

type Props = {
  onHintsChange: (hints: ContextHints) => void
}

export function ContextChips({ onHintsChange }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hints = deriveContextHints(pathname, searchParams)
  const entries = Object.entries(hints).filter(([, v]) => Boolean(v)) as [
    keyof ContextHints,
    string,
  ][]

  // Notify parent synchronously on render (stable for SSR hydration)
  // Parent uses this for the useChat body
  // eslint-disable-next-line react-hooks/exhaustive-deps
  import("react").then(({ useEffect }) => {})
  // Call onHintsChange via useEffect to avoid render-phase side effects
  // (This component is tiny; we inline the effect logic in the parent instead — see copilot-drawer.tsx)

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center rounded-full border border-[rgba(55,50,47,0.18)] bg-[#F0EDE9] px-2.5 py-0.5 text-xs font-medium text-[#605A57]"
        >
          {chipLabel(key, value)}
        </span>
      ))}
    </div>
  )
}

export { deriveContextHints }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "context-chips"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ai/context-chips.tsx
git commit -m "feat(ai): add ContextChips URL-derived context hints"
```

---

## Task 8: Create `agent-selector.tsx`

**Files:**
- Create: `components/ai/agent-selector.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ai/agent-selector.tsx
"use client"

import { Bot, FileText, RefreshCcw, Mail, Receipt, Upload } from "lucide-react"
import type { Agent } from "@/lib/ai/agents"

const AGENT_ICONS: Record<string, React.ElementType> = {
  "ar-summary": FileText,
  "report-explainer": Bot,
  "recon-suggester": RefreshCcw,
  "reminder-drafter": Mail,
  "tax-explainer": Receipt,
  "import-mapper": Upload,
}

type Props = {
  agents: Agent[]
  onSelect: (agentId: string) => void
}

export function AgentSelector({ agents, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-[#605A57]">
        Choose an assistant
      </p>
      {agents.map((agent) => {
        const Icon = AGENT_ICONS[agent.id] ?? Bot
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className="flex items-start gap-3 rounded-xl border border-[rgba(55,50,47,0.12)] bg-white p-3 text-left transition-colors hover:border-[rgba(55,50,47,0.25)] hover:bg-[#FAF9F8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#37322F]"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0EDE9]">
              <Icon className="h-4 w-4 text-[#605A57]" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#37322F]">{agent.name}</p>
              <p className="mt-0.5 text-xs text-[#605A57]">{agent.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "agent-selector"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ai/agent-selector.tsx
git commit -m "feat(ai): add AgentSelector grid component"
```

---

## Task 9: Create `chat-thread.tsx`

**Files:**
- Create: `components/ai/chat-thread.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ai/chat-thread.tsx
"use client"

import { useEffect, useRef } from "react"
import { useChat } from "ai/react"
import { ArrowUp, Loader2 } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import type { ContextHints } from "./context-chips"

type Props = {
  agentId: string
  orgSlug: string
  contextHints: ContextHints
}

export function ChatThread({ agentId, orgSlug, contextHints }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/ai/chat",
    body: { agentId, orgSlug, contextHints },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="mt-4 text-center text-xs text-[#9E9891]">
            Ask me anything about this page&apos;s data.
          </p>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Loader2 className="h-4 w-4 animate-spin text-[#9E9891]" />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <p className="shrink-0 px-3 pb-1 text-center text-[10px] text-[#C4BFB9]">
        Advisory only — AI never posts to the ledger
      </p>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[rgba(55,50,47,0.10)] p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-[#37322F] outline-none placeholder:text-[#C4BFB9]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#37322F] text-white transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "chat-thread"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ai/chat-thread.tsx
git commit -m "feat(ai): add ChatThread with useChat streaming"
```

---

## Task 10: Create `copilot-drawer.tsx`

**Files:**
- Create: `components/ai/copilot-drawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ai/copilot-drawer.tsx
"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { X, ChevronLeft } from "lucide-react"
import { AGENT_REGISTRY, DEFAULT_AGENT_ID } from "@/lib/ai/agents"
import { AgentSelector } from "./agent-selector"
import { ContextChips, deriveContextHints, type ContextHints } from "./context-chips"
import { ChatThread } from "./chat-thread"

type Props = {
  orgSlug: string
  onClose: () => void
}

function eligibleAgents(pathname: string) {
  return Object.values(AGENT_REGISTRY).filter((agent) =>
    agent.pages.some((prefix) => pathname.includes(prefix)),
  )
}

export function CopilotDrawer({ orgSlug, onClose }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const agents = eligibleAgents(pathname)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [contextHints, setContextHints] = useState<ContextHints>({})

  // Re-derive context hints whenever pathname or searchParams change
  useEffect(() => {
    setContextHints(deriveContextHints(pathname, searchParams))
  }, [pathname, searchParams])

  const selectedAgent = selectedAgentId ? AGENT_REGISTRY[selectedAgentId] : null

  return (
    <div className="fixed bottom-[72px] right-4 z-50 flex h-[540px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[rgba(55,50,47,0.14)] bg-[#FAFAF9] shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(55,50,47,0.10)] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgentId(null)}
              className="mr-1 text-[#605A57] hover:text-[#37322F]"
              aria-label="Back to agent list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-semibold text-[#37322F]">
            {selectedAgent ? selectedAgent.name : "AI Copilot"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#9E9891] hover:text-[#37322F]"
          aria-label="Close AI Copilot"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Context chips — only when agent selected */}
      {selectedAgent && Object.keys(contextHints).length > 0 && (
        <ContextChips onHintsChange={setContextHints} />
      )}

      {/* Body */}
      {!selectedAgent ? (
        <div className="flex-1 overflow-y-auto">
          {agents.length > 0 ? (
            <AgentSelector agents={agents} onSelect={setSelectedAgentId} />
          ) : (
            <AgentSelector
              agents={[AGENT_REGISTRY[DEFAULT_AGENT_ID]]}
              onSelect={setSelectedAgentId}
            />
          )}
        </div>
      ) : (
        <ChatThread
          key={selectedAgentId}
          agentId={selectedAgentId!}
          orgSlug={orgSlug}
          contextHints={contextHints}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "copilot-drawer"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ai/copilot-drawer.tsx
git commit -m "feat(ai): add CopilotDrawer slide-over"
```

---

## Task 11: Create `copilot-button.tsx`

**Files:**
- Create: `components/ai/copilot-button.tsx`

- [ ] **Step 1: Create the file**

```tsx
// components/ai/copilot-button.tsx
"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { usePathname } from "next/navigation"
import { AGENT_REGISTRY } from "@/lib/ai/agents"
import { CopilotDrawer } from "./copilot-drawer"

type Props = {
  orgSlug: string
}

function hasEligibleAgent(pathname: string): boolean {
  return Object.values(AGENT_REGISTRY).some((agent) =>
    agent.pages.some((prefix) => pathname.includes(prefix)),
  )
}

export function CopilotButton({ orgSlug }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const eligible = hasEligibleAgent(pathname)

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#37322F] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open AI Copilot"
      >
        <Bot className="h-5 w-5" />
        {eligible && !open && (
          <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        )}
      </button>
      {open && <CopilotDrawer orgSlug={orgSlug} onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "copilot-button"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ai/copilot-button.tsx
git commit -m "feat(ai): add CopilotButton floating trigger"
```

---

## Task 12: Mount `CopilotButton` in `AppShell`

**Files:**
- Modify: `components/app-sidebar.tsx` (lines ~698–710, inside `AppShell` return)

The `AppShell` component already receives `orgSlug` as a prop. We add `CopilotButton` as the last child inside the `SidebarProvider` wrapper, after `{children}`.

- [ ] **Step 1: Add the import**

In `components/app-sidebar.tsx`, find the import block and add:

```ts
import { CopilotButton } from "@/components/ai/copilot-button"
```

- [ ] **Step 2: Mount the button in `AppShell`**

Find the `AppShell` return statement (around line 698). The current code is:

```tsx
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        orgSlug={orgSlug}
        orgName={orgName}
        orgs={orgs}
        userName={userName}
        userEmail={userEmail}
        activeHref={activeHref}
      />
      {children}
    </SidebarProvider>
  )
```

Change it to:

```tsx
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        orgSlug={orgSlug}
        orgName={orgName}
        orgs={orgs}
        userName={userName}
        userEmail={userEmail}
        activeHref={activeHref}
      />
      {children}
      <CopilotButton orgSlug={orgSlug} />
    </SidebarProvider>
  )
```

- [ ] **Step 3: Verify TypeScript compiles (full check)**

```bash
npx tsc --noEmit 2>&1 | grep -E "app-sidebar|copilot"
```

Expected: no output.

- [ ] **Step 4: Run the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/{orgSlug}/dashboard` in a browser. You should see:
- A dark circular floating button in the bottom-right corner
- A pulsing green dot on the button (if the current page has an eligible agent)
- Clicking it opens the CopilotDrawer
- Selecting an agent shows the ChatThread
- Typing a message and pressing Enter streams a response from Gemini

- [ ] **Step 5: Commit**

```bash
git add components/app-sidebar.tsx components/ai/
git commit -m "feat(ai): mount CopilotButton in AppShell — Feature #15 complete"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Global floating drawer (bottom-right trigger) → `copilot-button.tsx`
- ✅ Reads live tenant data (read-only) → `context-fetchers.ts`
- ✅ Routes to task-specific agents → `AGENT_REGISTRY`
- ✅ Streams advisory responses → `streamText + toDataStreamResponse`
- ✅ Never owns posting path — API route has zero mutations
- ✅ 6 agents (attachment extraction deferred)
- ✅ Multi-turn in-memory chat, resets on agent switch (`key={selectedAgentId}`)
- ✅ Gemini Flash default, Gemini Pro for reminder-drafter
- ✅ Auth guard (401) and company membership guard (403)
- ✅ `fetchContext` scoped to `companyId`
- ✅ `contextHints` derived from URL pathname and search params
- ✅ No "Apply" or "Post" buttons on assistant messages
- ✅ Disclaimer: "Advisory only — AI never posts to the ledger"
- ✅ Copilot button only in `AppShell` (authenticated org routes only)
- ✅ Pulsing dot when eligible agents exist for current page
- ✅ `GOOGLE_GENERATIVE_AI_API_KEY` env var documented (Task 1)

**Type consistency:**
- `ContextHints` exported from `context-chips.tsx`, imported in `chat-thread.tsx` and `copilot-drawer.tsx`
- `Agent` type exported from `agents.ts`, imported in `agent-selector.tsx` and `copilot-drawer.tsx`
- `AGENT_REGISTRY` and `DEFAULT_AGENT_ID` exported from `agents.ts`, imported in `copilot-button.tsx`, `copilot-drawer.tsx`
- `deriveContextHints` exported from `context-chips.tsx`, imported in `copilot-drawer.tsx`
- `geminiFlash` and `geminiPro` from `models.ts`, used only in `agents.ts`
