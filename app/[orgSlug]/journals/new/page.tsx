import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { JournalEntryForm } from "./journal-form"

export default async function NewJournalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [accounts, configs] = await Promise.all([
    prisma.chartAccount.findMany({
      where:   { companyId: ctx.company.id, isPosting: true, isActive: true, deletedAt: null },
      orderBy: [{ type: "asc" }, { code: "asc" }],
      select:  { id: true, code: true, name: true, type: true },
    }),
    prisma.voucherTypeConfig.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select:  { id: true, label: true, baseVoucherType: true, formConfig: true },
    }),
  ])

  return <JournalEntryForm orgSlug={orgSlug} accounts={accounts} configs={configs} />
}
