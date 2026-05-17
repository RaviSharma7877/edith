# Voucher-Based Data Entry — Design Spec
**Date:** 2026-05-16  
**Feature:** Missing Functionalities Report #2 — Custom Voucher Types  
**Status:** Approved, ready for implementation

---

## Overview

Introduce a `VoucherTypeConfig` table as the canonical type registry for all accounting vouchers. Every entry in `JournalEntry` links to a config row that drives: form layout, default line pre-population, account subtype filtering, party selector visibility, extra header fields, and simplified single-amount mode.

All 11 existing system voucher types (JOURNAL_ENTRY, PAYMENT_RECEIPT, etc.) are seeded as config rows with `isSystem: true`. Company admins and accountants can create unlimited custom types, manage them in a settings page, and quick-create them inline from the voucher form.

---

## Approach

**Approach B — Config table + `voucherTypeConfigId` FK on JournalEntry.**

The `VoucherTypeConfig` table is the single source of truth for type metadata. The existing Prisma `VoucherType` enum is retained for backward compatibility. Custom types map to `JOURNAL_ENTRY` in the enum; all types are distinguished by `voucherTypeConfigId` at the application layer.

---

## 1. Data Model

### New table: `voucher_type_configs`

```prisma
model VoucherTypeConfig {
  id              String      @id @default(cuid())
  companyId       String?     // null = global template; set = company-scoped copy
  workspaceId     String?
  key             String      // "PAYMENT_RECEIPT", "CUST_EXPENSE_CLAIM"
  label           String      // "Payment Voucher", "Expense Claim"
  prefix          String      // "PV", "EC" — max 5 chars
  isSystem        Boolean     @default(false)  // system rows cannot be deleted
  isActive        Boolean     @default(true)
  sortOrder       Int         @default(100)
  baseVoucherType VoucherType // custom types always map to JOURNAL_ENTRY
  formConfig      Json        // see Form Config Schema section
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  company       Company?        @relation(fields: [companyId], references: [id])
  journalEntries JournalEntry[]

  @@unique([companyId, key])
  @@index([companyId, isActive, sortOrder])
  @@map("voucher_type_configs")
}
```

### Change to `JournalEntry`

Add one nullable FK column:

```prisma
voucherTypeConfigId  String?
voucherTypeConfig    VoucherTypeConfig? @relation(fields: [voucherTypeConfigId], references: [id])
```

Existing entries without a config row continue working. All new entries populate `voucherTypeConfigId`.

---

## 2. Form Config JSON Schema

The `formConfig` column on `VoucherTypeConfig` is a JSON blob with the following TypeScript shape (stored in `lib/ledger/voucher-form-config.ts` as the canonical type):

```ts
interface VoucherFormConfig {
  party?: {
    show: boolean
    label: string          // "Paid to", "Received from", "Customer"
    type: "customer" | "vendor" | "both" | "none"
    required: boolean
  }

  extraFields?: Array<{
    key: string            // "chequeNumber", "dueDate", "poReference"
    label: string
    fieldType: "text" | "date" | "number"
    required: boolean
  }>

  defaultLines?: Array<{
    position: number       // 0-based render order
    label: string          // "Bank Account", "Expense Account"
    direction: "DEBIT" | "CREDIT"
    accountSubtype?: string     // pre-filter the account selector
    accountId?: string          // hard-pin a specific account
    locked: boolean             // true = user cannot change account or direction
    amountEditable: boolean
  }>

  lineConstraints?: {
    allowedDebitSubtypes?: string[]   // null/absent = allow all
    allowedCreditSubtypes?: string[]
    minLines: number                  // default 2
    maxLines?: number                 // absent = unlimited
  }

  simplifiedMode?: {
    enabled: boolean
    amountLabel: string   // "Amount paid", "Amount received", "Transfer amount"
    // Engine splits into debit/credit using defaultLines[0] and defaultLines[1]
  }
}
```

### Concrete examples

**PAYMENT_DISBURSEMENT**
```json
{
  "party": { "show": true, "label": "Paid to", "type": "vendor", "required": false },
  "extraFields": [
    { "key": "chequeNumber", "label": "Cheque / UTR no.", "fieldType": "text", "required": false }
  ],
  "defaultLines": [
    { "position": 0, "label": "Bank / Cash account", "direction": "CREDIT",
      "accountSubtype": "BANK", "locked": false, "amountEditable": true },
    { "position": 1, "label": "Expense / Payable account", "direction": "DEBIT",
      "accountSubtype": null, "locked": false, "amountEditable": true }
  ],
  "lineConstraints": { "minLines": 2 },
  "simplifiedMode": { "enabled": true, "amountLabel": "Amount paid" }
}
```

