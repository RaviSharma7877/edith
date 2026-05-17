import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AccountingClient } from "./accounting-client"

interface Props {
  params: Promise<{ orgSlug: string }>
}

export default async function AccountingPage({ params }: Props) {
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

  const membership = user?.workspaceMembers.find((m) => m.workspace.slug === orgSlug)
  if (!membership) redirect("/onboarding")

  const company = await prisma.company.findFirst({
    where: { workspaceId: membership.workspace.id, isDefault: true, deletedAt: null },
    select: {
      id:          true,
      name:        true,
      currency:    true,
      taxMode:     true,
    },
  })

  // Snapshot counts for the module tiles
  const [accountCount, openPeriods, draftJournals, recentJournals, recentActivity] = company
    ? await Promise.all([
        prisma.chartAccount.count({ where: { companyId: company.id, deletedAt: null } }),
        prisma.accountingPeriod.count({ where: { fiscalYear: { companyId: company.id }, status: "OPEN" } }),
        prisma.journalEntry.count({ where: { companyId: company.id, status: "DRAFT" } }),
        prisma.journalEntry.findMany({
          where: { companyId: company.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            voucherNumber: true,
            voucherType: true,
            totalDebit: true,
            status: true,
            date: true,
          }
        }),
        prisma.auditLog.findMany({
          where: { 
            workspaceId: membership.workspace.id,
            resourceType: { in: ["journal_entry", "chart_account", "company", "fiscal_year"] }
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { actor: { select: { displayName: true, email: true } } }
        })
      ])
    : [0, 0, 0, [], []]

  const orgs = (user?.workspaceMembers ?? []).map((m) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const userName = session.user.name ?? session.user.email.split("@")[0]

  return (
    <AccountingClient
      orgSlug={orgSlug}
      orgName={membership.workspace.name}
      orgs={orgs}
      userName={userName}
      userEmail={session.user.email}
      company={company ? { id: company.id, name: company.name, currency: company.currency, taxMode: company.taxMode } : null}
      stats={{ accountCount, openPeriods, draftJournals }}
      recentJournals={recentJournals.map((j) => ({ ...j, totalDebit: j.totalDebit.toString() }))}
      recentActivity={recentActivity.map((a) => ({ ...a, resourceType: a.resourceType ?? "" }))}
    />
  )
}
