import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { PaymentsClient } from "./payments-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const sp          = await searchParams
  const ctx         = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const page   = Math.max(1, parseInt(sp.page ?? "1"))
  const limit  = 20
  const where  = {
    companyId:  ctx.company.id,
    ...(sp.type       ? { type: sp.type }                        : {}),
    ...(sp.status     ? { status: sp.status as any }             : {}),
    ...(sp.customerId ? { customerId: sp.customerId }            : {}),
    ...(sp.vendorId   ? { vendorId: sp.vendorId }                : {}),
  }

  const [total, payments, customers, vendors] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, paymentNumber: true, type: true, date: true,
        amount: true, currency: true, status: true,
        paymentMethod: true, reference: true, isReversal: true,
        customer: { select: { id: true, name: true } },
        vendor:   { select: { id: true, name: true } },
        _count:   { select: { allocations: true } },
      },
    }),
    prisma.customer.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  const pagination = { page, pages: Math.ceil(total / limit), total }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <h1 className="text-lg font-semibold text-[#37322F]">Payments</h1>
        </div>
        <Link
          href={`/${orgSlug}/payments/new`}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Payment
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <PaymentsClient
          orgSlug={orgSlug}
          initialPayments={payments as any}
          initialPagination={pagination}
          customers={customers}
          vendors={vendors}
        />
      </div>
    </div>
  )
}
