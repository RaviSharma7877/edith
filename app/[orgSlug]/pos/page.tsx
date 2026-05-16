import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell, StatCard } from "../payroll/_components/phase5-ui"

export default async function POSPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const [tills, sessions, transactions] = await Promise.all([
    prisma.pOSTill.findMany({ where: { companyId: ctx.company.id }, orderBy: { name: "asc" } }),
    prisma.pOSSession.findMany({ where: { companyId: ctx.company.id }, include: { till: true }, orderBy: { openedAt: "desc" }, take: 10 }),
    prisma.pOSTransaction.findMany({ where: { companyId: ctx.company.id }, include: { session: true }, orderBy: { transactionAt: "desc" }, take: 10 }),
  ])
  const openSessions = sessions.filter((s) => s.status === "OPEN").length
  const salesTotal = transactions.filter((t) => !t.isVoided).reduce((sum, tx) => sum + Number(tx.totalAmount), 0)

  return (
    <Phase5Shell title="POS" description="Retail tills, cashier sessions and tendered transactions" action={<div className="flex gap-2"><Link href={`/${orgSlug}/pos/tills/new`} className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium">New till</Link><Link href={`/${orgSlug}/pos/sessions/new`} className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium">Open session</Link><Link href={`/${orgSlug}/pos/transactions/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">New sale</Link></div>}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Tills" value={tills.length} hint={`${tills.filter((t) => t.isActive).length} active`} />
          <StatCard label="Open sessions" value={openSessions} hint="Cashier sessions" />
          <StatCard label="Recent sales" value={`₹${salesTotal.toLocaleString("en-IN")}`} hint="Last 10 non-void transactions" />
        </div>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="flex items-center justify-between px-4 py-3"><h2 className="font-semibold text-[#37322F]">Tills</h2><Link className="text-xs font-medium" href={`/${orgSlug}/pos/tills/new`}>Add</Link></div>
            {tills.length === 0 ? <EmptyState>No tills yet.</EmptyState> : tills.map((till) => (
              <Link key={till.id} href={`/${orgSlug}/pos/tills/${till.id}`} className="grid grid-cols-[1fr_auto] border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
                <span>{till.name}</span><span className="text-[#605A57]">{till.isActive ? "Active" : "Inactive"}</span>
              </Link>
            ))}
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="flex items-center justify-between px-4 py-3"><h2 className="font-semibold text-[#37322F]">Sessions</h2><Link className="text-xs font-medium" href={`/${orgSlug}/pos/sessions/new`}>Open</Link></div>
            {sessions.length === 0 ? <EmptyState>No sessions yet.</EmptyState> : sessions.map((posSession) => (
              <Link key={posSession.id} href={`/${orgSlug}/pos/sessions/${posSession.id}`} className="grid grid-cols-[1fr_auto] border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
                <span>{posSession.sessionNumber}<span className="ml-2 text-[#605A57]">{posSession.till.name}</span></span><span>{posSession.status}</span>
              </Link>
            ))}
          </div>
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
            <div className="flex items-center justify-between px-4 py-3"><h2 className="font-semibold text-[#37322F]">Transactions</h2><Link className="text-xs font-medium" href={`/${orgSlug}/pos/transactions/new`}>Create</Link></div>
            {transactions.length === 0 ? <EmptyState>No sales yet.</EmptyState> : transactions.map((tx) => (
              <Link key={tx.id} href={`/${orgSlug}/pos/transactions/${tx.id}`} className="grid grid-cols-[1fr_auto] border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]">
                <span>{tx.transactionNumber}<span className="ml-2 text-[#605A57]">{tx.tenderType}</span></span><span>₹{Number(tx.totalAmount).toLocaleString("en-IN")}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Phase5Shell>
  )
}
