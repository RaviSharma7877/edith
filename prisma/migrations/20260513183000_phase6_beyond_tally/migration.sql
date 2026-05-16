-- CreateEnum
CREATE TYPE "EcommercePlatform" AS ENUM ('SHOPIFY', 'WOOCOMMERCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OcrJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "BulkOperationStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "stock_forecasts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "forecastQty" DECIMAL(12,4) NOT NULL,
    "suggestedReorderQty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "confidencePct" DECIMAL(8,4),
    "algorithm" TEXT NOT NULL DEFAULT 'exponential_smoothing',
    "sourceWindowStart" TIMESTAMP(3),
    "sourceWindowEnd" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecommerce_channels" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" "EcommercePlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "itemMapping" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecommerce_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceName" TEXT,
    "status" "OcrJobStatus" NOT NULL DEFAULT 'QUEUED',
    "extractedData" JSONB,
    "billId" TEXT,
    "invoiceId" TEXT,
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channelType" "NotificationChannelType" NOT NULL,
    "recipients" TEXT[],
    "template" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consolidation_groups" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyIds" TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consolidation_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tally_export_jobs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "exportNumber" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "xmlPayload" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tally_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL,
    "options" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_operations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" "BulkOperationStatus" NOT NULL DEFAULT 'DRAFT',
    "inputData" JSONB,
    "resultData" JSONB,
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_forecasts_companyId_period_idx" ON "stock_forecasts"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "stock_forecasts_companyId_stockItemId_period_key" ON "stock_forecasts"("companyId", "stockItemId", "period");

-- CreateIndex
CREATE INDEX "ecommerce_channels_companyId_platform_idx" ON "ecommerce_channels"("companyId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ecommerce_channels_companyId_name_key" ON "ecommerce_channels"("companyId", "name");

-- CreateIndex
CREATE INDEX "ocr_jobs_companyId_status_idx" ON "ocr_jobs"("companyId", "status");

-- CreateIndex
CREATE INDEX "notification_rules_companyId_trigger_idx" ON "notification_rules"("companyId", "trigger");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rules_companyId_name_key" ON "notification_rules"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "consolidation_groups_workspaceId_name_key" ON "consolidation_groups"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "tally_export_jobs_companyId_createdAt_idx" ON "tally_export_jobs"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "tally_export_jobs_companyId_exportNumber_key" ON "tally_export_jobs"("companyId", "exportNumber");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_companyId_userId_name_key" ON "dashboard_layouts"("companyId", "userId", "name");

-- CreateIndex
CREATE INDEX "custom_field_definitions_companyId_entityType_idx" ON "custom_field_definitions"("companyId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_companyId_entityType_fieldName_key" ON "custom_field_definitions"("companyId", "entityType", "fieldName");

-- CreateIndex
CREATE INDEX "custom_field_values_companyId_entityType_idx" ON "custom_field_values"("companyId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_entityType_entityId_fieldId_key" ON "custom_field_values"("entityType", "entityId", "fieldId");

-- CreateIndex
CREATE INDEX "bulk_operations_companyId_status_idx" ON "bulk_operations"("companyId", "status");

-- AddForeignKey
ALTER TABLE "stock_forecasts" ADD CONSTRAINT "stock_forecasts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_forecasts" ADD CONSTRAINT "stock_forecasts_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecommerce_channels" ADD CONSTRAINT "ecommerce_channels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_jobs" ADD CONSTRAINT "ocr_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consolidation_groups" ADD CONSTRAINT "consolidation_groups_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tally_export_jobs" ADD CONSTRAINT "tally_export_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_operations" ADD CONSTRAINT "bulk_operations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
