# AI Copilot for Accounting — Design Spec

Date: 2026-05-16  
Status: Approved  
Feature: #15 — AI Assistance for Accounting

---

## Overview

A global AI copilot slide-over drawer that appears on every accounting page. It reads live tenant data (read-only), routes questions to task-specific agents, and streams advisory responses. It never owns the posting path — it can only suggest, summarize, draft, and explain.

---

## Decisions Made

| Decision | Choice |
|---|---|
| Panel placement | Global floating drawer (bottom-right trigger) |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/google`) |
| Default model | Gemini Flash 2.0 (free tier) |
| Agent structure | By task type (6 agents) |
| Conversation mode | Multi-turn in-memory chat per task (resets on agent switch) |
| Scope | 6 agents — attachment extraction deferred |

---

## Architecture

```
AppShell (app/[orgSlug]/layout.tsx → components/app-sidebar.tsx)
  └─ receives orgSlug as prop (already available in AppShell)
  └─ AICopilotButton (fixed, bottom-right, z-50)
       └─ AICopilotDrawer (slide-over, 380px, no push)
            │  receives orgSlug as prop from AppShell
            └─ reads usePathname() → eligibleAgents[]
            └─ AgentSelector (if no agent selected)
            └─ ContextChips + ChatThread (if agent selected)
                 └─ useChat({ api: '/api/ai/chat', body: { agentId, orgSlug, contextHints } })

/api/ai/chat (POST)
  1. getServerSession → 401
  2. resolveCompany(orgSlug, email) → 403
  3. AGENT_REGISTRY[agentId] → 400
  4. agent.fetchContext(companyId, contextHints) — Prisma reads only
  5. streamText({ model, system, messages })
  6. toDataStreamResponse()
```

---

## Environment Variables

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

Add to `.env.local` and Vercel project environment variables.

---

## Packages to Install

```bash
npm install ai @ai-sdk/google
```

---

## Agent Registry (`lib/ai/agents.ts`)

### Type

```ts
type Agent = {
  id: string
  name: string
  description: string
  model: LanguageModel
  pages: string[]              // path prefixes — drawer shows agent when pathname starts with one
  systemPrompt: string
  fetchContext: (
    companyId: string,
    hints?: Record<string, string>
  ) => Promise<string>
}
```

### 6 Agents

| ID | Name | Model | Trigger Pages | Context Fetched |
|---|---|---|---|---|
| `ar-summary` | AR Summary | Gemini Flash | `/reports`, `/sales-invoices`, `/customers` | Top 20 overdue invoices (customer, amount, days overdue) |
| `report-explainer` | Report Explainer | Gemini Flash | `/reports` | Current period P&L / trial balance totals vs prior period |
| `recon-suggester` | Reconciliation Hints | Gemini Flash | `/reconciliation` | Up to 30 unmatched bank lines + unreconciled journal entries |
| `reminder-drafter` | Reminder Drafter | Gemini Pro | `/customers`, `/sales-invoices` | Selected customer + open invoices + company name |
| `tax-explainer` | Tax Explainer | Gemini Flash | `/tax`, `/sales-invoices`, `/purchase-bills` | Active tax codes + current return period + flagged warnings |
| `import-mapper` | Import Mapper | Gemini Flash | `/imports` | Detected CSV columns + available account/customer/vendor names |

**Fallback:** If no agent matches the current page, `ar-summary` is shown as default. The copilot button is only mounted inside `AppShell` (the `app/[orgSlug]/` layout), so it never appears on marketing, login, or onboarding pages — only on authenticated org routes.

---

## API Route — `app/api/ai/chat/route.ts`

```
POST /api/ai/chat
Content-Type: application/json

Body:
{
  agentId: string
  orgSlug: string
  messages: CoreMessage[]
  contextHints?: {
    customerId?: string
    invoiceId?: string
    runId?: string
    period?: string
    importJobId?: string
  }
}

