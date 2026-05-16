import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { JournalActions } from "./journal-actions"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const entry = await prisma.journalEntry.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      lines: {
        orderBy: [{ direction: "asc" }, { id: "asc" }],
        include: { account: { select: { id: true, code: true, name: true, type: true } } },
      },
      attachments: { select: { id: true, name: true, mimeType: true, createdAt: true } },
      reversalOf:  { select: { id: true, voucherNumber: true } },
      reversedBy:  { select: { id: true, voucherNumber: true } },
    },
  })
  if (!entry) notFound()

  const totalDebit  = entry.lines.filter((l) => l.direction === "DEBIT").reduce((s, l) => s + Number(l.amount), 0)
  const totalCredit = entry.lines.filter((l) => l.direction === "CREDIT").reduce((s, l) => s + Number(l.amount), 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.001

  function fmt(v: number | string | { toString(): string }) {
    return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT:            "bg-gray-100 text-gray-700",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
    POSTED:           "bg-green-100 text-green-700",
    REVERSED:         "bg-purple-100 text-purple-700",
    CANCELLED:        "bg-red-100 text-red-700",
  }

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/journals`} className="text-sm text-[#605A57] hover:text-[#37322F]">← Journals</Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="font-mono text-sm font-medium text-[#37322F]">{entry.voucherNumber}</span>
          {entry.isReversal && (
            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">REVERSAL</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_COLORS[entry.status] ?? "bg-gray-100 text-gray-700"}`}>
            {entry.status.replace(/_/g, " ")}
          </span>
          <JournalActions orgSlug={orgSlug} entryId={id} status={entry.status} balanced={balanced} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 sm:grid-cols-4">
            {[
              { label: "Type",        value: entry.voucherType.replace(/_/g, " ") },
              { label: "Date",        value: fmtDate(entry.date) },
              { label: "Reference",   value: entry.reference ?? "—" },
              { label: "Posted at",   value: entry.postedAt ? fmtDate(entry.postedAt) : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-[#605A57]">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-[#37322F]">{value}</p>
              </div>
            ))}
            {entry.description && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-[#605A57]">Description</p>
                <p className="mt-0.5 text-sm text-[#37322F]">{entry.description}</p>
              </div>
            )}
            {entry.narration && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-[#605A57]">Narration</p>
                <p className="mt-0.5 text-sm text-[#37322F]">{entry.narration}</p>
              </div>
            )}
          </div>

          {/* Reversal links */}
          {entry.reversalOf && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Reversal of{" "}
              <Link href={`/${orgSlug}/journals/${entry.reversalOf.id}`} className="font-medium underline">
                {entry.reversalOf.voucherNumber}
              </Link>
            </div>
          )}
          {entry.reversedBy.length > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              Reversed by{" "}
              {entry.reversedBy.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <Link href={`/${orgSlug}/journals/${r.id}`} className="font-medium underline">{r.voucherNumber}</Link>
                </span>
              ))}
            </div>
          )}

          {/* Lines table */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Account</span>
              <span>Direction</span>
              <span className="text-right">Amount</span>
              <span>Description</span>
            </div>

            {entry.lines.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm"
              >
                <Link href={`/${orgSlug}/accounts/${line.account.id}`} className="font-medium text-[#37322F] hover:underline">
                  <span className="font-mono text-xs text-[#605A57] mr-2">{line.account.code}</span>
                  {line.account.name}
                </Link>
                <span className={`text-xs font-medium ${line.direction === "DEBIT" ? "text-blue-600" : "text-green-600"}`}>
                  {line.direction === "DEBIT" ? "Dr" : "Cr"}
                </span>
                <span className="text-right font-mono text-sm">{fmt(line.amount)}</span>
                <span className="text-xs text-[#605A57]">{line.description ?? "—"}</span>
              </div>
            ))}

            {/* Totals */}
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1.5fr] gap-3 border-t border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2">
              <span className="text-xs font-semibold text-[#37322F]">Total</span>
              <span />
              <div className="space-y-0.5 text-right">
                <div className="flex justify-between text-xs">
                  <span className="text-[#605A57]">Dr</span>
                  <span className="font-mono font-semibold text-[#37322F]">{fmt(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#605A57]">Cr</span>
                  <span className="font-mono font-semibold text-[#37322F]">{fmt(totalCredit)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-medium ${balanced ? "text-green-600" : "text-destructive"}`}>
                  {balanced ? "✓ Balanced" : "Not balanced"}
                </span>
              </div>
            </div>
          </div>

          {/* Hash chain */}
          {entry.entryHash && (
            <div className="rounded-md border border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-3">
              <p className="text-xs font-medium text-[#605A57]">Tamper evidence</p>
              <p className="mt-1 font-mono text-[10px] text-[#605A57] break-all">{entry.entryHash}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
