import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InvoiceForm } from "./invoice-form"

export default async function NewInvoicePage({
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

  const [customers, accounts] = await Promise.all([
    prisma.customer.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      select:  { id: true, name: true, code: true, creditDays: true },
      orderBy: { name: "asc" },
    }),
    prisma.chartAccount.findMany({
      where:   { companyId: ctx.company.id, isActive: true, isPosting: true },
      select:  { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ])

  return (
    <InvoiceForm
      orgSlug={orgSlug}
      customers={customers}
      accounts={accounts}
      prefillCustomerId={sp.customerId}
    />
  )
}
