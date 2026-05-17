import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"

function fmt(v: { toNumber?: () => number } | string | number | null | undefined) {
  if (v === null || v === undefined) return "—"
  const n = typeof v === "object" && v && "toNumber" in v ? (v as { toNumber: () => number }).toNumber() : Number(v)
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function BankAccountsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const accounts = await prisma.bankAccount.findMany({
    where:   { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    include: {
      chartAccount: { select: { id: true, name: true, code: true, subtype: true } },
    },
  })

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <h1 className="text-lg font-semibold text-[#37322F]">Bank Accounts</h1>
        </div>
        <Link
          href={`/${orgSlug}/bank-accounts/new`}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Link Account
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0">
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[rgba(55,50,47,0.20)] bg-white p-12 text-center">
              <p className="text-sm text-[#605A57]">No bank accounts linked yet.</p>
              <Link
                href={`/${orgSlug}/bank-accounts/new`}
                className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Link a bank account
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1.2fr_0.9fr_0.8fr_0.7fr_0.5fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
                <span>Bank</span>
                <span>Chart Account</span>
                <span>IFSC</span>
                <span className="text-right">Balance</span>
                <span>Currency</span>
                <span>Active</span>
              </div>
              {accounts.map((acc) => (
                <Link
                  key={acc.id}
                  href={`/${orgSlug}/bank-accounts/${acc.id}`}
                  className="grid grid-cols-[1.5fr_1.2fr_0.9fr_0.8fr_0.7fr_0.5fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-2.5 text-sm hover:bg-[#F7F5F3] transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#37322F]">{acc.bankName}</p>
                    <p className="font-mono text-[11px] text-[#605A57]">···{acc.maskedNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#37322F]">{acc.chartAccount.name}</p>
                    <p className="font-mono text-[10px] text-[#605A57]">{acc.chartAccount.code}</p>
                  </div>
                  <span className="font-mono text-xs text-[#605A57]">{acc.ifscCode ?? "—"}</span>
                  <span className="text-right font-mono text-xs text-[#37322F]">₹{fmt(acc.currentBalance)}</span>
                  <span className="text-xs text-[#605A57]">{acc.currency}</span>
                  <span className={`inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${acc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {acc.isActive ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
