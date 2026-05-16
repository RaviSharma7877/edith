import type { ParseResult, ParsedTable } from "./types"
import { extractTablesFromPdf } from "./pdf-extractor"

// ── CSV ────────────────────────────────────────────────────────────────────────

async function parseCSV(buffer: Buffer): Promise<ParsedTable[]> {
  const Papa = (await import("papaparse")).default
  const text = buffer.toString("utf-8")

  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
    header:         false,
  })

  if (!result.data.length) return []

  const rows    = result.data as string[][]
  const headers = rows[0].map((h) => String(h).trim())
  const body    = rows.slice(1).map((r) => r.map((c) => String(c ?? "").trim()))

  return [{ headers, rows: body }]
}

// ── XLSX / XLS / ODS ──────────────────────────────────────────────────────────

async function parseXLSX(buffer: Buffer): Promise<{ tables: ParsedTable[]; sheetNames: string[] }> {
  const XLSX = await import("xlsx")

  const workbook   = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const tables:    ParsedTable[]  = []
  const sheetNames = workbook.SheetNames

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const data  = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    if (!data.length) continue

    const headers = (data[0] as unknown[]).map((h) => String(h ?? "").trim()).filter(Boolean)
    if (!headers.length) continue

    const rows = data.slice(1).map((r) =>
      headers.map((_, i) => {
        const cell = (r as unknown[])[i]
        if (cell instanceof Date) {
          return cell.toISOString().split("T")[0]
        }
        return String(cell ?? "").trim()
      }),
    ).filter((r) => r.some((c) => c !== ""))

    tables.push({ headers, rows })
  }

  return { tables, sheetNames }
}

// ── DOCX ──────────────────────────────────────────────────────────────────────

async function parseDOCX(buffer: Buffer): Promise<{ tables: ParsedTable[]; rawText: string }> {
  const mammoth = await import("mammoth")
  const tables: ParsedTable[] = []

  // Extract raw HTML — mammoth preserves table structure
  const htmlResult = await mammoth.convertToHtml({ buffer })
  const html       = htmlResult.value

  // Parse <table> elements from the HTML string
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? []

  for (const tableHtml of tableMatches) {
    const rows: string[][] = []

    // Extract <tr> blocks
    const trMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? []
    for (const tr of trMatches) {
      const cellMatches = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? []
      const cells = cellMatches.map((cell) =>
        cell.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      )
      rows.push(cells)
    }

    if (rows.length < 2) continue

    tables.push({ headers: rows[0], rows: rows.slice(1) })
  }

  // Also extract plain text
  const textResult = await mammoth.extractRawText({ buffer })

  return { tables, rawText: textResult.value }
}

// ── Master parse function ──────────────────────────────────────────────────────

export async function parseFile(buffer: Buffer, fileName: string): Promise<ParseResult> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""

  let tables:     ParsedTable[] = []
  let rawText:    string | undefined
  let sheetNames: string[] | undefined
  let fileType:   ParseResult["fileType"] = "unknown"

  if (ext === "csv" || ext === "tsv") {
    fileType = "csv"
    tables   = await parseCSV(buffer)
  } else if (["xlsx", "xls", "ods"].includes(ext)) {
    fileType = "xlsx"
    const result = await parseXLSX(buffer)
    tables     = result.tables
    sheetNames = result.sheetNames
  } else if (ext === "pdf") {
    fileType = "pdf"
    const result = await extractTablesFromPdf(buffer)
    tables   = result.tables
    rawText  = result.rawText
  } else if (["docx", "doc"].includes(ext)) {
    fileType = "docx"
    const result = await parseDOCX(buffer)
    tables   = result.tables
    rawText  = result.rawText
  }

  // Flatten: use first table for column detection
  const firstTable     = tables[0]
  const detectedColumns = firstTable?.headers ?? []
  const previewRows     = (firstTable?.rows.slice(0, 10) ?? []).map((row) =>
    Object.fromEntries(detectedColumns.map((col, i) => [col, row[i] ?? ""])),
  )

  return { fileType, tables, rawText, sheetNames, detectedColumns, previewRows }
}
