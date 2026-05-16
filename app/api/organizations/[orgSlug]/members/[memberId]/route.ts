/**
 * PATCH  /api/organizations/[orgSlug]/members/[memberId]  — update role / suspend / reactivate / toggle canApprove
 * DELETE /api/organizations/[orgSlug]/members/[memberId]  — remove member
 */

import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"
import {
  ASSIGNABLE_ROLES,
  PROTECTED_ROLES,
  MAKER_CHECKER_ELIGIBLE_ROLES,
} from "@/lib/permissions"
import type { SystemRole } from "@prisma/client"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, memberId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ctx.workspaceId },
  })
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })

  // Cannot modify protected roles (SUPER_ADMIN, ORG_OWNER) unless you are one
  const currentMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: ctx.userId } },
  })
  const currentRole = currentMember?.systemRole ?? "VIEWER"

  if (
    target.systemRole && PROTECTED_ROLES.includes(target.systemRole) &&
    currentRole !== "SUPER_ADMIN" && currentRole !== "ORG_OWNER"
  ) {
    return NextResponse.json({ error: "Cannot modify a protected role member" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { action, role, canApprove } = body as {
    action?: "suspend" | "reactivate" | "change_role" | "toggle_approve"
    role?: string
    canApprove?: boolean
  }

  let updateData: Record<string, unknown> = {}

  if (action === "suspend") {
    if (target.userId === ctx.userId) {
      return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 })
    }
    updateData = { isActive: false, suspendedAt: new Date(), suspendedById: ctx.userId }

  } else if (action === "reactivate") {
    updateData = { isActive: true, suspendedAt: null, suspendedById: null }

  } else if (action === "change_role") {
    const newRole = (role ?? "").toUpperCase() as SystemRole
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
      return NextResponse.json({ error: `Role "${role}" cannot be assigned` }, { status: 400 })
    }
    updateData = { systemRole: newRole, customRoleId: null }

  } else if (action === "toggle_approve") {
    const targetRole = target.systemRole ?? "VIEWER"
    if (!MAKER_CHECKER_ELIGIBLE_ROLES.includes(targetRole)) {
      return NextResponse.json(
        { error: "This role is not eligible for approval permissions" }, { status: 400 },
      )
    }
    updateData = { canApprove: typeof canApprove === "boolean" ? canApprove : !target.canApprove }

  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data:  updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, memberId } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const target = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: ctx.workspaceId },
  })
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 })

  if (target.userId === ctx.userId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 })
  }
  if (target.systemRole && PROTECTED_ROLES.includes(target.systemRole)) {
    return NextResponse.json({ error: "Cannot remove a protected role member" }, { status: 403 })
  }

  await prisma.workspaceMember.delete({ where: { id: memberId } })
  return NextResponse.json({ ok: true })
}
