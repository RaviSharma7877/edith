import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { reverseEntry } from "@/lib/ledger/ledger-service"

// ── POST /api/organizations/[orgSlug]/journals/[id]/reverse ───────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug, id } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { reason, date: reversalDate } = body

  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reversal reason is required." }, { status: 400 })
  }

  try {
    const reversal = await reverseEntry({
      entryId:     id,
      companyId:   ctx.company.id,
      workspaceId: ctx.workspaceId,
      userId:      ctx.userId,
      reason:      reason.trim(),
      date:        reversalDate ? new Date(reversalDate) : undefined,
      currency:    ctx.company.currency,
    })
    return NextResponse.json(reversal, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const status = message.includes("not found") ? 404
                 : message.includes("already been reversed") ? 409
                 : 422
    return NextResponse.json({ error: message }, { status })
  }
}
