/**
 * POST /api/organizations/[orgSlug]/imports/parse
 *
 * Accepts a multipart file upload, parses it with the appropriate parser
 * (CSV / XLSX / PDF / DOCX), and returns a preview of columns and rows.
 * No data is written to the database — this is purely a parse + preview step.
 */

import { getServerSession }  from "next-auth"
import { authOptions }       from "@/lib/auth"
import { resolveCompany }    from "@/lib/api/resolve-company"
import { NextResponse }      from "next/server"
import { parseFile }         from "@/lib/import/parsers"
import { autoMap }           from "@/lib/import/field-schemas"
import type { ImportType }   from "@/lib/import/types"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  const file       = formData.get("file")
  const importType = (formData.get("type") as ImportType) ?? "customers"

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  const MAX_BYTES = 20 * 1024 * 1024  // 20 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 })
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const fileName = file.name

  let parseResult
  try {
    parseResult = await parseFile(buffer, fileName)
  } catch (err) {
    return NextResponse.json({
      error: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 422 })
  }

  const autoMapping = autoMap(parseResult.detectedColumns, importType)

  return NextResponse.json({
    fileType:        parseResult.fileType,
    sheetNames:      parseResult.sheetNames,
    tables:          parseResult.tables.length,
    detectedColumns: parseResult.detectedColumns,
    previewRows:     parseResult.previewRows,
    autoMapping,
    // Include all tables for multi-table PDF/XLSX
    allTables: parseResult.tables.map((t, i) => ({
      index:   i,
      headers: t.headers,
      rowCount: t.rows.length,
    })),
  })
}
