import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const job = await prisma.importJob.findFirst({
    where:   { id, workspaceId: ctx.workspaceId },
    include: {
      rows: {
        orderBy: { rowIndex: "asc" },
        where:   { status: { not: "success" } },
        take:    200,
      },
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(job)
}
