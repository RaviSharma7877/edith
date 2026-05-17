import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { PaymentForm } from "./payment-form"
import { SidebarTrigger } from "@/components/ui/sidebar"
import Link from "next/link"

export default async function NewPaymentPage({
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

  const [customers, vendors, bankAccounts] = await Promise.all([
    prisma.customer.findMany({
      where:   { companyId: ctx.company.id, deletedAt: null },
      select:  { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      where:   { companyId: ctx.company.id, deletedAt: null },
      select:  { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where:   { companyId: ctx.company.id, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { chartAccount: { select: { name: true } } },
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <Link href={`/${orgSlug}/payments`} className="text-sm text-[#605A57] hover:text-[#37322F]">
            ← Payments
          </Link>
          <span className="text-[rgba(55,50,47,0.30)]">/</span>
          <span className="text-sm font-medium text-[#37322F]">New Payment</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <PaymentForm
          orgSlug={orgSlug}
          customers={customers}
          vendors={vendors}
          bankAccounts={bankAccounts}
          prefillCustomerId={sp.customerId}
          prefillVendorId={sp.vendorId}
        />
      </div>
    </div>
  )
}
