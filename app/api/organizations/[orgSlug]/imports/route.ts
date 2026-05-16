/**
 * GET  /api/organizations/[orgSlug]/imports  — list import jobs
 * POST /api/organizations/[orgSlug]/imports  — create + process import
 */

import { getServerSession }    from "next-auth"
import { authOptions }         from "@/lib/auth"
import { prisma }              from "@/lib/prisma"
import { resolveCompany }      from "@/lib/api/resolve-company"
import { NextResponse }        from "next/server"
import { parseFile }           from "@/lib/import/parsers"
import { processImportRows, hashRow } from "@/lib/import/processor"
import type { ImportType, FieldMapping } from "@/lib/import/types"

export const runtime     = "nodejs"
export const maxDuration = 120

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const jobs = await prisma.importJob.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
    take:    50,
    select:  {
      id: true, type: true, fileType: true, status: true, fileName: true,
      totalRows: true, successRows: true, errorRows: true, processedRows: true,
      createdAt: true, completedAt: true,
    },
  })

  return NextResponse.json(jobs)
}

// ── POST ───────────────────────────────────────────────────────────────────────

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
  const mappingRaw = formData.get("mapping") as string | null
  const tableIndex = parseInt(formData.get("tableIndex") as string ?? "0", 10)
  const idempotencyKey = (formData.get("idempotencyKey") as string) || undefined

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }

  if (!mappingRaw) {
    return NextResponse.json({ error: "mapping is required" }, { status: 400 })
  }

  let mapping: FieldMapping
  try {
    mapping = JSON.parse(mappingRaw)
  } catch {
    return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 })
  }

  // Idempotency: return existing job if key already used
  if (idempotencyKey) {
    const existing = await prisma.importJob.findUnique({ where: { idempotencyKey } })
    if (existing) return NextResponse.json(existing)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let parseResult
  try {
    parseResult = await parseFile(buffer, file.name)
  } catch (err) {
    return NextResponse.json({
      error: `Parse failed: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 422 })
  }

  const table = parseResult.tables[tableIndex] ?? parseResult.tables[0]
  if (!table) {
    return NextResponse.json({ error: "No tables detected in the file" }, { status: 422 })
  }

  // Build row objects from the selected table
  const dataRows: Record<string, string>[] = table.rows.map((r) =>
    Object.fromEntries(table.headers.map((h, i) => [h, r[i] ?? ""])),
  )

  // Create the import job record
  const job = await prisma.importJob.create({
    data: {
      workspaceId:  ctx.workspaceId,
      companyId:    ctx.company.id,
      type:         importType,
      fileType:     parseResult.fileType,
      fileName:     file.name,
      idempotencyKey,
      status:       "processing",
      totalRows:    dataRows.length,
      mapping:      mapping as object,
      startedAt:    new Date(),
      createdById:  ctx.userId,
    },
  })

  // Process rows
  const results = await processImportRows(
    dataRows, mapping, importType, ctx.company.id, ctx.workspaceId, ctx.userId,
  )

  const successRows = results.filter((r) => r.status === "success").length
  const errorRows   = results.filter((r) => r.status === "error").length
  const skipped     = results.filter((r) => r.status === "skipped").length

  // Persist per-row results
  await prisma.importRow.createMany({
    data: results.map((r) => ({
      importJobId:  job.id,
      rowIndex:     r.rowIndex,
      rawData:      dataRows[r.rowIndex] as object,
      status:       r.status,
      errorMessage: r.error ?? null,
      entityId:     r.entityId ?? null,
      entityType:   r.entityType ?? null,
      rowHash:      hashRow(dataRows[r.rowIndex]),
    })),
  })

  // Update job to done
  const finalJob = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status:       errorRows > 0 && successRows === 0 ? "failed" : "done",
      processedRows: results.length,
      successRows,
      errorRows,
      completedAt:  new Date(),
    },
  })

  return NextResponse.json({
    ...finalJob,
    rows: results,
    skipped,
  })
}
