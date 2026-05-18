import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function GodownsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const godowns = await prisma.godown.findMany({
    where: { companyId: ctx.company.id },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { children: true, voucherLines: true } },
    },
  })

  type GodownRow = {
    id: string
    name: string
    code: string | null
    address: string | null
    isActive: boolean
    parent: { name: string } | null
    _count: { children: number; voucherLines: number }
  }
  const typedGodowns = godowns as GodownRow[]

  return (
    <InventoryPageShell
      title="Godowns"
      description="Warehouses, locations and store hierarchies"
      action={<Link href={`/${orgSlug}/inventory/godowns/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New godown</Link>}
    >
      {godowns.length === 0 ? (
        <EmptyTable>No godowns yet.</EmptyTable>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
          <div className="grid grid-cols-[1fr_2fr_1.5fr_2fr_1fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
            <span>Code</span>
            <span>Name</span>
            <span>Parent</span>
            <span>Address</span>
            <span className="text-center">Status</span>
          </div>
          {typedGodowns.map((godown) => (
            <Link key={godown.id} href={`/${orgSlug}/inventory/godowns/${godown.id}`} className="grid grid-cols-[1fr_2fr_1.5fr_2fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
              <span className="font-mono text-xs text-[#605A57]">{godown.code ?? "-"}</span>
              <span className="font-medium text-[#37322F]">{godown.name}</span>
              <span className="text-[#605A57]">{godown.parent?.name ?? "Root"}</span>
              <span className="truncate text-[#605A57]">{godown.address ?? "-"}</span>
              <span className="text-center text-xs text-[#605A57]">{godown.isActive ? "Active" : "Inactive"}</span>
            </Link>
          ))}
        </div>
      )}
    </InventoryPageShell>
  )
}
