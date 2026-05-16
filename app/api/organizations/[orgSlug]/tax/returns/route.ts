import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const returns = await prisma.taxReturn.findMany({
    where:   { companyId: ctx.company.id },
    orderBy: [{ period: "desc" }, { type: "asc" }],
  })
  return NextResponse.json(returns)
}

// POST — create/regenerate a tax return snapshot
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
  const { type, period } = body

  if (!type)   return NextResponse.json({ error: "type is required."   }, { status: 400 })
  if (!period) return NextResponse.json({ error: "period is required." }, { status: 400 })

  // Cannot regenerate a filed return
  const existing = await prisma.taxReturn.findFirst({
    where: { companyId: ctx.company.id, type, period },
  })
  if (existing?.status === "filed")
    return NextResponse.json({ error: "This return has already been filed and cannot be regenerated." }, { status: 422 })

  // Fetch the computed data from the appropriate endpoint
  const base = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/organizations/${orgSlug}`
  let data: Record<string, unknown> = {}
  try {
    if (type === "GSTR1") {
      const res = await fetch(`${base}/tax/gstr1?period=${period}`, {
        headers: { Cookie: req.headers.get("Cookie") ?? "" },
      })
      data = await res.json()
    } else if (type === "GSTR3B") {
      const res = await fetch(`${base}/tax/gstr3b?period=${period}`, {
        headers: { Cookie: req.headers.get("Cookie") ?? "" },
      })
      data = await res.json()
    }
  } catch {
    // data stays empty — return is saved as draft without computed data
  }

  const jsonData = data as Prisma.InputJsonValue

  const taxReturn = existing
    ? await prisma.taxReturn.update({
        where: { id: existing.id },
        data:  { data: jsonData, updatedAt: new Date() },
      })
    : await prisma.taxReturn.create({
        data: {
          workspaceId: ctx.workspaceId,
          companyId:   ctx.company.id,
          type,
          period,
          status:      "draft",
          data:        jsonData,
        },
      })

  return NextResponse.json(taxReturn, { status: existing ? 200 : 201 })
}
