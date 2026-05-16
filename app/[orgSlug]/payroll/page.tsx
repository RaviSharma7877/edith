import Link from "next/link"
import { Users, WalletCards, FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Phase5Shell, StatCard } from "./_components/phase5-ui"

async function ctx(orgSlug: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const resolved = await resolveCompany(orgSlug, session.user.email)
  if (!resolved) redirect("/workspace")
  return resolved
}

export default async function PayrollPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const { company } = await ctx(orgSlug)
  const [employees, activeEmployees, runs, latestRun] = await Promise.all([
    prisma.employee.count({ where: { companyId: company.id, deletedAt: null } }),
    prisma.employee.count({ where: { companyId: company.id, deletedAt: null, status: "ACTIVE" } }),
    prisma.payrollRun.count({ where: { companyId: company.id } }),
    prisma.payrollRun.findFirst({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
  ])

  const modules = [
    { title: "Employees", href: "payroll/employees", icon: Users, copy: "Maintain employee master data, statutory IDs and CTC." },
    { title: "Payroll Runs", href: "payroll/runs", icon: WalletCards, copy: "Process monthly payroll totals, deductions and payout status." },
    { title: "Payslip Register", href: "payroll/runs", icon: FileText, copy: "Track payslip lines and statutory registers per run." },
  ]

  return (
    <Phase5Shell title="Payroll" description="Employees, payroll processing, PF/ESI and payslip registers">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Employees" value={employees} hint={`${activeEmployees} active`} />
          <StatCard label="Payroll runs" value={runs} hint={latestRun ? `Latest ${latestRun.period}` : "No runs yet"} />
          <StatCard label="Latest net pay" value={`₹${Number(latestRun?.netPay ?? 0).toLocaleString("en-IN")}`} hint={latestRun?.status ?? "Draft-ready"} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} href={`/${orgSlug}/${module.href}`} className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 transition hover:border-[#37322F]/30">
              <module.icon className="size-5 text-[#605A57]" />
              <h2 className="mt-4 text-base font-semibold text-[#37322F]">{module.title}</h2>
              <p className="mt-1 text-sm text-[#605A57]">{module.copy}</p>
            </Link>
          ))}
        </div>
      </div>
    </Phase5Shell>
  )
}
