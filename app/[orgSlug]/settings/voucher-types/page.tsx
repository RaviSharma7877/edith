import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { VoucherTypesClient } from "./voucher-types-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function VoucherTypesPage({ params }: Props) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMembers: {
        where: { isActive: true },
        include: { workspace: { select: { id: true, slug: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  })

  const membership = user?.workspaceMembers.find((m: { workspace: { slug: string; id: string } }) => m.workspace.slug === orgSlug)
  if (!membership) redirect("/onboarding")

  const company = await prisma.company.findFirst({
    where: { workspaceId: membership.workspace.id, isDefault: true, deletedAt: null },
    select: { id: true },
  })
  if (!company) redirect(`/${orgSlug}/settings`)

  const configs = await prisma.voucherTypeConfig.findMany({
    where:   { companyId: company.id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      id: true, key: true, label: true, prefix: true,
      isSystem: true, isActive: true, sortOrder: true,
      baseVoucherType: true, formConfig: true,
      createdAt: true, updatedAt: true,
    },
  })

  const orgs = (user?.workspaceMembers ?? []).map((m: { workspace: { slug: string; name: string } }) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const userName = session.user.name ?? session.user.email.split("@")[0]

  return (
    <VoucherTypesClient
      orgSlug={orgSlug}
      orgName={membership.workspace.name}
      orgs={orgs}
      userName={userName}
      userEmail={session.user.email}
      configs={configs.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }))}
    />
  )
}
