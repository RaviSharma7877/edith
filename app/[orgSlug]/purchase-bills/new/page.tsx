import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { BillForm } from "./bill-form"

export default async function NewBillPage({
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

  const [vendors, accounts] = await Promise.all([
    prisma.vendor.findMany({
      where:   { companyId: ctx.company.id, isActive: true, deletedAt: null },
      select:  { id: true, name: true, code: true, paymentTerms: true },
      orderBy: { name: "asc" },
    }),
    prisma.chartAccount.findMany({
      where:   { companyId: ctx.company.id, type: "EXPENSE", isActive: true, isPosting: true },
      select:  { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ])

  return (
    <BillForm
      orgSlug={orgSlug}
      vendors={vendors}
      accounts={accounts}
      prefillVendorId={sp.vendorId}
    />
  )
}
