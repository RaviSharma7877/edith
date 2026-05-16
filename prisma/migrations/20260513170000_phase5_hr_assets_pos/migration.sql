-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'EXITED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'PROCESSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'WDV');

-- CreateEnum
CREATE TYPE "POSSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TenderType" AS ENUM ('CASH', 'UPI', 'CARD', 'MIXED');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "pan" TEXT,
    "uan" TEXT,
    "esiNumber" TEXT,
    "monthlyCtc" DECIMAL(15,4) NOT NULL,
    "bankDetails" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "grossPay" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "employerCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_lines" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'earning',
    "amount" DECIMAL(15,4) NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pf_registers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "wageBase" DECIMAL(15,4) NOT NULL,
    "employeePfAmount" DECIMAL(15,4) NOT NULL,
    "employerPfAmount" DECIMAL(15,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pf_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esi_registers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "wageBase" DECIMAL(15,4) NOT NULL,
    "employeeEsiAmount" DECIMAL(15,4) NOT NULL,
    "employerEsiAmount" DECIMAL(15,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "esi_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "putToUseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(15,4) NOT NULL,
    "salvageValue" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "depreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "accumulatedDepreciation" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "vendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciation_schedules" (
    "id" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "depreciationAmount" DECIMAL(15,4) NOT NULL,
    "accumulatedAmount" DECIMAL(15,4) NOT NULL,
    "bookValue" DECIMAL(15,4) NOT NULL,
    "journalEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_disposals" (
    "id" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "disposalDate" TIMESTAMP(3) NOT NULL,
    "saleValue" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "gainLossAmount" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tills" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_tills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tillId" TEXT NOT NULL,
    "sessionNumber" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(15,4),
    "expectedCash" DECIMAL(15,4),
    "status" "POSSessionStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "salesInvoiceId" TEXT,
    "customerId" TEXT,
    "tenderType" "TenderType" NOT NULL,
    "subtotal" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,4) NOT NULL,
    "paidAmount" DECIMAL(15,4) NOT NULL,
    "changeDue" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "transactionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_employeeCode_key" ON "employees"("companyId", "employeeCode");

-- CreateIndex
CREATE INDEX "employees_companyId_status_idx" ON "employees"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_journalEntryId_key" ON "payroll_runs"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_companyId_runNumber_key" ON "payroll_runs"("companyId", "runNumber");

-- CreateIndex
CREATE INDEX "payroll_runs_companyId_period_idx" ON "payroll_runs"("companyId", "period");

-- CreateIndex
CREATE INDEX "payroll_runs_companyId_status_idx" ON "payroll_runs"("companyId", "status");

-- CreateIndex
CREATE INDEX "payslip_lines_payrollRunId_idx" ON "payslip_lines"("payrollRunId");

-- CreateIndex
CREATE INDEX "payslip_lines_employeeId_idx" ON "payslip_lines"("employeeId");

-- CreateIndex
CREATE INDEX "pf_registers_companyId_payrollRunId_idx" ON "pf_registers"("companyId", "payrollRunId");

-- CreateIndex
CREATE INDEX "esi_registers_companyId_payrollRunId_idx" ON "esi_registers"("companyId", "payrollRunId");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_companyId_assetCode_key" ON "fixed_assets"("companyId", "assetCode");

-- CreateIndex
CREATE INDEX "fixed_assets_companyId_status_idx" ON "fixed_assets"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciation_schedules_fixedAssetId_period_key" ON "asset_depreciation_schedules"("fixedAssetId", "period");

-- CreateIndex
CREATE INDEX "asset_disposals_fixedAssetId_idx" ON "asset_disposals"("fixedAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_tills_companyId_name_key" ON "pos_tills"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pos_sessions_companyId_sessionNumber_key" ON "pos_sessions"("companyId", "sessionNumber");

-- CreateIndex
CREATE INDEX "pos_sessions_companyId_status_idx" ON "pos_sessions"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_transactions_companyId_transactionNumber_key" ON "pos_transactions"("companyId", "transactionNumber");

-- CreateIndex
CREATE INDEX "pos_transactions_companyId_transactionAt_idx" ON "pos_transactions"("companyId", "transactionAt");

-- CreateIndex
CREATE INDEX "pos_transactions_sessionId_idx" ON "pos_transactions"("sessionId");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_registers" ADD CONSTRAINT "pf_registers_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pf_registers" ADD CONSTRAINT "pf_registers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esi_registers" ADD CONSTRAINT "esi_registers_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esi_registers" ADD CONSTRAINT "esi_registers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciation_schedules" ADD CONSTRAINT "asset_depreciation_schedules_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_tills" ADD CONSTRAINT "pos_tills_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tillId_fkey" FOREIGN KEY ("tillId") REFERENCES "pos_tills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
