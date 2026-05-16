import { redirect }        from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { TenantsClient }    from "./tenants-client"

export default async function TenantsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true, systemRole: "SUPER_ADMIN" },
      },
    },
  })
  if (!user?.workspaceMembers.length) redirect("/workspace")

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          members:   { where: { isActive: true, inviteStatus: "ACCEPTED" } },
          companies: true,
        },
      },
    },
  })

  return (
    <TenantsClient
      workspaces={workspaces.map((w) => ({
        id:        w.id,
        name:      w.name,
        slug:      w.slug,
        planTier:  w.planTier,
        status:    w.status,
        members:   w._count.members,
        companies: w._count.companies,
        createdAt: w.createdAt.toISOString(),
      }))}
    />
  )
}
