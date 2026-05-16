import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { resolveCompany } from "@/lib/api/resolve-company"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  BarChart2, BookOpen, Scale, List, Clock, ArrowDownLeft, ArrowUpRight,
} from "lucide-react"

const REPORTS = [
  {
    slug:  "p-and-l",
    title: "Profit & Loss",
    description: "Revenue, expenses, and net profit for a period",
    icon:  BarChart2,
    color: "bg-green-50 border-green-200",
    iconColor: "text-green-600",
  },
  {
    slug:  "balance-sheet",
    title: "Balance Sheet",
    description: "Assets, liabilities, and equity at a point in time",
    icon:  Scale,
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-600",
  },
  {
    slug:  "trial-balance",
    title: "Trial Balance",
    description: "All accounts with debit and credit totals",
    icon:  List,
    color: "bg-purple-50 border-purple-200",
    iconColor: "text-purple-600",
  },
  {
    slug:  "general-ledger",
    title: "General Ledger",
    description: "Per-account transaction history with running balance",
    icon:  BookOpen,
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-600",
  },
  {
    slug:  "ar-aging",
    title: "AR Aging",
    description: "Outstanding customer invoices by age bucket",
    icon:  ArrowDownLeft,
    color: "bg-teal-50 border-teal-200",
    iconColor: "text-teal-600",
  },
  {
    slug:  "ap-aging",
    title: "AP Aging",
    description: "Outstanding vendor bills by age bucket",
    icon:  ArrowUpRight,
    color: "bg-rose-50 border-rose-200",
    iconColor: "text-rose-600",
  },
  {
    slug:  "../tax/gstr1",
    title: "GSTR-1 Workpaper",
    description: "Outward supplies for GST return",
    icon:  Clock,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
  },
  {
    slug:  "../tax/gstr3b",
    title: "GSTR-3B Workpaper",
    description: "Monthly GST summary — liability and ITC",
    icon:  Clock,
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
  },
]

export default async function ReportsHubPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div>
          <h1 className="text-lg font-semibold text-[#37322F]">Reports</h1>
          <p className="text-xs text-[#605A57]">Financial statements and analytics</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {REPORTS.map((r) => (
            <a
              key={r.slug}
              href={r.slug.startsWith("../") ? `/${orgSlug}/${r.slug.slice(3)}` : `/${orgSlug}/reports/${r.slug}`}
              className={`group rounded-xl border p-5 flex flex-col gap-3 hover:shadow-md transition-all ${r.color}`}
            >
              <div className={`size-10 rounded-lg flex items-center justify-center bg-white ${r.iconColor}`}>
                <r.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#37322F] group-hover:text-[#1a1714]">
                  {r.title}
                </p>
                <p className="text-xs text-[#605A57] mt-0.5 leading-relaxed">{r.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
