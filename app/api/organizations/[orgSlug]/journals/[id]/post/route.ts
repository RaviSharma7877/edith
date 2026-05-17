import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { computeEntryHash } from "@/lib/ledger/ledger-utils"

// ── POST /api/organizations/[orgSlug]/journals/[id]/post ──────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const entry = await prisma.journalEntry.findFirst({
    where:   { id, companyId: ctx.company.id },
    include: { lines: { include: { account: true } } },
  })
  if (!entry) return NextResponse.json({ error: "Journal entry not found" }, { status: 404 })

  if (!["DRAFT", "PENDING_APPROVAL"].includes(entry.status)) {
    return NextResponse.json(
      { error: `Cannot post a journal in "${entry.status}" status.` },
      { status: 409 },
    )
  }

  // Debit must equal Credit
  const totalDebit  = entry.lines
    .filter((l) => l.direction === "DEBIT")
    .reduce((s, l) => s + Number(l.amount), 0)
  const totalCredit = entry.lines
    .filter((l) => l.direction === "CREDIT")
    .reduce((s, l) => s + Number(l.amount), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return NextResponse.json(
      { error: `Journal is not balanced. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}` },
      { status: 422 },
    )
  }

  // All accounts must be active and postable
  const invalid = entry.lines.filter((l) => !l.account.isActive || !l.account.isPosting)
  if (invalid.length > 0) {
    const names = invalid.map((l) => `${l.account.code} – ${l.account.name}`).join(", ")
    return NextResponse.json({ error: `Accounts not postable: ${names}` }, { status: 422 })
  }

  // Period must be open
  const openPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      status:    "OPEN",
      startDate: { lte: entry.date },
      endDate:   { gte: entry.date },
      fiscalYear: { companyId: ctx.company.id },
    },
  })
  if (!openPeriod) {
    return NextResponse.json(
      { error: "No open accounting period covers this journal's date." },
      { status: 422 },
    )
  }

  // Build hash chain from ledger-utils (single source of truth)
  const lastPosted = await prisma.journalEntry.findFirst({
    where:   { companyId: ctx.company.id, status: "POSTED" },
    orderBy: { postedAt: "desc" },
    select:  { entryHash: true },
  })

  const entryHash = computeEntryHash(
    lastPosted?.entryHash ?? null,
    entry.voucherNumber,
    entry.date,
    totalDebit,
    entry.lines.map((l) => ({ accountId: l.accountId, direction: l.direction, amount: Number(l.amount) })),
  )

  const posted = await prisma.journalEntry.update({
    where: { id },
    data: {
      status:       "POSTED",
      postedById:   ctx.userId,
      postedAt:     new Date(),
      periodId:     openPeriod.id,
      previousHash: lastPosted?.entryHash ?? null,
      entryHash,
      totalDebit:   String(totalDebit),
      totalCredit:  String(totalCredit),
    },
    include: { lines: true },
  })

  await prisma.auditLog.create({
    data: {
      workspaceId:  ctx.workspaceId,
      actorId:      ctx.userId,
      action:       "JOURNAL_POSTED",
      severity:     "INFO",
      resourceType: "journal_entry",
      resourceId:   id,
      resourceName: entry.voucherNumber,
      amount:       String(totalDebit),
      currency:     ctx.company.currency,
      description:  `Journal entry "${entry.voucherNumber}" posted`,
    },
  })

  return NextResponse.json(posted)
}
