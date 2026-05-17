import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { createPayrollRun } from "../../actions"
import { PayrollRunForm, Phase5Shell } from "../../_components/phase5-ui"

export default async function NewPayrollRunPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  return (
    <Phase5Shell title="New Payroll Run" description="Create a monthly payroll batch">
      <PayrollRunForm orgSlug={orgSlug} action={createPayrollRun.bind(null, orgSlug)} />
    </Phase5Shell>
  )
}
