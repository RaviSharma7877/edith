import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Phase5Shell, StatCard } from "../_components/phase5-ui"
import { Shield, Users } from "lucide-react"

export default async function StatutoryPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [pfCount, esiCount, latestRun] = await Promise.all([
    prisma.pFRegister.count({ where: { companyId: ctx.company.id } }),
    prisma.eSIRegister.count({ where: { companyId: ctx.company.id } }),
    prisma.payrollRun.findFirst({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } }),
  ])

  const modules = [
    {
      title: "PF Register",
      href: `/${orgSlug}/payroll/statutory/pf`,
      icon: Shield,
      copy: "Provident Fund contributions — employee (12%) and employer (12%) per payroll run.",
    },
    {
      title: "ESI Register",
      href: `/${orgSlug}/payroll/statutory/esi`,
      icon: Users,
      copy: "Employee State Insurance contributions — employee (0.75%) and employer (3.25%).",
    },
  ]

  return (
    <Phase5Shell title="Statutory Registers" description="PF and ESI contribution registers for compliance reporting">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="PF entries" value={pfCount} hint={latestRun ? `Latest run: ${latestRun.period}` : "No runs yet"} />
          <StatCard label="ESI entries" value={esiCount} hint={latestRun ? `Latest run: ${latestRun.period}` : "No runs yet"} />
          <StatCard label="Employees covered" value="—" hint="Based on active run lines" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((m) => (
            <Link key={m.title} href={m.href} className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 transition hover:border-[#37322F]/30">
              <m.icon className="size-5 text-[#605A57]" />
              <h2 className="mt-4 text-base font-semibold text-[#37322F]">{m.title}</h2>
              <p className="mt-1 text-sm text-[#605A57]">{m.copy}</p>
            </Link>
          ))}
        </div>
      </div>
    </Phase5Shell>
  )
}
