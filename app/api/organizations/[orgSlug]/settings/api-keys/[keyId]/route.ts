import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"

// DELETE — revoke key
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; keyId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, keyId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const key = await prisma.apiKey.findFirst({
    where: { id: keyId, workspaceId: ctx.workspaceId },
  })
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.apiKey.update({
    where: { id: keyId },
    data:  { isActive: false, revokedAt: new Date(), revokedById: ctx.userId },
  })

  return NextResponse.json(updated)
}
