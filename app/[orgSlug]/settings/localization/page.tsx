import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LocalizationClient } from "./localization-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function LocalizationPage({ params }: Props) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  })

  const membership = user?.workspaceMembers.find((m: { workspace: { slug: string; id: string } }) => m.workspace.slug === orgSlug)
  if (!membership) redirect("/onboarding")

  const company = await prisma.company.findFirst({
    where: { workspaceId: membership.workspace.id, isDefault: true, deletedAt: null },
    select: {
      id:             true,
      currency:       true,
      fiscalYearStart: true,
      timezone:       true,
      locale:         true,
      coaTemplate:    true,
      taxMode:        true,
      taxRegistrations: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const orgs = (user?.workspaceMembers ?? []).map((m: { workspace: { slug: string; name: string } }) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const userName = session.user.name ?? session.user.email.split("@")[0]

  return (
    <LocalizationClient
      orgSlug={orgSlug}
      orgName={membership.workspace.name}
      orgs={orgs}
      userName={userName}
      userEmail={session.user.email}
      company={company ? {
        id:              company.id,
        currency:        company.currency,
        fiscalYearStart: company.fiscalYearStart,
        timezone:        company.timezone,
        locale:          company.locale,
        coaTemplate:     company.coaTemplate,
        taxMode:         company.taxMode,
        taxRegistrations: company.taxRegistrations.map((r) => ({
          id:            r.id,
          type:          r.type,
          number:        r.number,
          effectiveFrom: r.effectiveFrom.toISOString(),
          isActive:      r.isActive,
        })),
      } : null}
    />
  )
}
