import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function BOMPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const { search = "" } = await searchParams
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const boms = await prisma.billOfMaterials.findMany({
    where: {
      companyId: ctx.company.id,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { finishedItem: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      finishedItem: { select: { name: true } },
      _count: { select: { components: true, byProducts: true } },
    },
  })

  return (
    <InventoryPageShell
      title="Bill of Materials"
      description="Manage manufacturing recipes and production standards"
      action={
        <Link href={`/${orgSlug}/inventory/bom/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          New BOM
        </Link>
      }
    >
      <div className="space-y-4">
        <form className="flex max-w-sm gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search BOM or finished item"
            className="h-9 flex-1 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm outline-none"
          />
          <button className="h-9 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F]">Search</button>
        </form>

        {boms.length === 0 ? (
          <EmptyTable>No Bill of Materials found.</EmptyTable>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Name</span>
              <span>Finished Item</span>
              <span className="text-right">Output Qty</span>
              <span className="text-center">Components</span>
              <span className="text-center">Status</span>
            </div>
            {boms.map((bom) => (
              <Link key={bom.id} href={`/${orgSlug}/inventory/bom/${bom.id}`} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#37322F]">{bom.name}</p>
                </div>
                <span className="truncate text-[#605A57]">{bom.finishedItem.name}</span>
                <span className="text-right font-mono text-xs text-[#37322F]">{Number(bom.outputQty).toLocaleString("en-IN")}</span>
                <span className="text-center font-mono text-xs text-[#605A57]">{bom._count.components}</span>
                <span className="text-center text-xs text-[#605A57]">{bom.isActive ? "Active" : "Inactive"}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </InventoryPageShell>
  )
}
