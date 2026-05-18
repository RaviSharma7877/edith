import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { BankAccountEdit } from "./bank-account-edit"
import { SidebarTrigger } from "@/components/ui/sidebar"

function fmt(v: { toNumber?: () => number } | string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  const n = typeof v === "object" && v && "toNumber" in v ? (v as { toNumber: () => number }).toNumber() : Number(v)
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function BankAccountDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [account, statements] = await Promise.all([
    prisma.bankAccount.findFirst({
      where:   { id, companyId: ctx.company.id },
      include: { chartAccount: { select: { id: true, name: true, code: true, subtype: true } } },
    }),
    prisma.bankStatement.findMany({
      where:   { bankAccountId: id },
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { lines: true } },
        runs:   { orderBy: { startedAt: "desc" }, take: 1 },
      },
    }),
  ])
  if (!account) notFound()

  const accountForEdit = { ...account, currentBalance: account.currentBalance?.toString() ?? "0" }

  type StatementRow = { id: string; startDate: Date | null; endDate: Date | null; isLocked: boolean; closingBalance: unknown; sourceType: string | null; _count: { lines: number }; runs: { completedAt: Date | null; totalMatched: number }[] }
  const typedStatements = statements as StatementRow[]

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/bank-accounts`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Bank Accounts
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="text-sm font-medium text-[#37322F]">{account.bankName} ···{account.maskedNumber}</span>
        </div>
        <Link
          href={`/${orgSlug}/bank-accounts/${id}/statements/import`}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Import Statement
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">
          <BankAccountEdit orgSlug={orgSlug} account={accountForEdit} />

          {/* Statements */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#37322F]">Statements</p>
              <span className="text-xs text-[#605A57]">{statements.length} imported</span>
            </div>

            {statements.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#605A57]">
                No statements imported yet.{" "}
                <Link href={`/${orgSlug}/bank-accounts/${id}/statements/import`} className="text-primary underline">
                  Import one now.
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1fr_0.8fr] gap-3 border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9] px-4 py-2 text-xs font-medium text-[#605A57]">
                  <span>Period</span>
                  <span className="text-right">Closing balance</span>
                  <span className="text-right">Lines</span>
                  <span>Source</span>
                  <span>Reconciliation</span>
                  <span />
                </div>
                {typedStatements.map((s) => {
                  const latestRun  = s.runs[0]
                  const isComplete = !!latestRun?.completedAt
                  const pct        = latestRun
                    ? Math.round((latestRun.totalMatched / Math.max(s._count.lines, 1)) * 100)
                    : 0
                  return (
                    <div
                      key={s.id}
                      className="grid grid-cols-[1.2fr_1fr_0.7fr_0.7fr_1fr_0.8fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm"
                    >
                      <span className="text-xs text-[#37322F]">
                        {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                        {s.isLocked && (
                          <span className="ml-1.5 rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-600">LOCKED</span>
                        )}
                      </span>
                      <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(s.closingBalance)}</span>
                      <span className="text-right text-xs text-[#605A57]">{s._count.lines}</span>
                      <span className="text-xs text-[#605A57] uppercase">{s.sourceType ?? "csv"}</span>
                      <div className="flex items-center gap-2">
                        {latestRun ? (
                          <>
                            <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full rounded-full ${isComplete ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-medium ${isComplete ? "text-green-600" : "text-[#605A57]"}`}>
                              {isComplete ? "Done" : `${pct}%`}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-[#605A57]">Not started</span>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        {!s.isLocked && (
                          <Link
                            href={`/${orgSlug}/reconciliation?statementId=${s.id}&bankAccountId=${id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Reconcile
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
