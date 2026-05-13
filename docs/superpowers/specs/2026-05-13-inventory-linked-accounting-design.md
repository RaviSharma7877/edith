# Inventory-Linked Accounting — Design Spec
**Date:** 2026-05-13  
**Status:** Approved for implementation

---

## 1. Overview

Add a fully-featured Inventory module to the existing Edith accounting platform, matching TallyPrime's inventory-accounting coupling. The module lives as a new top-level **Inventory** sidebar section (separate from Accounting) and integrates with the accounting engine via the existing `sourceType`/`sourceId` pattern on `JournalEntry`.

**Scope:** Full TallyPrime feature parity including all valuation methods, batch/expiry tracking, per-line godown selection, price lists, landing cost, zero-valued transactions, and free sample/BOGO modeling.

**Out of scope (deferred):** Inter-company stock transfers, barcode/QR scanning, Bill of Materials / manufacturing.

---

## 2. Sidebar & Routes

A new `Inventory` collapsible menu is added to `components/app-sidebar.tsx` between Accounting and Documents, using the identical `Collapsible` + `SidebarMenuSub` pattern as Accounting. The sidebar gets a parallel `inventoryOpen` state and `INVENTORY_ROOTS` constant.

**Icon:** `Package` (Lucide)

| Sub-menu item | Route |
|---|---|
| Dashboard | `/{orgSlug}/inventory` |
| Stock Items | `/{orgSlug}/inventory/stock-items` |
| Stock Groups | `/{orgSlug}/inventory/stock-groups` |
| Godowns | `/{orgSlug}/inventory/godowns` |
| Batches | `/{orgSlug}/inventory/batches` |
| Price Lists | `/{orgSlug}/inventory/price-lists` |
| Stock Vouchers | `/{orgSlug}/inventory/stock-vouchers` |
| Reports | `/{orgSlug}/inventory/reports` |

No existing Accounting sub-menu items are moved — accounting journal entries remain in Accounting; stock movement and master data live in Inventory.

---

## 3. Database Schema

All new models are scoped to `companyId` and follow the existing Prisma conventions (`@id @default(cuid())`, `createdAt`, `updatedAt`, `@@map`).

### 3.1 Enums (new)

```prisma
enum ValuationMethod {
  FIFO
  WAC        // Weighted Average Cost
  LIFO
  STANDARD   // fixed standard cost on StockItem
  BATCH      // cost from the selected Batch record
}

enum StockVoucherType {
  RECEIPT      // purchase receipt (auto from PurchaseBill post)
  DELIVERY     // sales delivery (auto from SalesInvoice post)
  TRANSFER     // godown-to-godown transfer
  ADJUSTMENT   // qty correction
  WRITE_OFF    // write off to expense
  OPENING      // opening stock
}

enum StockDirection {
  IN
  OUT
}
```

### 3.2 Master data models

**StockGroup**
```prisma
model StockGroup {
  id               String          @id @default(cuid())
  companyId        String
  name             String
  parentId         String?
  valuationMethod  ValuationMethod @default(FIFO)
  isActive         Boolean         @default(true)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  company          Company         @relation(...)
  parent           StockGroup?     @relation("GroupHierarchy", ...)
  children         StockGroup[]    @relation("GroupHierarchy")
  stockItems       StockItem[]

  @@unique([companyId, name])
  @@map("stock_groups")
}
```

**StockUnit**
```prisma
model StockUnit {
  id             String    @id @default(cuid())
  companyId      String
  name           String    // "Nos", "Kg", "Box", "Litre"
  symbol         String    // "Nos", "kg", "Box", "L"
  decimalPlaces  Int       @default(2)
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())

  company        Company   @relation(...)
  primaryItems   StockItem[] @relation("PrimaryUnit")
  altItems       StockItem[] @relation("AlternateUnit")

  @@unique([companyId, name])
  @@map("stock_units")
}
```

