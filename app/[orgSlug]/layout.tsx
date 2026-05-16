import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { AppShell } from "@/components/app-sidebar"

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true, name: true } } },
      },
    },
  })

  const member = user?.workspaceMembers.find((m) => m.workspace.slug === orgSlug)
  if (!member) redirect("/workspace")

  const orgs = user!.workspaceMembers.map((m) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get("sidebar_state")
  const defaultOpen = sidebarCookie ? sidebarCookie.value === "true" : true

  return (
    <AppShell
      orgSlug={orgSlug}
      orgName={member.workspace.name}
      orgs={orgs}
      userName={session.user.name ?? undefined}
      userEmail={session.user.email}
      defaultOpen={defaultOpen}
    >
      {children}
    </AppShell>
  )
}
