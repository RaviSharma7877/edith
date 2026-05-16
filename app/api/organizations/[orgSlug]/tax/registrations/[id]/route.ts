import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const reg = await prisma.taxRegistration.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const ALLOWED = ["number", "effectiveFrom", "effectiveTo", "stateCode", "isActive", "metadata"] as const
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) {
      if (key === "effectiveFrom" || key === "effectiveTo")
        data[key] = body[key] ? new Date(body[key]) : null
      else
        data[key] = body[key] ?? null
    }
  }

  const updated = await prisma.taxRegistration.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const reg = await prisma.taxRegistration.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.taxRegistration.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
