import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { computeTrialBalance } from "@/lib/ledger/ledger-service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url  = new URL(req.url)
  const from = url.searchParams.get("from")
  const to   = url.searchParams.get("to")

  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const toDate   = to   ? new Date(to)   : new Date()
  toDate.setHours(23, 59, 59, 999)

  const result = await computeTrialBalance({
    companyId: ctx.company.id,
    from:      fromDate,
    to:        toDate,
  })

  return NextResponse.json(result)
}
