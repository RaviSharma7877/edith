# Voucher-Based Data Entry (Custom Voucher Types) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `VoucherTypeConfig` table that drives dynamic form rendering, custom voucher numbering sequences, and a settings page where admins can create and manage voucher types.

**Architecture:** A new Prisma model `VoucherTypeConfig` is the single source of truth for all type metadata. The existing `VoucherType` enum is retained for backward compatibility; custom types map to `JOURNAL_ENTRY` in that enum but are distinguished by `voucherTypeConfigId` FK on `JournalEntry`. The dynamic form reads a config row and renders party selectors, extra fields, locked default lines, and a simplified single-amount mode according to the `formConfig` JSON column.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, React 19, Zod 4, shadcn/ui (Radix), Tailwind CSS 4, TypeScript 5.

---

## Task 1: Prisma schema — add VoucherTypeConfig model + FK on JournalEntry

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260516133000_add_voucher_type_configs/migration.sql`

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Open `prisma/schema.prisma`. Find the line `@@map("journal_entries")` (end of the `JournalEntry` model). Add the new model **after** the `JournalLine` model block. Also add two fields to `JournalEntry` and a relation on `Company`.

**Changes to `JournalEntry` model** — add two lines before the `company` relation (after `sourceId String?`):

```prisma
  voucherTypeConfigId  String?
  voucherTypeConfig    VoucherTypeConfig? @relation(fields: [voucherTypeConfigId], references: [id])
```

Also add a new `@@index` to `JournalEntry`:
```prisma
  @@index([voucherTypeConfigId])
```

**New model to add** (after the `JournalLine` model block, before any other model):

```prisma
model VoucherTypeConfig {
  id              String      @id @default(cuid())
  companyId       String?
  workspaceId     String?
  key             String
  label           String
  prefix          String
  isSystem        Boolean     @default(false)
  isActive        Boolean     @default(true)
  sortOrder       Int         @default(100)
  baseVoucherType VoucherType
  formConfig      Json
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  company        Company?       @relation(fields: [companyId], references: [id])
  journalEntries JournalEntry[]

  @@unique([companyId, key])
  @@index([companyId, isActive, sortOrder])
  @@map("voucher_type_configs")
}
```

**Add relation on `Company` model** — find the `Company` model and add to its relations list:
```prisma
  voucherTypeConfigs VoucherTypeConfig[]
```

- [ ] **Step 2: Write the migration SQL**

Create file `prisma/migrations/20260516133000_add_voucher_type_configs/migration.sql` with this content:

```sql
-- CreateTable
CREATE TABLE "voucher_type_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "workspaceId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "baseVoucherType" "VoucherType" NOT NULL,
    "formConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "voucher_type_configs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (VoucherTypeConfig → Company)
ALTER TABLE "voucher_type_configs" ADD CONSTRAINT "voucher_type_configs_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable (JournalEntry — add FK column)
ALTER TABLE "journal_entries" ADD COLUMN "voucherTypeConfigId" TEXT;

-- AddForeignKey (JournalEntry → VoucherTypeConfig)
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_voucherTypeConfigId_fkey"
    FOREIGN KEY ("voucherTypeConfigId") REFERENCES "voucher_type_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (compound unique — for company-scoped rows)
CREATE UNIQUE INDEX "voucher_type_configs_companyId_key_key"
    ON "voucher_type_configs"("companyId", "key");

-- CreateIndex (partial unique — prevents duplicate global templates, NULL-safe)
CREATE UNIQUE INDEX "voucher_type_configs_global_key_unique"
    ON "voucher_type_configs"("key") WHERE "companyId" IS NULL;

