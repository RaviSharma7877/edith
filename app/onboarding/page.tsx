import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OnboardingForm } from "./onboarding-form"

interface Props {
  searchParams: Promise<{ new?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { new: isNew } = await searchParams

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  // If ?new=1 skip the auto-redirect so existing users can create another org
  if (!isNew) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaceMembers: {
          take: 1,
          where: { isActive: true },
          orderBy: { joinedAt: "asc" },
          include: { workspace: { select: { slug: true } } },
        },
      },
    })

    const firstMembership = user?.workspaceMembers?.[0]
    if (firstMembership?.workspace?.slug) {
      redirect(`/${firstMembership.workspace.slug}/dashboard`)
    }
  }

  return <OnboardingForm email={session.user.email} />
}
