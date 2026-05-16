import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, Field, Panel, Phase6Shell, Select, TextArea } from "../../beyond-tally/_components/phase6-ui"
import { createStockForecast, deleteStockForecast, updateStockForecast } from "../../beyond-tally/actions"

export default async function ForecastsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [items, forecasts] = await Promise.all([
    prisma.stockItem.findMany({ where: { companyId: ctx.company.id, deletedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    prisma.stockForecast.findMany({ where: { companyId: ctx.company.id }, include: { stockItem: true }, orderBy: [{ period: "desc" }, { createdAt: "desc" }] }),
  ])

  return (
    <Phase6Shell title="Stock Forecasting" description="Demand predictions and suggested reorder quantities">
      <div className="space-y-6">
        <Panel title="Create forecast">
          <form action={createStockForecast.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-4">
            <Select label="Stock item" name="stockItemId" options={items} required emptyLabel="Select item" />
            <Field label="Period" name="period" defaultValue={new Date().toISOString().slice(0, 7)} required />
            <Field label="Forecast qty" name="forecastQty" type="number" step="0.0001" required />
            <Field label="Suggested reorder" name="suggestedReorderQty" type="number" step="0.0001" defaultValue="0" />
            <Field label="Confidence %" name="confidencePct" type="number" step="0.0001" />
            <Field label="Algorithm" name="algorithm" defaultValue="exponential_smoothing" />
            <Field label="Window start" name="sourceWindowStart" type="date" />
            <Field label="Window end" name="sourceWindowEnd" type="date" />
            <div className="md:col-span-4"><TextArea label="Notes" name="notes" /></div>
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create forecast</button>
          </form>
        </Panel>
        {forecasts.length === 0 ? <EmptyState>No forecasts yet.</EmptyState> : (
          <div className="space-y-3">
            {forecasts.map((forecast) => (
              <form key={forecast.id} action={updateStockForecast.bind(null, orgSlug, forecast.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_auto_auto]">
                <div><p className="text-sm font-semibold">{forecast.stockItem.name}</p><p className="text-xs text-[#605A57]">{forecast.period}</p></div>
                <Field label="Forecast" name="forecastQty" type="number" step="0.0001" defaultValue={String(forecast.forecastQty)} />
                <Field label="Reorder" name="suggestedReorderQty" type="number" step="0.0001" defaultValue={String(forecast.suggestedReorderQty)} />
                <Field label="Confidence" name="confidencePct" type="number" step="0.0001" defaultValue={forecast.confidencePct ? String(forecast.confidencePct) : ""} />
                <Field label="Notes" name="notes" defaultValue={forecast.notes} />
                <button className="self-end h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button>
                <button formAction={deleteStockForecast.bind(null, orgSlug, forecast.id)} className="self-end h-9 rounded-md border px-3 text-xs font-medium">Delete</button>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
