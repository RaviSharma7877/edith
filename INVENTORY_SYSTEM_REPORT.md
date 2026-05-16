# Inventory System Feature Report

Date: 2026-05-12

## Scope

This report analyzes the core requirements for an inventory system built on top of the accounting-first BusinessOS platform. It converts the conceptual requirements into a structured product feature report, aligning the inventory roadmap with the previously established accounting roadmap.

The system is evaluated against the expectations of a TallyPrime-like ledger-grade inventory engine, where stock tracking is not a disconnected operational tool, but a deeply integrated financial sub-ledger.

## Executive Summary

The platform requires an inventory system that fundamentally treats physical goods tracking as an extension of the financial ledger. The inventory core must handle master data, stock groups, godowns (warehouses), physical movements (receipts, issues, transfers), valuation algorithms (FIFO, WAC), traceability (batches, serials), and complex costing (landed cost, BOMs).

The recommended product direction is to reject "simple quantity tracking" in favor of a perpetual inventory engine. This means immutable stock postings, maker-checker approvals for adjustments, and strict, automated double-entry ledger integration. The product should borrow TallyPrime's strengths in deep inventory-accounting coupling, zero-valued transaction handling, and hierarchical stock summaries, while improving upon cloud-native multi-location access, barcode-driven UI, and granular ownership states.

## Inventory Product Principles

- Inventory is a sub-ledger of the accounting core; physical stock value must always reconcile with the Balance Sheet Inventory Asset account.
- Every physical movement that alters stock valuation must automatically generate a corresponding double-entry journal (Perpetual Inventory).
- Posted stock movements cannot be hard-edited; corrections must use reversal journals, debit/credit notes, or stock adjustments.
- Valuation is recalculated retrospectively if backdated transactions are introduced.
- Strict governance controls *who* owns the stock (Company, Customer, Vendor) and *where* it is located (Godown, In-Transit).
- The UI should be optimized for rapid entry, supporting barcode scanners, dense grids, and keyboard navigation.

## Full Inventory Feature Inventory

### 1. Stock Master Data and Groups

Priority: P0

Features:

- Multi-level hierarchical stock groups (e.g., Electronics > Mobile > Apple).
- Stock item profile: SKU/Code, descriptive name, default unit of measure (UOM).
- Alternate UOMs and dynamic conversion factors (e.g., 1 Box = 12 Pieces).
- Tax classification: Default HSN/SAC codes and tax rates inherited from groups.
- Item typing: Goods, Services, or Non-Inventory items.
- Default accounting ledger mapping (Inventory Asset, COGS, Sales Revenue) at item or group level.

Core validations:

- SKU/Code uniqueness across the tenant.
- Conversion factors must be greater than zero and mathematically sound.
- Deletion is blocked if the item has historical transactions or stock balances.
- Cannot change base UOM after transactions are posted.

Recommended pages:

- `/app/inventory/items`
- `/app/inventory/items/new`
- `/app/inventory/groups`

### 2. Godowns (Warehouses) and Multi-Location

Priority: P1

Features:

- Godown directory (warehouses, retail stores, virtual zones).
- Hierarchical locations (Region > City > Store > Backroom).
- "In-Transit" logical godowns for multi-stage transfers.
- Godown-specific access control for Warehouse Operators.
- Default godown assignment per user or branch.

Core validations:

- Every physical stock movement requires a valid godown.
- Cannot delete a godown if it holds a non-zero stock balance.
- Transfers require sufficient stock in the source godown.

Recommended pages:

- `/app/settings/warehouses`
- `/app/inventory/godowns`

### 3. Stock Journals and Valuation Engine

Priority: P0

Features:

- Manual stock receipt journals (inward without AP bill).
- Manual stock issue journals (outward without AR invoice).
- Inter-warehouse transfer journals.
- Physical stock adjustment journals (shrinkage, damage, write-offs).
- Standardized valuation engine supporting Weighted Average Cost (WAC) and FIFO.
- Retrospective recalculation of COGS and stock value upon backdated insertions.
- Opening balance capture (qty, rate, value).

Core validations:

- Outward movements cannot drive stock quantity below zero (unless explicitly allowed via soft warnings).
- Adjustment journals must balance financially against an expense account (e.g., Inventory Shrinkage).
- Period locks block backdated stock movements.

Recommended pages:

- `/app/inventory/journals`
- `/app/inventory/journals/new`
- `/app/inventory/adjustments`

### 4. Sales and Purchase Integration

Priority: P0

Features:

- Auto-deduction of stock quantity upon posting a Sales Invoice.
- Auto-addition of stock quantity upon posting a Purchase Bill.
- Actual vs. Billed quantities handling (e.g., billing for 10, shipping 12).
- Zero-valued transaction handling (Free samples, BOGO) deducting physical stock without inflating revenue or standard COGS.
- Price lists and multi-level matrix pricing (Wholesale, Retail, Distributor) with effective dates.

Core validations:

- Sales/Purchase items must exist in the Stock Master.
- Godown must be specified on every item line if multi-location is enabled.
- Zero-valued lines must be explicitly flagged to bypass missing-price validations.

Recommended pages:

- Integrated directly into `/app/sales-invoices/new` and `/app/purchase-bills/new`
- `/app/inventory/price-lists`

