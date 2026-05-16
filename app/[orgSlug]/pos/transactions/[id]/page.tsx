import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { deletePOSTransaction, updatePOSTransaction } from "../../../payroll/actions"
import { POSTransactionForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function EditPOSTransactionPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [transaction, sessions, customers] = await Promise.all([
    prisma.pOSTransaction.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.pOSSession.findMany({ where: { companyId: ctx.company.id }, orderBy: { openedAt: "desc" } }),
    prisma.customer.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { name: "asc" } }),
  ])
  if (!transaction) notFound()
  return (
    <Phase5Shell title="Edit POS Sale" description={transaction.transactionNumber}>
      <div className="space-y-5">
        <POSTransactionForm orgSlug={orgSlug} transaction={transaction} sessions={sessions.map((s) => ({ id: s.id, name: s.sessionNumber }))} customers={customers} action={updatePOSTransaction.bind(null, orgSlug, id)} />
        <form action={deletePOSTransaction.bind(null, orgSlug, id)} className="max-w-5xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Void transaction</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Void</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
