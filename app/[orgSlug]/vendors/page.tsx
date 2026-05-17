import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { VendorsClient } from "./vendors-client"

export default async function VendorsPage({
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

  const search = sp.search ?? ""
  const page   = Math.max(1, parseInt(sp.page ?? "1"))
  const limit  = 50

  const where = {
    companyId: ctx.company.id,
    deletedAt: null,
    ...(search ? {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { code:  { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  }

  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({
      where,
      orderBy: { name: "asc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, code: true, name: true, email: true, phone: true,
        gstin: true, paymentTerms: true, isActive: true, createdAt: true,
        _count: { select: { purchaseBills: true } },
      },
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#37322F]">Vendors</h1>
        <Link
          href={`/${orgSlug}/vendors/new`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New vendor
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <VendorsClient
          orgSlug={orgSlug}
          vendors={vendors.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))}
          page={page}
          pages={Math.ceil(total / limit)}
          total={total}
          search={search}
        />
      </div>
    </div>
  )
}
