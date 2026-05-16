import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { createPOSSession } from "../../../payroll/actions"
import { POSSessionForm, Phase5Shell } from "../../../payroll/_components/phase5-ui"

export default async function NewPOSSessionPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const tills = await prisma.pOSTill.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } })
  return (
    <Phase5Shell title="Open POS Session" description="Start a cashier session">
      <POSSessionForm orgSlug={orgSlug} tills={tills} action={createPOSSession.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
