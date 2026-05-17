import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VoucherTypeConfigCreateSchema, labelToKey } from "@/lib/ledger/voucher-form-config"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url             = new URL(req.url)
  const includeInactive = url.searchParams.get("includeInactive") === "true"

  const configs = await prisma.voucherTypeConfig.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  })

  return NextResponse.json(configs)
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

  const body   = await req.json()
  const parsed = VoucherTypeConfigCreateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 })

  const { label, prefix, isActive, sortOrder, formConfig } = parsed.data
  const key = parsed.data.key ?? labelToKey(label)

  if (!/^[A-Z][A-Z0-9_]{1,29}$/.test(key))
    return NextResponse.json({ error: "key must match ^[A-Z][A-Z0-9_]{1,29}$" }, { status: 400 })

  const existingPrefix = await prisma.voucherTypeConfig.findFirst({
    where: { companyId: ctx.company.id, prefix, deletedAt: null },
  })
  if (existingPrefix)
    return NextResponse.json({ error: `Prefix "${prefix}" is already in use.` }, { status: 409 })

  const existingKey = await prisma.voucherTypeConfig.findFirst({
    where: { companyId: ctx.company.id, key, deletedAt: null },
  })
  if (existingKey)
    return NextResponse.json({ error: `Key "${key}" is already in use.` }, { status: 409 })

  const config = await prisma.voucherTypeConfig.create({
    data: {
      companyId:       ctx.company.id,
      workspaceId:     ctx.workspaceId,
      key,
      label,
      prefix,
      isSystem:        false,
      isActive:        isActive ?? true,
      sortOrder:       sortOrder ?? 100,
      baseVoucherType: "JOURNAL_ENTRY",
      formConfig:      formConfig as object ?? {},
    },
  })

  return NextResponse.json(config, { status: 201 })
}
