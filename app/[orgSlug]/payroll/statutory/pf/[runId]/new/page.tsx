import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { PFEntryForm, Phase5Shell } from "../../../../_components/phase5-ui"
import { createPFEntry } from "../../../../actions"

export default async function NewPFEntryPage({ params }: { params: Promise<{ orgSlug: string; runId: string }> }) {
  const { orgSlug, runId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const run = await prisma.payrollRun.findFirst({ where: { id: runId, companyId: ctx.company.id } })
  if (!run) notFound()

  const employees = await prisma.employee.findMany({
    where: { companyId: ctx.company.id, deletedAt: null, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  })

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    name: `${e.employeeCode} — ${e.firstName}${e.lastName ? ` ${e.lastName}` : ""}`,
  }))

  return (
    <Phase5Shell title="Add PF Entry" description={`Run ${run.runNumber} · ${run.period}`}>
      <PFEntryForm orgSlug={orgSlug} action={createPFEntry.bind(null, orgSlug, runId)} employees={employeeOptions} runId={runId} />
    </Phase5Shell>
  )
}
