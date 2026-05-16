import { getServerSession } from "next-auth"
import { authOptions }      from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { resolveCompany }   from "@/lib/api/resolve-company"
import { NextResponse }     from "next/server"
import { randomBytes }      from "crypto"

const VALID_EVENTS = [
  "invoice.created", "invoice.updated", "invoice.posted", "invoice.voided",
  "bill.created",    "bill.updated",    "bill.posted",    "bill.voided",
  "payment.created", "payment.reconciled",
  "journal.posted",
  "customer.created", "customer.updated",
  "vendor.created",   "vendor.updated",
  "period.locked",    "period.closed",   "period.reopened",
]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const endpoints = await prisma.webhookEndpoint.findMany({
    where:   { workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, url: true, events: true, status: true,
      failureCount: true, lastSuccessAt: true, lastFailureAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(endpoints)
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
  const url    = (body.url ?? "").trim()
  const events = (body.events as string[]) ?? []

  if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })
  try { new URL(url) } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  const invalid = events.filter((e) => !VALID_EVENTS.includes(e))
  if (invalid.length) {
    return NextResponse.json({ error: `Unknown events: ${invalid.join(", ")}` }, { status: 400 })
  }
  if (!events.length) {
    return NextResponse.json({ error: "At least one event is required" }, { status: 400 })
  }

  const secret = `whsec_${randomBytes(32).toString("hex")}`

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      workspaceId: ctx.workspaceId,
      url,
      events,
      secret,
      createdById: ctx.userId,
    },
  })

  // Secret is returned ONCE at creation — then only the first 8 chars are shown
  return NextResponse.json({ ...endpoint, secret }, { status: 201 })
}
