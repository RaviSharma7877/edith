import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sections = await prisma.tCSSection.findMany({
    where: { workspaceId: ctx.workspaceId, isActive: true },
    orderBy: { section: "asc" },
  })
  return NextResponse.json(sections)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { section, description, rate, threshold } = body

  if (!section || !description || rate == null || threshold == null)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

  const record = await prisma.tCSSection.create({
    data: { workspaceId: ctx.workspaceId, section, description, rate, threshold },
  })
  return NextResponse.json(record, { status: 201 })
}
