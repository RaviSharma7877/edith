import { prisma } from "@/lib/prisma"
import type { VoucherFormConfig } from "./voucher-form-config"
import type { VoucherType } from "@prisma/client"

interface SeedRow {
  key:             string
  label:           string
  prefix:          string
  baseVoucherType: VoucherType
  sortOrder:       number
  isActive:        boolean
  formConfig:      VoucherFormConfig
}

const SYSTEM_CONFIGS: SeedRow[] = [
  {
    key: "JOURNAL_ENTRY", label: "Journal Entry", prefix: "JV",
    baseVoucherType: "JOURNAL_ENTRY", sortOrder: 10, isActive: true,
    formConfig: {
      party:          { show: false, label: "", type: "none", required: false },
      defaultLines:   [],
      lineConstraints:{ minLines: 2 },
      simplifiedMode: { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "PAYMENT_RECEIPT", label: "Receipt Voucher", prefix: "RV",
    baseVoucherType: "PAYMENT_RECEIPT", sortOrder: 20, isActive: true,
    formConfig: {
      party: { show: true, label: "Received from", type: "customer", required: false },
      extraFields: [
        { key: "chequeNumber", label: "Cheque / UTR no.", fieldType: "text", required: false },
      ],
      defaultLines: [
        { position: 0, label: "Bank / Cash account", direction: "DEBIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "Income / Receivable account", direction: "CREDIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: true, amountLabel: "Amount received" },
    },
  },
  {
    key: "PAYMENT_DISBURSEMENT", label: "Payment Voucher", prefix: "PV",
    baseVoucherType: "PAYMENT_DISBURSEMENT", sortOrder: 30, isActive: true,
    formConfig: {
      party: { show: true, label: "Paid to", type: "vendor", required: false },
      extraFields: [
        { key: "chequeNumber", label: "Cheque / UTR no.", fieldType: "text", required: false },
      ],
      defaultLines: [
        { position: 0, label: "Bank / Cash account", direction: "CREDIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "Expense / Payable account", direction: "DEBIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: true, amountLabel: "Amount paid" },
    },
  },
  {
    key: "SALES_INVOICE", label: "Sales Invoice", prefix: "SI",
    baseVoucherType: "SALES_INVOICE", sortOrder: 40, isActive: true,
    formConfig: {
      party: { show: true, label: "Customer", type: "customer", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Receivable", direction: "DEBIT",
          accountSubtype: "ACCOUNTS_RECEIVABLE", locked: false, amountEditable: true },
        { position: 1, label: "Revenue account", direction: "CREDIT",
          accountSubtype: "OPERATING_REVENUE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "PURCHASE_BILL", label: "Purchase Bill", prefix: "PB",
    baseVoucherType: "PURCHASE_BILL", sortOrder: 50, isActive: true,
    formConfig: {
      party: { show: true, label: "Vendor", type: "vendor", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Payable", direction: "CREDIT",
          accountSubtype: "ACCOUNTS_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Expense account", direction: "DEBIT",
          accountSubtype: "OPERATING_EXPENSE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "CREDIT_NOTE", label: "Credit Note", prefix: "CN",
    baseVoucherType: "CREDIT_NOTE", sortOrder: 60, isActive: true,
    formConfig: {
      party: { show: true, label: "Customer", type: "customer", required: true },
      defaultLines: [
        { position: 0, label: "Revenue account", direction: "DEBIT",
          accountSubtype: "OPERATING_REVENUE", locked: false, amountEditable: true },
        { position: 1, label: "Accounts Receivable", direction: "CREDIT",
          accountSubtype: "ACCOUNTS_RECEIVABLE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "DEBIT_NOTE", label: "Debit Note", prefix: "DN",
    baseVoucherType: "DEBIT_NOTE", sortOrder: 70, isActive: true,
    formConfig: {
      party: { show: true, label: "Vendor", type: "vendor", required: true },
      defaultLines: [
        { position: 0, label: "Accounts Payable", direction: "DEBIT",
          accountSubtype: "ACCOUNTS_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Expense account", direction: "CREDIT",
          accountSubtype: "OPERATING_EXPENSE", locked: false, amountEditable: true },
      ],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "CONTRA", label: "Contra Entry", prefix: "CO",
    baseVoucherType: "CONTRA", sortOrder: 80, isActive: true,
    formConfig: {
      party: { show: false, label: "", type: "none", required: false },
      defaultLines: [
        { position: 0, label: "From account", direction: "CREDIT",
          accountSubtype: "BANK", locked: false, amountEditable: true },
        { position: 1, label: "To account", direction: "DEBIT",
          accountSubtype: "CASH", locked: false, amountEditable: true },
      ],
      lineConstraints: {
        minLines: 2, maxLines: 2,
        allowedDebitSubtypes:  ["CASH", "BANK"],
        allowedCreditSubtypes: ["CASH", "BANK"],
      },
      simplifiedMode: { enabled: true, amountLabel: "Transfer amount" },
    },
  },
  {
    key: "OPENING_BALANCE", label: "Opening Balance", prefix: "OB",
    baseVoucherType: "OPENING_BALANCE", sortOrder: 90, isActive: true,
    formConfig: {
      party:           { show: false, label: "", type: "none", required: false },
      defaultLines:    [],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "BANK_RECONCILIATION_ADJ", label: "Bank Adjustment", prefix: "BA",
    baseVoucherType: "BANK_RECONCILIATION_ADJ", sortOrder: 95, isActive: false,
    formConfig: {
      party:           { show: false, label: "", type: "none", required: false },
      defaultLines:    [],
      lineConstraints: { minLines: 2 },
      simplifiedMode:  { enabled: false, amountLabel: "" },
    },
  },
  {
    key: "TAX_ADJUSTMENT", label: "Tax Adjustment", prefix: "TA",
    baseVoucherType: "TAX_ADJUSTMENT", sortOrder: 100, isActive: true,
    formConfig: {
      party: { show: false, label: "", type: "none", required: false },
      defaultLines: [
        { position: 0, label: "Tax Payable account", direction: "DEBIT",
          accountSubtype: "TAX_PAYABLE", locked: false, amountEditable: true },
        { position: 1, label: "Offset account", direction: "CREDIT",
          accountSubtype: null, locked: false, amountEditable: true },
      ],
      lineConstraints: {
        minLines: 2,
        allowedDebitSubtypes: ["TAX_PAYABLE", "TAX_EXPENSE"],
      },
      simplifiedMode: { enabled: false, amountLabel: "" },
    },
  },
]

/**
 * Seeds all 11 system VoucherTypeConfig rows for a company.
 * Safe to call multiple times — uses upsert on (companyId, key).
 */
export async function seedCompanyVoucherTypes(
  companyId:   string,
  workspaceId?: string,
): Promise<void> {
  await Promise.all(
    SYSTEM_CONFIGS.map((row) =>
      prisma.voucherTypeConfig.upsert({
        where:  { companyId_key: { companyId, key: row.key } },
        update: {},
        create: {
          companyId,
          workspaceId:     workspaceId ?? null,
          key:             row.key,
          label:           row.label,
          prefix:          row.prefix,
          isSystem:        true,
          isActive:        row.isActive,
          sortOrder:       row.sortOrder,
          baseVoucherType: row.baseVoucherType,
          formConfig:      row.formConfig as object,
        },
      }),
    ),
  )
}
