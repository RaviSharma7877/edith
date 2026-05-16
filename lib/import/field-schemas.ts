import type { FieldDef, ImportType } from "./types"

const FIELD_SCHEMAS: Record<ImportType, FieldDef[]> = {
  customers: [
    { key: "name",         label: "Name",          required: true,  type: "string" },
    { key: "email",        label: "Email",          required: false, type: "string" },
    { key: "phone",        label: "Phone",          required: false, type: "string" },
    { key: "gstin",        label: "GSTIN",          required: false, type: "string" },
    { key: "pan",          label: "PAN",            required: false, type: "string" },
    { key: "addressLine1", label: "Address Line 1", required: false, type: "string" },
    { key: "city",         label: "City",           required: false, type: "string" },
    { key: "state",        label: "State",          required: false, type: "string" },
    { key: "pincode",      label: "Pincode",        required: false, type: "string" },
    { key: "country",      label: "Country",        required: false, type: "string" },
    { key: "currency",     label: "Currency",       required: false, type: "string" },
    { key: "creditLimit",  label: "Credit Limit",   required: false, type: "number" },
  ],

  vendors: [
    { key: "name",         label: "Name",          required: true,  type: "string" },
    { key: "email",        label: "Email",          required: false, type: "string" },
    { key: "phone",        label: "Phone",          required: false, type: "string" },
    { key: "gstin",        label: "GSTIN",          required: false, type: "string" },
    { key: "pan",          label: "PAN",            required: false, type: "string" },
    { key: "addressLine1", label: "Address Line 1", required: false, type: "string" },
    { key: "city",         label: "City",           required: false, type: "string" },
    { key: "state",        label: "State",          required: false, type: "string" },
    { key: "pincode",      label: "Pincode",        required: false, type: "string" },
    { key: "country",      label: "Country",        required: false, type: "string" },
    { key: "currency",     label: "Currency",       required: false, type: "string" },
  ],

  chart_of_accounts: [
    { key: "code",        label: "Account Code",   required: true,  type: "string" },
    { key: "name",        label: "Account Name",   required: true,  type: "string" },
    { key: "type",        label: "Account Type",   required: true,  type: "string" },
    { key: "subtype",     label: "Sub-type",       required: false, type: "string" },
    { key: "parentCode",  label: "Parent Code",    required: false, type: "string" },
    { key: "description", label: "Description",    required: false, type: "string" },
    { key: "currency",    label: "Currency",       required: false, type: "string" },
    { key: "taxCode",     label: "Tax Code",       required: false, type: "string" },
  ],

  opening_balances: [
    { key: "accountCode", label: "Account Code",  required: true,  type: "string" },
    { key: "accountName", label: "Account Name",  required: false, type: "string" },
    { key: "debit",       label: "Debit",         required: false, type: "number" },
    { key: "credit",      label: "Credit",        required: false, type: "number" },
    { key: "asOfDate",    label: "As Of Date",    required: true,  type: "date"   },
    { key: "currency",    label: "Currency",      required: false, type: "string" },
  ],

  invoices: [
    { key: "invoiceNumber", label: "Invoice No",    required: true,  type: "string" },
    { key: "customerName",  label: "Customer Name", required: true,  type: "string" },
    { key: "invoiceDate",   label: "Invoice Date",  required: true,  type: "date"   },
    { key: "dueDate",       label: "Due Date",      required: false, type: "date"   },
    { key: "amount",        label: "Amount",        required: true,  type: "number" },
    { key: "taxAmount",     label: "Tax Amount",    required: false, type: "number" },
    { key: "currency",      label: "Currency",      required: false, type: "string" },
    { key: "description",   label: "Description",   required: false, type: "string" },
    { key: "status",        label: "Status",        required: false, type: "string" },
  ],

  bills: [
    { key: "billNumber",  label: "Bill No",       required: true,  type: "string" },
    { key: "vendorName",  label: "Vendor Name",   required: true,  type: "string" },
    { key: "billDate",    label: "Bill Date",     required: true,  type: "date"   },
    { key: "dueDate",     label: "Due Date",      required: false, type: "date"   },
    { key: "amount",      label: "Amount",        required: true,  type: "number" },
    { key: "taxAmount",   label: "Tax Amount",    required: false, type: "number" },
    { key: "currency",    label: "Currency",      required: false, type: "string" },
    { key: "description", label: "Description",   required: false, type: "string" },
  ],

  journals: [
    { key: "journalNumber", label: "Journal No",    required: false, type: "string" },
    { key: "date",          label: "Date",          required: true,  type: "date"   },
    { key: "narration",     label: "Narration",     required: false, type: "string" },
    { key: "accountCode",   label: "Account Code",  required: true,  type: "string" },
    { key: "accountName",   label: "Account Name",  required: false, type: "string" },
    { key: "debit",         label: "Debit",         required: false, type: "number" },
    { key: "credit",        label: "Credit",        required: false, type: "number" },
    { key: "currency",      label: "Currency",      required: false, type: "string" },
  ],
}

export function getFieldSchema(type: ImportType): FieldDef[] {
  return FIELD_SCHEMAS[type] ?? []
}

export function autoMap(columns: string[], type: ImportType): Record<string, string> {
  const fields  = getFieldSchema(type)
  const mapping: Record<string, string> = {}

  for (const col of columns) {
    const normalized = col.toLowerCase().replace(/[\s_\-]+/g, "")
    const match = fields.find((f) => {
      const fNorm  = f.key.toLowerCase()
      const lNorm  = f.label.toLowerCase().replace(/[\s_\-]+/g, "")
      return normalized === fNorm || normalized === lNorm ||
        normalized.includes(fNorm) || fNorm.includes(normalized)
    })
    if (match) mapping[col] = match.key
  }

  return mapping
}
