import { prisma } from "@/lib/prisma"
import type { Company } from "@prisma/client"

export type CompanyContext = {
  company: Company
  workspaceId: string
  userId: string
}

export async function resolveCompany(
  orgSlug: string,
  userEmail: string,
): Promise<CompanyContext | null> {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true } } },
      },
    },
  })

  const member = user?.workspaceMembers.find((m: { workspace: { id: string; slug: string }; inviteStatus: string }) => {
    return m.workspace.slug === orgSlug && m.inviteStatus === "ACCEPTED"
  })
  if (!member) return null

  const company = await prisma.company.findFirst({
    where: { workspaceId: member.workspace.id, isDefault: true, deletedAt: null },
  })
  if (!company) return null

  return { company, workspaceId: member.workspace.id, userId: user!.id }
}