**CONTRA**
```json
{
  "party": { "show": false, "label": "", "type": "none", "required": false },
  "defaultLines": [
    { "position": 0, "label": "From account", "direction": "CREDIT",
      "accountSubtype": "BANK", "locked": false, "amountEditable": true },
    { "position": 1, "label": "To account", "direction": "DEBIT",
      "accountSubtype": "CASH", "locked": false, "amountEditable": true }
  ],
  "lineConstraints": {
    "minLines": 2, "maxLines": 2,
    "allowedDebitSubtypes": ["CASH", "BANK"],
    "allowedCreditSubtypes": ["CASH", "BANK"]
  },
  "simplifiedMode": { "enabled": true, "amountLabel": "Transfer amount" }
}
```

**JOURNAL_ENTRY** (fully open)
```json
{
  "party": { "show": false, "label": "", "type": "none", "required": false },
  "defaultLines": [],
  "lineConstraints": { "minLines": 2 },
  "simplifiedMode": { "enabled": false, "amountLabel": "" }
}
```

---

## 3. API Layer

All routes under `/api/organizations/[orgSlug]/voucher-type-configs/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/voucher-type-configs` | List active types ordered by `sortOrder`. Query param `?includeInactive=true` for settings page. |
| POST | `/voucher-type-configs` | Create custom type. `key` auto-slugged from label if not provided. `baseVoucherType` defaults to `JOURNAL_ENTRY`. |
| GET | `/voucher-type-configs/[id]` | Fetch single config with full `formConfig`. |
| PATCH | `/voucher-type-configs/[id]` | Update. System rows: only `formConfig`, `isActive`, `sortOrder` mutable. |
| DELETE | `/voucher-type-configs/[id]` | Soft-delete. Blocked if `isSystem` or if any `JournalEntry` references this config. |

**Validation rules enforced at API layer:**
- `key` must match `^[A-Z][A-Z0-9_]{1,29}$`
- `prefix` max 5 chars, unique per company
- System rows: `key`, `label`, `prefix`, `baseVoucherType` are immutable via API
- DELETE blocked when `JournalEntry` count by `voucherTypeConfigId` > 0

**Updated `POST /journals`:**  
Accepts optional `voucherTypeConfigId`. When present:
1. Loads and validates the config belongs to the same company
2. Uses `config.baseVoucherType` as `voucherType` on `JournalEntry`
3. Sets `voucherTypeConfigId` on the created entry
4. Uses `config.prefix` for voucher number generation

**`nextVoucherNumber` update (`lib/ledger/ledger-service.ts`):**  
Accepts optional `{ prefix, voucherTypeConfigId }`. When `voucherTypeConfigId` is present, counts by `voucherTypeConfigId` instead of `voucherType` so custom types get independent sequences (e.g. `EC-2025-0001`).

---

## 4. UI Architecture

### 4a. Settings page — `/[orgSlug]/settings/voucher-types`

**Files:**
- `app/[orgSlug]/settings/voucher-types/page.tsx` — server component, fetches all configs including inactive
- `app/[orgSlug]/settings/voucher-types/voucher-types-client.tsx` — sortable table with active toggles, edit/delete actions
- `app/[orgSlug]/settings/voucher-types/voucher-type-drawer.tsx` — two-step create/edit drawer
- `app/[orgSlug]/settings/voucher-types/default-lines-builder.tsx` — drag-and-drop default line config

Table shows: label, prefix, party type, line constraints summary, active toggle. System rows show a lock badge — only `formConfig` is editable. "New voucher type" opens the drawer.

**Drawer steps:**
1. Name, key (auto-slugged), prefix, party type, simplified mode toggle
2. Default lines builder: add/remove/reorder lines, pick `accountSubtype`, set direction, locked flag, extra fields list

### 4b. Dynamic voucher form — `/[orgSlug]/journals/new`

**Files:**
- `app/[orgSlug]/journals/new/page.tsx` — server, fetches accounts + active `VoucherTypeConfig` list
- `app/[orgSlug]/journals/new/dynamic-voucher-form.tsx` — replaces `journal-form.tsx`
- `app/[orgSlug]/journals/new/simplified-mode-input.tsx` — single-amount UX component

**Form rendering logic (on type selection):**
```
config selected →
  show party selector    if party.show
  render extraFields     in header card
  render defaultLines    (locked lines: account name + direction read-only)
  filter account dropdowns on free lines to allowedSubtypes
  switch simplified/full mode based on simplifiedMode.enabled
  enforce minLines/maxLines on submit
```

In simplified mode, the user picks bank account, types one amount, picks the offset account. The form internally writes two `JournalLine` rows before submitting.

### 4c. Quick-create from type selector

