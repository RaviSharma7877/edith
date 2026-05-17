import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VoucherTypeConfigUpdateSchema } from "@/lib/ledger/voucher-form-config"

type RouteParams = { params: Promise<{ orgSlug: string; id: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(config)
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body   = await req.json()
  const parsed = VoucherTypeConfigUpdateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 })

  const { label, isActive, sortOrder, formConfig } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (formConfig  !== undefined) updateData.formConfig  = formConfig as object
  if (isActive    !== undefined) updateData.isActive    = isActive
  if (sortOrder   !== undefined) updateData.sortOrder   = sortOrder
  if (!config.isSystem && label !== undefined) updateData.label = label

  const updated = await prisma.voucherTypeConfig.update({
    where: { id },
    data:  updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const config = await prisma.voucherTypeConfig.findFirst({
    where: { id, companyId: ctx.company.id, deletedAt: null },
  })
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (config.isSystem)
    return NextResponse.json({ error: "System voucher types cannot be deleted." }, { status: 422 })

  const usageCount = await prisma.journalEntry.count({ where: { voucherTypeConfigId: id } })
  if (usageCount > 0)
    return NextResponse.json({
      error: `Cannot delete: ${usageCount} journal entr${usageCount === 1 ? "y" : "ies"} use this voucher type.`,
    }, { status: 422 })

  await prisma.voucherTypeConfig.update({
    where: { id },
    data:  { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
