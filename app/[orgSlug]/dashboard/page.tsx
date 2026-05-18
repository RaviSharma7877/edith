import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "./dashboard-client"
import type { StatCard, ChartPoint, Transaction } from "./dashboard-client"

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function pctChange(current: number, prev: number): { text: string; up: boolean } {
  if (prev === 0 && current === 0) return { text: "0%", up: true }
  if (prev === 0) return { text: current > 0 ? "+100%" : "0%", up: current > 0 }
  const pct = ((current - prev) / prev) * 100
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 }
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ welcome?: string }>
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { welcome } = await searchParams

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

  const currentMembership = user?.workspaceMembers.find(
    (m: { workspace: { slug: string } }) => m.workspace.slug === orgSlug,
  )

  if (!currentMembership) redirect("/onboarding")

  const orgs = (user?.workspaceMembers ?? []).map((m: { workspace: { slug: string; name: string } }) => ({
    slug: m.workspace.slug,
    name: m.workspace.name,
  }))

  const name = session.user.name ?? session.user.email.split("@")[0]

  const baseProps = {
    orgSlug,
    orgName: currentMembership.workspace.name,
    userName: name ?? undefined,
    userEmail: session.user.email,
    orgs,
    showWelcome: welcome === "1",
  }

  // ── Company lookup ──────────────────────────────────────────────────────────
  const company = await prisma.company.findFirst({
    where: { workspaceId: currentMembership.workspace.id, isDefault: true, deletedAt: null },
    select: { id: true },
  })

  if (!company) {
    return (
      <DashboardClient
        {...baseProps}
        stats={[]}
        revenueData={[]}
        transactions={[]}
      />
    )
  }

  const companyId = company.id
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPrevMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twelveMonthsAgo     = new Date(now.getFullYear() - 1, now.getMonth(), 1)

  // ── Parallel data queries ───────────────────────────────────────────────────
  const [
    revCur, revPrev,
    expCur, expPrev,
    receivablesAgg,
    overdueCount,
    recentInvoices,
    recentBills,
    recentJournals,
    recentPayments,
    monthlyInvoices,
    monthlyBills,
  ] = await Promise.all([
    prisma.salesInvoice.aggregate({
      where: { companyId, status: "POSTED", isCreditNote: false, invoiceDate: { gte: startOfCurrentMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.salesInvoice.aggregate({
      where: { companyId, status: "POSTED", isCreditNote: false, invoiceDate: { gte: startOfPrevMonth, lt: startOfCurrentMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.purchaseBill.aggregate({
      where: { companyId, status: "POSTED", isDebitNote: false, billDate: { gte: startOfCurrentMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.purchaseBill.aggregate({
      where: { companyId, status: "POSTED", isDebitNote: false, billDate: { gte: startOfPrevMonth, lt: startOfCurrentMonth } },
      _sum: { totalAmount: true },
    }),
    prisma.salesInvoice.aggregate({
      where: { companyId, status: { in: ["APPROVED", "POSTED"] }, isCreditNote: false, amountDue: { gt: 0 } },
      _sum: { amountDue: true },
      _count: true,
    }),
    prisma.salesInvoice.count({
      where: { companyId, status: { in: ["APPROVED", "POSTED"] }, isCreditNote: false, amountDue: { gt: 0 }, dueDate: { lt: now } },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId, isCreditNote: false },
      orderBy: { invoiceDate: "desc" },
      take: 8,
      select: {
        id: true, invoiceNumber: true, status: true,
        totalAmount: true, amountDue: true, dueDate: true, invoiceDate: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.purchaseBill.findMany({
      where: { companyId, isDebitNote: false },
      orderBy: { billDate: "desc" },
      take: 8,
      select: {
        id: true, billNumber: true, status: true,
        totalAmount: true, amountDue: true, dueDate: true, billDate: true,
        vendor: { select: { name: true } },
      },
    }),
    prisma.journalEntry.findMany({
      where: { companyId, voucherType: "JOURNAL_ENTRY" },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, voucherNumber: true, status: true, totalDebit: true, date: true, description: true },
    }),
    prisma.payment.findMany({
      where: { companyId },
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true, paymentNumber: true, status: true, amount: true, date: true,
        customer: { select: { name: true } },
        vendor:   { select: { name: true } },
      },
    }),
    prisma.salesInvoice.findMany({
      where: { companyId, status: "POSTED", isCreditNote: false, invoiceDate: { gte: twelveMonthsAgo } },
      select: { invoiceDate: true, totalAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: { companyId, status: "POSTED", isDebitNote: false, billDate: { gte: twelveMonthsAgo } },
      select: { billDate: true, totalAmount: true },
    }),
  ])

  // ── Stats ───────────────────────────────────────────────────────────────────
  const revenue     = Number(revCur._sum.totalAmount ?? 0)
  const revPrevAmt  = Number(revPrev._sum.totalAmount ?? 0)
  const expenses    = Number(expCur._sum.totalAmount ?? 0)
  const expPrevAmt  = Number(expPrev._sum.totalAmount ?? 0)
  const receivables = Number(receivablesAgg._sum.amountDue ?? 0)
  const unpaidCount = receivablesAgg._count
  const netProfit   = revenue - expenses
  const netPrevProfit = revPrevAmt - expPrevAmt

  const revDelta  = pctChange(revenue, revPrevAmt)
  const expDelta  = pctChange(expenses, expPrevAmt)
  const profDelta = pctChange(netProfit, netPrevProfit)

  const stats: StatCard[] = [
    {
      label: "Total Revenue",
      value: fmtINR(revenue),
      change: revDelta.text,
      up: revDelta.up,
      sub1: revDelta.up ? "Trending up this month" : "Down from last month",
      sub2: "Based on posted invoices",
    },
    {
      label: "Outstanding Receivables",
      value: fmtINR(receivables),
      change: overdueCount > 0 ? `${overdueCount} overdue` : "All paid",
      up: overdueCount === 0,
      sub1: `${unpaidCount} invoice${unpaidCount !== 1 ? "s" : ""} unpaid`,
      sub2: "Current balance due",
    },
    {
      label: "Total Expenses",
      value: fmtINR(expenses),
      change: expDelta.text,
      up: !expDelta.up,
      sub1: expDelta.up ? "Up from last month" : "Down from last month",
      sub2: "Based on posted bills",
    },
    {
      label: "Net Profit",
      value: fmtINR(netProfit),
      change: profDelta.text,
      up: profDelta.up,
      sub1: profDelta.up ? "Strong margin growth" : "Below last month",
      sub2: "Revenue minus expenses",
    },
  ]

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartMap: Record<string, { month: string; revenue: number; expenses: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    chartMap[`${d.getFullYear()}-${d.getMonth()}`] = { month: MONTHS[d.getMonth()], revenue: 0, expenses: 0 }
  }
  for (const inv of monthlyInvoices) {
    const d = new Date(inv.invoiceDate)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (chartMap[key]) chartMap[key].revenue += Number(inv.totalAmount)
  }
  for (const bill of monthlyBills) {
    const d = new Date(bill.billDate)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (chartMap[key]) chartMap[key].expenses += Number(bill.totalAmount)
  }
  const revenueData: ChartPoint[] = Object.values(chartMap)

  // ── Transactions ────────────────────────────────────────────────────────────
  function invStatus(status: string, amountDue: number, dueDate: Date | null): string {
    if (status === "POSTED") {
      if (amountDue === 0) return "paid"
      if (dueDate && dueDate < now) return "overdue"
      return "pending"
    }
    return status === "DRAFT" ? "draft" : "pending"
  }

  const allTx = [
    ...recentInvoices.map((inv) => ({
      id:          inv.id,
      description: `${inv.invoiceNumber} — ${inv.customer.name}`,
      type:        "Sales Invoice",
      status:      invStatus(inv.status, Number(inv.amountDue), inv.dueDate),
      amount:      fmtINR(Number(inv.totalAmount)),
      date:        new Date(inv.invoiceDate),
    })),
    ...recentBills.map((bill) => ({
      id:          bill.id,
      description: `${bill.billNumber} — ${bill.vendor.name}`,
      type:        "Purchase Bill",
      status:      invStatus(bill.status, Number(bill.amountDue), bill.dueDate),
      amount:      fmtINR(Number(bill.totalAmount)),
      date:        new Date(bill.billDate),
    })),
    ...recentJournals.map((je) => ({
      id:          je.id,
      description: `${je.voucherNumber}${je.description ? " — " + je.description : ""}`,
      type:        "Journal Entry",
      status:      je.status === "POSTED" ? "posted" : "draft",
      amount:      fmtINR(Number(je.totalDebit)),
      date:        new Date(je.date),
    })),
    ...recentPayments.map((pmt) => ({
      id:          pmt.id,
      description: `${pmt.paymentNumber}${pmt.customer?.name ? " — " + pmt.customer.name : pmt.vendor?.name ? " — " + pmt.vendor.name : ""}`,
      type:        "Payment",
      status:      pmt.status === "POSTED" ? "posted" : "pending",
      amount:      fmtINR(Number(pmt.amount)),
      date:        new Date(pmt.date),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)

  const transactions: Transaction[] = allTx.map((t) => ({ ...t, date: fmtDate(t.date) }))

  return (
    <DashboardClient
      {...baseProps}
      stats={stats}
      revenueData={revenueData}
      transactions={transactions}
    />
  )
}
