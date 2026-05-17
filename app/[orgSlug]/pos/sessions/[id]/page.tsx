import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { deletePOSSession, updatePOSSession } from "../../../payroll/actions"
import { POSSessionForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function EditPOSSessionPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [posSession, tills] = await Promise.all([
    prisma.pOSSession.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.pOSTill.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
  ])
  if (!posSession) notFound()
  return (
    <Phase5Shell title="Edit POS Session" description={posSession.sessionNumber}>
      <div className="space-y-5">
        <POSSessionForm orgSlug={orgSlug} session={{ ...posSession, openingCash: posSession.openingCash?.toString() ?? null, expectedCash: posSession.expectedCash?.toString() ?? null, closingCash: posSession.closingCash?.toString() ?? null }} tills={tills} action={updatePOSSession.bind(null, orgSlug, id)} />
        <form action={deletePOSSession.bind(null, orgSlug, id)} className="max-w-4xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Cancel session</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Cancel</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
