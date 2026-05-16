/**
 * GET  /api/organizations/[orgSlug]/members  — list workspace members
 * POST /api/organizations/[orgSlug]/members  — invite a new member
 */

import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"
import { randomBytes }      from "crypto"
import { ASSIGNABLE_ROLES } from "@/lib/permissions"
import type { SystemRole }  from "@prisma/client"

export const runtime = "nodejs"

// 7-day invite expiry
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const members = await prisma.workspaceMember.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true, email: true, displayName: true, firstName: true,
          lastName: true, avatarUrl: true, lastActiveAt: true,
        },
      },
      customRole: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(members.map((m) => ({
    id:             m.id,
    userId:         m.userId,
    email:          m.user.email,
    name:           (m.user.displayName ?? `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim()) || m.user.email,
    avatarUrl:      m.user.avatarUrl,
    systemRole:     m.systemRole,
    customRole:     m.customRole,
    inviteStatus:   m.inviteStatus,
    isActive:       m.isActive,
    suspendedAt:    m.suspendedAt,
    canApprove:     m.canApprove,
    invitedAt:      m.invitedAt,
    inviteExpiresAt: m.inviteExpiresAt,
    joinedAt:       m.joinedAt,
    lastActive:     m.user.lastActiveAt,
  })))
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const { email, role } = body as { email?: string; role?: string }

  if (!email?.trim()) return NextResponse.json({ error: "email is required" }, { status: 400 })

  const roleStr = (role ?? "VIEWER").toUpperCase() as SystemRole
  if (!ASSIGNABLE_ROLES.includes(roleStr)) {
    return NextResponse.json({ error: `Role "${role}" cannot be assigned` }, { status: 400 })
  }

  // Find or create the invitee user record
  let invitee = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!invitee) {
    invitee = await prisma.user.create({
      data: {
        email:     email.trim().toLowerCase(),
        firstName: email.split("@")[0],
        status:    "PENDING_VERIFICATION",
      },
    })
  }

  // Guard: already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: invitee.id } },
  })
  if (existing) {
    if (existing.isActive && existing.inviteStatus === "ACCEPTED") {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 })
    }
    // Re-invite: refresh token and expiry
    const token      = randomBytes(32).toString("hex")
    const expiresAt  = new Date(Date.now() + INVITE_TTL_MS)
    const updated    = await prisma.workspaceMember.update({
      where: { id: existing.id },
      data: {
        systemRole:     roleStr,
        inviteToken:    token,
        inviteStatus:   "PENDING",
        inviteExpiresAt: expiresAt,
        invitedBy:      ctx.userId,
        invitedAt:      new Date(),
        isActive:       true,
      },
    })
    return NextResponse.json({ ...updated, inviteUrl: `/api/invites/${token}` }, { status: 200 })
  }

  const token     = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId:    ctx.workspaceId,
      userId:         invitee.id,
      systemRole:     roleStr,
      inviteToken:    token,
      inviteStatus:   "PENDING",
      inviteExpiresAt: expiresAt,
      invitedBy:      ctx.userId,
      invitedAt:      new Date(),
    },
  })

  // TODO: send invite email here when email service is configured
  // await sendInviteEmail(email, orgSlug, token)

  return NextResponse.json({ ...member, inviteUrl: `/api/invites/${token}` }, { status: 201 })
}
