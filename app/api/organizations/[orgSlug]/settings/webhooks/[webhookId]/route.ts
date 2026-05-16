import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"

// PATCH — update events or pause/resume
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; webhookId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, webhookId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, workspaceId: ctx.workspaceId },
  })
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body   = await req.json()
  const update: { events?: string[]; status?: "ACTIVE" | "PAUSED" } = {}
  if (body.events) update.events = body.events
  if (body.status) update.status = body.status

  const updated = await prisma.webhookEndpoint.update({
    where: { id: webhookId },
    data:  update,
  })
  return NextResponse.json(updated)
}

// DELETE — remove endpoint
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; webhookId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, webhookId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, workspaceId: ctx.workspaceId },
  })
  if (!endpoint) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.webhookEndpoint.delete({ where: { id: webhookId } })
  return NextResponse.json({ deleted: true })
}
