import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { DocumentStatus, type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InvoicesClient } from "./invoices-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

type InvoicesClientProps = Parameters<typeof InvoicesClient>[0]

const documentStatuses = new Set<string>(Object.values(DocumentStatus))

export default async function SalesInvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug }  = await params
  const sp           = await searchParams
  const ctx          = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const status       = documentStatuses.has(sp.status ?? "") ? sp.status : ""
  const customerId   = sp.customerId   ?? ""
  const isCreditNote = sp.isCreditNote ?? ""
  const page         = Math.max(1, parseInt(sp.page ?? "1"))
  const limit        = 20

  const where: Prisma.SalesInvoiceWhereInput = {
    companyId: ctx.company.id,
    ...(status       ? { status: status as DocumentStatus }                    : {}),
    ...(customerId   ? { customerId }                                          : {}),
    ...(isCreditNote ? { isCreditNote: isCreditNote === "true" }               : {}),
  }

  const [total, invoices, customers] = await Promise.all([
    prisma.salesInvoice.count({ where }),
    prisma.salesInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, invoiceNumber: true, status: true, invoiceDate: true,
        dueDate: true, totalAmount: true, amountDue: true, amountPaid: true,
        isCreditNote: true, currency: true, createdAt: true,
        customer: { select: { id: true, name: true, code: true } },
        _count:   { select: { lines: true } },
      },
    }),
    prisma.customer.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
      take:    200,
    }),
  ])

  return (
    <div className="flex h-svh w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <h1 className="text-lg font-semibold text-[#37322F]">Sales Invoices</h1>
        </div>
        <Link
          href={`/${orgSlug}/sales-invoices/new`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New invoice
        </Link>
      </header>

      <div className="min-w-0 flex-1 overflow-auto p-6">
        <InvoicesClient
          orgSlug={orgSlug}
          invoices={invoices as unknown as InvoicesClientProps["invoices"]}
          page={page}
          pages={Math.ceil(total / limit)}
          total={total}
          statusFilter={status || undefined}
          customerIdFilter={customerId || undefined}
          isCreditNoteFilter={isCreditNote || undefined}
          customers={customers}
        />
      </div>
    </div>
  )
}
