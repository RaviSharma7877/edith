import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ReconciliationStarter } from "./reconciliation-starter"

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function ReconciliationPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const sp          = await searchParams
  const ctx         = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  // Recent reconciliation runs
  const runs = await prisma.reconciliationRun.findMany({
    where:   { statement: { bankAccount: { companyId: ctx.company.id } } },
    orderBy: { startedAt: "desc" },
    take:    20,
    include: {
      statement: {
        include: {
          bankAccount: { select: { id: true, bankName: true, maskedNumber: true } },
          _count:      { select: { lines: true } },
        },
      },
    },
  })

  // If launched from bank account detail, auto-start/resume
  const statementId   = sp.statementId
  const bankAccountId = sp.bankAccountId

  type ReconciliationRunRow = { id: string; startedAt: Date | null; completedAt: Date | null; totalMatched: number; totalUnmatched: number; statement: { startDate: Date | null; endDate: Date | null; bankAccount: { id: string; bankName: string; maskedNumber: string | null } } }
  const typedRuns = runs as ReconciliationRunRow[]

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <h1 className="text-lg font-semibold text-[#37322F]">Reconciliation</h1>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">

          {/* Start reconciliation from a statement */}
          {statementId && (
            <ReconciliationStarter
              orgSlug={orgSlug}
              bankAccountId={bankAccountId ?? ""}
              statementId={statementId}
            />
          )}

          {/* Run history */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <p className="text-sm font-semibold text-[#37322F]">Recent runs</p>
            </div>
            {runs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#605A57]">No reconciliation runs yet.</div>
            ) : (
              <>
                <div className="grid grid-cols-[1.8fr_1fr_0.6fr_0.6fr_0.8fr] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
                  <span>Statement</span>
                  <span>Started</span>
                  <span className="text-right">Matched</span>
                  <span className="text-right">Unmatched</span>
                  <span>Status</span>
                </div>
                {typedRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/${orgSlug}/reconciliation/${run.id}`}
                    className="grid grid-cols-[1.8fr_1fr_0.6fr_0.6fr_0.8fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm hover:bg-[#F7F5F3] transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#37322F]">
                        {run.statement.bankAccount.bankName} ···{run.statement.bankAccount.maskedNumber}
                      </p>
                      <p className="text-[10px] text-[#605A57]">
                        {fmtDate(run.statement.startDate)} – {fmtDate(run.statement.endDate)}
                      </p>
                    </div>
                    <span className="text-xs text-[#605A57]">{fmtDate(run.startedAt)}</span>
                    <span className="text-right text-xs font-medium text-green-600">{run.totalMatched}</span>
                    <span className="text-right text-xs text-destructive">{run.totalUnmatched}</span>
                    <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${run.completedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {run.completedAt ? "Completed" : "In progress"}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
