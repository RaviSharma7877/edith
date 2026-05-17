import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import type { DocumentStatus } from "@prisma/client"
import { resolveCompany } from "@/lib/api/resolve-company"
import { BillsClient } from "./bills-client"

export default async function PurchaseBillsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const sp          = await searchParams
  const ctx         = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const status      = sp.status      ?? ""
  const vendorId    = sp.vendorId    ?? ""
  const isDebitNote = sp.isDebitNote ?? ""
  const page        = Math.max(1, parseInt(sp.page ?? "1"))
  const limit       = 20

  const where = {
    companyId: ctx.company.id,
    ...(status      ? { status: status as DocumentStatus }           : {}),
    ...(vendorId    ? { vendorId }                                 : {}),
    ...(isDebitNote ? { isDebitNote: isDebitNote === "true" }      : {}),
  }

  const [total, bills, vendors] = await Promise.all([
    prisma.purchaseBill.count({ where }),
    prisma.purchaseBill.findMany({
      where,
      orderBy: { billDate: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, billNumber: true, vendorBillRef: true, status: true, billDate: true,
        dueDate: true, totalAmount: true, amountDue: true, isDebitNote: true, currency: true,
        vendor: { select: { id: true, name: true, code: true } },
        _count:  { select: { lines: true } },
      },
    }),
    prisma.vendor.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
      take:    200,
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#37322F]">Purchase Bills</h1>
        <Link
          href={`/${orgSlug}/purchase-bills/new`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New bill
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <BillsClient
          orgSlug={orgSlug}
          bills={bills.map((b) => ({ ...b, totalAmount: b.totalAmount?.toString() ?? "0", amountDue: b.amountDue?.toString() ?? "0", billDate: b.billDate instanceof Date ? b.billDate.toISOString() : b.billDate, dueDate: b.dueDate instanceof Date ? b.dueDate.toISOString() : b.dueDate }))}
          page={page}
          pages={Math.ceil(total / limit)}
          total={total}
          statusFilter={status || undefined}
          vendorIdFilter={vendorId || undefined}
          isDebitNoteFilter={isDebitNote || undefined}
          vendors={vendors}
        />
      </div>
    </div>
  )
}
