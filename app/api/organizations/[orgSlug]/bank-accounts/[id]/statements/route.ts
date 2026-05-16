import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const statements = await prisma.bankStatement.findMany({
    where:   { bankAccountId: id },
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { lines: true, runs: true } },
      runs:   { orderBy: { startedAt: "desc" }, take: 1, select: { id: true, completedAt: true, totalMatched: true, totalUnmatched: true } },
    },
  })

  return NextResponse.json(statements)
}

// POST body: { startDate, endDate, openingBalance, closingBalance, sourceType, lines: Line[] }
// Lines: { date, description, reference?, debitAmount?, creditAmount?, balance? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { startDate, endDate, openingBalance, closingBalance, sourceType, lines } = body

  if (!startDate || !endDate)
    return NextResponse.json({ error: "startDate and endDate are required." }, { status: 400 })
  if (!Array.isArray(lines) || lines.length === 0)
    return NextResponse.json({ error: "At least one statement line is required." }, { status: 400 })

  const start = new Date(startDate)
  const end   = new Date(endDate)
  if (start > end)
    return NextResponse.json({ error: "startDate must be before endDate." }, { status: 400 })

  // Duplicate import detection: same account + overlapping date range
  const overlap = await prisma.bankStatement.findFirst({
    where: {
      bankAccountId: id,
      startDate: { lte: end },
      endDate:   { gte: start },
    },
  })
  if (overlap)
    return NextResponse.json({
      error: `A statement already covers ${overlap.startDate.toISOString().split("T")[0]} – ${overlap.endDate.toISOString().split("T")[0]}. Delete it first or adjust the date range.`,
    }, { status: 409 })

  // Validate lines
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!l.date)        return NextResponse.json({ error: `Line ${i + 1}: date is required.`        }, { status: 400 })
    if (!l.description) return NextResponse.json({ error: `Line ${i + 1}: description is required.` }, { status: 400 })
    if (!l.debitAmount && !l.creditAmount)
      return NextResponse.json({ error: `Line ${i + 1}: debitAmount or creditAmount is required.` }, { status: 400 })
  }

  const statement = await prisma.bankStatement.create({
    data: {
      bankAccountId:  id,
      startDate:      start,
      endDate:        end,
      openingBalance: parseFloat(openingBalance ?? "0"),
      closingBalance: parseFloat(closingBalance ?? "0"),
      sourceType:     sourceType ?? "csv",
      importedById:   ctx.userId,
      lines: {
        create: lines.map((l: any) => ({
          date:         new Date(l.date),
          description:  l.description.trim(),
          reference:    l.reference?.trim() || null,
          debitAmount:  l.debitAmount  ? parseFloat(l.debitAmount)  : null,
          creditAmount: l.creditAmount ? parseFloat(l.creditAmount) : null,
          balance:      l.balance      ? parseFloat(l.balance)      : null,
        })),
      },
    },
    include: { _count: { select: { lines: true } } },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "BANK_STATEMENT_IMPORTED",
      resourceType: "bank_statement",
      resourceId:   statement.id,
      resourceName: `${account.bankName} ${start.toISOString().split("T")[0]} – ${end.toISOString().split("T")[0]}`,
    },
  })

  return NextResponse.json(statement, { status: 201 })
}
