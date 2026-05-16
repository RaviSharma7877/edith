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

  const accounts = await prisma.bankAccount.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "asc" },
    include: {
      chartAccount: { select: { id: true, name: true, code: true, subtype: true } },
    },
  })

  return NextResponse.json(accounts)
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
  const { chartAccountId, bankName, maskedNumber, ifscCode, swiftCode, currency } = body

  if (!chartAccountId) return NextResponse.json({ error: "Chart account is required." }, { status: 400 })
  if (!bankName)       return NextResponse.json({ error: "Bank name is required."       }, { status: 400 })
  if (!maskedNumber)   return NextResponse.json({ error: "Account number is required."  }, { status: 400 })

  // Validate chart account belongs to company and is BANK/CASH
  const chartAccount = await prisma.chartAccount.findFirst({
    where: {
      id:        chartAccountId,
      companyId: ctx.company.id,
      subtype:   { in: ["BANK", "CASH"] as any },
      isActive:  true,
    },
  })
  if (!chartAccount)
    return NextResponse.json({ error: "Chart account not found or not a Bank/Cash account." }, { status: 422 })

  // One bank account per chart account
  const existing = await prisma.bankAccount.findUnique({ where: { chartAccountId } })
  if (existing)
    return NextResponse.json({ error: "A bank account is already linked to this chart account." }, { status: 409 })

  const account = await prisma.bankAccount.create({
    data: {
      companyId:     ctx.company.id,
      chartAccountId,
      bankName:      bankName.trim(),
      maskedNumber:  maskedNumber.trim(),
      ifscCode:      ifscCode?.trim() || null,
      swiftCode:     swiftCode?.trim() || null,
      currency:      currency ?? "INR",
    },
    include: {
      chartAccount: { select: { id: true, name: true, code: true } },
    },
  })

  return NextResponse.json(account, { status: 201 })
}
