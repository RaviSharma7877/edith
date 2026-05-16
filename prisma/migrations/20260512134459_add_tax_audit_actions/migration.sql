-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TAX_REGISTRATION_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'TAX_REGISTRATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TAX_REGISTRATION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'EINVOICE_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'EINVOICE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'EWAY_BILL_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'EWAY_BILL_CANCELLED';
