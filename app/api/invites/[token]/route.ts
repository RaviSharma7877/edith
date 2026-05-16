/**
 * GET /api/invites/[token]  — accept an invite token
 * Redirects to the workspace dashboard on success.
 */

import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { NextResponse }     from "next/server"
import { redirect }         from "next/navigation"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const session   = await getServerSession(authOptions)

  const member = await prisma.workspaceMember.findUnique({
    where:   { inviteToken: token },
    include: { workspace: { select: { slug: true, name: true } } },
  })

  if (!member) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 })
  }
  if (member.inviteStatus === "ACCEPTED") {
    // Already accepted — just redirect to the org
    return redirect(`/${member.workspace.slug}/dashboard`)
  }
  if (member.inviteStatus === "CANCELLED") {
    return NextResponse.json({ error: "This invite has been cancelled" }, { status: 410 })
  }
  if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
    await prisma.workspaceMember.update({
      where: { id: member.id },
      data:  { inviteStatus: "EXPIRED" },
    })
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 })
  }

  // If the user is not signed in, redirect to login with the token as a return param
  if (!session?.user?.email) {
    return redirect(`/login?invite=${token}`)
  }

  // Mark invite as accepted
  await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      inviteStatus: "ACCEPTED",
      inviteToken:  null,
      joinedAt:     new Date(),
      isActive:     true,
    },
  })

  return redirect(`/${member.workspace.slug}/dashboard`)
}
