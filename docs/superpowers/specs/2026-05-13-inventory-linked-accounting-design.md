# Inventory-Linked Accounting — Full Platform Design Spec
**Date:** 2026-05-13  
**Status:** Approved for implementation  
**Scope:** Full TallyPrime parity + beyond-Tally differentiation, organized into 6 phases

---

## 0. Phase Map

| Phase | Name | What ships |
|---|---|---|
| **1** | Inventory Foundation | Core inventory module: stock master data, godowns, batches, serial numbers, price lists, stock vouchers, all valuation methods, delivery notes, GRNs, orders, rejections, barcode scanning, physical verification, inventory reports |
| **2** | Manufacturing | Bill of Materials, manufacturing journals, job work, by-products/scrap, inter-company stock transfers, manufacturing reports |
| **3** | Accounting Extensions | Cost centres & profit centres, budgets & variance, memorandum vouchers, reversing journals, interest calculation, cheque register, item-wise profitability |
| **4** | Compliance Extensions | TDS module (Form 26Q), TCS module (Form 27EQ), MSME compliance (Form 1), IMS/GSTR-2B auto-reconciliation |
| **5** | HR & Assets | Payroll (PF/ESI/gratuity/payslips), Fixed assets (register + depreciation), POS (retail billing + barcode) |
| **6** | Beyond Tally | AI stock forecasting, eCommerce sync, Document AI, WhatsApp/SMS alerts, multi-entity consolidation, Tally XML export, interactive analytics, custom fields, bulk operations |

Each phase is independently deployable. Later phases build on earlier ones but do not require all prior phases to be complete.

---

## 1. Overview

Add a complete Inventory + extended-accounting platform to Edith, going beyond TallyPrime parity to cloud-native, mobile-responsive, API-first features TallyPrime cannot offer. The Inventory module lives as a new top-level **Inventory** sidebar section (separate from Accounting) and integrates with the accounting engine via the existing `sourceType`/`sourceId` pattern on `JournalEntry`.

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

---

## Phase 1 Additions (beyond original inventory spec)

### P1-A: New voucher types added to StockVoucherType enum

```prisma
enum StockVoucherType {
  // ... existing ...
  DELIVERY_NOTE      // goods dispatched before invoice (pre-invoice)
  GOODS_RECEIPT_NOTE // goods received before bill (pre-bill)
  SALES_ORDER        // customer order (no stock movement, commitment tracking)
  PURCHASE_ORDER     // supplier order (no stock movement, commitment tracking)
  REJECTION_IN       // customer returns (reverses DELIVERY stock)
  REJECTION_OUT      // supplier returns (reverses RECEIPT stock)
  PHYSICAL_VERIFY    // records physical count; generates ADJUSTMENT for variance
}
```

### P1-B: New models

**StockCategory** — orthogonal classification (e.g. "Premium", "Budget") across all groups:
```prisma
model StockCategory {
  id        String    @id @default(cuid())
  companyId String
  name      String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  items     StockItem[]
  @@unique([companyId, name])
  @@map("stock_categories")
}
```
Add `categoryId String?` to `StockItem`.

**SerialNumber** — individual unit tracking beyond batch:
```prisma
model SerialNumber {
  id          String    @id @default(cuid())
  companyId   String
  stockItemId String
  serialNo    String
  batchId     String?
  status      String    @default("in_stock")  // "in_stock" | "sold" | "returned" | "written_off"
  godownId    String?
  soldToId    String?   // customerId
  soldVoucherId String?
  createdAt   DateTime  @default(now())
  @@unique([companyId, stockItemId, serialNo])
  @@map("serial_numbers")
}
```
Add `serialNumberId String?` to `StockVoucherLine`.

