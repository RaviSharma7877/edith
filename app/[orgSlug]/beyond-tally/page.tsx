import Link from "next/link"
import { BarChart2, Bell, Bot, DatabaseZap, FileText, GitMerge, PackageSearch, Settings2, ShoppingBag } from "lucide-react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Phase6Shell, StatCard } from "./_components/phase6-ui"

export default async function BeyondTallyPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [forecasts, channels, rules, bulkOps] = await Promise.all([
    prisma.stockForecast.count({ where: { companyId: ctx.company.id } }),
    prisma.ecommerceChannel.count({ where: { companyId: ctx.company.id, isActive: true } }),
    prisma.notificationRule.count({ where: { companyId: ctx.company.id, isActive: true } }),
    prisma.bulkOperation.count({ where: { companyId: ctx.company.id } }),
  ])

  const modules = [
    { title: "Stock Forecasting", href: "inventory/forecasts", icon: PackageSearch, copy: "Predicted demand and suggested reorder quantities." },
    { title: "eCommerce Sync", href: "integrations/ecommerce", icon: ShoppingBag, copy: "Store channels, webhook secrets and SKU mapping." },
    { title: "Document AI", href: "documents/ocr", icon: Bot, copy: "OCR jobs for vendor bills and sales documents." },
    { title: "Notifications", href: "settings/notifications", icon: Bell, copy: "Low stock, expiry and overdue reminder rules." },
    { title: "Consolidation", href: "settings/consolidation", icon: GitMerge, copy: "Multi-company consolidation groups." },
    { title: "Tally XML Export", href: "settings/exports/tally-xml", icon: FileText, copy: "Migration-friendly XML export jobs." },
    { title: "Analytics Layouts", href: "analytics", icon: BarChart2, copy: "Interactive dashboard layout presets." },
    { title: "Custom Fields", href: "settings/custom-fields", icon: Settings2, copy: "Entity-specific extension fields." },
    { title: "Bulk Operations", href: "bulk-operations", icon: DatabaseZap, copy: "Bulk price, post and export job tracking." },
  ]

  return (
    <Phase6Shell title="Beyond Tally" description="Forecasting, sync, automation, analytics and extensibility">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Forecast rows" value={forecasts} hint="Inventory demand predictions" />
          <StatCard label="Channels" value={channels} hint="Active commerce stores" />
          <StatCard label="Alert rules" value={rules} hint="Active notification rules" />
          <StatCard label="Bulk jobs" value={bulkOps} hint="Operations tracked" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} href={`/${orgSlug}/${module.href}`} className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 transition hover:border-[#37322F]/30">
              <module.icon className="size-5 text-[#605A57]" />
              <h2 className="mt-4 text-base font-semibold text-[#37322F]">{module.title}</h2>
              <p className="mt-1 text-sm text-[#605A57]">{module.copy}</p>
            </Link>
          ))}
        </div>
      </div>
    </Phase6Shell>
  )
}
