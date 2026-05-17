# 📄 Missing Functionalities Report – Detailed Implementation Guide

---

## 🎯 Overview
This document expands on the **gap analysis** between the current **inventory‑first application** and the **full TallyPrime suite**. For every missing feature we provide:

1. **Why the feature matters** – business & compliance impact.
2. **What is missing** – a concise description of the current gap.
3. **Design & implementation plan** – concrete steps, data‑model sketches (Prisma schema snippets), UI wire‑frame ideas, and integration points.
4. **Reference to the Inventory Report** – where the existing inventory architecture can be leveraged (e.g., valuation engine, immutable stock ledger).

The goal is to give the engineering team a **single source of truth** for building the next set of modules **in a coherent, extensible way**.

---

## 📚 Methodology Recap
1. **Source Documents** – `INVENTORY_SYSTEM_REPORT.md` (inventory blueprint) and the TallyPrime feature matrix.
2. **Comparison Process** – each TallyPrime capability was checked against the inventory spec; missing or partial items were flagged.
3. **Impact Scoring** – High / Medium / Low, based on essentiality for a SaaS accounting platform.

---

## 🚀 Detailed Missing Core Accounting & Invoicing Features
> **Why it matters:** Accounting forms the backbone of any BusinessOS. Without a double‑entry ledger the system cannot guarantee financial integrity, auditability, or compliance.

| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **Bookkeeping & Double‑Entry Ledger** | No ledger engine, journal posting, or trial‑balance logic. | **Data Model** – Add Prisma tables: `Account`, `JournalEntry`, `Transaction`. Each `Transaction` references a debit and a credit `Account`. <br>**Core Engine** – Build a service `ledgerService` with methods `postJournal(entry)`, `computeTrialBalance(period)`. <br>**Integration** – Hook inventory stock movements to create corresponding journal entries (see Inventory Report § Valuation Engine). <br>**Testing** – Unit tests for balanced entries, period closing, and reversal entries. |
| **2** | **Voucher‑Based Data Entry (Custom Voucher Types)** | No voucher abstraction; only stock journals exist. | **Voucher Types** – Define a `Voucher` table with a `type` enum (e.g., `SALES`, `PURCHASE`, `PAYMENT`, `RECEIPT`, `BANK`). Each voucher contains one or many `VoucherLine` rows linked to `Account` and `Amount`. <br>**UI** – Dynamic form generation based on voucher type (similar to inventory UI for Stock Journals). <br>**Extensibility** – Allow custom voucher types via a config JSON, mirroring the *“Price‑list UI”* pattern in the Inventory Report. |
| **3** | **Single‑ and Double‑Entry Invoice Modes** | Invoices are only integration points; no UI or posting flow. | **Invoice Schema** – `Invoice` table with `customerId`, `date`, `status`, `lines[]`. Each line includes `itemId`, `quantity`, `price`, `taxRate`. <br>**Posting Logic** – On `Invoice.save()`, generate a double‑entry voucher (`Sales` account ↔ `Receivables`). <br>**UI** – React‑style form (or plain HTML) with auto‑complete for items (leveraging inventory item catalog). <br>**Print/Email** – Use a templating engine (e.g., Handlebars) to generate PDF/HTML invoices, then email via nodemailer. |
| **4** | **Chart of Accounts (COA) & Multiple Ledgers** | No COA definition, hierarchy, or multi‑ledger support. | **COA Table** – `Account` has fields `code`, `name`, `type` (Asset, Liability, Equity, Revenue, Expense), `parentId`. <br>**Hierarchy UI** – Tree view component with drag‑and‑drop reordering, similar to the *item‑group* UI in the inventory report. <br>**Multiple Ledgers** – Support “company‑wide” ledger plus subsidiary ledgers (e.g., departmental). Use a `ledgerId` foreign key on `JournalEntry`. |
| **5** | **Professional Invoice Creation, Printing, Emailing, Customization** | No invoice designer, PDF generation, or email workflow. | **Template Engine** – Provide default Handlebars templates (`invoice_default.html`). Allow users to upload custom HTML templates (store in S3 bucket). <br>**PDF Generation** – Use `puppeteer` to render HTML to PDF. <br>**Email** – Integrate nodemailer, add optional “Send on Save” toggle. |
| **6** | **GST‑Compliant Invoices, E‑Invoices, E‑Way‑Bills** | Only a brief “GST‑first” note; no generation or filing capability. | **GST Engine** – Extend invoice line calculation to include GSTIN, tax slabs, and reverse‑charge logic. <br>**E‑Invoice API** – Build a thin wrapper around the Indian GSTN e‑Invoice API (JSON payload → IRN). Store IRN and QR‑code on the invoice record. <br>**E‑Way‑Bill** – Similar wrapper to the e‑Way‑Bill API, generate a transport document linked to the sales voucher. |
| **7** | **Export Bills & Multiple Billing Formats** | No export service or format selector UI. | **Export Service** – Endpoint `/export?format=excel|csv|json`. Use `exceljs` for XLSX, `json2csv` for CSV. Include a UI dropdown in the invoice list view. |
| **8** | **Multi‑Currency Transactions & Automatic Forex Gain/Loss** | No currency conversion engine. | **Currency Table** – `Currency` with `code`, `symbol`, `rateToBase`. <br>**Forex Engine** – On voucher posting, capture the exchange rate (via a scheduled task pulling from an external rates API). Auto‑create gain/loss entry if rates differ on settlement. |
| **9** | **Multiple Price Levels & Price Lists** | Present (partial) – UI exists but not linked to accounting. | **Integration** – When an invoice line uses a price list, store the selected price level. On posting, calculate COGS using the inventory valuation engine (FIFO/WAC) and record the revenue‑vs‑COGS voucher automatically. |
| **10** | **Payment QR Codes & Links on Invoices** | Not covered. | **QR Generation** – Use a library (`qrcode`) to embed a payment URI (UPI, bank URL) on the PDF. Store the QR data in `Invoice.paymentQr`. |
| **11** | **Multiple Addresses for Company & Ledgers** | Absent. | **Address Table** – `Address` entity with fields `line1`, `city`, `state`, `pin`, `gstin`. Link `Company` and `Ledger` via `addressId`. UI: modal form for address entry. |
| **12** | **Bills Receivable / Payable, Post‑Dated Registers** | No dedicated registers or post‑dated handling logic. | **Bills Module** – `Bill` table with `type` (receivable/payable), `dueDate`, `status`. For post‑dated bills, schedule a background job (e.g., `node-cron`) to auto‑post when due. |
| **13** | **Zero‑Valued Transaction Handling (BOGO, Free Sample)** | Mentioned for inventory only; accounting impact missing. | **Zero‑Value Voucher** – Allow voucher lines with amount = 0 but with linked inventory movement. Tag with `transactionType = 'BOGO'` for reporting. |
| **14** | **Debit/Credit Notes, Payments & Receipts, Allocation** | No credit‑note or payment‑allocation workflows. | **Credit Note Flow** – Mirror invoice creation but with negative amounts; automatically allocate against open receivables. <br>**Payment Allocation UI** – Grid showing open invoices; user drags a payment onto an invoice to allocate. |

---

