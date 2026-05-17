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

-- CreateIndex
CREATE INDEX "voucher_type_configs_workspaceId_idx"
    ON "voucher_type_configs"("workspaceId");
