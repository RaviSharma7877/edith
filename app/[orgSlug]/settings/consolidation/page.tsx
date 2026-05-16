import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, Field, Panel, Phase6Shell } from "../../beyond-tally/_components/phase6-ui"
import { createConsolidationGroup, deleteConsolidationGroup, updateConsolidationGroup } from "../../beyond-tally/actions"

export default async function ConsolidationPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [companies, groups] = await Promise.all([
    prisma.company.findMany({ where: { workspaceId: ctx.workspaceId, deletedAt: null }, orderBy: { name: "asc" } }),
    prisma.consolidationGroup.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: "desc" } }),
  ])

  const companyChecks = (selected: string[] = []) => companies.map((company) => (
    <label key={company.id} className="flex items-center gap-2 text-sm"><input name="companyIds" type="checkbox" value={company.id} defaultChecked={selected.includes(company.id)} />{company.name}</label>
  ))

  return (
    <Phase6Shell title="Consolidation" description="Multi-company consolidation groups">
      <div className="space-y-6">
        <Panel title="Create consolidation group">
          <form action={createConsolidationGroup.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Name" name="name" required />
            <Field label="Currency" name="currency" defaultValue={ctx.company.currency} />
            <div className="space-y-2">{companyChecks()}</div>
            <Checkbox />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create group</button>
          </form>
        </Panel>
        {groups.length === 0 ? <EmptyState>No consolidation groups yet.</EmptyState> : (
          <div className="space-y-3">
            {groups.map((group) => (
              <form key={group.id} action={updateConsolidationGroup.bind(null, orgSlug, group.id)} className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_2fr_auto_auto]">
                <Field label="Name" name="name" defaultValue={group.name} required />
                <Field label="Currency" name="currency" defaultValue={group.currency} />
                <div className="space-y-2">{companyChecks(group.companyIds)}</div>
                <div className="self-end"><Checkbox defaultChecked={group.isActive} /></div>
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteConsolidationGroup.bind(null, orgSlug, group.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Disable</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