## 🏦 Detailed Missing Banking Features
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **Bank Reconciliation (Smart Suggestions)** | No bank‑feed import, no reconciliation UI. | **Import Engine** – CSV/OFX parser that creates provisional `BankTransaction` entries. <br>**Matching Algorithm** – Compute similarity between bank txn and pending vouchers (date, amount, narration). Present suggestions in a UI grid with *Accept*/*Reject* actions. |
| **2** | **Automated Voucher Creation from Bank Statements** | No import‑to‑voucher pipeline. | **Auto‑Voucher Service** – For each unmatched bank txn, generate a `BankReceipt` or `BankPayment` voucher based on transaction type field. Allow user to edit before posting. |
| **3** | **Cheque Books & Post‑Dated Cheque Tracking** | Not mentioned. | **Cheque Entity** – `Cheque` table with `number`, `date`, `amount`, `status`. UI for issuing, clearing, and post‑dated tracking. |
| **4** | **Connected Banking & Digital Payments** | No payment‑gateway integration. | **Gateway Wrapper** – Integrate with Razorpay/PayU for instant payment links. Store transaction IDs and auto‑reconcile when the gateway webhook fires. |
| **5** | **User Authorization for Banking Ops** | No granular banking roles. | **RBAC Extension** – Add permissions `BANK_READ`, `BANK_WRITE`, `BANK_RECONCILE`. Enforce in both API and UI layers. |

---

## 📜 Detailed Missing Tax, GST & Compliance Features
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **GST Returns (GSTR‑1, GSTR‑3B) Upload/Filing** | No filing workflow. | **Return Generator** – Aggregate taxable invoices per period, produce JSON/Excel per GSTN schema. <br>**Upload API** – Secure endpoint to submit returns to GSTN (using token‑based authentication). |
| **2** | **GSTR‑2A/2B Download & Auto‑Reconciliation** | Absent. | **Downloader Service** – Scheduled job to pull GSTR‑2A/2B JSON from GSTN, map to purchase invoices, reconcile mismatches, flag for review. |
| **3** | **E‑Invoice & E‑Way‑Bill Generation** | Only “GST‑first” mentioned. | **E‑Invoice Service** – Create IRN payload, call GSTN API, store IRN & QR. <br>**E‑Way‑Bill Service** – Same pattern for transport documents, link to sales voucher. |
| **4** | **Input Tax Credit (ITC) Matching** | No vendor‑invoice matching engine. | **ITC Engine** – On purchase invoice import, cross‑check GST paid against sales ITC claims. Auto‑suggest credit entries. |
| **5** | **India‑Specific Statutory Packs (MSME, VAT, Excise, TDS/TCS, ESI, PF)** | No statutory modules. | **Modular Tax Packs** – Each pack is a separate Prisma schema (`TaxPackMSTax`, `TaxPackTDS`) and a set of validation rules. Load dynamically based on tenant configuration (similar to the *“price‑list pack”* concept). |
| **6** | **International VAT Packs (GCC, Kenya)** | No multi‑country tax packs. | **VAT Pack Architecture** – Same modular approach; each pack implements `calculateVat(invoice)` according to local rules. |
| **7** | **Audit / Edit Log (Tamper‑Evidence)** | Present only for inventory. | **Unified Audit Log** – Extend existing immutable log to capture all ledger, voucher, and tax actions. Store hash chain per tenant for integrity verification. |

---

## 👥 Detailed Missing Payroll Features
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **Employee Records & Statutory Payroll Calculations** | No payroll data model, no payslip generation. | **Employee Schema** – `Employee` with `salaryComponents`, `taxDeclarations`, `bankDetails`. <br>**Payroll Engine** – Compute gross, deductions (PF, ESI, Professional Tax), net. Use rule‑engine (json rules) for state‑specific calculations. |
| **2** | **Payslips, Attendance Reports, Payroll Management UI** | Absent. | **Payslip PDF** – Handlebars template fed by payroll engine output. <br>**Attendance Integration** – Simple clock‑in/clock‑out table; payroll engine consumes attendance for daily wage calculations. |

---

## 📈 Detailed Missing Reporting & Analytics Features
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **Real‑Time Financial Reports (P&L, Balance Sheet, Cash/Bank Books)** | Only inventory‑level reports exist. | **Reporting Layer** – Build a read‑only service `reportingService` that runs SQL aggregates on `JournalEntry` and `Transaction`. Use materialized views for performance. Export to PDF/Excel via `jsreport`. |
| **2** | **Drill‑Down From Reports to Source Data** | No linking to journal entries. | **Interactive Grids** – Each report row includes a *"View Details"* button that redirects to a filtered transaction list (`/transactions?account=...&period=...`). |
| **3** | **Business Dashboards & KPI Widgets** | Absent. | **Dashboard Engine** – Leverage `chart.js` or `recharts` to display KPIs (e.g., Days Sales Outstanding, Cash Conversion Cycle). Data sources are the same materialized views used for financial reports. |
| **4** | **Ledger Reports, Aging (AR/AP), Purchase‑Sales Registers** | Missing. | **Aging Engine** – Compute outstanding amounts grouped by bucket (0‑30, 31‑60, >60 days). UI: bucketed bar chart + table. |
| **5** | **Cost Centre & Project Cost Tracking** | Not covered. | **Cost Centre Table** – `CostCentre` linked to `Transaction` via `costCentreId`. Extend ledger posting to capture cost centre code. Provide project profitability reports. |
| **6** | **Forecasting & Provisional Reports** | Absent. | **Forecast Module** – Simple moving‑average or linear regression on past revenue to generate provisional P&L. UI: *"Create Forecast"* wizard. |
| **7** | **Export to Excel/CSV with Audit Logs** | Export UI exists only for inventory. | **Export Service** – Accept `reportId` and `format`. Append audit metadata (generated‑by, timestamp, hash) as a footer row. |

---

## 🔐 Detailed Missing Security, Access & SaaS Foundations
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **Granular User Roles & Maker‑Checker Workflow** | Inventory roles exist but no tenant‑wide security model. | **RBAC System** – Define `Role` (`ADMIN`, `ACCOUNTANT`, `DATA_ENTRY`, `VIEWER`). Store permissions per module. Implement maker‑checker via `WorkflowTask` table that holds pending actions awaiting approval. |
| **2** | **Multi‑Tenant SaaS Architecture & Tenant Isolation** | No tenant provisioning, per‑tenant schema, or data‑residency controls. | **Tenant Model** – `Tenant` table with `domain`, `subscriptionPlan`. All core tables reference `tenantId`. Use Row‑Level Security (PostgreSQL policies) to enforce isolation. Provide a tenant‑provisioning script that creates default accounts, COA, and tax packs. |
| **3** | **API Keys, Scoped Webhooks & Developer Portal** | No public API surface. | **API Gateway** – Issue JWT‑based API keys per tenant. Add webhook subscription table (`Webhook`) with event types (`INVOICE_CREATED`, `PAYMENT_RECEIVED`). Deliver JSON payloads with HMAC signatures. |
| **4** | **AI Copilot (Explain Variance, Draft Reminders)** | No AI assistance layer. | **Copilot Service** – Wrap OpenAI’s Chat API; feed it ledger diffs, invoice anomalies, and ask for plain‑language explanations. Expose via a chatbot UI in the dashboard. |
| **5** | **Collaborative Review, Comments, Live Status** | No real‑time collaboration UI. | **Comment System** – `Comment` entity linked to any document (voucher, invoice). Use websockets (socket.io) to broadcast new comments instantly. |
| **6** | **Scheduled / Saved Report Views & Export Audit Trails** | Only on‑demand inventory reports. | **Saved Report** – `SavedReport` table storing query parameters, name, and schedule (cron). Scheduler service runs the report and stores the result in `ReportRun` for later download, logging the user and timestamp. |
| **7** | **Product‑Level Analytics (Usage Metering, Job‑Queue Health)** | No telemetry or observability dashboards. | **Telemetry** – Emit events (`invoice_created`, `ledger_posted`) to a PostgreSQL `metrics` table. Build a small admin dashboard showing total invoices per day, job‑queue latency, webhook failures. |
| **8** | **Modular Localization Packs (Tax‑Pack Versioning, Rollout)** | No versioned tax‑pack system. | **Pack Registry** – `TaxPack` table with `version`, `country`, `effectiveFrom`. When a tenant upgrades, migrate existing tax data to the new schema via migration scripts. |
| **9** | **Open‑Source Extensibility Hooks** | Closed codebase, no plugin framework. | **Plugin Architecture** – Define a `Plugin` interface (init, execute, cleanup). Load plugins from a `plugins/` folder at runtime. Provide sample plugin that adds a custom report. |

---

## 🏢 Detailed BusinessOS “Wedge” Features (Beyond Core Accounting)
| # | Feature | Gap Detail | Implementation Blueprint |
|---|---------|------------|--------------------------|
| **1** | **CRM → Proposal → Project → Invoice Workflow** | No CRM or project modules. | **CRM Module** – `Lead`, `Contact`, `Opportunity` tables. Convert an `Opportunity` to a `Proposal` (PDF). <br>**Project Module** – `Project` linked to `Proposal`; track milestones, budget, and cost centre allocations. <br>**Invoice Trigger** – Upon project milestone completion, auto‑generate an invoice linked to the project. |
| **2** | **Client Portal (Invoice Status, Comments, Document Sharing)** | Absent. | **Portal Front‑End** – React SPA hosted on a sub‑domain (`portal.myapp.com`). Auth via temporary token emailed to client. Show invoice list, payment status, allow comment threads. |
| **3** | **Automation / Rules Engine (Scheduled Jobs, Triggers)** | No job‑queue described. | **Rule Engine** – Store JSON rules (`when: invoice.overdue && amount > 5000, then: sendReminder`). Use `node-cron` or `bullmq` to evaluate rules every hour. |
| **4** | **Embedded BI (Metabase‑Style Dashboards)** | No embedded analytics. | **BI Layer** – Deploy Metabase (or build a lightweight dashboard using `superset`). Connect via read‑only DB user; embed dashboards via iframe with SSO token. |
| **5** | **SaaS Operational Observability (Health Checks, Webhook Failures)** | No admin console for platform health. | **Admin Dashboard** – Show service uptime, DB connection pool stats, webhook error rate. Provide alerts via Slack webhook. |

---

## 📊 Prioritisation Matrix (MVP‑First)
| Priority | Domain | Core Features to Build | Rationale |
|----------|--------|-----------------------|-----------|
| **P0** | Accounting Core | • Double‑entry ledger <br>• Chart of Accounts <br>• Voucher system <br>• Invoice posting (double‑entry) <br>• Trial balance, P&L, Balance Sheet <br>• AR/AP aging <br>• Period locks & audit log | Foundation for any finance product; enables compliance and reporting. |
| **P0** | Inventory Integration | • Stock master data <br>• Stock valuation engine (FIFO/WAC) <br>• Immutable stock ledger ↔ GL posting <br>• Basic stock journals (receipt, issue, adjustment) | Couples inventory with the new ledger; ensures financial integrity. |
| **P1** | Banking & Reconciliation | • Bank statement import <br>• Reconciliation UI with smart suggestions <br>• Cheque book & post‑dated cheque handling | Automates a high‑pain manual process for SMBs. |
| **P1** | Tax & GST | • GST filing (GSTR‑1/3B) <br>• E‑invoice & e‑way‑bill generation <br>• ITC matching workflow | Legal compliance for the Indian market – must ship early for go‑to‑market. |
| **P1** | Payroll | • Employee master, statutory deductions, payslip PDF <br>• Attendance + payroll run wizard | Completes the end‑to‑end finance stack for SMBs. |
| **P2** | SaaS Foundations | • Multi‑tenant DB isolation <br>• API key & webhook framework <br>• Role‑based access + maker‑checker across all modules | Enables true cloud‑native SaaS, differentiates from desktop Tally. |
| **P2** | AI Copilot & Automation | • Variance explanation AI <br>• Draft reminder & email generation <br>• Rules engine for auto‑postings | Adds modern AI‑driven value proposition. |
| **P3** | BusinessOS Extensions | • CRM & Project modules <br>• Client portal <br>• Embedded BI dashboards <br>• Usage analytics & health console | Turns the product from pure accounting into a full Business Operating System. |

---

## ✅ Recommended Immediate Action Plan (Next Sprint)
1. **Design Ledger Schema** – create Prisma models `Account`, `JournalEntry`, `Transaction`. Draft migration scripts. 
2. **Implement Voucher Service** – API endpoints for creating, editing, and posting vouchers. Wire UI forms.
3. **Build COA UI** – tree component with drag‑and‑drop; store hierarchy in `Account.parentId`.
4. **Integrate Inventory Movements** – extend existing stock‑journal code to call `ledgerService.postJournal()` on every receipt/issue.
5. **Create First Financial Reports** – materialized view `mv_trial_balance`, endpoint `/reports/trial-balance`.
6. **Prototype Bank Statement Import** – CSV parser, provisional `BankTransaction` table, simple matching UI.
7. **Set Up GST Return Generator** – JSON output matching GSTN schema; unit tests for tax calculations.
8. **Add Payroll Core Tables** – `Employee`, `PayrollRun`, `PayrollComponent`. Simple payroll run script.
9. **Backlog Creation** – For every row in the tables above, generate a JIRA ticket (e.g., *"Implement Double‑Entry Ledger*"), linking to the corresponding implementation blueprint.

---

## 📚 Conclusion
The inventory‑first roadmap already provides a **robust stock valuation engine**, immutable logs, and a **valuation‑centric API**. By **layering the accounting core on top of that foundation** and progressively adding banking, tax, payroll, reporting, and SaaS capabilities, we transform the product into a **complete, cloud‑native Business Operating System** that rivals TallyPrime while delivering modern UI/UX, AI assistance, and extensibility.

---

*Prepared by Antigravity – Advanced Agentic Coding Assistant*
