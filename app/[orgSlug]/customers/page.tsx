import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CustomersClient } from "./customers-client"
import { SidebarTrigger } from "@/components/ui/sidebar"

type CustomersClientProps = Parameters<typeof CustomersClient>[0]

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const { search = "", page: pageStr = "1" } = await searchParams
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const page  = Math.max(1, parseInt(pageStr))
  const limit = 50

  const where: Prisma.CustomerWhereInput = {
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

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, code: true, name: true, email: true, phone: true,
        gstin: true, creditLimit: true, creditDays: true, isActive: true,
        createdAt: true,
        _count: { select: { salesInvoices: true } },
      },
    }),
  ])

  return (
    <div className="flex h-svh w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <h1 className="text-lg font-semibold text-[#37322F]">Customers</h1>
        </div>
        <Link href={`/${orgSlug}/customers/new`}>
          <Button size="sm">+ New customer</Button>
        </Link>
      </header>
      <div className="min-w-0 flex-1 overflow-auto p-6">
        <CustomersClient
          orgSlug={orgSlug}
          customers={customers as unknown as CustomersClientProps["customers"]}
          page={page}
          pages={Math.ceil(total / limit)}
          total={total}
          search={search}
        />
      </div>
    </div>
  )
}
