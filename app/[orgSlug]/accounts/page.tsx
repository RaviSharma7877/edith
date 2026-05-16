import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { AccountsClient } from "./accounts-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function AccountsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const accounts = await prisma.chartAccount.findMany({
    where:   { companyId: ctx.company.id, deletedAt: null },
    orderBy: [{ type: "asc" }, { code: "asc" }],
    select: {
      id: true, code: true, name: true, type: true, subtype: true,
      parentId: true, isPosting: true, isActive: true, isSystemAccount: true,
      openingBalance: true,
      _count: { select: { journalLines: true, children: true } },
    },
  })

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <div>
            <h1 className="text-lg font-semibold text-[#37322F]">Chart of Accounts</h1>
            <p className="text-sm text-[#605A57]">{accounts.length} accounts</p>
          </div>
        </div>
        <Link
          href={`/${orgSlug}/accounts/new`}
          className="rounded-md bg-[#37322F] px-4 py-2 text-sm font-medium text-white hover:bg-[#49423D]"
        >
          New account
        </Link>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <AccountsClient orgSlug={orgSlug} accounts={accounts as any} />
      </div>
    </div>
  )
}
