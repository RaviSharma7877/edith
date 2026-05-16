import { getServerSession }  from "next-auth"
import { authOptions }       from "@/lib/auth"
import { prisma }            from "@/lib/prisma"
import { resolveCompany }    from "@/lib/api/resolve-company"
import { NextResponse }      from "next/server"
import { processImportRows } from "@/lib/import/processor"
import type { ImportType, FieldMapping } from "@/lib/import/types"

export const runtime     = "nodejs"
export const maxDuration = 120

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const job = await prisma.importJob.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
  })
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const errorRows = await prisma.importRow.findMany({
    where: { importJobId: id, status: "error" },
  })
  if (!errorRows.length) return NextResponse.json({ message: "No error rows to retry" })

  const dataRows = errorRows.map((r) => r.rawData as Record<string, string>)
  const mapping  = (job.mapping ?? {}) as FieldMapping

  const results = await processImportRows(
    dataRows, mapping, job.type as ImportType, ctx.company.id, ctx.workspaceId, ctx.userId,
  )

  // Update each retried row
  for (const result of results) {
    const rowRecord = errorRows[result.rowIndex]
    await prisma.importRow.update({
      where: { id: rowRecord.id },
      data: {
        status:       result.status,
        errorMessage: result.error ?? null,
        entityId:     result.entityId ?? null,
        entityType:   result.entityType ?? null,
      },
    })
  }

  const newSuccess = results.filter((r) => r.status === "success").length
  const stillError = results.filter((r) => r.status === "error").length

  // Update job counters
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      successRows: { increment: newSuccess },
      errorRows:   { decrement: newSuccess },
      status:      stillError === 0 ? "done" : "done",
    },
  })

  return NextResponse.json({ retried: results.length, newSuccess, stillError, results })
}