Response: text/event-stream (Vercel AI SDK data stream)
```

**Security:**
- Auth required — returns 401 if no session
- Company membership required — returns 403 if orgSlug not in user's workspaces
- `fetchContext` always scopes every Prisma query to validated `companyId`
- `contextHints` IDs are re-validated for company ownership before use
- Route is read-only — no mutations anywhere in the handler

---

## Client Components (`components/ai/`)

### `copilot-button.tsx`
- Fixed position, bottom-right, `z-50`
- `Bot` icon (lucide-react)
- Toggles drawer open/closed
- Shows a subtle pulsing dot when on a page with eligible agents

### `copilot-drawer.tsx`
- Slide-over from right, 380px wide
- Does not push page content (`fixed` position)
- Header: "AI Copilot" title + close button
- Reads `usePathname()` to derive `eligibleAgents`
- `selectedAgentId` state — null = show AgentSelector
- When agent selected: header shows agent name + "← Back" to deselect

### `agent-selector.tsx`
- Grid of agent cards (icon, name, description)
- One card per eligible agent on current page
- Clicking a card sets `selectedAgentId`

### `context-chips.tsx`
- Read-only pills showing current page context
- Derived from URL params + page metadata
- Examples:
  - `/reconciliation/[runId]` → `Run: RUN-2026-04`
  - `/reports/p-and-l?period=2026-04` → `Period: Apr 2026`
  - `/customers/[id]` → `Customer: Acme Corp`
- Passed as `contextHints` in `useChat` body

### `chat-thread.tsx`
- `useChat({ api: '/api/ai/chat', body: { agentId, orgSlug, contextHints } })`
- Fresh instance per agent selection (key={selectedAgentId})
- Message list with auto-scroll
- Input bar pinned to drawer bottom
- Disclaimer: "Advisory only — AI never posts to the ledger"
- Streaming status indicator while response is in-flight

### `message-bubble.tsx`
- User messages: right-aligned, plain text
- Assistant messages: left-aligned, markdown rendered (bold, lists, code blocks)
- No "Apply" or "Post" action buttons on any assistant message

---

## Context Chip Detection Logic

```ts
function deriveContextHints(pathname: string, searchParams: URLSearchParams): ContextHints {
  // /reconciliation/[runId]
  if match /reconciliation/([^/]+) → { runId }
  // /customers/[id]
  if match /customers/([^/]+) and not /new → { customerId }
  // /sales-invoices/[id]
  if match /sales-invoices/([^/]+) and not /new → { invoiceId }
  // /imports/[id]
  if match /imports/([^/]+) → { importJobId }
  // ?period=YYYY-MM
  if searchParams.get('period') → { period }
}
```

---

## Non-Negotiable Constraints

1. **AI never posts.** The API route has zero Prisma mutations. No action can be triggered from an AI response.
2. **Tenant isolation.** Every `fetchContext` call is scoped to the validated `companyId` for the authenticated user's session.
3. **No hallucinated data.** System prompts instruct agents to answer only from the provided context, and to say "I don't have enough data" rather than guessing.
4. **Read-only UI.** No assistant message will render a button that calls a mutation. Markdown only.
5. **Model constraint note.** The `reminder-drafter` agent uses Gemini Pro, not Flash, for better writing quality. All others use Flash (free tier).

---

## File Structure

```
app/
  api/
    ai/
      chat/
        route.ts              ← streaming POST handler

components/
  ai/
    copilot-button.tsx
    copilot-drawer.tsx
    agent-selector.tsx
    context-chips.tsx
    chat-thread.tsx
    message-bubble.tsx

lib/
  ai/
    agents.ts                 ← AGENT_REGISTRY + Agent type
    context-fetchers.ts       ← per-agent Prisma fetch functions
    models.ts                 ← model instantiation (google('gemini-2.0-flash') etc.)
```

---

## What Is Explicitly Out of Scope

- Posting, reversing, closing, or filing via AI
- Persistent conversation history in DB
- Attachment / file upload parsing (deferred)
- AI-generated journal entries or vouchers
- Scheduled AI reports or email delivery
