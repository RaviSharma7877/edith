import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

// Age buckets: Current (not yet due), 1-30, 31-60, 61-90, 90+
function ageBucket(daysOverdue: number): string {
  if (daysOverdue <= 0)  return "current"
  if (daysOverdue <= 30) return "1_30"
  if (daysOverdue <= 60) return "31_60"
  if (daysOverdue <= 90) return "61_90"
  return "over_90"
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url       = new URL(req.url)
  const asOfParam = url.searchParams.get("asOf")
  const asOf      = asOfParam ? new Date(asOfParam) : new Date()
  asOf.setHours(23, 59, 59, 999)

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId:  ctx.company.id,
      status:     "POSTED",
      amountDue:  { gt: 0 },
      invoiceDate: { lte: asOf },
    },
    include: { customer: { select: { id: true, name: true, code: true } } },
    orderBy: [{ customer: { name: "asc" } }, { dueDate: "asc" }],
  })

  type BucketKey = "current" | "1_30" | "31_60" | "61_90" | "over_90"

  interface CustomerRow {
    customerId:   string
    customerName: string
    customerCode: string | null
    current:      number
    "1_30":       number
    "31_60":      number
    "61_90":      number
    over_90:      number
    total:        number
    invoices: {
      id: string; invoiceNumber: string; invoiceDate: string
      dueDate: string | null; amountDue: number; daysOverdue: number; bucket: string
    }[]
  }

  const customerMap = new Map<string, CustomerRow>()

  for (const inv of invoices) {
    const due        = inv.dueDate ?? inv.invoiceDate
    const msOverdue  = asOf.getTime() - due.getTime()
    const daysOverdue = Math.max(0, Math.floor(msOverdue / 86_400_000))
    const bucket      = ageBucket(daysOverdue) as BucketKey
    const amt         = Number(inv.amountDue)

    let row = customerMap.get(inv.customerId)
    if (!row) {
      row = {
        customerId:   inv.customerId,
        customerName: inv.customer.name,
        customerCode: inv.customer.code,
        current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0,
        total:  0,
        invoices: [],
      }
      customerMap.set(inv.customerId, row)
    }

    row[bucket] += amt
    row.total   += amt
    row.invoices.push({
      id:            inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate:   inv.invoiceDate.toISOString(),
      dueDate:       inv.dueDate?.toISOString() ?? null,
      amountDue:     amt,
      daysOverdue,
      bucket,
    })
  }

  const rows = Array.from(customerMap.values())

  const summary = {
    current: rows.reduce((s, r) => s + r.current, 0),
    "1_30":  rows.reduce((s, r) => s + r["1_30"], 0),
    "31_60": rows.reduce((s, r) => s + r["31_60"], 0),
    "61_90": rows.reduce((s, r) => s + r["61_90"], 0),
    over_90: rows.reduce((s, r) => s + r.over_90,  0),
    total:   rows.reduce((s, r) => s + r.total,    0),
  }

  return NextResponse.json({ asOf: asOf.toISOString(), rows, summary })
}
