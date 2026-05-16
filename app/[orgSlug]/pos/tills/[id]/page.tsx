import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { deletePOSTill, updatePOSTill } from "../../../payroll/actions"
import { POSTillForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function EditPOSTillPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const till = await prisma.pOSTill.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!till) notFound()
  return (
    <Phase5Shell title="Edit POS Till" description={till.name}>
      <div className="space-y-5">
        <POSTillForm orgSlug={orgSlug} till={till} action={updatePOSTill.bind(null, orgSlug, id)} />
        <form action={deletePOSTill.bind(null, orgSlug, id)} className="max-w-3xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Deactivate till</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Deactivate</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
