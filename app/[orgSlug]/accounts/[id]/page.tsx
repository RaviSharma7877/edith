import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { AccountEditClient } from "./account-edit-client"

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const account = await prisma.chartAccount.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
    include: {
      parent:   { select: { id: true, code: true, name: true } },
      children: {
        where:   { deletedAt: null },
        select:  { id: true, code: true, name: true, isPosting: true, isActive: true },
        orderBy: { code: "asc" },
      },
      _count: { select: { journalLines: true } },
    },
  })
  if (!account) notFound()

  return (
    <div className="flex h-svh flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <AccountEditClient orgSlug={orgSlug} account={account as any} />
    </div>
  )
}
