-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('ACTIVE', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CoaTemplate" AS ENUM ('STANDARD_INDIA', 'STANDARD_US', 'STANDARD_UK', 'BLANK');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('GST', 'VAT', 'SALES_TAX', 'NONE');

-- AlterTable
ALTER TABLE "accounting_periods" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "reopenReason" TEXT,
ADD COLUMN     "reopenedAt" TIMESTAMP(3),
ADD COLUMN     "reopenedById" TEXT,
ADD COLUMN     "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "coaTemplate" "CoaTemplate" NOT NULL DEFAULT 'STANDARD_INDIA',
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-IN',
ADD COLUMN     "openingBalanceChoice" TEXT NOT NULL DEFAULT 'fresh',
ADD COLUMN     "openingBalanceDate" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setupStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxMode" "TaxMode" NOT NULL DEFAULT 'GST',
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "fiscal_years" ADD COLUMN     "status" "FiscalYearStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "accounting_periods_fiscalYearId_idx" ON "accounting_periods"("fiscalYearId");
