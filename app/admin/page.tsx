import { redirect }        from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { AdminDashboard }   from "./admin-client"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: true },
      },
    },
  })

  const isSuperAdmin = user?.workspaceMembers.some((m: { systemRole: string | null }) => m.systemRole === "SUPER_ADMIN")
  if (!isSuperAdmin) redirect("/workspace")

  const [totalWorkspaces, totalUsers, totalCompanies] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.company.count(),
  ])

  const recentWorkspaces = await prisma.workspace.findMany({
    take:    10,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: { where: { isActive: true, inviteStatus: "ACCEPTED" } } } },
    },
  })

  return (
    <AdminDashboard
      stats={{ totalWorkspaces, totalUsers, totalCompanies }}
      recentWorkspaces={recentWorkspaces.map((w) => ({
        id:        w.id,
        name:      w.name,
        slug:      w.slug,
        planTier:  w.planTier,
        status:    w.status,
        members:   w._count.members,
        createdAt: w.createdAt.toISOString(),
      }))}
    />
  )
}
