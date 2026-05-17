import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TaxReturnsClient } from "./tax-returns-client"

export default async function TaxReturnsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const returns = await prisma.taxReturn.findMany({
    where:   { companyId: ctx.company.id },
    orderBy: [{ period: "desc" }, { type: "asc" }],
  })

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <h1 className="text-lg font-semibold text-[#37322F]">Tax Returns</h1>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <TaxReturnsClient orgSlug={orgSlug} initialReturns={returns as unknown as { id: string; type: string; period: string; status: string; filedAt: string | null; ackNumber: string | null; createdAt: string }[]} />
      </div>
    </div>
  )
}
