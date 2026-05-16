import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell, StatCard } from "../payroll/_components/phase5-ui"

export default async function FixedAssetsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [assets, activeCount, disposedCount] = await Promise.all([
    prisma.fixedAsset.findMany({ where: { companyId: ctx.company.id, deletedAt: null }, orderBy: { assetCode: "asc" } }),
    prisma.fixedAsset.count({ where: { companyId: ctx.company.id, deletedAt: null, status: "ACTIVE" } }),
    prisma.fixedAsset.count({ where: { companyId: ctx.company.id, status: "DISPOSED" } }),
  ])
  const bookValue = assets.reduce((sum, asset) => sum + Number(asset.purchaseCost) - Number(asset.accumulatedDepreciation), 0)

  return (
    <Phase5Shell title="Fixed Assets" description="Asset register, depreciation base and disposal status" action={<Link href={`/${orgSlug}/fixed-assets/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New asset</Link>}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Active assets" value={activeCount} hint={`${disposedCount} disposed`} />
          <StatCard label="Book value" value={`₹${bookValue.toLocaleString("en-IN")}`} hint="Cost less accumulated depreciation" />
          <StatCard label="Register rows" value={assets.length} hint="Visible assets" />
        </div>
        {assets.length === 0 ? <EmptyState>No fixed assets yet.</EmptyState> : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="grid grid-cols-[1fr_2fr_1.2fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
              <span>Code</span><span>Name</span><span>Category</span><span>Cost</span><span>Book value</span><span>Status</span>
            </div>
            {assets.map((asset) => (
              <Link key={asset.id} href={`/${orgSlug}/fixed-assets/${asset.id}`} className="grid grid-cols-[1fr_2fr_1.2fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
                <span className="font-medium text-[#37322F]">{asset.assetCode}</span>
                <span>{asset.name}</span>
                <span>{asset.category ?? "-"}</span>
                <span>₹{Number(asset.purchaseCost).toLocaleString("en-IN")}</span>
                <span>₹{(Number(asset.purchaseCost) - Number(asset.accumulatedDepreciation)).toLocaleString("en-IN")}</span>
                <span>{asset.status.replaceAll("_", " ")}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Phase5Shell>
  )
}