**StockItem**
```prisma
model StockItem {
  id                 String          @id @default(cuid())
  companyId          String
  code               String?
  name               String
  groupId            String
  primaryUnitId      String
  alternateUnitId    String?
  conversionFactor   Decimal?        @db.Decimal(12, 6)  // 1 box = N nos
  hsnCode            String?
  taxCodeId          String?
  valuationMethod    ValuationMethod? // overrides group if set; if both null, defaults to FIFO
  standardCost       Decimal?        @db.Decimal(15, 4)  // for STANDARD method
  reorderLevel       Decimal?        @db.Decimal(12, 4)
  isActive           Boolean         @default(true)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  deletedAt          DateTime?

  company            Company         @relation(...)
  group              StockGroup      @relation(...)
  primaryUnit        StockUnit       @relation("PrimaryUnit", ...)
  alternateUnit      StockUnit?      @relation("AlternateUnit", ...)
  batches            Batch[]
  priceListLines     PriceListLine[]
  stockLedger        StockLedger[]

  @@unique([companyId, code])
  @@index([companyId, groupId])
  @@map("stock_items")
}
```

**Godown**
```prisma
model Godown {
  id          String    @id @default(cuid())
  companyId   String
  code        String?
  name        String
  parentId    String?   // hierarchical godowns
  address     String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  company     Company   @relation(...)
  parent      Godown?   @relation("GodownHierarchy", ...)
  children    Godown[]  @relation("GodownHierarchy")

  @@unique([companyId, name])
  @@map("godowns")
}
```

**Batch**
```prisma
model Batch {
  id            String    @id @default(cuid())
  companyId     String
  stockItemId   String
  batchNumber   String
  mfgDate       DateTime?
  expiryDate    DateTime?
  costPrice     Decimal   @db.Decimal(15, 4)
  currentQty    Decimal   @db.Decimal(12, 4) @default(0)  // denorm updated on each StockLedger write
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  stockItem     StockItem @relation(...)

  @@unique([companyId, stockItemId, batchNumber])
  @@map("batches")
}
```

**PriceList + PriceListLine**
```prisma
model PriceList {
  id            String          @id @default(cuid())
  companyId     String
  name          String          // "Retail", "Wholesale", "Distributor"
  currency      String          @default("INR")
  effectiveFrom DateTime
  effectiveTo   DateTime?
  isActive      Boolean         @default(true)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  company       Company         @relation(...)
  lines         PriceListLine[]
  customers     Customer[]      @relation("CustomerDefaultPriceList")

  @@unique([companyId, name])
  @@map("price_lists")
}

model PriceListLine {
  id          String    @id @default(cuid())
  priceListId String
  stockItemId String
  minQty      Decimal   @db.Decimal(12, 4) @default(0)
  rate        Decimal   @db.Decimal(15, 4)
  discountPct Decimal?  @db.Decimal(8, 4)
  createdAt   DateTime  @default(now())

  priceList   PriceList @relation(...)
  stockItem   StockItem @relation(...)

  @@index([priceListId, stockItemId])
  @@map("price_list_lines")
}
```

### 3.3 Transaction models

**StockVoucher + StockVoucherLine**
```prisma
model StockVoucher {
  id              String           @id @default(cuid())
  companyId       String
  voucherNumber   String
  voucherType     StockVoucherType
  date            DateTime
  status          DocumentStatus   @default(DRAFT)
  narration       String?
  // links to invoice/bill when auto-generated on post
  sourceType      String?          // "invoice" | "bill"
  sourceId        String?
  // for TRANSFER: from/to godown at header level (optional — per-line is canonical)
  journalEntryId  String?          @unique
  createdById     String
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  company         Company          @relation(...)
  lines           StockVoucherLine[]

  @@unique([companyId, voucherNumber])
  @@index([companyId, date])
  @@map("stock_vouchers")
}

model StockVoucherLine {
  id             String        @id @default(cuid())
  voucherId      String
  stockItemId    String
  godownId       String
  batchId        String?
  direction      StockDirection
  actualQty      Decimal       @db.Decimal(12, 4)   // moves stock
  billedQty      Decimal       @db.Decimal(12, 4)   // on invoice (may differ for BOGO/samples)
  rate           Decimal       @db.Decimal(15, 4)
  amount         Decimal       @db.Decimal(15, 4)   // actualQty × rate
  landedCost     Decimal       @db.Decimal(15, 4) @default(0)  // allocated landing charges
  createdAt      DateTime      @default(now())

  voucher        StockVoucher  @relation(...)

  @@index([voucherId])
  @@map("stock_voucher_lines")
}
```

