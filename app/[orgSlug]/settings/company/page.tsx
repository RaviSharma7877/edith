import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CompanySettingsClient } from "./company-settings-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function CompanySettingsPage({ params }: Props) {
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
  })

  const orgs = (user?.workspaceMembers ?? []).map((m: { workspace: { slug: string; name: string } }) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const userName = session.user.name ?? session.user.email.split("@")[0]

  const effectiveCompany = company || {
    name: membership.workspace.name,
    legalName: null,
  }
  
  return (
    <CompanySettingsClient
      orgSlug={orgSlug}
      orgName={membership.workspace.name}
      orgs={orgs}
      userName={userName}
      userEmail={session.user.email}
      company={effectiveCompany as { name: string; legalName: string | null }}
    />
  )
}
