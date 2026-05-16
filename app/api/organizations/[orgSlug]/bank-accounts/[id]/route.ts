import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      chartAccount: { select: { id: true, name: true, code: true, subtype: true } },
    },
  })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(account)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const account = await prisma.bankAccount.findFirst({ where: { id, companyId: ctx.company.id } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const ALLOWED = ["bankName", "maskedNumber", "ifscCode", "swiftCode", "currency", "isActive"] as const
  const data: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key] ?? null
  }

  const updated = await prisma.bankAccount.update({ where: { id }, data })
  return NextResponse.json(updated)
}
