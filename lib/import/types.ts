// Shared types for the import pipeline

export interface ParsedTable {
  headers: string[]
  rows:     string[][]    // each inner array = one row, aligned to headers
}

export interface ParseResult {
  fileType:        "csv" | "xlsx" | "pdf" | "docx" | "unknown"
  tables:          ParsedTable[]   // one per detected table / sheet
  rawText?:        string          // full document text (PDF/docx)
  sheetNames?:     string[]        // xlsx sheet names
  detectedColumns: string[]        // first table's headers (convenience)
  previewRows:     Record<string, string>[]  // first 10 rows as {col: value}
}

export type ImportType =
  | "customers"
  | "vendors"
  | "chart_of_accounts"
  | "opening_balances"
  | "invoices"
  | "bills"
  | "journals"

export interface FieldDef {
  key:      string
  label:    string
  required: boolean
  type:     "string" | "number" | "date" | "boolean"
}

export type FieldMapping = Record<string, string>  // sourceColumn → targetField
