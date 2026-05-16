import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { EmptyTable, InventoryPageShell } from "../_components/inventory-page-shell"

export default async function ManufacturingJournalsPage({
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

  const journals = await prisma.manufacturingJournal.findMany({
    where: {
      companyId: ctx.company.id,
      ...(search
        ? {
            OR: [
              { journalNumber: { contains: search, mode: "insensitive" } },
              { bom: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 100,
    include: {
      bom: { select: { name: true, finishedItem: { select: { name: true } } } },
      outputGodown: { select: { name: true } },
      _count: { select: { consumptions: true } },
    },
  })

  return (
    <InventoryPageShell
      title="Manufacturing Journals"
      description="Record production runs and material consumptions"
      action={
        <Link href={`/${orgSlug}/inventory/manufacturing/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          New Production
        </Link>
      }
    >
      <div className="space-y-4">
        <form className="flex max-w-sm gap-2">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search journal number or BOM"
            className="h-9 flex-1 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm outline-none"
          />
          <button className="h-9 rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F]">Search</button>
        </form>

        {journals.length === 0 ? (
          <EmptyTable>No production records found.</EmptyTable>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
            <div className="grid grid-cols-[1.5fr_1fr_2fr_1fr_1fr_0.8fr] gap-3 bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
              <span>Journal No</span>
              <span>Date</span>
              <span>Finished Item</span>
              <span className="text-right">Output Qty</span>
              <span className="text-center">Components</span>
              <span className="text-center">Status</span>
            </div>
            {journals.map((journal) => (
              <Link key={journal.id} href={`/${orgSlug}/inventory/manufacturing/${journal.id}`} className="grid grid-cols-[1.5fr_1fr_2fr_1fr_1fr_0.8fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm transition hover:bg-[#FAFAF9]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#37322F]">{journal.journalNumber}</p>
                </div>
                <span className="text-[#605A57]">{journal.date.toLocaleDateString()}</span>
                <span className="truncate text-[#605A57]">{journal.bom.finishedItem.name} <span className="text-xs">({journal.bom.name})</span></span>
                <span className="text-right font-mono text-xs text-[#37322F]">{Number(journal.outputQty).toLocaleString("en-IN")}</span>
                <span className="text-center font-mono text-xs text-[#605A57]">{journal._count.consumptions}</span>
                <span className="text-center text-xs text-[#605A57]">{journal.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </InventoryPageShell>
  )
}