### 5. Traceability: Batches, Expiry, and Serials

Priority: P1

Features:

- Batch/Lot tracking upon inward receipt (manufacturing date, expiry date).
- First-Expire, First-Out (FEFO) dispatch enforcement.
- Serial number tracking for individual high-value units.
- Serial lifecycle tracking (Procured -> In Stock -> Sold -> Returned -> Repaired).
- Recall reporting to trace specific batches to customers.

Core validations:

- Outbound batches/serials must exactly match inbound batches/serials.
- Cannot dispatch expired batches without override approval.
- Serial numbers must be strictly unique per SKU.

Recommended pages:

- `/app/inventory/batches`
- `/app/inventory/serials`

### 6. Complex Supply Chain (BOM, Landed Cost, Job Work)

Priority: P2

Features:

- Landed Cost computation: capitalizing freight, customs, and insurance into stock value based on quantity/value apportionment.
- Bill of Materials (BOM) & Kitting: Defining multi-level raw material requirements for finished goods.
- Assembly/Disassembly journals (consuming raw materials to produce finished goods).
- Outward Job Work: Tracking raw materials sent to subcontractors and value-added costs upon return.
- Barcode/QR scanner optimization for fast POS and warehouse operations.

Core validations:

- Assembly outputs must financially equal the sum of consumed inputs plus applied overhead.
- Landed cost documents must map perfectly to the original Purchase Bills.

Recommended pages:

- `/app/inventory/bom`
- `/app/inventory/manufacturing`
- `/app/inventory/landed-costs`

### 7. Governance, Roles, and Custody Models

Priority: P0

Features:

- Specialized roles: Inventory Manager, Warehouse Operator, Store Clerk.
- Custody states: Company Owned, Customer Owned (repair/service), Supplier Owned (consignment), Consignment Outward.
- Dual Maker-Checker approvals for inventory write-offs exceeding dynamic thresholds.
- Cycle count / physical stocktake approval workflows.
- Immutable movement logging (actor, IP, timestamp, diff).

Core validations:

- Warehouse Operators cannot view item costs or access financial reporting.
- Customer-owned items must retain a financial valuation of exactly zero on the balance sheet.
- Adjustments exceeding thresholds are hard-blocked pending Manager approval.

Recommended pages:

- `/app/settings/users-roles`
- `/app/inventory/stocktakes`

### 8. Inventory Reports and Analytics

Priority: P0

Features:

- Real-time Stock Summary (drillable from Group -> Item -> Godown -> Batch).
- Stock Movement Analysis (Fast-moving vs. Slow/Dead stock).
- As-of-date Inventory Valuation Report.
- Item Profitability / Gross Margin Analysis.
- Shortfall/Reorder reports (Expected Arrivals vs. Committed Quantities).
- Export to Excel/CSV with audit logs.

Core validations:

- Financial reports must pull directly from the valuation engine, not disconnected approximations.
- Date ranges must respect period bounds.

Recommended pages:

- `/app/reports/stock-summary`
- `/app/reports/valuation`
- `/app/reports/item-profitability`
- `/app/reports/movement-analysis`

## Recommended Data Model

Core tables/entities to integrate with existing accounting schema:

- `stock_groups`
- `stock_items`
- `warehouses`
- `stock_movements` (The immutable stock ledger)
- `stock_batches`
- `stock_serials`
- `price_lists`
- `bom_templates`
- `physical_counts`

Non-negotiable invariants:

- Stock movements are strictly append-only; corrections require reversal movements.
- Every `stock_movement` that impacts company value must map to a `journal_entry`.
- Inventory Asset balance in the GL must exactly match the sum of (`quantity` * `unit_cost`) across all items in the valuation engine.
- Tenant isolation is strictly enforced.

## Recommended Inventory Pages

Core operations:
- `/app/inventory` (Dashboard)
- `/app/inventory/items`
- `/app/inventory/groups`
- `/app/inventory/journals`
- `/app/inventory/adjustments`
- `/app/inventory/transfers`

Traceability & Pricing:
- `/app/inventory/price-lists`
- `/app/inventory/batches`
- `/app/inventory/serials`

Reports:
- `/app/reports/stock-summary`
- `/app/reports/valuation`
- `/app/reports/item-profitability`

Settings:
- `/app/settings/warehouses`
- `/app/settings/inventory-preferences`

## Recommended Build Priorities

### MVP P0

- Stock item master and groups.
- Basic stock valuation (FIFO/WAC).
- Core stock journals (Receipt, Issue, Adjustment).
- Deep integration with Sales Invoices (outward) and Purchase Bills (inward).
- Automated double-entry GL posting for all movements.
- Stock Summary and Valuation reports.
- Immutable logging and period locks.

### MVP P1

- Multi-location (Godowns) and Transfers.
- Batch and Expiry tracking.
- Reorder levels and minimum stock alerts.
- Actual vs. Billed quantity handling.
- Zero-valued transaction processing.
- Price lists.

### MVP P2

- Serial number tracking.
- Landed cost computation.
- Bill of Materials (BOM) and light manufacturing.
- Subcontracting / Job work workflows.
- Barcode scanner optimized surfaces.