**PhysicalStockVerification** — header for a stock-take session:
```prisma
model PhysicalStockVerification {
  id          String    @id @default(cuid())
  companyId   String
  date        DateTime
  godownId    String?
  status      String    @default("draft")  // "draft" | "posted"
  narration   String?
  createdById String
  createdAt   DateTime  @default(now())
  lines       PhysicalStockLine[]
  @@map("physical_stock_verifications")
}

model PhysicalStockLine {
  id            String   @id @default(cuid())
  verificationId String
  stockItemId   String
  godownId      String
  batchId       String?
  bookQty       Decimal  @db.Decimal(12, 4)   // from StockLedger
  physicalQty   Decimal  @db.Decimal(12, 4)   // entered by user
  variance      Decimal  @db.Decimal(12, 4)   // physicalQty - bookQty
  createdAt     DateTime @default(now())
  verification  PhysicalStockVerification @relation(...)
  @@map("physical_stock_lines")
}
```
On post: auto-generate `StockVoucher` (ADJUSTMENT) for each non-zero variance line.

### P1-C: Barcode/QR scanning

- `StockItem` gains `barcode String?` and `qrCode String?` fields
- Stock voucher and invoice line forms include a scan-input field: scan fires a lookup by barcode → auto-fills item
- QR code generated and displayed on each StockItem detail page (using a client-side QR library, no server dependency)
- Barcode label print template added to stock item actions menu

### P1-D: Delivery Notes and GRNs (pre-invoice stock movement)

- Delivery Note → creates a DELIVERY_NOTE StockVoucher (stock moves OUT) → when invoice is created, it references the DN; no double stock movement
- GRN → creates a GOODS_RECEIPT_NOTE StockVoucher (stock moves IN) → when bill is created, it references the GRN
- Link field: `SalesInvoice.deliveryNoteId?`, `PurchaseBill.grnId?`

### P1-E: Purchase Orders / Sales Orders

- Orders do not move stock — they create a `commitment` tracked against open order quantity
- `StockItem` shows: in-stock qty, committed qty (from open orders), available qty
- When an invoice/bill is created from an order, the order line is marked fulfilled

---

## Phase 2: Manufacturing

### P2 Schema additions

**BillOfMaterials** — recipe for a finished good:
```prisma
model BillOfMaterials {
  id              String    @id @default(cuid())
  companyId       String
  finishedItemId  String    // the output StockItem
  name            String    // "Standard BOM v1"
  outputQty       Decimal   @db.Decimal(12, 4)  // qty produced per batch
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  components      BOMComponent[]
  byProducts      BOMByProduct[]
  @@map("bill_of_materials")
}

model BOMComponent {
  id        String          @id @default(cuid())
  bomId     String
  stockItemId String        // raw material / sub-assembly
  qty       Decimal         @db.Decimal(12, 4)
  unitId    String
  isScrap   Boolean         @default(false)
  bom       BillOfMaterials @relation(...)
  @@map("bom_components")
}

model BOMByProduct {
  id          String          @id @default(cuid())
  bomId       String
  stockItemId String
  qty         Decimal         @db.Decimal(12, 4)
  rate        Decimal         @db.Decimal(15, 4) @default(0)
  bom         BillOfMaterials @relation(...)
  @@map("bom_by_products")
}
```

**ManufacturingJournal** — records one production run:
```prisma
model ManufacturingJournal {
  id              String         @id @default(cuid())
  companyId       String
  journalNumber   String
  bomId           String
  date            DateTime
  status          DocumentStatus @default(DRAFT)
  outputQty       Decimal        @db.Decimal(12, 4)
  outputGodownId  String
  narration       String?
  journalEntryId  String?        @unique  // accounting entry for production cost
  createdById     String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  consumptions    ManufacturingConsumption[]
  @@unique([companyId, journalNumber])
  @@map("manufacturing_journals")
}

model ManufacturingConsumption {
  id            String               @id @default(cuid())
  journalId     String
  stockItemId   String
  godownId      String
  batchId       String?
  qty           Decimal              @db.Decimal(12, 4)
  rate          Decimal              @db.Decimal(15, 4)
  amount        Decimal              @db.Decimal(15, 4)
  journal       ManufacturingJournal @relation(...)
  @@map("manufacturing_consumptions")
}
```

On post: consume raw materials (OUT StockLedger), produce finished goods (IN StockLedger), generate `JournalEntry` for WIP → Finished Goods transfer.