**StockLedger** (immutable append-only)
```prisma
model StockLedger {
  id               String         @id @default(cuid())
  companyId        String
  stockItemId      String
  godownId         String
  batchId          String?
  date             DateTime
  direction        StockDirection
  qty              Decimal        @db.Decimal(12, 4)
  runningQty       Decimal        @db.Decimal(12, 4)  // after this entry
  rate             Decimal        @db.Decimal(15, 4)
  amount           Decimal        @db.Decimal(15, 4)
  valuationMethod  ValuationMethod
  sourceVoucherId  String         // StockVoucher.id
  createdAt        DateTime       @default(now())

  stockItem        StockItem      @relation(...)

  @@index([companyId, stockItemId, date])
  @@index([companyId, godownId])
  @@map("stock_ledger")
}
```

### 3.4 Modifications to existing models

**SalesInvoiceLine** — add:
```prisma
  stockItemId   String?
  godownId      String?
  batchId       String?
  actualQty     Decimal?  @db.Decimal(12, 4)
  billedQty     Decimal?  @db.Decimal(12, 4)
```

**PurchaseBillLine** — add same fields.

Opening stock is set via a `StockVoucher` of type OPENING (not stored on `StockItem` directly).

**Customer** — add:
```prisma
  defaultPriceListId  String?
```

**Company** — add relations:
```prisma
  stockGroups    StockGroup[]
  stockUnits     StockUnit[]
  stockItems     StockItem[]
  godowns        Godown[]
  priceLists     PriceList[]
  stockVouchers  StockVoucher[]
```

---

## 4. Business Logic

### 4.1 Stock movement on document post

**SalesInvoice posted:**
1. For each line where `stockItemId` is set:
   - Create one `StockVoucher` (DELIVERY, sourceType: "invoice", sourceId: invoiceId) per invoice
   - Create `StockVoucherLine` per invoice line (direction: OUT, godownId from line)
   - Append `StockLedger` rows using the item's effective valuation method (group → item override)
2. Compute COGS per method:
   - **FIFO** — consume oldest IN ledger entries first, FIFO queue per item+godown
   - **WAC** — `runningAvgCost = totalValue / runningQty` at time of OUT
   - **LIFO** — consume newest IN entries first
   - **Standard** — `rate = StockItem.standardCost`
   - **Batch** — `rate = Batch.costPrice` of selected batch
3. Auto-generate `JournalEntry` (sourceType: "stock_voucher"): `COGS Dr / Inventory Cr` at computed cost

**PurchaseBill posted:**
1. For each line where `stockItemId` is set:
   - Create `StockVoucher` (RECEIPT) + `StockVoucherLine` (direction: IN)
   - Append `StockLedger` rows
2. **Landing cost allocation** — any non-stock bill lines (freight, insurance, customs) are treated as landing charges and allocated across stock lines by value (default) or qty. The allocated amount is added to `StockVoucherLine.landedCost` and the effective `rate` stored in `StockLedger` = `(lineAmount + allocatedLandedCost) / qty`.
3. Auto-generate `JournalEntry`: `Inventory Dr / AP Cr`

### 4.2 Manual stock vouchers

| Type | Accounting effect |
|---|---|
| TRANSFER | No journal entry — stock moves between godowns only |
| ADJUSTMENT | `Inventory Dr/Cr / Stock Variance Account Dr/Cr` |
| WRITE_OFF | `Stock Write-off Expense Dr / Inventory Cr` |
| OPENING | `Inventory Dr / Opening Stock Adjustment Cr` |

### 4.3 Price list auto-apply

