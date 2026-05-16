import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, Field, Panel, Phase6Shell, StatCard, TextArea } from "../beyond-tally/_components/phase6-ui"
import { createDashboardLayout, deleteDashboardLayout } from "../beyond-tally/actions"

export default async function AnalyticsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [layouts, ledgerRows, forecasts] = await Promise.all([
    prisma.dashboardLayout.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } }),
    prisma.journalLine.count({ where: { journalEntry: { companyId: ctx.company.id } } }),
    prisma.stockForecast.count({ where: { companyId: ctx.company.id } }),
  ])

  return (
    <Phase6Shell title="Interactive Analytics" description="Dashboard layouts and drill-down data surfaces">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Layouts" value={layouts.length} hint="Saved widget arrangements" />
          <StatCard label="Ledger lines" value={ledgerRows} hint="Available for drill-down" />
          <StatCard label="Forecast rows" value={forecasts} hint="Inventory analytics overlay" />
        </div>
        <Panel title="Create layout">
          <form action={createDashboardLayout.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Name" name="name" required />
            <div className="md:col-span-2"><TextArea label="Widgets JSON" name="widgets" defaultValue={'[{"id":"sales","x":0,"y":0,"w":6,"h":3}]'} required /></div>
            <Checkbox name="isDefault" label="Default layout" defaultChecked={false} />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create layout</button>
          </form>
        </Panel>
        {layouts.length === 0 ? <EmptyState>No dashboard layouts yet.</EmptyState> : (
          <div className="grid gap-3 md:grid-cols-2">
            {layouts.map((layout) => (
              <form key={layout.id} className="rounded-lg border bg-white p-4">
                <p className="font-semibold">{layout.name}</p>
                <p className="mt-1 text-xs text-[#605A57]">{layout.isDefault ? "Default" : "Custom"} layout</p>
                <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-[#F7F5F3] p-3 text-xs">{JSON.stringify(layout.widgets, null, 2)}</pre>
                <button formAction={deleteDashboardLayout.bind(null, orgSlug, layout.id)} className="mt-3 h-9 rounded-md border px-3 text-xs font-medium">Delete</button>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
