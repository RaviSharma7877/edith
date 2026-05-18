import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { JournalsClient } from "./journals-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function JournalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const sp = await searchParams
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const status   = sp.status   || undefined
  const configId = sp.configId || undefined
  const page     = Math.max(1, parseInt(sp.page ?? "1"))
  const limit    = 20

  const where: Record<string, unknown> = { companyId: ctx.company.id }
  if (status)   where.status              = status
  if (configId) where.voucherTypeConfigId = configId

  const [entries, total, configs] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { date: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, voucherNumber: true, voucherType: true, date: true,
        status: true, description: true, totalDebit: true, totalCredit: true,
        isReversal: true, postedAt: true, createdAt: true,
        voucherTypeConfig: { select: { label: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
    prisma.voucherTypeConfig.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select:  { id: true, label: true },
    }),
  ])

  const pages = Math.ceil(total / limit)

  type EntryRow = {
    id: string; voucherNumber: string | null; voucherType: string; date: Date
    status: string; description: string | null; isReversal: boolean
    postedAt: Date | null; createdAt: Date
    totalDebit: { toString(): string }; totalCredit: { toString(): string }
    voucherTypeConfig: { label: string } | null; _count: { lines: number }
  }
  const typedEntries = entries as EntryRow[]

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <div>
            <h1 className="text-lg font-semibold text-[#37322F]">Journals</h1>
            <p className="text-sm text-[#605A57]">{total} entries</p>
          </div>
        </div>
        <Link
          href={`/${orgSlug}/journals/new`}
          className="rounded-md bg-[#37322F] px-4 py-2 text-sm font-medium text-white hover:bg-[#49423D]"
        >
          New entry
        </Link>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <JournalsClient
          orgSlug={orgSlug}
          entries={typedEntries.map(({ voucherTypeConfig, totalDebit, totalCredit, ...e }) => ({
            ...e,
            date:        e.date.toISOString(),
            createdAt:   e.createdAt.toISOString(),
            postedAt:    e.postedAt?.toISOString() ?? null,
            voucherNumber: e.voucherNumber ?? "Draft",
            totalDebit:  String(totalDebit),
            totalCredit: String(totalCredit),
            configLabel: voucherTypeConfig?.label ?? null,
          }))}
          page={page}
          pages={pages}
          total={total}
          statusFilter={status}
          configIdFilter={configId}
          configs={configs}
        />
      </div>
    </div>
  )
}
