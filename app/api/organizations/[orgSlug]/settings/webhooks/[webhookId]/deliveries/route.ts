import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"

export async function GET(
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

  const deliveries = await prisma.webhookDelivery.findMany({
    where:   { endpointId: webhookId },
    orderBy: { createdAt: "desc" },
    take:    100,
    select: {
      id: true, event: true, statusCode: true, attempts: true,
      deliveredAt: true, failedAt: true, createdAt: true, responseBody: true,
    },
  })

  return NextResponse.json(deliveries)
}
