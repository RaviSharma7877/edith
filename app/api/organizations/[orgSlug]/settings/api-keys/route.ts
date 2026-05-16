import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"
import { randomBytes, createHash } from "crypto"

const VALID_SCOPES = [
  "invoices:read", "invoices:write",
  "bills:read",    "bills:write",
  "journals:read", "journals:write",
  "reports:read",
  "contacts:read", "contacts:write",
  "webhooks:read", "webhooks:write",
  "imports:write",
]

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

  const keys = await prisma.apiKey.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, keyPrefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, isActive: true,
      revokedAt: true, createdAt: true,
    },
  })

  return NextResponse.json(keys)
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

  const body      = await req.json()
  const name      = (body.name ?? "").trim()
  const scopes    = (body.scopes as string[]) ?? []
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s))
  if (invalidScopes.length) {
    return NextResponse.json({ error: `Invalid scopes: ${invalidScopes.join(", ")}` }, { status: 400 })
  }

  // Generate a cryptographically secure key: ek_live_{32 random bytes hex}
  const rawKey   = `ek_live_${randomBytes(32).toString("hex")}`
  const keyHash  = createHash("sha256").update(rawKey).digest("hex")
  const keyPrefix = rawKey.slice(0, 16)

  const key = await prisma.apiKey.create({
    data: {
      workspaceId: ctx.workspaceId,
      userId:      ctx.userId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt,
    },
  })

  // Return the raw key ONCE — it is never stored in plaintext
  return NextResponse.json({
    id:        key.id,
    name:      key.name,
    keyPrefix: key.keyPrefix,
    scopes:    key.scopes,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    rawKey,   // only returned at creation time
  }, { status: 201 })
}
