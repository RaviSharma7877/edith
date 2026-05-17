import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { nextVoucherNumber } from "@/lib/ledger/ledger-service"
import type { VoucherType, TransactionDirection } from "@prisma/client"

// ── GET /api/organizations/[orgSlug]/journals ─────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url         = new URL(req.url)
  const status      = url.searchParams.get("status")      ?? undefined
  const voucherType = url.searchParams.get("voucherType") ?? undefined
  const page        = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1"))
  const limit       = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"))
  const skip        = (page - 1) * limit

  const where: Record<string, unknown> = { companyId: ctx.company.id }
  if (status)      where.status = status
  if (voucherType) where.voucherType = voucherType

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      select: {
        id: true, voucherNumber: true, voucherType: true, date: true,
        status: true, description: true, totalDebit: true, totalCredit: true,
        isReversal: true, reversalOfId: true, postedAt: true, createdAt: true,
        _count: { select: { lines: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ])

  return NextResponse.json({
    entries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

// ── POST /api/organizations/[orgSlug]/journals ────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { voucherType, date, description, narration, reference, lines = [], voucherTypeConfigId } = body

  if (!voucherType || !date) {
    return NextResponse.json({ error: "voucherType and date are required." }, { status: 400 })
  }
  if (!Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json({ error: "At least 2 lines are required." }, { status: 400 })
  }

  for (const line of lines) {
    if (!line.accountId || !line.direction || line.amount == null) {
      return NextResponse.json(
        { error: "Each line requires accountId, direction (DEBIT|CREDIT), and amount." },
        { status: 400 },
      )
    }
    if (!["DEBIT", "CREDIT"].includes(line.direction)) {
      return NextResponse.json({ error: "direction must be DEBIT or CREDIT." }, { status: 400 })
    }
    if (Number(line.amount) <= 0) {
      return NextResponse.json({ error: "Line amounts must be positive." }, { status: 400 })
    }
  }

  const totalDebit  = lines
    .filter((l: any) => l.direction === "DEBIT")
    .reduce((s: number, l: any) => s + Number(l.amount), 0)
  const totalCredit = lines
    .filter((l: any) => l.direction === "CREDIT")
    .reduce((s: number, l: any) => s + Number(l.amount), 0)

  let configPrefix:     string | undefined
  let resolvedConfigId: string | undefined
  if (voucherTypeConfigId) {
    const vtc = await prisma.voucherTypeConfig.findFirst({
      where:  { id: voucherTypeConfigId, companyId: ctx.company.id, deletedAt: null },
      select: { prefix: true, id: true },
    })
    if (!vtc) return NextResponse.json({ error: "Invalid voucherTypeConfigId." }, { status: 400 })
    configPrefix     = vtc.prefix
    resolvedConfigId = vtc.id
  }
  const voucherNumber = await nextVoucherNumber(
    ctx.company.id,
    voucherType as VoucherType,
    configPrefix ? { prefix: configPrefix, voucherTypeConfigId: resolvedConfigId } : undefined,
  )

  const entry = await prisma.journalEntry.create({
    data: {
      companyId:           ctx.company.id,
      voucherType:         voucherType as VoucherType,
      voucherTypeConfigId: resolvedConfigId ?? null,
      voucherNumber,
      date:         new Date(date),
      status:       "DRAFT",
      description:  description?.trim() || null,
      narration:    narration?.trim()   || null,
      reference:    reference?.trim()   || null,
      totalDebit:   String(totalDebit),
      totalCredit:  String(totalCredit),
      createdById:  ctx.userId,
      lines: {
        create: lines.map((l: any) => ({
          accountId:    l.accountId,
          direction:    l.direction as TransactionDirection,
          amount:       String(Number(l.amount)),
          description:  l.description?.trim()  || null,
          reference:    l.reference?.trim()    || null,
          costCenterId: l.costCenterId         || null,
          projectId:    l.projectId            || null,
          branchId:     l.branchId             || null,
          taxCodeId:    l.taxCodeId            || null,
          taxRate:      l.taxRate   != null ? String(l.taxRate)   : null,
          taxAmount:    l.taxAmount != null ? String(l.taxAmount) : null,
          baseAmount:   l.baseAmount!= null ? String(l.baseAmount): null,
        })),
      },
    },
    include: { lines: true },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "JOURNAL_DRAFTED",
      severity:     "INFO",
      resourceType: "journal_entry",
      resourceId:   entry.id,
      resourceName: entry.voucherNumber,
      amount:       String(totalDebit),
      currency:     ctx.company.currency,
      description:  `Journal entry "${entry.voucherNumber}" drafted`,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
