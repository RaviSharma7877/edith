import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TaxSettingsClient } from "./tax-settings-client"

export default async function TaxSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [registrations, taxCodes] = await Promise.all([
    prisma.taxRegistration.findMany({
      where:   { companyId: ctx.company.id },
      orderBy: [{ type: "asc" }, { effectiveFrom: "asc" }],
    }),
    prisma.taxCode.findMany({
      where:   { workspaceId: ctx.workspaceId },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <h1 className="text-lg font-semibold text-[#37322F]">Tax Settings</h1>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <TaxSettingsClient
          orgSlug={orgSlug}
          initialRegistrations={registrations as any}
          initialTaxCodes={taxCodes as any}
        />
      </div>
    </div>
  )
}
