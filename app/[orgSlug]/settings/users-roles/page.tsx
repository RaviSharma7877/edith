import { redirect }        from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { prisma }           from "@/lib/prisma"
import { UsersRolesClient } from "./users-roles-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function UsersRolesPage({ params }: Props) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const members = await prisma.workspaceMember.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true, email: true, displayName: true,
          firstName: true, lastName: true, lastActiveAt: true,
        },
      },
    },
  })

  const workspace = await prisma.workspace.findUnique({
    where:  { id: ctx.workspaceId },
    select: { planTier: true },
  })

  // Count seats for plan warning
  const activeCount = members.filter((m) => m.isActive && m.inviteStatus === "ACCEPTED").length

  return (
    <UsersRolesClient
      orgSlug={orgSlug}
      currentUserId={ctx.userId}
      activeCount={activeCount}
      planTier={workspace?.planTier ?? "FREE"}
      members={members.map((m) => ({
        id:             m.id,
        userId:         m.userId,
        email:          m.user.email,
        name:           (m.user.displayName ?? `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim()) || m.user.email,
        systemRole:     m.systemRole ?? "VIEWER",
        inviteStatus:   m.inviteStatus,
        inviteExpiresAt: m.inviteExpiresAt?.toISOString() ?? null,
        isActive:       m.isActive,
        suspendedAt:    m.suspendedAt?.toISOString() ?? null,
        canApprove:     m.canApprove,
        joinedAt:       m.joinedAt?.toISOString() ?? null,
        lastActive:     m.user.lastActiveAt?.toISOString() ?? null,
      }))}
    />
  )
}
