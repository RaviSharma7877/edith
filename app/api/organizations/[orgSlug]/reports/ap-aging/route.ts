import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { NextResponse } from "next/server"

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

  const bills = await prisma.purchaseBill.findMany({
    where: {
      companyId: ctx.company.id,
      status:    "POSTED",
      amountDue: { gt: 0 },
      billDate:  { lte: asOf },
    },
    include: { vendor: { select: { id: true, name: true, code: true } } },
    orderBy: [{ vendor: { name: "asc" } }, { dueDate: "asc" }],
  })

  type BucketKey = "current" | "1_30" | "31_60" | "61_90" | "over_90"

  interface VendorRow {
    vendorId:   string
    vendorName: string
    vendorCode: string | null
    current:    number
    "1_30":     number
    "31_60":    number
    "61_90":    number
    over_90:    number
    total:      number
    bills: {
      id: string; billNumber: string; billDate: string
      dueDate: string | null; amountDue: number; daysOverdue: number; bucket: string
    }[]
  }

  const vendorMap = new Map<string, VendorRow>()

  for (const bill of bills) {
    const due        = bill.dueDate ?? bill.billDate
    const msOverdue  = asOf.getTime() - due.getTime()
    const daysOverdue = Math.max(0, Math.floor(msOverdue / 86_400_000))
    const bucket      = ageBucket(daysOverdue) as BucketKey
    const amt         = Number(bill.amountDue)

    let row = vendorMap.get(bill.vendorId)
    if (!row) {
      row = {
        vendorId:   bill.vendorId,
        vendorName: bill.vendor.name,
        vendorCode: bill.vendor.code,
        current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0,
        total:   0,
        bills:   [],
      }
      vendorMap.set(bill.vendorId, row)
    }

    row[bucket] += amt
    row.total   += amt
    row.bills.push({
      id:         bill.id,
      billNumber: bill.billNumber,
      billDate:   bill.billDate.toISOString(),
      dueDate:    bill.dueDate?.toISOString() ?? null,
      amountDue:  amt,
      daysOverdue,
      bucket,
    })
  }

  const rows = Array.from(vendorMap.values())

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
