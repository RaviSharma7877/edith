import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./dashboard-client"

interface Props {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ welcome?: string }>
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { welcome } = await searchParams

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  // Fetch workspace + user's full org list in one query
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

  const currentMembership = user?.workspaceMembers.find(
    (m) => m.workspace.slug === orgSlug,
  )

  if (!currentMembership) redirect("/onboarding")

  const orgs = (user?.workspaceMembers ?? []).map((m) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const name = session.user.name ?? session.user.email.split("@")[0]

  return (
    <DashboardClient
      orgSlug={orgSlug}
      orgName={currentMembership.workspace.name}
      userName={name ?? undefined}
      userEmail={session.user.email}
      orgs={orgs}
      showWelcome={welcome === "1"}
    />
  )
}
