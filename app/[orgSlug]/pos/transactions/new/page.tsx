import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { createPOSTransaction } from "../../../payroll/actions"
import { POSTransactionForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function NewPOSTransactionPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [sessions, customers] = await Promise.all([
    prisma.pOSSession.findMany({ where: { companyId: ctx.company.id, status: "OPEN" }, orderBy: { openedAt: "desc" } }),
    prisma.customer.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { name: "asc" } }),
  ])
  return (
    <Phase5Shell title="New POS Sale" description="Record a tendered retail transaction">
      <POSTransactionForm orgSlug={orgSlug} sessions={sessions.map((s) => ({ id: s.id, name: s.sessionNumber }))} customers={customers} action={createPOSTransaction.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