**JobWork** — material sent to/received from a job worker:
```prisma
model JobWorkOrder {
  id            String         @id @default(cuid())
  companyId     String
  orderNumber   String
  type          String         // "principal" | "worker"
  jobWorkerId   String         // vendorId
  date          DateTime
  dueDate       DateTime?
  status        DocumentStatus @default(DRAFT)
  narration     String?
  createdById   String
  createdAt     DateTime       @default(now())
  lines         JobWorkLine[]
  @@unique([companyId, orderNumber])
  @@map("job_work_orders")
}

model JobWorkLine {
  id            String       @id @default(cuid())
  orderId       String
  stockItemId   String
  godownId      String
  direction     StockDirection  // IN = receive finished, OUT = send raw
  qty           Decimal      @db.Decimal(12, 4)
  rate          Decimal      @db.Decimal(15, 4)
  order         JobWorkOrder @relation(...)
  @@map("job_work_lines")
}
```

**Inter-company stock transfer:**
```prisma
model InterCompanyTransfer {
  id              String         @id @default(cuid())
  fromCompanyId   String
  toCompanyId     String
  transferNumber  String
  date            DateTime
  status          DocumentStatus @default(DRAFT)
  narration       String?
  createdById     String
  createdAt       DateTime       @default(now())
  lines           InterCompanyTransferLine[]
  @@unique([fromCompanyId, transferNumber])
  @@map("inter_company_transfers")
}

model InterCompanyTransferLine {
  id          String               @id @default(cuid())
  transferId  String
  stockItemId String
  fromGodownId String
  toGodownId  String
  qty         Decimal              @db.Decimal(12, 4)
  rate        Decimal              @db.Decimal(15, 4)
  transfer    InterCompanyTransfer @relation(...)
  @@map("inter_company_transfer_lines")
}
```
On post: OUT StockLedger for `fromCompanyId`, IN StockLedger for `toCompanyId`, paired JournalEntries in both company books.

### P2 Routes (under `/inventory`)

| Route | Purpose |
|---|---|
| `/inventory/bom` | BOM list + create/edit |
| `/inventory/manufacturing` | Manufacturing journal list |
| `/inventory/manufacturing/new` | New production run |
| `/inventory/job-work` | Job work order list |
| `/inventory/inter-company-transfers` | ICT list |
| `/inventory/reports/consumption` | Raw material consumption |
| `/inventory/reports/production` | Production output |

---

## Phase 3: Accounting Extensions

### P3 Schema additions

**CostCentre** (full module, extends existing `costCenterId` on JournalLine):
```prisma
model CostCentre {
  id          String    @id @default(cuid())
  companyId   String
  name        String
  type        String    @default("cost")  // "cost" | "profit"
  parentId    String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  parent      CostCentre?  @relation("CostCentreHierarchy", ...)
  children    CostCentre[] @relation("CostCentreHierarchy")
  budgets     Budget[]
  @@unique([companyId, name])
  @@map("cost_centres")
}
```

**Budget:**
```prisma
model Budget {
  id            String    @id @default(cuid())
  companyId     String
  name          String
  fiscalYearId  String
  costCentreId  String?
  accountId     String?   // ChartAccount
  periodType    String    @default("monthly")  // "monthly" | "quarterly" | "annual"
  createdAt     DateTime  @default(now())
  lines         BudgetLine[]
  @@map("budgets")
}

model BudgetLine {
  id        String    @id @default(cuid())
  budgetId  String
  period    String    // "2025-04" for monthly
  amount    Decimal   @db.Decimal(15, 4)
  budget    Budget    @relation(...)
  @@map("budget_lines")
}
```

**Memo Voucher** — add `isMemo Boolean @default(false)` to `JournalEntry`. Memo entries are not posted to ledger balances; they appear only in scenario reports.

**Reversing Journal** — add `autoReverseDate DateTime?` to `JournalEntry`. A background job checks daily and creates the reversal entry on that date.

**Interest Calculation:**
```prisma
model InterestRule {
  id          String    @id @default(cuid())
  companyId   String
  name        String
  ratePercent Decimal   @db.Decimal(8, 4)
  basis       String    // "365" | "360" | "30_day_month"
  graceDays   Int       @default(0)
  appliesTo   String    // "customer" | "vendor" | "both"
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  @@map("interest_rules")
}
```
Interest calculation runs on-demand per party, generates a `JournalEntry` (Interest Income Dr / AR Cr or Interest Expense Dr / AP Cr).

