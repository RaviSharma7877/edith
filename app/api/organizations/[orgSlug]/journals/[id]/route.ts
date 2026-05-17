import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import type { TransactionDirection } from "@prisma/client"

// ── GET /api/organizations/[orgSlug]/journals/[id] ────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      lines: {
        orderBy: [{ direction: "asc" }, { id: "asc" }],
        include: { account: { select: { id: true, code: true, name: true, type: true } } },
      },
      attachments: true,
      reversalOf:  { select: { id: true, voucherNumber: true } },
      reversedBy:  { select: { id: true, voucherNumber: true } },
    },
  })

  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })
  return NextResponse.json(entry)
}

// ── PATCH /api/organizations/[orgSlug]/journals/[id] ──────────────────────────
// Only DRAFT entries can be edited.

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId: ctx.company.id },
  })
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })

  if (entry.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT journal entries can be edited." }, { status: 409 })
  }

  const body = await req.json()
  const { date, description, narration, reference, lines } = body

  const headerData: Record<string, unknown> = {}
  if (date        !== undefined) headerData.date        = new Date(date)
  if (description !== undefined) headerData.description = description?.trim() || null
  if (narration   !== undefined) headerData.narration   = narration?.trim()   || null
  if (reference   !== undefined) headerData.reference   = reference?.trim()   || null

  if (lines !== undefined) {
    if (!Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: "At least 2 lines are required." }, { status: 400 })
    }

    type LineInput = { direction: string; amount: number | string; accountId: string; description?: string; costCenterId?: string; projectId?: string; branchId?: string; taxCodeId?: string; taxRate?: number | null; taxAmount?: number | null }
    const totalDebit  = (lines as LineInput[]).filter((l) => l.direction === "DEBIT")
                             .reduce((s: number, l) => s + Number(l.amount), 0)
    const totalCredit = (lines as LineInput[]).filter((l) => l.direction === "CREDIT")
                             .reduce((s: number, l) => s + Number(l.amount), 0)

    headerData.totalDebit  = String(totalDebit)
    headerData.totalCredit = String(totalCredit)

    await prisma.$transaction([
      prisma.journalLine.deleteMany({ where: { journalEntryId: id } }),
      prisma.journalEntry.update({ where: { id }, data: headerData }),
      ...(lines as LineInput[]).map((l) =>
        prisma.journalLine.create({
          data: {
            journalEntryId: id,
            accountId:      l.accountId,
            direction:      l.direction as TransactionDirection,
            amount:         String(Number(l.amount)),
            description:    l.description?.trim()  || null,
            costCenterId:   l.costCenterId          || null,
            projectId:      l.projectId             || null,
            branchId:       l.branchId              || null,
            taxCodeId:      l.taxCodeId             || null,
            taxRate:        l.taxRate   != null ? String(l.taxRate)   : null,
            taxAmount:      l.taxAmount != null ? String(l.taxAmount) : null,
          },
        }),
      ),
    ])
  } else if (Object.keys(headerData).length > 0) {
    await prisma.journalEntry.update({ where: { id }, data: headerData })
  }

  const updated = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: { include: { account: { select: { id: true, code: true, name: true } } } },
    },
  })

  return NextResponse.json(updated)
}
