import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TaxReturnDetail } from "./tax-return-detail"

export default async function TaxReturnPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id, companyId: ctx.company.id },
  })
  if (!taxReturn) notFound()

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#37322F]">
            {taxReturn.type} — {taxReturn.period}
          </h1>
          <a
            href={`/${orgSlug}/tax/returns`}
            className="text-xs text-[#8B8580] hover:text-[#37322F] transition-colors"
          >
            ← All returns
          </a>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <TaxReturnDetail
          orgSlug={orgSlug}
          taxReturn={taxReturn as unknown as { id: string; type: string; period: string; status: string; filedAt: string | null; filedById: string | null; ackNumber: string | null; data: Record<string, unknown>; createdAt: string; updatedAt: string }}
        />
      </div>
    </div>
  )
}