**ChequeRegister:**
```prisma
model Cheque {
  id            String    @id @default(cuid())
  companyId     String
  bankAccountId String
  paymentId     String?
  chequeNumber  String
  chequeDate    DateTime
  amount        Decimal   @db.Decimal(15, 4)
  payee         String?
  status        String    @default("issued")  // "issued" | "presented" | "cleared" | "bounced" | "cancelled" | "post_dated"
  presentedDate DateTime?
  clearedDate   DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  @@unique([companyId, bankAccountId, chequeNumber])
  @@map("cheques")
}
```

### P3 Routes (new sidebar section: **Finance**)

| Route | Purpose |
|---|---|
| `/{orgSlug}/cost-centres` | Cost centre & profit centre tree |
| `/{orgSlug}/budgets` | Budget list + variance report |
| `/{orgSlug}/cheques` | Cheque register |
| `/{orgSlug}/interest` | Interest calculation tool |
| `/{orgSlug}/reports/item-profitability` | Item-wise P&L |

---

## Phase 4: Compliance Extensions

### P4 Schema additions

**TDSRate / TCSRate:**
```prisma
model TDSSection {
  id            String    @id @default(cuid())
  workspaceId   String
  section       String    // "194C", "194J", "194I" etc.
  description   String
  individualRate Decimal  @db.Decimal(8, 4)
  companyRate   Decimal   @db.Decimal(8, 4)
  threshold     Decimal   @db.Decimal(15, 4)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  @@map("tds_sections")
}

model TDSEntry {
  id            String    @id @default(cuid())
  companyId     String
  sectionId     String
  paymentId     String?   // linked Payment
  vendorId      String
  tdsAmount     Decimal   @db.Decimal(15, 4)
  baseAmount    Decimal   @db.Decimal(15, 4)
  date          DateTime
  quarterPeriod String    // "Q1-2025-26"
  status        String    @default("deducted")  // "deducted" | "deposited" | "filed"
  challanNumber String?
  createdAt     DateTime  @default(now())
  @@map("tds_entries")
}

// TCS follows same pattern with TCSSection + TCSEntry
```

**MSMESupplier** — tag vendors as MSME:
```prisma
// Add to Vendor model:
//   isMSME     Boolean  @default(false)
//   msmeRegNo  String?
//   msmeType   String?  // "micro" | "small" | "medium"
```

**GSTReconciliation (IMS):**
```prisma
model GSTRReconciliationRun {
  id          String    @id @default(cuid())
  companyId   String
  period      String    // "2025-04"
  type        String    // "2A" | "2B"
  status      String    @default("pending")
  totalBooks  Int       @default(0)
  totalPortal Int       @default(0)
  matched     Int       @default(0)
  mismatched  Int       @default(0)
  missing     Int       @default(0)
  runAt       DateTime  @default(now())
  lines       GSTRReconciliationLine[]
  @@map("gstr_reconciliation_runs")
}

model GSTRReconciliationLine {
  id            String   @id @default(cuid())
  runId         String
  invoiceNumber String?
  gstin         String?
  bookAmount    Decimal? @db.Decimal(15, 4)
  portalAmount  Decimal? @db.Decimal(15, 4)
  bookTax       Decimal? @db.Decimal(15, 4)
  portalTax     Decimal? @db.Decimal(15, 4)
  status        String   // "matched" | "mismatched" | "missing_in_books" | "missing_in_portal"
  run           GSTRReconciliationRun @relation(...)
  @@map("gstr_reconciliation_lines")
}
```

### P4 Routes

| Route | Purpose |
|---|---|
| `/{orgSlug}/tds` | TDS dashboard |
| `/{orgSlug}/tds/entries` | TDS entry list + Form 26Q export |
| `/{orgSlug}/tcs/entries` | TCS entry list + Form 27EQ export |
| `/{orgSlug}/tax/gstr-reconciliation` | IMS/GSTR-2B reconciliation workspace |
| `/{orgSlug}/tax/msme` | MSME supplier list + Form 1 |

---

## Phase 5: HR, Assets & POS

### P5 Schema additions (summary — detailed schema in separate spec)