-- CreateIndex
CREATE INDEX "voucher_type_configs_companyId_isActive_sortOrder_idx"
    ON "voucher_type_configs"("companyId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "journal_entries_voucherTypeConfigId_idx"
    ON "journal_entries"("voucherTypeConfigId");
```

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate dev --name add_voucher_type_configs
```

Expected: Prisma applies the migration and regenerates the client. You will see `✔ Generated Prisma Client`. If Prisma complains about drift, run `npx prisma migrate resolve --applied 20260516133000_add_voucher_type_configs` then re-run.

- [ ] **Step 4: Verify the generated client has the new types**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors about `VoucherTypeConfig`. (Other pre-existing errors are acceptable.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260516133000_add_voucher_type_configs/
git commit -m "feat(schema): add VoucherTypeConfig model + voucherTypeConfigId FK on JournalEntry"
```

---

## Task 2: TypeScript types and Zod schema — `lib/ledger/voucher-form-config.ts`

This file is pure — no Prisma, no DB. It exports the canonical TypeScript interface for the `formConfig` JSON column, plus a Zod schema used by API validation.

**Files:**
- Create: `lib/ledger/voucher-form-config.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/ledger/voucher-form-config.ts
import { z } from "zod"

// ── TypeScript interface (used as documentation + for type assertions) ─────────

export interface VoucherFormConfig {
  party?: {
    show:     boolean
    label:    string
    type:     "customer" | "vendor" | "both" | "none"
    required: boolean
  }

  extraFields?: Array<{
    key:       string
    label:     string
    fieldType: "text" | "date" | "number"
    required:  boolean
  }>

  defaultLines?: Array<{
    position:        number
    label:           string
    direction:       "DEBIT" | "CREDIT"
    accountSubtype?: string | null
    accountId?:      string | null
    locked:          boolean
    amountEditable:  boolean
  }>

  lineConstraints?: {
    allowedDebitSubtypes?:  string[] | null
    allowedCreditSubtypes?: string[] | null
    minLines:               number
    maxLines?:              number | null
  }

  simplifiedMode?: {
    enabled:     boolean
    amountLabel: string
  }
}

// ── Zod schema (used by API routes to validate POST/PATCH bodies) ──────────────

const PartySchema = z.object({
  show:     z.boolean(),
  label:    z.string(),
  type:     z.enum(["customer", "vendor", "both", "none"]),
  required: z.boolean(),
})

const ExtraFieldSchema = z.object({
  key:       z.string().min(1),
  label:     z.string().min(1),
  fieldType: z.enum(["text", "date", "number"]),
  required:  z.boolean(),
})

const DefaultLineSchema = z.object({
  position:       z.number().int().min(0),
  label:          z.string(),
  direction:      z.enum(["DEBIT", "CREDIT"]),
  accountSubtype: z.string().nullable().optional(),
  accountId:      z.string().nullable().optional(),
  locked:         z.boolean(),
  amountEditable: z.boolean(),
})

const LineConstraintsSchema = z.object({
  allowedDebitSubtypes:  z.array(z.string()).nullable().optional(),
  allowedCreditSubtypes: z.array(z.string()).nullable().optional(),
  minLines:              z.number().int().min(1).default(2),
  maxLines:              z.number().int().min(1).nullable().optional(),
})

const SimplifiedModeSchema = z.object({
  enabled:     z.boolean(),
  amountLabel: z.string(),
})

export const VoucherFormConfigSchema = z.object({
  party:           PartySchema.optional(),
  extraFields:     z.array(ExtraFieldSchema).optional(),
  defaultLines:    z.array(DefaultLineSchema).optional(),
  lineConstraints: LineConstraintsSchema.optional(),
  simplifiedMode:  SimplifiedModeSchema.optional(),
})

// ── Zod schema for creating/updating a VoucherTypeConfig row ─────────────────

export const VoucherTypeConfigCreateSchema = z.object({
  key:             z.string().regex(/^[A-Z][A-Z0-9_]{1,29}$/).optional(), // auto-slugged if absent
  label:           z.string().min(1).max(100),
  prefix:          z.string().min(1).max(5),
  isActive:        z.boolean().optional().default(true),
  sortOrder:       z.number().int().optional().default(100),
  formConfig:      VoucherFormConfigSchema.optional().default({}),
})

export const VoucherTypeConfigUpdateSchema = z.object({
  label:     z.string().min(1).max(100).optional(),
  isActive:  z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  formConfig: VoucherFormConfigSchema.optional(),
})

// ── Helper: produce a key slug from a label ──────────────────────────────────

export function labelToKey(label: string): string {
  return label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^([0-9])/, "X$1")
    .substring(0, 30) || "CUSTOM"
}
```

- [ ] **Step 2: Type-check the file**

```bash
npx tsc --noEmit lib/ledger/voucher-form-config.ts 2>&1
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ledger/voucher-form-config.ts
git commit -m "feat(ledger): add VoucherFormConfig TypeScript interface + Zod schemas"
```

---

## Task 3: Seed utility — `lib/ledger/seed-voucher-types.ts`

Seeds all 11 system `VoucherTypeConfig` rows for a given company. Called from org creation. Uses `upsert` so it's safe to re-run.

**Files:**
- Create: `lib/ledger/seed-voucher-types.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/ledger/seed-voucher-types.ts
import { prisma } from "@/lib/prisma"
import type { VoucherFormConfig } from "./voucher-form-config"
import type { VoucherType } from "@prisma/client"

interface SeedRow {
  key:             string
  label:           string
  prefix:          string
  baseVoucherType: VoucherType
  sortOrder:       number
  isActive:        boolean
  formConfig:      VoucherFormConfig
}

const SYSTEM_CONFIGS: SeedRow[] = [
  {
    key: "JOURNAL_ENTRY", label: "Journal Entry", prefix: "JV",
    baseVoucherType: "JOURNAL_ENTRY", sortOrder: 10, isActive: true,
    formConfig: {
      party:          { show: false, label: "", type: "none", required: false },
      defaultLines:   [],
      lineConstraints:{ minLines: 2 },
      simplifiedMode: { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "PAYMENT_RECEIPT", label: "Receipt Voucher", prefix: "RV",
    baseVoucherType: "PAYMENT_RECEIPT", sortOrder: 20, isActive: true,
    formConfig: {
      party: { show: true, label: "Received from", type: "customer", required: false },
      extraFields: [
        { key: "chequeNumber", label: "Cheque / UTR no.", fieldType: "text", required: false },
      ],
      defaultLines: [
        { position: 0, label: "Bank / Cash account", direction: "DEBIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "Income / Receivable account", direction: "CREDIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: true, amountLabel: "Amount received" },
    },
  },
  {
    key: "PAYMENT_DISBURSEMENT", label: "Payment Voucher", prefix: "PV",
    baseVoucherType: "PAYMENT_DISBURSEMENT", sortOrder: 30, isActive: true,
    formConfig: {
      party: { show: true, label: "Paid to", type: "vendor", required: false },
      extraFields: [
        { key: "chequeNumber", label: "Cheque / UTR no.", fieldType: "text", required: false },
      ],
      defaultLines: [
        { position: 0, label: "Bank / Cash account", direction: "CREDIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "Expense / Payable account", direction: "DEBIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: true, amountLabel: "Amount paid" },
    },
  },
  {
    key: "SALES_INVOICE", label: "Sales Invoice", prefix: "SI",
    baseVoucherType: "SALES_INVOICE", sortOrder: 40, isActive: true,
    formConfig: {
      party: { show: true, label: "Customer", type: "customer", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Receivable", direction: "DEBIT",
          accountSubtype: "ACCOUNTS_RECEIVABLE", locked: false, amountEditable: true },
        { position: 1, label: "Revenue account", direction: "CREDIT",
          accountSubtype: "OPERATING_REVENUE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "PURCHASE_BILL", label: "Purchase Bill", prefix: "PB",
    baseVoucherType: "PURCHASE_BILL", sortOrder: 50, isActive: true,
    formConfig: {
      party: { show: true, label: "Vendor", type: "vendor", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Payable", direction: "CREDIT",
          accountSubtype: "ACCOUNTS_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Expense account", direction: "DEBIT",
          accountSubtype: "OPERATING_EXPENSE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "CREDIT_NOTE", label: "Credit Note", prefix: "CN",
    baseVoucherType: "CREDIT_NOTE", sortOrder: 60, isActive: true,
    formConfig: {
      party: { show: true, label: "Customer", type: "customer", required: true },
      defaultLines: [
        { position: 0, label: "Revenue account", direction: "DEBIT",
          accountSubtype: "OPERATING_REVENUE", locked: false, amountEditable: true },
        { position: 1, label: "Accounts Receivable", direction: "CREDIT",
          accountSubtype: "ACCOUNTS_RECEIVABLE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "DEBIT_NOTE", label: "Debit Note", prefix: "DN",
    baseVoucherType: "DEBIT_NOTE", sortOrder: 70, isActive: true,
    formConfig: {
      party: { show: true, label: "Vendor", type: "vendor", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Payable", direction: "DEBIT",
          accountSubtype: "ACCOUNTS_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Expense account", direction: "CREDIT",
          accountSubtype: "OPERATING_EXPENSE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "CONTRA", label: "Contra Entry", prefix: "CO",
    baseVoucherType: "CONTRA", sortOrder: 80, isActive: true,
    formConfig: {
      party: { show: false, label: "", type: "none", required: false },
      defaultLines: [
        { position: 0, label: "From account", direction: "CREDIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "To account",   direction: "DEBIT",
          accountSubtype: "CASH", locked: false, amountEditable: true },
      ],
      lineConstraints: {
        minLines: 2, maxLines: 2,
        allowedDebitSubtypes:  ["CASH", "BANK"],
        allowedCreditSubtypes: ["CASH", "BANK"],
      },
      simplifiedMode: { enabled: true, amountLabel: "Transfer amount" },
    },
  },
  {
    key: "OPENING_BALANCE", label: "Opening Balance", prefix: "OB",
    baseVoucherType: "OPENING_BALANCE", sortOrder: 90, isActive: true,
    formConfig: {
      party:           { show: false, label: "", type: "none", required: false },
      defaultLines:    [],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "BANK_RECONCILIATION_ADJ", label: "Bank Adjustment", prefix: "BA",
    baseVoucherType: "BANK_RECONCILIATION_ADJ", sortOrder: 95, isActive: false,
    formConfig: {
      party:           { show: false, label: "", type: "none", required: false },
      defaultLines:    [],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "TAX_ADJUSTMENT", label: "Tax Adjustment", prefix: "TA",
    baseVoucherType: "TAX_ADJUSTMENT", sortOrder: 100, isActive: true,
    formConfig: {
      party: { show: false, label: "", type: "none", required: false },
      defaultLines: [
        { position: 0, label: "Tax Payable account", direction: "DEBIT",
          accountSubtype: "TAX_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Offset account", direction: "CREDIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: {
        minLines: 2,
        allowedDebitSubtypes: ["TAX_PAYABLE", "TAX_EXPENSE"],
      },
      simplifiedMode: { enabled: false, amountLabel: "" },
    },
  },
]

/**
 * Seeds all 11 system VoucherTypeConfig rows for a company.
 * Safe to call multiple times — uses upsert on (companyId, key).
 */
export async function seedCompanyVoucherTypes(
  companyId: string,
  workspaceId?: string,
): Promise<void> {
  await Promise.all(
    SYSTEM_CONFIGS.map((row) =>
      prisma.voucherTypeConfig.upsert({
        where:  { companyId_key: { companyId, key: row.key } },
        update: {},
        create: {
          companyId,
          workspaceId: workspaceId ?? null,
          key:             row.key,
          label:           row.label,
          prefix:          row.prefix,
          isSystem:        true,
          isActive:        row.isActive,
          sortOrder:       row.sortOrder,
          baseVoucherType: row.baseVoucherType,
          formConfig:      row.formConfig as object,
        },
      }),
    ),
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "seed-voucher-types"
```

Expected: No output (no errors for this file).

- [ ] **Step 3: Commit**

```bash
git add lib/ledger/seed-voucher-types.ts
git commit -m "feat(ledger): add seedCompanyVoucherTypes utility with 11 system configs"
```

---

## Task 4: Update `nextVoucherNumber` to support prefix override

The existing function counts by `voucherType`. When `voucherTypeConfigId` is supplied, we must count by config instead so custom types get independent sequences (e.g. `EC-2025-0001`).

**Files:**
- Modify: `lib/ledger/ledger-service.ts` (lines 16–24)

- [ ] **Step 1: Replace the `nextVoucherNumber` function signature and body**

Find this block in `lib/ledger/ledger-service.ts`:

```typescript
export async function nextVoucherNumber(
  companyId: string,
  voucherType: VoucherType,
): Promise<string> {
  const year   = new Date().getFullYear()
  const prefix = voucherPrefix(voucherType)
  const count  = await prisma.journalEntry.count({ where: { companyId, voucherType } })
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
}
```

Replace with:

```typescript
export async function nextVoucherNumber(
  companyId:            string,
  voucherType:          VoucherType,
  opts?: { prefix?: string; voucherTypeConfigId?: string },
): Promise<string> {
  const year   = new Date().getFullYear()
  const prefix = opts?.prefix ?? voucherPrefix(voucherType)
  const count  = opts?.voucherTypeConfigId
    ? await prisma.journalEntry.count({
        where: { companyId, voucherTypeConfigId: opts.voucherTypeConfigId },
      })
    : await prisma.journalEntry.count({ where: { companyId, voucherType } })
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "ledger-service"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add lib/ledger/ledger-service.ts
git commit -m "feat(ledger): extend nextVoucherNumber to support prefix/configId override"
```

---

## Task 5: API routes — list and create voucher type configs

**Files:**
- Create: `app/api/organizations/[orgSlug]/voucher-type-configs/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/api/organizations/[orgSlug]/voucher-type-configs/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VoucherTypeConfigCreateSchema, labelToKey } from "@/lib/ledger/voucher-form-config"

// GET /api/organizations/[orgSlug]/voucher-type-configs
// Returns active configs ordered by sortOrder. ?includeInactive=true to include all.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url             = new URL(req.url)
  const includeInactive = url.searchParams.get("includeInactive") === "true"

  const configs = await prisma.voucherTypeConfig.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  })

  return NextResponse.json(configs)
}

// POST /api/organizations/[orgSlug]/voucher-type-configs
// Creates a custom (non-system) voucher type config for this company.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body   = await req.json()
  const parsed = VoucherTypeConfigCreateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid body" }, { status: 400 })

  const { label, prefix, isActive, sortOrder, formConfig } = parsed.data
  const key = parsed.data.key ?? labelToKey(label)

  // Validate key format
  if (!/^[A-Z][A-Z0-9_]{1,29}$/.test(key))
    return NextResponse.json({ error: "key must match ^[A-Z][A-Z0-9_]{1,29}$" }, { status: 400 })

  // Check prefix uniqueness within company
  const existingPrefix = await prisma.voucherTypeConfig.findFirst({
    where: { companyId: ctx.company.id, prefix, deletedAt: null },
  })
  if (existingPrefix)
    return NextResponse.json({ error: `Prefix "${prefix}" is already in use.` }, { status: 409 })

  // Check key uniqueness within company
  const existingKey = await prisma.voucherTypeConfig.findFirst({
    where: { companyId: ctx.company.id, key, deletedAt: null },
  })
  if (existingKey)
    return NextResponse.json({ error: `Key "${key}" is already in use.` }, { status: 409 })

  const config = await prisma.voucherTypeConfig.create({
    data: {
      companyId:       ctx.company.id,
      workspaceId:     ctx.workspaceId,
      key,
      label,
      prefix,
      isSystem:        false,
      isActive:        isActive ?? true,
      sortOrder:       sortOrder ?? 100,
      baseVoucherType: "JOURNAL_ENTRY",
      formConfig:      formConfig as object ?? {},
    },
  })

  return NextResponse.json(config, { status: 201 })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "voucher-type-configs/route"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/organizations/[orgSlug]/voucher-type-configs/route.ts"
git commit -m "feat(api): GET + POST /voucher-type-configs — list and create voucher type configs"
```

---

## Task 6: API routes — get, update, delete a single config

**Files:**
- Create: `app/api/organizations/[orgSlug]/voucher-type-configs/[id]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/api/organizations/[orgSlug]/voucher-type-configs/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VoucherTypeConfigUpdateSchema } from "@/lib/ledger/voucher-form-config"

type RouteParams = { params: Promise<{ orgSlug: string; id: string }> }

// GET /api/organizations/[orgSlug]/voucher-type-configs/[id]
export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(config)
}

// PATCH /api/organizations/[orgSlug]/voucher-type-configs/[id]
// System rows: only formConfig, isActive, sortOrder are mutable.
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body   = await req.json()
  const parsed = VoucherTypeConfigUpdateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid body" }, { status: 400 })

  const { label, isActive, sortOrder, formConfig } = parsed.data

  // System rows: only formConfig, isActive, sortOrder are mutable
  const updateData: Record<string, unknown> = {}
  if (formConfig !== undefined) updateData.formConfig = formConfig as object
  if (isActive  !== undefined) updateData.isActive   = isActive
  if (sortOrder !== undefined) updateData.sortOrder  = sortOrder
  if (!config.isSystem) {
    if (label !== undefined) updateData.label = label
  }

  const updated = await prisma.voucherTypeConfig.update({
    where: { id },
    data:  updateData,
  })

  return NextResponse.json(updated)
}

// DELETE /api/organizations/[orgSlug]/voucher-type-configs/[id]
// Soft-delete. Blocked if isSystem or if any JournalEntry references this config.
export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (config.isSystem)
    return NextResponse.json({ error: "System voucher types cannot be deleted." }, { status: 422 })

  const usageCount = await prisma.journalEntry.count({ where: { voucherTypeConfigId: id } })
  if (usageCount > 0)
    return NextResponse.json({
      error: `Cannot delete: ${usageCount} journal entr${usageCount === 1 ? "y" : "ies"} use this voucher type.`,
    }, { status: 422 })

  await prisma.voucherTypeConfig.update({
    where: { id },
    data:  { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "voucher-type-configs/\[id\]"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/organizations/[orgSlug]/voucher-type-configs/[id]/route.ts"
git commit -m "feat(api): GET + PATCH + DELETE /voucher-type-configs/[id]"
```

---

## Task 7: Update `POST /journals` to accept `voucherTypeConfigId`

**Files:**
- Modify: `app/api/organizations/[orgSlug]/journals/route.ts`

- [ ] **Step 1: Update the POST handler**

In `app/api/organizations/[orgSlug]/journals/route.ts`, find the destructuring line in the `POST` handler:

```typescript
  const { voucherType, date, description, narration, reference, lines = [] } = body
```

Replace with:

```typescript
  const { voucherType, date, description, narration, reference, lines = [], voucherTypeConfigId } = body
```

Then find the `nextVoucherNumber` call:

```typescript
  const voucherNumber = await nextVoucherNumber(ctx.company.id, voucherType as VoucherType)
```

Replace with:

```typescript
  // Resolve config prefix if voucherTypeConfigId is supplied
  let configPrefix: string | undefined
  let resolvedConfigId: string | undefined
  if (voucherTypeConfigId) {
    const vtc = await prisma.voucherTypeConfig.findFirst({
      where: { id: voucherTypeConfigId, companyId: ctx.company.id, deletedAt: null },
      select: { prefix: true, id: true, baseVoucherType: true },
    })
    if (!vtc) return NextResponse.json({ error: "Invalid voucherTypeConfigId." }, { status: 400 })
    configPrefix    = vtc.prefix
    resolvedConfigId = vtc.id
  }
  const voucherNumber = await nextVoucherNumber(
    ctx.company.id,
    voucherType as VoucherType,
    configPrefix ? { prefix: configPrefix, voucherTypeConfigId: resolvedConfigId } : undefined,
  )
```

Then find the `prisma.journalEntry.create` call's `data` object and add `voucherTypeConfigId` to it:

```typescript
      voucherTypeConfigId: resolvedConfigId ?? null,
```

(Add this after `createdById: ctx.userId,`)

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "journals/route"
```

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add "app/api/organizations/[orgSlug]/journals/route.ts"
git commit -m "feat(api): POST /journals accepts optional voucherTypeConfigId"
```

---

## Task 8: Wire seed into org creation

**Files:**
- Modify: `app/api/organizations/route.ts`

- [ ] **Step 1: Add the import**

In `app/api/organizations/route.ts`, add this import near the top (after existing imports):

```typescript
import { seedCompanyVoucherTypes } from "@/lib/ledger/seed-voucher-types"
```

- [ ] **Step 2: Call the seed after company creation**

Find the place where a new `Company` is created in `app/api/organizations/route.ts`. After `prisma.company.create(...)` completes (where the company `id` is available), add:

```typescript
    // Seed system voucher type configs for this company
    await seedCompanyVoucherTypes(company.id, workspace.id)
```

(Replace `company` and `workspace` with whatever variable names hold those objects in the existing code. Read the current POST handler to find the correct variable names.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "organizations/route"
```

Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add "app/api/organizations/route.ts"
git commit -m "feat(api): seed system voucher type configs on org creation"
```

---

## Task 9: Settings page — server component

**Files:**
- Create: `app/[orgSlug]/settings/voucher-types/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/[orgSlug]/settings/voucher-types/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VoucherTypesClient } from "./voucher-types-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function VoucherTypesPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const configs = await prisma.voucherTypeConfig.findMany({
    where:   { companyId: ctx.company.id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  })

  return <VoucherTypesClient orgSlug={orgSlug} configs={configs as any} />
}
```

- [ ] **Step 2: Commit (stub — client component added next)**

```bash
git add "app/[orgSlug]/settings/voucher-types/page.tsx"
git commit -m "feat(settings): voucher-types server page stub"
```

---

## Task 10: Settings page — client table and drawer

**Files:**
- Create: `app/[orgSlug]/settings/voucher-types/voucher-types-client.tsx`
- Create: `app/[orgSlug]/settings/voucher-types/voucher-type-drawer.tsx`

- [ ] **Step 1: Create `voucher-types-client.tsx`**

```typescript
// app/[orgSlug]/settings/voucher-types/voucher-types-client.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Plus, Pencil, Trash2 } from "lucide-react"
import { AppShell, type OrgItem } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { VoucherTypeDrawer } from "./voucher-type-drawer"
import type { VoucherFormConfig } from "@/lib/ledger/voucher-form-config"

export type ConfigRow = {
  id: string; key: string; label: string; prefix: string
  isSystem: boolean; isActive: boolean; sortOrder: number
  baseVoucherType: string; formConfig: VoucherFormConfig
}

export function VoucherTypesClient({
  orgSlug, configs: initial,
}: {
  orgSlug: string
  configs: ConfigRow[]
}) {
  const router               = useRouter()
  const [configs, setConfigs] = useState<ConfigRow[]>(initial)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing]       = useState<ConfigRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConfigRow | null>(null)
  const [deleting, setDeleting]         = useState(false)

  async function toggleActive(config: ConfigRow) {
    const res = await fetch(`/api/organizations/${orgSlug}/voucher-type-configs/${config.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive: !config.isActive }),
    })
    if (res.ok) {
      setConfigs((prev) =>
        prev.map((c) => c.id === config.id ? { ...c, isActive: !config.isActive } : c),
      )
    } else {
      toast.error("Failed to update status.")
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/organizations/${orgSlug}/voucher-type-configs/${deleteTarget.id}`, {
      method: "DELETE",
    })
    setDeleting(false)
    if (res.ok) {
      setConfigs((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success("Voucher type deleted.")
    } else {
      const body = await res.json()
      toast.error(body.error ?? "Delete failed.")
    }
  }

  function openCreate() { setEditing(null); setDrawerOpen(true) }
  function openEdit(c: ConfigRow) { setEditing(c); setDrawerOpen(true) }

  function onSaved(updated: ConfigRow) {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id)
      if (idx === -1) return [...prev, updated]
      return prev.map((c) => c.id === updated.id ? updated : c)
    })
    setDrawerOpen(false)
    router.refresh()
  }

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <h1 className="text-lg font-semibold text-[#37322F]">Voucher Types</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="size-3.5" /> New voucher type
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Label</span>
            <span>Prefix</span>
            <span>Party</span>
            <span>Mode</span>
            <span>Active</span>
            <span className="w-20" />
          </div>

          {configs.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[#605A57]">
              No voucher types configured. Click "New voucher type" to add one.
            </p>
          )}

          {configs.map((config) => {
            const party = (config.formConfig as VoucherFormConfig)?.party
            const simplified = (config.formConfig as VoucherFormConfig)?.simplifiedMode
            return (
              <div
                key={config.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-3 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#37322F]">{config.label}</span>
                  {config.isSystem && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Lock className="size-2.5" /> system
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-xs text-[#605A57]">{config.prefix}</span>
                <span className="text-xs text-[#605A57] capitalize">
                  {party?.show ? party.type : "—"}
                </span>
                <span className="text-xs text-[#605A57]">
                  {simplified?.enabled ? "Simplified" : "Full"}
                </span>
                <Switch
                  checked={config.isActive}
                  onCheckedChange={() => toggleActive(config)}
                />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(config)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  {!config.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-[#605A57] hover:text-destructive"
                      onClick={() => setDeleteTarget(config)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <VoucherTypeDrawer
        orgSlug={orgSlug}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        config={editing}
        onSaved={onSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. It is blocked if any journal entries use this type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Create `voucher-type-drawer.tsx`**

```typescript
// app/[orgSlug]/settings/voucher-types/voucher-type-drawer.tsx
"use client"

import { useState, useEffect } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { labelToKey } from "@/lib/ledger/voucher-form-config"
import type { VoucherFormConfig } from "@/lib/ledger/voucher-form-config"
import type { ConfigRow } from "./voucher-types-client"

const ACCOUNT_SUBTYPES = [
  "BANK","CASH","ACCOUNTS_RECEIVABLE","ACCOUNTS_PAYABLE",
  "INVENTORY","OPERATING_REVENUE","OTHER_REVENUE",
  "OPERATING_EXPENSE","COST_OF_GOODS_SOLD","TAX_PAYABLE","RETAINED_EARNINGS",
]

type DefaultLine = NonNullable<VoucherFormConfig["defaultLines"]>[number]

function emptyLine(): DefaultLine {
  return { position: 0, label: "", direction: "DEBIT", accountSubtype: null, locked: false, amountEditable: true }
}

export function VoucherTypeDrawer({
  orgSlug, open, onOpenChange, config, onSaved,
}: {
  orgSlug:      string
  open:         boolean
  onOpenChange: (open: boolean) => void
  config:       ConfigRow | null
  onSaved:      (updated: ConfigRow) => void
}) {
  const isSystem  = config?.isSystem ?? false
  const isEditing = !!config

  const [label,          setLabel]          = useState("")
  const [keyVal,         setKeyVal]         = useState("")
  const [prefix,         setPrefix]         = useState("")
  const [partyShow,      setPartyShow]      = useState(false)
  const [partyType,      setPartyType]      = useState<"customer"|"vendor"|"both"|"none">("none")
  const [partyLabel,     setPartyLabel]     = useState("")
  const [simplEnabled,   setSimplEnabled]   = useState(false)
  const [simplLabel,     setSimplLabel]     = useState("")
  const [defaultLines,   setDefaultLines]   = useState<DefaultLine[]>([])
  const [saving,         setSaving]         = useState(false)

  // Populate from config when opening in edit mode
  useEffect(() => {
    if (!open) return
    if (config) {
      const fc = config.formConfig as VoucherFormConfig
      setLabel(config.label)
      setKeyVal(config.key)
      setPrefix(config.prefix)
      setPartyShow(fc.party?.show ?? false)
      setPartyType(fc.party?.type ?? "none")
      setPartyLabel(fc.party?.label ?? "")
      setSimplEnabled(fc.simplifiedMode?.enabled ?? false)
      setSimplLabel(fc.simplifiedMode?.amountLabel ?? "")
      setDefaultLines((fc.defaultLines ?? []).map((l, i) => ({ ...l, position: i })))
    } else {
      setLabel(""); setKeyVal(""); setPrefix("")
      setPartyShow(false); setPartyType("none"); setPartyLabel("")
      setSimplEnabled(false); setSimplLabel(""); setDefaultLines([])
    }
  }, [open, config])

  function moveLine(idx: number, dir: -1 | 1) {
    setDefaultLines((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next.map((l, i) => ({ ...l, position: i }))
    })
  }

  function updateLine(idx: number, patch: Partial<DefaultLine>) {
    setDefaultLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function addLine() {
    setDefaultLines((prev) => [...prev, { ...emptyLine(), position: prev.length }])
  }

  function removeLine(idx: number) {
    setDefaultLines((prev) =>
      prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, position: i })),
    )
  }

  async function handleSave() {
    if (!label.trim() || !prefix.trim()) { toast.error("Label and prefix are required."); return }

    const formConfig: VoucherFormConfig = {
      party: {
        show: partyShow, label: partyLabel, type: partyType, required: false,
      },
      defaultLines,
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: simplEnabled, amountLabel: simplLabel },
    }

    setSaving(true)
    const url    = isEditing
      ? `/api/organizations/${orgSlug}/voucher-type-configs/${config!.id}`
      : `/api/organizations/${orgSlug}/voucher-type-configs`
    const method = isEditing ? "PATCH" : "POST"

    const body = isSystem
      ? { formConfig, isActive: config?.isActive, sortOrder: config?.sortOrder }
      : { label: label.trim(), key: keyVal.trim() || undefined, prefix: prefix.trim(), formConfig }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSaving(false)

    if (res.ok) {
      const saved = await res.json()
      toast.success(isEditing ? "Voucher type updated." : "Voucher type created.")
      onSaved(saved)
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Save failed.")
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="w-[480px] max-w-full flex flex-col">
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? `Edit — ${config?.label}` : "New Voucher Type"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Basic info */}
          {!isSystem && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input value={label} onChange={(e) => {
                  setLabel(e.target.value)
                  if (!isEditing) setKeyVal(labelToKey(e.target.value))
                }} placeholder="e.g. Expense Claim" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Key (auto)</Label>
                  <Input value={keyVal} onChange={(e) => setKeyVal(e.target.value.toUpperCase())} placeholder="EXPENSE_CLAIM" />
                </div>
                <div className="space-y-1.5">
                  <Label>Prefix * (max 5)</Label>
                  <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase().slice(0, 5))} placeholder="EC" />
                </div>
              </div>
            </div>
          )}

          {/* Party */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Party selector</Label>
              <Switch checked={partyShow} onCheckedChange={setPartyShow} />
            </div>
            {partyShow && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Party type</Label>
                  <Select value={partyType} onValueChange={(v) => setPartyType(v as typeof partyType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Party label</Label>
                  <Input value={partyLabel} onChange={(e) => setPartyLabel(e.target.value)} placeholder="Paid to" />
                </div>
              </div>
            )}
          </div>

          {/* Simplified mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Simplified mode (single amount)</Label>
              <Switch checked={simplEnabled} onCheckedChange={setSimplEnabled} />
            </div>
            {simplEnabled && (
              <div className="space-y-1.5">
                <Label>Amount label</Label>
                <Input value={simplLabel} onChange={(e) => setSimplLabel(e.target.value)} placeholder="Amount paid" />
              </div>
            )}
          </div>

          {/* Default lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Default lines</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLine} className="gap-1 text-xs">
                <Plus className="size-3" /> Add line
              </Button>
            </div>
            {defaultLines.length === 0 && (
              <p className="text-xs text-[#605A57]">No default lines — users start from scratch each time.</p>
            )}
            {defaultLines.map((line, idx) => (
              <div key={idx} className="rounded border border-[rgba(55,50,47,0.12)] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#605A57] w-4">{idx + 1}</span>
                  <Input
                    className="h-7 text-xs flex-1"
                    value={line.label}
                    onChange={(e) => updateLine(idx, { label: e.target.value })}
                    placeholder="Line label"
                  />
                  <Select value={line.direction} onValueChange={(v) => updateLine(idx, { direction: v as "DEBIT" | "CREDIT" })}>
                    <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBIT">Dr</SelectItem>
                      <SelectItem value="CREDIT">Cr</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => moveLine(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => moveLine(idx, 1)} disabled={idx === defaultLines.length - 1}>
                    <ArrowDown className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6 hover:text-destructive" onClick={() => removeLine(idx)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <Select value={line.accountSubtype ?? ""} onValueChange={(v) => updateLine(idx, { accountSubtype: v || null })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Filter by account subtype (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any subtype</SelectItem>
                    {ACCOUNT_SUBTYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Switch
                      checked={line.locked}
                      onCheckedChange={(v) => updateLine(idx, { locked: v })}
                      className="scale-75"
                    />
                    Locked (read-only)
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2 pt-0">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "voucher-types"
```

Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add "app/[orgSlug]/settings/voucher-types/"
git commit -m "feat(settings): voucher types management page — table + create/edit drawer"
```

---

## Task 11: Dynamic voucher form — `simplified-mode-input.tsx`

This is the single-amount UX component. Extracted separately so `dynamic-voucher-form.tsx` can import it cleanly.

**Files:**
- Create: `app/[orgSlug]/journals/new/simplified-mode-input.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/[orgSlug]/journals/new/simplified-mode-input.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Account = { id: string; code: string; name: string; subtype: string | null }

interface Props {
  amountLabel:       string
  accounts:          Account[]
  amount:            string
  debitAccountId:    string
  creditAccountId:   string
  onAmountChange:    (v: string) => void
  onDebitAccount:    (id: string) => void
  onCreditAccount:   (id: string) => void
  allowedDebitSubtypes?:  string[] | null
  allowedCreditSubtypes?: string[] | null
}

export function SimplifiedModeInput({
  amountLabel, accounts, amount, debitAccountId, creditAccountId,
  onAmountChange, onDebitAccount, onCreditAccount,
  allowedDebitSubtypes, allowedCreditSubtypes,
}: Props) {
  const debitAccounts  = allowedDebitSubtypes?.length
    ? accounts.filter((a) => a.subtype && allowedDebitSubtypes.includes(a.subtype))
    : accounts

  const creditAccounts = allowedCreditSubtypes?.length
    ? accounts.filter((a) => a.subtype && allowedCreditSubtypes.includes(a.subtype))
    : accounts

  function opts(list: Account[]) {
    return list.map((a) => ({ value: a.id, label: `${a.code} – ${a.name}` }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{amountLabel || "Amount"} *</Label>
        <Input
          type="number" min="0.01" step="0.01"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="font-mono text-right"
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>From (Credit) *</Label>
          <Select value={creditAccountId} onValueChange={onCreditAccount} required>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {opts(creditAccounts).map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>To (Debit) *</Label>
          <Select value={debitAccountId} onValueChange={onDebitAccount} required>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent className="max-h-64">
              {opts(debitAccounts).map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/[orgSlug]/journals/new/simplified-mode-input.tsx"
git commit -m "feat(journals): SimplifiedModeInput component for single-amount voucher entry"
```

---

## Task 12: Dynamic voucher form — `dynamic-voucher-form.tsx`

This replaces `journal-form.tsx` as the main form component. It reads the selected `VoucherTypeConfig` and renders the form accordingly.

**Files:**
- Create: `app/[orgSlug]/journals/new/dynamic-voucher-form.tsx`
- Modify: `app/[orgSlug]/journals/new/page.tsx` (swap import + data fetch)

- [ ] **Step 1: Create `dynamic-voucher-form.tsx`**

```typescript
// app/[orgSlug]/journals/new/dynamic-voucher-form.tsx
"use client"

import { useState, useId, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Trash2, ChevronDown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { SimplifiedModeInput } from "./simplified-mode-input"
import type { VoucherFormConfig } from "@/lib/ledger/voucher-form-config"

type Account = { id: string; code: string; name: string; subtype: string | null }

type VoucherTypeConfig = {
  id: string; key: string; label: string; prefix: string; isSystem: boolean
  baseVoucherType: string; formConfig: VoucherFormConfig
}

type Line = {
  key:         string
  accountId:   string
  direction:   "DEBIT" | "CREDIT"
  amount:      string
  description: string
  locked:      boolean
  lineLabel?:  string
}

function emptyLine(key: string, direction: "DEBIT" | "CREDIT" = "DEBIT"): Line {
  return { key, accountId: "", direction, amount: "", description: "", locked: false }
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildDefaultLines(uid: string, config: VoucherTypeConfig): Line[] {
  const defaults = config.formConfig?.defaultLines ?? []
  if (defaults.length === 0) {
    return [emptyLine(`${uid}-0`), emptyLine(`${uid}-1`, "CREDIT")]
  }
  return defaults
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((dl, i) => ({
      key:         `${uid}-${i}`,
      accountId:   dl.accountId ?? "",
      direction:   dl.direction,
      amount:      "",
      description: "",
      locked:      dl.locked,
      lineLabel:   dl.label,
    }))
}

export function DynamicVoucherForm({
  orgSlug, accounts, voucherTypeConfigs,
}: {
  orgSlug:            string
  accounts:           Account[]
  voucherTypeConfigs: VoucherTypeConfig[]
}) {
  const router = useRouter()
  const uid    = useId()

  const defaultConfig = voucherTypeConfigs[0]

  const [selectedConfigId, setSelectedConfigId]   = useState(defaultConfig?.id ?? "")
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState("")
  const [narration,   setNarration]   = useState("")
  const [reference,   setReference]   = useState("")
  const [partyId,     setPartyId]     = useState("")
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})
  const [lines,       setLines]       = useState<Line[]>(() =>
    defaultConfig ? buildDefaultLines(uid, defaultConfig) : [emptyLine(`${uid}-0`), emptyLine(`${uid}-1`, "CREDIT")],
  )
  // Simplified mode state
  const [simplAmount,  setSimplAmount]  = useState("")
  const [simplDebitId, setSimplDebitId] = useState("")
  const [simplCreditId,setSimplCreditId]= useState("")

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  const config     = voucherTypeConfigs.find((c) => c.id === selectedConfigId) ?? defaultConfig
  const formConfig = config?.formConfig as VoucherFormConfig | undefined
  const isSimplified = formConfig?.simplifiedMode?.enabled ?? false

  // Reset lines when config changes
  useEffect(() => {
    if (!config) return
    setLines(buildDefaultLines(uid, config))
    setExtraFields({})
    setPartyId("")
    setSimplAmount(""); setSimplDebitId(""); setSimplCreditId("")
  }, [selectedConfigId]) // eslint-disable-line react-hooks/exhaustive-deps

  // In simplified mode build lines from the two account pickers
  function buildSimplifiedLines(): Line[] {
    const amount = parseFloat(simplAmount) || 0
    return [
      { key: "simpl-dr", accountId: simplDebitId,  direction: "DEBIT",  amount: String(amount), description: "", locked: false },
      { key: "simpl-cr", accountId: simplCreditId, direction: "CREDIT", amount: String(amount), description: "", locked: false },
    ]
  }

  const effectiveLines = isSimplified ? buildSimplifiedLines() : lines

  const totalDebit  = effectiveLines.filter((l) => l.direction === "DEBIT").reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const totalCredit = effectiveLines.filter((l) => l.direction === "CREDIT").reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0

  function addLine() {
    setLines((prev) => [...prev, emptyLine(`${uid}-${Date.now()}`)])
  }

  function removeLine(key: string) {
    setLines((prev) => {
      const filtered = prev.filter((l) => l.key !== key)
      const minLines = formConfig?.lineConstraints?.minLines ?? 2
      if (filtered.length < minLines) return prev
      return filtered
    })
  }

  function updateLine(key: string, field: keyof Line, value: string) {
    setLines((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l))
  }

  // Filtered accounts by allowed subtype for free (non-locked) lines
  function accountsForLine(line: Line): Account[] {
    const constraints = formConfig?.lineConstraints
    if (!constraints) return accounts
    const allowed = line.direction === "DEBIT"
      ? constraints.allowedDebitSubtypes
      : constraints.allowedCreditSubtypes
    if (!allowed?.length) return accounts
    return accounts.filter((a) => a.subtype && allowed.includes(a.subtype))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!balanced) { setError("Debits must equal credits before saving."); return }

    const minLines = formConfig?.lineConstraints?.minLines ?? 2
    const maxLines = formConfig?.lineConstraints?.maxLines
    if (effectiveLines.length < minLines) { setError(`At least ${minLines} lines required.`); return }
    if (maxLines && effectiveLines.length > maxLines) { setError(`At most ${maxLines} lines allowed.`); return }

    setSaving(true)
    setError(null)

    const payload = {
      voucherType:        config?.baseVoucherType ?? "JOURNAL_ENTRY",
      voucherTypeConfigId: config?.id,
      date, description, narration, reference,
      lines: effectiveLines.map((l) => ({
        accountId:   l.accountId,
        direction:   l.direction,
        amount:      parseFloat(l.amount),
        description: l.description,
      })),
    }

    const res = await fetch(`/api/organizations/${orgSlug}/journals`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/${orgSlug}/journals/${data.id}`)
    } else {
      const body = await res.json()
      setError(body.error ?? "Failed to save journal entry.")
      setSaving(false)
    }
  }

  // Quick-create: redirect to settings to configure new type
  function handleNewType() {
    router.push(`/${orgSlug}/settings/voucher-types`)
  }

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <Link href={`/${orgSlug}/journals`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Journals
        </Link>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <h1 className="text-lg font-semibold text-[#37322F]">New journal entry</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Header fields */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
            <p className="font-semibold text-[#37322F]">Entry details</p>

            <div className="grid grid-cols-3 gap-4">
              {/* Voucher type selector */}
              <div className="space-y-1.5">
                <Label>Voucher type *</Label>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {voucherTypeConfigs.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <button
                      type="button"
                      className="relative flex w-full cursor-pointer select-none items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-[#605A57] hover:bg-accent"
                      onClick={handleNewType}
                    >
                      <Plus className="size-3" /> New voucher type…
                    </button>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice #, cheque no., etc." />
              </div>
            </div>

            {/* Party selector */}
            {formConfig?.party?.show && (
              <div className="space-y-1.5">
                <Label>{formConfig.party.label || "Party"}{formConfig.party.required ? " *" : ""}</Label>
                <Input
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  placeholder={`${formConfig.party.label} name / ID`}
                  required={formConfig.party.required}
                />
              </div>
            )}

            {/* Extra fields */}
            {formConfig?.extraFields?.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}{field.required ? " *" : ""}</Label>
                <Input
                  type={field.fieldType === "date" ? "date" : field.fieldType === "number" ? "number" : "text"}
                  value={extraFields[field.key] ?? ""}
                  onChange={(e) => setExtraFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={field.required}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narration">Narration</Label>
              <Textarea id="narration" value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>

          {/* Simplified mode */}
          {isSimplified ? (
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
              <SimplifiedModeInput
                amountLabel={formConfig?.simplifiedMode?.amountLabel ?? "Amount"}
                accounts={accounts}
                amount={simplAmount}
                debitAccountId={simplDebitId}
                creditAccountId={simplCreditId}
                onAmountChange={setSimplAmount}
                onDebitAccount={setSimplDebitId}
                onCreditAccount={setSimplCreditId}
                allowedDebitSubtypes={formConfig?.lineConstraints?.allowedDebitSubtypes}
                allowedCreditSubtypes={formConfig?.lineConstraints?.allowedCreditSubtypes}
              />
            </div>
          ) : (
            /* Full journal lines grid */
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
              <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
                <p className="text-sm font-semibold text-[#37322F]">Journal lines</p>
              </div>

              <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
                <span>Account *</span>
                <span>Direction *</span>
                <span>Amount *</span>
                <span>Description</span>
                <span className="w-7" />
              </div>

              {lines.map((line, idx) => {
                const lineAccounts = accountsForLine(line)
                return (
                  <div key={line.key} className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2">
                    <div className="space-y-0.5">
                      {line.lineLabel && (
                        <span className="text-[10px] text-[#605A57] font-medium">{line.lineLabel}</span>
                      )}
                      <Select value={line.accountId} onValueChange={(v) => updateLine(line.key, "accountId", v)} required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {lineAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.code} – {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Select
                        value={line.direction}
                        onValueChange={(v) => !line.locked && updateLine(line.key, "direction", v)}
                        disabled={line.locked}
                      >
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBIT">Dr</SelectItem>
                          <SelectItem value="CREDIT">Cr</SelectItem>
                        </SelectContent>
                      </Select>
                      {line.locked && <Lock className="size-3 text-[#605A57]" />}
                    </div>

                    <Input
                      className="h-8 text-right font-mono text-sm"
                      type="number" min="0.01" step="0.01"
                      value={line.amount}
                      onChange={(e) => updateLine(line.key, "amount", e.target.value)}
                      placeholder="0.00"
                      required
                    />

                    <Input
                      className="h-8 text-sm"
                      value={line.description}
                      onChange={(e) => updateLine(line.key, "description", e.target.value)}
                      placeholder="Optional"
                    />

                    <Button
                      type="button" variant="ghost" size="icon"
                      className="size-7 text-[#605A57] hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                      disabled={line.locked || lines.length <= (formConfig?.lineConstraints?.minLines ?? 2)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )
              })}

              {/* Totals */}
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr_auto] items-center gap-3 border-t border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
                <span className="text-xs font-semibold text-[#37322F]">Total</span>
                <span />
                <div className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#605A57]">Dr</span>
                    <span className="font-mono font-medium text-[#37322F]">{fmt(totalDebit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#605A57]">Cr</span>
                    <span className="font-mono font-medium text-[#37322F]">{fmt(totalCredit)}</span>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  {totalDebit > 0 && (
                    <span className={`text-xs font-medium ${balanced ? "text-green-600" : "text-destructive"}`}>
                      {balanced ? "✓ Balanced" : `Out of balance by ${fmt(Math.abs(totalDebit - totalCredit))}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Add line — hidden when maxLines reached */}
              {(!formConfig?.lineConstraints?.maxLines || lines.length < formConfig.lineConstraints.maxLines) && (
                <div className="px-4 py-2 border-t border-[rgba(55,50,47,0.06)]">
                  <Button type="button" variant="ghost" size="sm" className="text-[#605A57] gap-1.5" onClick={addLine}>
                    <Plus className="size-3.5" /> Add line
                  </Button>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || !balanced}>
              {saving ? "Saving…" : "Save as draft"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `app/[orgSlug]/journals/new/page.tsx`**

Replace the entire file with:

```typescript
// app/[orgSlug]/journals/new/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { DynamicVoucherForm } from "./dynamic-voucher-form"

export default async function NewJournalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [accounts, voucherTypeConfigs] = await Promise.all([
    prisma.chartAccount.findMany({
      where:   { companyId: ctx.company.id, isPosting: true, isActive: true, deletedAt: null },
      orderBy: [{ type: "asc" }, { code: "asc" }],
      select:  { id: true, code: true, name: true, type: true, subtype: true },
    }),
    prisma.voucherTypeConfig.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ])

  return (
    <DynamicVoucherForm
      orgSlug={orgSlug}
      accounts={accounts as any}
      voucherTypeConfigs={voucherTypeConfigs as any}
    />
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "journals/new"
```

Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add "app/[orgSlug]/journals/new/dynamic-voucher-form.tsx" "app/[orgSlug]/journals/new/page.tsx"
git commit -m "feat(journals): replace journal-form with dynamic-voucher-form driven by VoucherTypeConfig"
```

---

## Task 13: Update journals list to show config label

**Files:**
- Modify: `app/[orgSlug]/journals/journals-client.tsx`
- Modify: `app/[orgSlug]/journals/page.tsx`

- [ ] **Step 1: Update the `Entry` type in `journals-client.tsx`**

Find:
```typescript
type Entry = {
  id: string; voucherNumber: string; voucherType: string; date: string
  status: string; description: string | null; totalDebit: string; totalCredit: string
  isReversal: boolean; postedAt: string | null; createdAt: string
  _count: { lines: number }
}
```

Replace with:
```typescript
type Entry = {
  id: string; voucherNumber: string; voucherType: string; date: string
  status: string; description: string | null; totalDebit: string; totalCredit: string
  isReversal: boolean; postedAt: string | null; createdAt: string
  _count: { lines: number }
  voucherTypeConfig: { id: string; label: string } | null
}
```

- [ ] **Step 2: Update the voucher type display in the row rendering**

In `journals-client.tsx`, find the table row where `voucherType` is displayed as text. It likely renders something like `entry.voucherType` or `entry.voucherType.replace(/_/g, " ")`. Replace that span with:

```typescript
{entry.voucherTypeConfig?.label ?? entry.voucherType.replace(/_/g, " ")}
```

This uses the config label when available and falls back to the raw enum for entries created before configs existed.

- [ ] **Step 3: Update the voucherType filter dropdown**

Find the hardcoded `VOUCHER_TYPES` array in `journals-client.tsx`:
```typescript
const VOUCHER_TYPES = [
  "JOURNAL_ENTRY","PAYMENT_RECEIPT","PAYMENT_DISBURSEMENT",
  "SALES_INVOICE","PURCHASE_BILL","CREDIT_NOTE","DEBIT_NOTE","CONTRA","OPENING_BALANCE",
]
```

Add a `configTypes` prop to `JournalsClient` and use it for the filter dropdown. Update the component props type:

```typescript
export function JournalsClient({
  orgSlug, entries, page, pages, total,
  statusFilter, voucherTypeFilter, configTypes,
}: {
  orgSlug: string
  entries: Entry[]
  page: number; pages: number; total: number
  statusFilter?: string
  voucherTypeFilter?: string
  configTypes: Array<{ id: string; label: string; key: string }>
}) {
```

Then replace the `VOUCHER_TYPES`-based filter dropdown with one built from `configTypes`:

```typescript
// In the filter UI (wherever voucherType filter Select is rendered):
<Select value={voucherTypeFilter ?? ""} onValueChange={(v) => applyFilter("voucherType", v || undefined)}>
  <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="">All types</SelectItem>
    {configTypes.map((t) => (
      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 4: Update `app/[orgSlug]/journals/page.tsx`** to pass config types and include `voucherTypeConfig` in the select

Read `app/[orgSlug]/journals/page.tsx` first, then add `voucherTypeConfig: { select: { id: true, label: true } }` to the `findMany` select clause on `JournalEntry`, and fetch `voucherTypeConfigs` from the DB to pass as `configTypes`.

The `findMany` select should include:
```typescript
voucherTypeConfig: { select: { id: true, label: true } },
```

And add a parallel fetch:
```typescript
const [entries, total, configTypes] = await Promise.all([
  prisma.journalEntry.findMany({ ... select: { ..., voucherTypeConfig: { select: { id: true, label: true } } } }),
  prisma.journalEntry.count({ where }),
  prisma.voucherTypeConfig.findMany({
    where: { companyId: ctx.company.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true, key: true },
  }),
])
```

Pass `configTypes` into `<JournalsClient ... configTypes={configTypes} />`.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep "journals"
```

Expected: No errors specific to your changes.

- [ ] **Step 6: Commit**

```bash
git add "app/[orgSlug]/journals/journals-client.tsx" "app/[orgSlug]/journals/page.tsx"
git commit -m "feat(journals): show VoucherTypeConfig label in list; dynamic filter from config list"
```

---

## Task 14: Add Voucher Types link to the settings navigation

**Files:**
- Modify: `app/[orgSlug]/settings/company/company-settings-client.tsx` (or wherever the settings sidebar/nav lives)

- [ ] **Step 1: Find the settings nav**

Read `app/[orgSlug]/settings/company/company-settings-client.tsx` to identify where settings navigation links are listed (look for `/settings/company` or `/settings/users-roles` links). The nav is likely in a sidebar or a `<nav>` list.

- [ ] **Step 2: Add the Voucher Types link**

In the same nav list where other settings links appear, add:

```typescript
<Link
  href={`/${orgSlug}/settings/voucher-types`}
  className={/* same className as existing nav items */}
>
  Voucher Types
</Link>
```

Match the exact className pattern used by the other links so the styling is consistent.

- [ ] **Step 3: Commit**

```bash
git add "app/[orgSlug]/settings/company/company-settings-client.tsx"
git commit -m "feat(settings): add Voucher Types link to settings navigation"
```

---

## Task 15: End-to-end smoke test

No automated test needed (the logic lives in pure functions already tested in Task 1 of Feature #1). Do a manual walkthrough.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify the settings page**

Navigate to `/{orgSlug}/settings/voucher-types`. Confirm:
- 11 system rows appear (seeded by `seedCompanyVoucherTypes`)
- Each row shows label, prefix, party type, simplified mode indicator, active toggle
- System rows show a lock badge
- Clicking "New voucher type" opens the drawer
- Creating a custom type appends it to the list
- Editing a system row only allows formConfig/isActive/sortOrder changes (label/prefix fields hidden)

- [ ] **Step 3: Verify the journal form**

Navigate to `/{orgSlug}/journals/new`. Confirm:
- Type dropdown populated from DB (not hardcoded)
- Selecting "Receipt Voucher" shows the party field ("Received from") and simplified mode (single amount)
- Selecting "Contra Entry" shows simplified mode with "Transfer amount" label; only BANK/CASH accounts in dropdowns
- Selecting "Journal Entry" shows full lines grid, no party, no simplified mode
- Selecting "Payment Voucher" shows 2 default lines pre-populated with subtype hints
- "New voucher type…" footer in dropdown navigates to settings

- [ ] **Step 4: Verify the journals list**

Navigate to `/{orgSlug}/journals`. Confirm:
- Type column shows config label (e.g., "Receipt Voucher") not raw enum
- Type filter dropdown populated from DB
- Entries created before configs show fallback (raw enum with underscores replaced by spaces)

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: custom voucher types end-to-end — VoucherTypeConfig complete"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] VoucherTypeConfig model + FK on JournalEntry → Task 1
- [x] `formConfig` JSON schema + Zod → Task 2
- [x] Per-company seeding of 11 system types → Task 3
- [x] `nextVoucherNumber` prefix override → Task 4
- [x] GET + POST `/voucher-type-configs` → Task 5
- [x] GET + PATCH + DELETE `/voucher-type-configs/[id]` → Task 6
- [x] POST `/journals` accepts `voucherTypeConfigId` → Task 7
- [x] Wire seed on org creation → Task 8
- [x] Settings server page → Task 9
- [x] Settings client table + drawer → Task 10
- [x] `SimplifiedModeInput` component → Task 11
- [x] `DynamicVoucherForm` + page update → Task 12
- [x] Journals list shows config label → Task 13
- [x] Settings nav link → Task 14
- [x] Partial unique index for global key uniqueness (NULL-safe) → Task 1 migration SQL

**Type consistency:**
- `VoucherFormConfig` interface defined in Task 2, imported in Tasks 3, 10, 11, 12
- `ConfigRow` type defined in `voucher-types-client.tsx`, imported in `voucher-type-drawer.tsx`
- `Account` type with `subtype` field — Task 12's `page.tsx` fetches `subtype` in select
- `labelToKey` exported from Task 2, imported in Task 10 drawer
- `seedCompanyVoucherTypes(companyId, workspaceId?)` — Task 3 definition matches Task 8 call site
- `nextVoucherNumber(companyId, voucherType, opts?)` — Task 4 definition matches Task 7 call site
