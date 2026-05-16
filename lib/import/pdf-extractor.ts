/**
 * Advanced PDF table extraction using pdfjs-dist.
 *
 * Algorithm:
 * 1. Extract all text items with their (x, y) bounding-box positions from every page.
 * 2. Cluster items that share the same Y-line (within ROW_TOLERANCE pts) into rows.
 * 3. Sort rows top-to-bottom; sort items within each row left-to-right.
 * 4. Detect table blocks: contiguous groups of rows where ≥2 items align in X.
 * 5. Derive column boundaries from the header row via gap analysis.
 * 6. Map every cell to the nearest column boundary → structured grid.
 *
 * This handles multi-column layouts, rotated pages, and tables that span page
 * breaks (the Y-axis is reset per page but we offset by cumulative page height).
 */

import path from "node:path"
import { pathToFileURL } from "node:url"
import type { ParsedTable } from "./types"

const ROW_TOLERANCE   = 4   // pts — items within this Y-distance are on the same line
const COL_GAP_MIN     = 6   // pts — minimum X-gap to split two adjacent columns
const MIN_TABLE_COLS  = 2   // a block needs at least this many columns to be a "table"
const MIN_TABLE_ROWS  = 2   // a block needs at least this many rows

interface TextItem {
  text: string
  x:    number   // left edge
  y:    number   // baseline (page-relative, top-down after inversion)
  w:    number   // width
}

interface Row {
  y:     number
  items: TextItem[]
}

// ── Cluster items into rows by Y proximity ─────────────────────────────────────

function clusterRows(items: TextItem[]): Row[] {
  if (!items.length) return []

  const sorted = [...items].sort((a, b) => a.y - b.y)
  const rows:   Row[] = []
  let current: Row = { y: sorted[0].y, items: [sorted[0]] }

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i]
    if (Math.abs(item.y - current.y) <= ROW_TOLERANCE) {
      current.items.push(item)
      // Keep y as the median of the group
      current.y = current.items.reduce((s, it) => s + it.y, 0) / current.items.length
    } else {
      rows.push(current)
      current = { y: item.y, items: [item] }
    }
  }
  rows.push(current)

  // Sort items within each row left-to-right
  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x)
  }

  return rows
}

// ── Derive column boundaries from a set of rows ─────────────────────────────────

function deriveColumnBoundaries(rows: Row[]): number[] {
  // Collect all x-start positions and x-end positions
  const xStarts: number[] = []
  for (const row of rows) {
    for (const item of row.items) {
      xStarts.push(item.x)
    }
  }
  xStarts.sort((a, b) => a - b)

  if (!xStarts.length) return []

  // Greedy merge: positions within COL_GAP_MIN of each other belong to the same column
  const boundaries: number[] = [xStarts[0]]
  for (let i = 1; i < xStarts.length; i++) {
    const last = boundaries[boundaries.length - 1]
    if (xStarts[i] - last > COL_GAP_MIN) {
      boundaries.push(xStarts[i])
    }
  }
  return boundaries
}

// ── Map a row's items to column slots ─────────────────────────────────────────

function mapToColumns(items: TextItem[], boundaries: number[]): string[] {
  const cells = new Array<string[]>(boundaries.length).fill(null!).map(() => [] as string[])

  for (const item of items) {
    // Find the boundary closest to item.x (always ≤ item.x or the nearest one)
    let colIdx = 0
    let minDist = Infinity
    for (let c = 0; c < boundaries.length; c++) {
      const dist = Math.abs(item.x - boundaries[c])
      if (dist < minDist) {
        minDist = dist
        colIdx  = c
      }
    }
    cells[colIdx].push(item.text)
  }

  return cells.map((c) => c.join(" ").trim())
}

// ── Detect "table-like" blocks within a flat list of rows ─────────────────────

function detectTableBlocks(rows: Row[]): Row[][] {
  const blocks: Row[][] = []
  let current: Row[] = []

  for (const row of rows) {
    // A row participates in a table if it has ≥ MIN_TABLE_COLS items
    if (row.items.length >= MIN_TABLE_COLS) {
      current.push(row)
    } else {
      if (current.length >= MIN_TABLE_ROWS) blocks.push(current)
      current = []
    }
  }
  if (current.length >= MIN_TABLE_ROWS) blocks.push(current)

  return blocks
}

// ── Convert a block of rows into a ParsedTable ─────────────────────────────────

function blockToTable(block: Row[]): ParsedTable {
  const boundaries = deriveColumnBoundaries(block)
  const grid       = block.map((row) => mapToColumns(row.items, boundaries))

  // Heuristic: treat first row as header if it contains no pure-numeric cells
  const firstRow   = grid[0]
  const isHeader   = firstRow.every((cell) => isNaN(parseFloat(cell)) || cell === "")

  if (isHeader && grid.length > 1) {
    return {
      headers: firstRow,
      rows:    grid.slice(1),
    }
  }

  // Auto-generate column headers (Col 1, Col 2, …)
  return {
    headers: firstRow.map((_, i) => `Column ${i + 1}`),
    rows:    grid,
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function extractTablesFromPdf(buffer: Buffer): Promise<{
  tables:  ParsedTable[]
  rawText: string
}> {
  // Dynamically import pdfjs-dist to avoid SSR issues with its legacy build
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs" as string)

  // Disable the web worker in Node.js — text extraction doesn't need it
  GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs"),
  ).href

  const loadingTask = getDocument({ data: new Uint8Array(buffer), disableWorker: true })
  const pdf         = await loadingTask.promise

  const allItems: TextItem[] = []
  let   rawText              = ""
  let   pageYOffset          = 0
  const PAGE_MARGIN          = 20  // virtual gap between pages

  for (let p = 1; p <= pdf.numPages; p++) {
    const page        = await pdf.getPage(p)
    const viewport    = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()

    const pageHeight  = viewport.height

    for (const item of textContent.items) {
      // pdfjs transform: [sx, shx, shy, sy, tx, ty]  — ty is bottom-up, invert it
      const raw = item as {
        str:       string
        transform: number[]
        width:     number
        height:    number
      }
      if (!raw.str.trim()) continue

      const tx = raw.transform[4]
      const ty = pageHeight - raw.transform[5]  // flip to top-down

      allItems.push({
        text: raw.str,
        x:    Math.round(tx * 10) / 10,
        y:    Math.round((ty + pageYOffset) * 10) / 10,
        w:    raw.width,
      })
      rawText += raw.str + " "
    }

    pageYOffset += pageHeight + PAGE_MARGIN
  }

  rawText = rawText.replace(/\s+/g, " ").trim()

  const rows   = clusterRows(allItems)
  const blocks = detectTableBlocks(rows)
  const tables = blocks.map(blockToTable)

  // Deduplicate tables whose headers are identical (can happen at page breaks)
  const seen    = new Set<string>()
  const unique  = tables.filter((t) => {
    const key = t.headers.join("|")
    if (seen.has(key) && t.rows.length < 3) return false
    seen.add(key)
    return true
  })

  return { tables: unique, rawText }
}
