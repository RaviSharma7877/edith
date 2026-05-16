-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "finishedItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputQty" DECIMAL(12,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_components" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "unitId" TEXT NOT NULL,
    "isScrap" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bom_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_by_products" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL DEFAULT 0,

    CONSTRAINT "bom_by_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing_journals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "journalNumber" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "outputQty" DECIMAL(12,4) NOT NULL,
    "outputGodownId" TEXT NOT NULL,
    "narration" TEXT,
    "journalEntryId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturing_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing_consumptions" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "batchId" TEXT,
    "qty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,
    "amount" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "manufacturing_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_work_orders" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jobWorkerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "narration" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_work_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "godownId" TEXT NOT NULL,
    "direction" "StockDirection" NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "job_work_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_company_transfers" (
    "id" TEXT NOT NULL,
    "fromCompanyId" TEXT NOT NULL,
    "toCompanyId" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "narration" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_company_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inter_company_transfer_lines" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "fromGodownId" TEXT NOT NULL,
    "toGodownId" TEXT NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "rate" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "inter_company_transfer_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_of_materials_companyId_finishedItemId_idx" ON "bill_of_materials"("companyId", "finishedItemId");

-- CreateIndex
CREATE INDEX "bom_components_bomId_idx" ON "bom_components"("bomId");

-- CreateIndex
CREATE INDEX "bom_by_products_bomId_idx" ON "bom_by_products"("bomId");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturing_journals_journalEntryId_key" ON "manufacturing_journals"("journalEntryId");

-- CreateIndex
CREATE INDEX "manufacturing_journals_companyId_date_idx" ON "manufacturing_journals"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturing_journals_companyId_journalNumber_key" ON "manufacturing_journals"("companyId", "journalNumber");

-- CreateIndex
CREATE INDEX "manufacturing_consumptions_journalId_idx" ON "manufacturing_consumptions"("journalId");

-- CreateIndex
CREATE INDEX "job_work_orders_companyId_date_idx" ON "job_work_orders"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "job_work_orders_companyId_orderNumber_key" ON "job_work_orders"("companyId", "orderNumber");

-- CreateIndex
CREATE INDEX "job_work_lines_orderId_idx" ON "job_work_lines"("orderId");

-- CreateIndex
CREATE INDEX "inter_company_transfers_toCompanyId_date_idx" ON "inter_company_transfers"("toCompanyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "inter_company_transfers_fromCompanyId_transferNumber_key" ON "inter_company_transfers"("fromCompanyId", "transferNumber");

-- CreateIndex
CREATE INDEX "inter_company_transfer_lines_transferId_idx" ON "inter_company_transfer_lines"("transferId");

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_finishedItemId_fkey" FOREIGN KEY ("finishedItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_components" ADD CONSTRAINT "bom_components_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "stock_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_by_products" ADD CONSTRAINT "bom_by_products_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_by_products" ADD CONSTRAINT "bom_by_products_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_journals" ADD CONSTRAINT "manufacturing_journals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_journals" ADD CONSTRAINT "manufacturing_journals_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_journals" ADD CONSTRAINT "manufacturing_journals_outputGodownId_fkey" FOREIGN KEY ("outputGodownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_consumptions" ADD CONSTRAINT "manufacturing_consumptions_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "manufacturing_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_consumptions" ADD CONSTRAINT "manufacturing_consumptions_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_consumptions" ADD CONSTRAINT "manufacturing_consumptions_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_consumptions" ADD CONSTRAINT "manufacturing_consumptions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_orders" ADD CONSTRAINT "job_work_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_orders" ADD CONSTRAINT "job_work_orders_jobWorkerId_fkey" FOREIGN KEY ("jobWorkerId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_lines" ADD CONSTRAINT "job_work_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "job_work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_lines" ADD CONSTRAINT "job_work_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_work_lines" ADD CONSTRAINT "job_work_lines_godownId_fkey" FOREIGN KEY ("godownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfers" ADD CONSTRAINT "inter_company_transfers_fromCompanyId_fkey" FOREIGN KEY ("fromCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfers" ADD CONSTRAINT "inter_company_transfers_toCompanyId_fkey" FOREIGN KEY ("toCompanyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer_lines" ADD CONSTRAINT "inter_company_transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "inter_company_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer_lines" ADD CONSTRAINT "inter_company_transfer_lines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer_lines" ADD CONSTRAINT "inter_company_transfer_lines_fromGodownId_fkey" FOREIGN KEY ("fromGodownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inter_company_transfer_lines" ADD CONSTRAINT "inter_company_transfer_lines_toGodownId_fkey" FOREIGN KEY ("toGodownId") REFERENCES "godowns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