The `<Select>` type dropdown gets a sticky footer item: `+ New voucher type`. Clicking opens a compact `<Dialog>` (not the full settings drawer) capturing: label, prefix, party type. Calls `POST /voucher-type-configs`, then auto-selects the new type. Full config (default lines, constraints) is completed later in Settings.

### 4d. Voucher list — `/[orgSlug]/journals`

`journals-client.tsx` gets a `Type` column showing `config.label` instead of raw enum string. The filter dropdown is populated from the config list. Custom type entries are correctly labelled. No page or route changes needed — just update the select query to include `voucherTypeConfig { label }`.

---

## 5. Seeding Strategy

### Global template rows (companyId: null)

Inserted via migration `20260516_add_voucher_type_configs`. All 11 rows have `isSystem: true`.

| key | label | prefix | baseVoucherType | party | simplifiedMode | Notes |
|-----|-------|--------|-----------------|-------|----------------|-------|
| `JOURNAL_ENTRY` | Journal Entry | JV | JOURNAL_ENTRY | none | off | Fully open |
| `PAYMENT_RECEIPT` | Receipt Voucher | RV | PAYMENT_RECEIPT | customer | on ("Amount received") | Line 0: Bank/Cash DEBIT |
| `PAYMENT_DISBURSEMENT` | Payment Voucher | PV | PAYMENT_DISBURSEMENT | vendor | on ("Amount paid") | Line 0: Bank/Cash CREDIT |
| `SALES_INVOICE` | Sales Invoice | SI | SALES_INVOICE | customer | off | Line 0: AR DEBIT; Line 1: Revenue CREDIT |
| `PURCHASE_BILL` | Purchase Bill | PB | PURCHASE_BILL | vendor | off | Line 0: AP CREDIT; Line 1: Expense DEBIT |
| `CREDIT_NOTE` | Credit Note | CN | CREDIT_NOTE | customer | off | Mirrors Sales Invoice, flipped |
| `DEBIT_NOTE` | Debit Note | DN | DEBIT_NOTE | vendor | off | Mirrors Purchase Bill, flipped |
| `CONTRA` | Contra Entry | CO | CONTRA | none | on ("Transfer amount") | BANK↔CASH only; maxLines: 2 |
| `OPENING_BALANCE` | Opening Balance | OB | OPENING_BALANCE | none | off | No constraints |
| `BANK_RECONCILIATION_ADJ` | Bank Adjustment | BA | BANK_RECONCILIATION_ADJ | none | off | `isActive: false` in selector |
| `TAX_ADJUSTMENT` | Tax Adjustment | TA | TAX_ADJUSTMENT | none | off | TAX_PAYABLE subtype filter |

### Per-company provisioning

`lib/ledger/seed-voucher-types.ts` exports `seedCompanyVoucherTypes(companyId: string)`. It copies all global template rows into company-scoped rows (`companyId` set). Called from the company-creation flow. This allows per-company account overrides (e.g. pinning a specific bank account to the Payment Voucher default) without affecting other companies.

---

## 6. Files Created / Modified

### New files
```
prisma/migrations/20260516_add_voucher_type_configs/migration.sql
lib/ledger/voucher-form-config.ts              (TypeScript type + Zod schema)
lib/ledger/seed-voucher-types.ts               (provisioning utility)
app/api/organizations/[orgSlug]/voucher-type-configs/route.ts
app/api/organizations/[orgSlug]/voucher-type-configs/[id]/route.ts
app/[orgSlug]/settings/voucher-types/page.tsx
app/[orgSlug]/settings/voucher-types/voucher-types-client.tsx
app/[orgSlug]/settings/voucher-types/voucher-type-drawer.tsx
app/[orgSlug]/settings/voucher-types/default-lines-builder.tsx
app/[orgSlug]/journals/new/dynamic-voucher-form.tsx
app/[orgSlug]/journals/new/simplified-mode-input.tsx
```

### Modified files
```
prisma/schema.prisma                           (add VoucherTypeConfig model + FK on JournalEntry)
lib/ledger/ledger-service.ts                   (nextVoucherNumber prefix override)
app/api/organizations/[orgSlug]/journals/route.ts   (accept voucherTypeConfigId)
app/[orgSlug]/journals/new/page.tsx            (fetch voucherTypeConfigs)
app/[orgSlug]/journals/new/journal-form.tsx    (replaced by dynamic-voucher-form.tsx)
app/[orgSlug]/journals/journals-client.tsx     (Type column from config.label)
app/[orgSlug]/settings/page.tsx                (add Voucher Types link in settings nav)
```

---

## 7. Out of Scope

- Invoice/bill/payment documents: these already have their own dedicated routes and forms; they are not replaced by the generic voucher form
- Approval workflow per voucher type (maker-checker): a future enhancement
- Per-line tax auto-calculation driven by formConfig: deferred to the Tax module
- Mobile-optimised voucher entry: future
