import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { ReconciliationWorkspace } from "./workspace-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function ReconciliationRunPage({
  params,
}: {
  params: Promise<{ orgSlug: string; runId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, runId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  // Fetch full run data (same shape as the GET API)
  const run = await prisma.reconciliationRun.findFirst({
    where: {
      id:        runId,
      statement: { bankAccount: { companyId: ctx.company.id } },
    },
    include: {
      statement: {
        include: {
          bankAccount: { select: { id: true, bankName: true, maskedNumber: true, chartAccountId: true } },
          lines: {
            orderBy: { date: "asc" },
            include: {
              matches: {
                where:   { runId },
                select:  { id: true, status: true, matchType: true, confidenceScore: true, journalLineId: true, paymentId: true },
              },
            },
          },
        },
      },
      matches: {
        include: {
          statementLine: { select: { id: true, date: true, description: true, debitAmount: true, creditAmount: true, balance: true, reconciliationStatus: true } },
        },
      },
    },
  })
  if (!run) notFound()

  const stmt        = run.statement
  const windowStart = new Date(stmt.startDate); windowStart.setDate(windowStart.getDate() - 7)
  const windowEnd   = new Date(stmt.endDate);   windowEnd.setDate(windowEnd.getDate() + 7)

  const matchedJLineIds = new Set(
    run.matches
      .filter((m) => m.journalLineId && ["MATCHED","CLEARED"].includes(m.status))
      .map((m) => m.journalLineId!),
  )

  const [unmatchedJLines, adjustAccounts] = await Promise.all([
    prisma.journalLine.findMany({
      where: {
        accountId:    stmt.bankAccount.chartAccountId,
        id:           { notIn: Array.from(matchedJLineIds) },
        journalEntry: { companyId: ctx.company.id, status: "POSTED", date: { gte: windowStart, lte: windowEnd } },
      },
      include: { journalEntry: { select: { id: true, date: true, voucherNumber: true, description: true } } },
      orderBy: { journalEntry: { date: "asc" } },
      take: 200,
    }),
    prisma.chartAccount.findMany({
      where:   { companyId: ctx.company.id, isActive: true, isPosting: true },
      select:  { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/reconciliation`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Reconciliation
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="text-sm font-medium text-[#37322F]">Run {runId.slice(-6).toUpperCase()}</span>
        </div>
      </header>

      <ReconciliationWorkspace
        orgSlug={orgSlug}
        runId={runId}
        initialData={{ run: run as any, unmatchedJLines: unmatchedJLines as any }}
        adjustAccounts={adjustAccounts}
      />
    </div>
  )
}
