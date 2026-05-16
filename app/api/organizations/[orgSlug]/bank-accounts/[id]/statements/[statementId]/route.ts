import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string; statementId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id, statementId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const statement = await prisma.bankStatement.findFirst({
    where: { id: statementId, bankAccountId: id },
    include: {
      lines: {
        orderBy: { date: "asc" },
        include: {
          matches: {
            where:   { status: { in: ["MATCHED", "CLEARED"] } },
            select:  { id: true, status: true, matchType: true, confidenceScore: true, paymentId: true, journalLineId: true },
          },
        },
      },
      runs: { orderBy: { startedAt: "desc" } },
    },
  })
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(statement)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string; statementId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id, statementId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const statement = await prisma.bankStatement.findFirst({ where: { id: statementId, bankAccountId: id } })
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (statement.isLocked)
    return NextResponse.json({ error: "This statement is locked and cannot be deleted." }, { status: 422 })

  await prisma.bankStatement.delete({ where: { id: statementId } })
  return NextResponse.json({ ok: true })
}
