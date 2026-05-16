import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

const PAGE_SIZE = 50

const actorSelect = { id: true, displayName: true, email: true } satisfies Prisma.UserSelect

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url          = new URL(req.url)
  const search       = url.searchParams.get("search")       ?? ""
  const actionFilter = url.searchParams.get("action")       ?? ""
  const severity     = url.searchParams.get("severity")     ?? ""
  const resourceType = url.searchParams.get("resourceType") ?? ""
  const actorId      = url.searchParams.get("actorId")      ?? ""
  const from         = url.searchParams.get("from")
  const to           = url.searchParams.get("to")
  const cursor       = url.searchParams.get("cursor")

  const fromDate = from ? new Date(from) : undefined
  const toDate   = to   ? new Date(to)   : undefined
  if (toDate) toDate.setHours(23, 59, 59, 999)

  const where: Prisma.AuditLogWhereInput = { workspaceId: ctx.workspaceId }

  if (actionFilter)  where.action       = actionFilter as Prisma.EnumAuditActionFilter
  if (severity)      where.severity     = severity     as Prisma.EnumAuditSeverityFilter
  if (resourceType)  where.resourceType = resourceType
  if (actorId)       where.actorId      = actorId

  if (fromDate || toDate || cursor) {
    const dateFilter: Prisma.DateTimeFilter<"AuditLog"> = {}
    if (fromDate) dateFilter.gte = fromDate
    if (toDate)   dateFilter.lte = toDate
    if (cursor)   dateFilter.lt  = new Date(cursor)
    where.createdAt = dateFilter
  }

  if (search) {
    where.OR = [
      { resourceName: { contains: search, mode: "insensitive" } },
      { description:  { contains: search, mode: "insensitive" } },
    ]
  }

  const [logs, actorRows] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: actorSelect } },
      orderBy: { createdAt: "desc" },
      take:    PAGE_SIZE + 1,
    }),
    prisma.auditLog.findMany({
      where:    { workspaceId: ctx.workspaceId, actorId: { not: null } },
      distinct: ["actorId"],
      include:  { actor: { select: actorSelect } },
      take:     100,
    }),
  ])

  const hasMore    = logs.length > PAGE_SIZE
  const items      = hasMore ? logs.slice(0, PAGE_SIZE) : logs
  const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

  const actors = actorRows
    .map((l) => l.actor)
    .filter(Boolean)
    .filter((a, i, arr) => arr.findIndex((b) => b?.id === a?.id) === i)
    .map((a) => ({ id: a!.id, name: a!.displayName, email: a!.email }))

  return NextResponse.json({ items, nextCursor, actors })
}