**Payroll:** `Employee`, `PayrollRun`, `PayslipLine`, `PFRegister`, `ESIRegister`  
**Fixed Assets:** `FixedAsset`, `AssetDepreciationSchedule`, `AssetDisposal`  
**POS:** `POSSession`, `POSTransaction`, `POSTill` — links to SalesInvoice with `isPOS: true`; cashier opens/closes sessions; supports cash + UPI + card tender types

### P5 Routes

| Route | Purpose |
|---|---|
| `/{orgSlug}/payroll` | Payroll dashboard |
| `/{orgSlug}/payroll/employees` | Employee master |
| `/{orgSlug}/payroll/runs` | Monthly payroll processing |
| `/{orgSlug}/fixed-assets` | Asset register |
| `/{orgSlug}/pos` | POS terminal |

---

## Phase 6: Beyond TallyPrime

### P6-A: AI Stock Forecasting
- `StockForecast` model stores predicted demand per item per period
- Computed from `StockLedger` history using a simple exponential smoothing algorithm (no external ML dependency)
- UI: forecast chart overlay on stock summary; auto-suggested reorder quantity

### P6-B: eCommerce Sync
- Webhook receiver: `POST /api/webhooks/ecommerce/{platform}/{orgSlug}` (Shopify, WooCommerce)
- On order created/fulfilled → create SalesInvoice + StockVoucher (DELIVERY) automatically
- `EcommerceChannel` model: `platform`, `storeUrl`, `webhookSecret`, `itemMapping` (JSON, ecommerce SKU → StockItem)

### P6-C: Document AI (Bill/Invoice OCR)
- Upload PDF/image of a vendor bill → AI extracts vendor, date, line items, amounts
- Pre-fills a `PurchaseBill` draft for human review
- Uses Claude API (`claude-sonnet-4-6`) with structured output via tool_use
- `OcrJob` model: `status`, `sourceKey`, `extractedData`, `billId?`

### P6-D: Notifications (WhatsApp/SMS/Email)
- Trigger library: low stock alert (qty < reorderLevel), expiry warning (30/7/1 day), overdue invoice, payment due reminder
- `NotificationRule` model: `trigger`, `channelType` (email/whatsapp/sms), `recipients`, `template`, `isActive`
- WhatsApp via Meta Cloud API; SMS via Twilio/MSG91; Email via existing SMTP

### P6-E: Multi-entity Consolidation
- `ConsolidationGroup` links multiple Companies within a workspace
- Consolidated Balance Sheet and P&L roll up across entities
- Inter-company eliminations tracked via `InterCompanyTransfer` records

### P6-F: Tally XML Export
- Export any date range of transactions as Tally-compatible XML
- Enables migration path: businesses can switch to Edith from Tally and back
- Route: `/{orgSlug}/settings/exports/tally-xml`

### P6-G: Interactive Analytics
- Replace static report tables with interactive charts (Recharts, already in project via shadcn chart component)
- Drill-down: click a group in Stock Summary → see items; click an item → see ledger
- Dashboard widgets are draggable/resizable per user preference (`DashboardLayout` model)

### P6-H: Custom Fields
- `CustomFieldDefinition` model: `entityType`, `fieldName`, `fieldType` (text/number/date/select), `isRequired`
- `CustomFieldValue` model: `entityType`, `entityId`, `fieldId`, `value`
- Applies to: StockItem, Customer, Vendor, SalesInvoice, PurchaseBill

### P6-I: Bulk Operations
- Bulk price update: select items → set new rate / apply % change → updates PriceListLine
- Bulk post vouchers: select DRAFT stock vouchers → post all in one action
- Bulk export: select any list → download CSV/Excel

---

## Summary: New sidebar sections by phase

| Phase | Sidebar section | Icon |
|---|---|---|
| 1 | **Inventory** (collapsible) | `Package` |
| 3 | **Finance** (collapsible — cost centres, budgets, cheques) | `TrendingUp` |
| 4 | TDS/TCS added under **Accounting > Tax** | — |
| 5 | **Payroll** (collapsible) | `Users` |
| 5 | **Fixed Assets** (collapsible) | `Building` |
| 5 | **POS** (top-level link) | `ShoppingCart` |
