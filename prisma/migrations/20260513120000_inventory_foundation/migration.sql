-- CreateEnum
CREATE TYPE "ValuationMethod" AS ENUM ('FIFO', 'WAC', 'LIFO', 'STANDARD', 'BATCH');

-- CreateEnum
CREATE TYPE "StockVoucherType" AS ENUM ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT', 'WRITE_OFF', 'OPENING', 'DELIVERY_NOTE', 'GOODS_RECEIPT_NOTE', 'SALES_ORDER', 'PURCHASE_ORDER', 'REJECTION_IN', 'REJECTION_OUT', 'PHYSICAL_VERIFY');

-- CreateEnum
CREATE TYPE "StockDirection" AS ENUM ('IN', 'OUT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_ITEM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_GROUP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_GROUP_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_GROUP_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'GODOWN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'GODOWN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'GODOWN_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'BATCH_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'BATCH_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRICE_LIST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRICE_LIST_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRICE_LIST_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_VOUCHER_DRAFTED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_VOUCHER_POSTED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_VOUCHER_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'STOCK_OPENING_SET';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "defaultPriceListId" TEXT;

-- AlterTable
ALTER TABLE "purchase_bill_lines" ADD COLUMN     "actualQty" DECIMAL(12,4),
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "billedQty" DECIMAL(12,4),
ADD COLUMN     "godownId" TEXT,
ADD COLUMN     "stockItemId" TEXT;

-- AlterTable
ALTER TABLE "purchase_bills" ADD COLUMN     "grnId" TEXT;

-- AlterTable
ALTER TABLE "sales_invoice_lines" ADD COLUMN     "actualQty" DECIMAL(12,4),
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "billedQty" DECIMAL(12,4),
ADD COLUMN     "godownId" TEXT,
ADD COLUMN     "stockItemId" TEXT;

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "deliveryNoteId" TEXT;

-- CreateTable
CREATE TABLE "stock_groups" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "valuationMethod" "ValuationMethod" NOT NULL DEFAULT 'FIFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_units" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "categoryId" TEXT,
    "primaryUnitId" TEXT NOT NULL,
    "alternateUnitId" TEXT,
    "conversionFactor" DECIMAL(12,6),
    "hsnCode" TEXT,
    "taxCodeId" TEXT,
    "barcode" TEXT,
    "qrCode" TEXT,
    "valuationMethod" "ValuationMethod",
    "standardCost" DECIMAL(15,4),
    "reorderLevel" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "godowns" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "godowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "costPrice" DECIMAL(15,4) NOT NULL,
    "currentQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_lines" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "minQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "rate" DECIMAL(15,4) NOT NULL,
    "discountPct" DECIMAL(8,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_list_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_vouchers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "voucherType" "StockVoucherType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "narration" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "journalEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_voucher_lines" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "batchId" TEXT,
    "serialNumberId" TEXT,
    "direction" "StockDirection" NOT NULL,
    "actualQty" DECIMAL(12,4) NOT NULL,
    "billedQty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,4) NOT NULL,
    "landedCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_voucher_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "batchId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "StockDirection" NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "runningQty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,4) NOT NULL,
    "valuationMethod" "ValuationMethod" NOT NULL,
    "sourceVoucherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "batchId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_stock',
    "godownId" TEXT,
    "soldToId" TEXT,
    "soldVoucherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_stock_verifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "godownId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "narration" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_stock_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physical_stock_lines" (
    "id" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "batchId" TEXT,
    "bookQty" DECIMAL(12,4) NOT NULL,
    "physicalQty" DECIMAL(12,4) NOT NULL,
    "variance" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "physical_stock_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_groups_companyId_parentId_idx" ON "stock_groups"("companyId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_groups_companyId_name_key" ON "stock_groups"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_categories_companyId_name_key" ON "stock_categories"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_units_companyId_name_key" ON "stock_units"("companyId", "name");

-- CreateIndex
CREATE INDEX "stock_items_companyId_groupId_idx" ON "stock_items"("companyId", "groupId");

-- CreateIndex
CREATE INDEX "stock_items_companyId_categoryId_idx" ON "stock_items"("companyId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_companyId_code_key" ON "stock_items"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_companyId_barcode_key" ON "stock_items"("companyId", "barcode");

-- CreateIndex
CREATE INDEX "godowns_companyId_parentId_idx" ON "godowns"("companyId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "godowns_companyId_name_key" ON "godowns"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "godowns_companyId_code_key" ON "godowns"("companyId", "code");

-- CreateIndex
CREATE INDEX "batches_companyId_expiryDate_idx" ON "batches"("companyId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "batches_companyId_stockItemId_batchNumber_key" ON "batches"("companyId", "stockItemId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_companyId_name_key" ON "price_lists"("companyId", "name");

-- CreateIndex
CREATE INDEX "price_list_lines_priceListId_stockItemId_idx" ON "price_list_lines"("priceListId", "stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_vouchers_journalEntryId_key" ON "stock_vouchers"("journalEntryId");

-- CreateIndex
CREATE INDEX "stock_vouchers_companyId_date_idx" ON "stock_vouchers"("companyId", "date");

-- CreateIndex
CREATE INDEX "stock_vouchers_companyId_voucherType_status_idx" ON "stock_vouchers"("companyId", "voucherType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_vouchers_companyId_voucherNumber_key" ON "stock_vouchers"("companyId", "voucherNumber");

-- CreateIndex
CREATE INDEX "stock_voucher_lines_voucherId_idx" ON "stock_voucher_lines"("voucherId");

-- CreateIndex
CREATE INDEX "stock_voucher_lines_stockItemId_godownId_idx" ON "stock_voucher_lines"("stockItemId", "godownId");

-- CreateIndex
CREATE INDEX "stock_ledger_companyId_stockItemId_date_idx" ON "stock_ledger"("companyId", "stockItemId", "date");

-- CreateIndex
CREATE INDEX "stock_ledger_companyId_godownId_idx" ON "stock_ledger"("companyId", "godownId");

-- CreateIndex
CREATE INDEX "stock_ledger_sourceVoucherId_idx" ON "stock_ledger"("sourceVoucherId");

-- CreateIndex
CREATE INDEX "serial_numbers_companyId_status_idx" ON "serial_numbers"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_companyId_stockItemId_serialNo_key" ON "serial_numbers"("companyId", "stockItemId", "serialNo");

-- CreateIndex
CREATE INDEX "physical_stock_verifications_companyId_date_idx" ON "physical_stock_verifications"("companyId", "date");

-- CreateIndex
CREATE INDEX "physical_stock_lines_verificationId_idx" ON "physical_stock_lines"("verificationId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_defaultPriceListId_fkey" FOREIGN KEY ("defaultPriceListId") REFERENCES "price_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "purchase_bill_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "purchase_bill_lines_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "purchase_bill_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_groups" ADD CONSTRAINT "stock_groups_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_groups" ADD CONSTRAINT "stock_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "stock_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_categories" ADD CONSTRAINT "stock_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_units" ADD CONSTRAINT "stock_units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stock_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "stock_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_primaryUnitId_fkey" FOREIGN KEY ("primaryUnitId") REFERENCES "stock_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_alternateUnitId_fkey" FOREIGN KEY ("alternateUnitId") REFERENCES "stock_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "godowns" ADD CONSTRAINT "godowns_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "godowns" ADD CONSTRAINT "godowns_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "godowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_lines" ADD CONSTRAINT "price_list_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_vouchers" ADD CONSTRAINT "stock_vouchers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_voucher_lines" ADD CONSTRAINT "stock_voucher_lines_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "stock_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_voucher_lines" ADD CONSTRAINT "stock_voucher_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_voucher_lines" ADD CONSTRAINT "stock_voucher_lines_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_voucher_lines" ADD CONSTRAINT "stock_voucher_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_voucher_lines" ADD CONSTRAINT "stock_voucher_lines_serialNumberId_fkey" FOREIGN KEY ("serialNumberId") REFERENCES "serial_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_sourceVoucherId_fkey" FOREIGN KEY ("sourceVoucherId") REFERENCES "stock_vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_soldToId_fkey" FOREIGN KEY ("soldToId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_verifications" ADD CONSTRAINT "physical_stock_verifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_verifications" ADD CONSTRAINT "physical_stock_verifications_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_lines" ADD CONSTRAINT "physical_stock_lines_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "physical_stock_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_lines" ADD CONSTRAINT "physical_stock_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_lines" ADD CONSTRAINT "physical_stock_lines_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_stock_lines" ADD CONSTRAINT "physical_stock_lines_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