When a sales invoice line is created:
1. If `stockItemId` is set and `customer.defaultPriceListId` is set
2. Query `PriceListLine` where `priceListId = customer.defaultPriceListId` AND `stockItemId = line.stockItemId` AND `minQty <= line.billedQty` ORDER BY `minQty DESC LIMIT 1`
3. Pre-fill `unitPrice = line.rate` (with optional `discountPct` applied)
4. User may override per line — no enforcement beyond the pre-fill

### 4.4 Zero-valued transactions & free samples / BOGO

- `StockVoucherLine.rate` may be `0` (zero-valued transaction)
- `actualQty` drives stock movement; `billedQty` drives invoice amount
- BOGO example: sell 2, charge for 1 → `actualQty = 2`, `billedQty = 1`, `rate = unitPrice`
- Free sample: `actualQty = 1`, `billedQty = 0`, `rate = 0` → stock moves, no revenue

---

## 5. UI Pages

All pages follow the existing pattern: server component `page.tsx` fetches data, passes to `*-client.tsx` for interactivity. Warm palette (`#37322F`, `#605A57`, `#F7F5F3`, `#FAFAF9`).

| Page | Key UI elements |
|---|---|
| `/inventory` | Dashboard: 4 summary cards (total items, total stock value, low stock count, expiring batches), quick-action buttons |
| `/inventory/stock-items` | Filterable table (group, active), row links to detail; "New Stock Item" button |
| `/inventory/stock-items/new` | Form with tabs: General / Godowns / Batches / Price Lists |
| `/inventory/stock-groups` | Tree view of group hierarchy, inline add/edit |
| `/inventory/godowns` | Hierarchical list, add/edit sheet |
| `/inventory/batches` | Table filtered by item, sortable by expiry; color-coded expiry warnings |
| `/inventory/price-lists` | List of price levels; detail page shows line-item grid |
| `/inventory/stock-vouchers` | Table with type/status filters; "New Voucher" button |
| `/inventory/stock-vouchers/new` | Line-item grid: item picker, godown picker, batch picker, actualQty, billedQty, rate |
| `/inventory/reports` | Tab-based: Stock Summary / Stock Ledger / Godown Summary / Batch-Expiry / Valuation / Movement / Reorder |

---

## 6. Reports

| Report | Key columns |
|---|---|
| Stock Summary | Item, Group, Unit, Opening Qty, Inward, Outward, Closing Qty, Closing Value |
| Stock Ledger | Date, Voucher, Type, Godown, Batch, In Qty, Out Qty, Balance Qty, Rate, Value |
| Godown Summary | Godown, Item, Qty, Rate, Value |
| Batch/Expiry | Item, Batch, Mfg Date, Expiry Date, Qty, Days to Expiry |
| Valuation | Item, Method, Qty, Avg Rate, Total Value |
| Movement Analysis | Item, Period, Total In, Total Out, Net Movement |
| Reorder | Item, Current Qty, Reorder Level, Shortage |

---

## 7. Audit Actions (additions to AuditAction enum)

```
STOCK_ITEM_CREATED / UPDATED / DELETED
STOCK_GROUP_CREATED / UPDATED / DELETED
GODOWN_CREATED / UPDATED / DELETED
BATCH_CREATED / UPDATED
PRICE_LIST_CREATED / UPDATED / DELETED
STOCK_VOUCHER_DRAFTED / POSTED / CANCELLED
STOCK_OPENING_SET
```

---

## 8. Integration seam summary

```
SalesInvoice.post()
  → StockVoucher (DELIVERY) + StockLedger rows
  → JournalEntry (sourceType: "stock_voucher", COGS Dr / Inventory Cr)

PurchaseBill.post()
  → StockVoucher (RECEIPT) + StockLedger rows (with landed cost)
  → JournalEntry (sourceType: "stock_voucher", Inventory Dr / AP Cr)

ManualStockVoucher.post()
  → StockLedger rows
  → JournalEntry (if type requires one, sourced from stock_voucher)
```

The accounting engine never reads inventory models directly — it only sees `JournalEntry` records. The inventory engine reads `StockLedger` for all valuation and reporting.
