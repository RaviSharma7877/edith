import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Phase5Shell, StatCard } from "../_components/phase5-ui"

export default async function PayrollReportsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [employees, activeEmployees, runs, pfEntries, esiEntries, attendanceRecords] = await Promise.all([
    prisma.employee.count({ where: { companyId: ctx.company.id, deletedAt: null } }),
    prisma.employee.count({ where: { companyId: ctx.company.id, deletedAt: null, status: "ACTIVE" } }),
    prisma.payrollRun.findMany({ where: { companyId: ctx.company.id }, orderBy: { period: "desc" }, take: 12 }),
    prisma.pFRegister.groupBy({ by: ["payrollRunId"], where: { companyId: ctx.company.id }, _sum: { employeePfAmount: true, employerPfAmount: true } }),
    prisma.eSIRegister.groupBy({ by: ["payrollRunId"], where: { companyId: ctx.company.id }, _sum: { employeeEsiAmount: true, employerEsiAmount: true } }),
    prisma.attendance.groupBy({ by: ["status"], where: { companyId: ctx.company.id }, _count: { id: true } }),
  ])

  type RunRow = { id: string; runNumber: string; period: string; status: string; grossPay: { valueOf(): number } | null; deductions: { valueOf(): number } | null; netPay: { valueOf(): number } | null }
  type PFEntry = { _sum: { employeePfAmount: { valueOf(): number } | null; employerPfAmount: { valueOf(): number } | null } }
  type ESIEntry = { _sum: { employeeEsiAmount: { valueOf(): number } | null; employerEsiAmount: { valueOf(): number } | null } }
  type AttendanceRow = { status: string; _count: { id: number } }

  const typedRuns = runs as RunRow[]
  const typedPF = pfEntries as PFEntry[]
  const typedESI = esiEntries as ESIEntry[]
  const typedAttendance = attendanceRecords as AttendanceRow[]

  const totalGross = typedRuns.reduce((s, r) => s + Number(r.grossPay), 0)
  const totalNet = typedRuns.reduce((s, r) => s + Number(r.netPay), 0)
  const totalDeductions = typedRuns.reduce((s, r) => s + Number(r.deductions), 0)
  const totalPFEmployee = typedPF.reduce((s, e) => s + Number(e._sum.employeePfAmount ?? 0), 0)
  const totalPFEmployer = typedPF.reduce((s, e) => s + Number(e._sum.employerPfAmount ?? 0), 0)
  const totalESIEmployee = typedESI.reduce((s, e) => s + Number(e._sum.employeeEsiAmount ?? 0), 0)
  const totalESIEmployer = typedESI.reduce((s, e) => s + Number(e._sum.employerEsiAmount ?? 0), 0)

  const attendanceByStatus = Object.fromEntries(typedAttendance.map((r) => [r.status, r._count.id]))
  const totalAttendance = typedAttendance.reduce((s, r) => s + r._count.id, 0)

  const paidRuns = typedRuns.filter((r) => r.status === "PAID")

  return (
    <Phase5Shell title="Payroll Reports" description="Headcount, cost summary and statutory compliance snapshot">
      <div className="space-y-8">

        {/* Headcount */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#605A57]">Headcount</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total employees" value={employees} hint="Including inactive" />
            <StatCard label="Active employees" value={activeEmployees} hint="Currently employed" />
            <StatCard label="Payroll runs (all time)" value={runs.length} hint={`${paidRuns.length} paid`} />
          </div>
        </section>

        {/* Cost summary */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#605A57]">Cost Summary (All Runs)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total gross pay" value={`₹${totalGross.toLocaleString("en-IN")}`} hint="Before deductions" />
            <StatCard label="Total deductions" value={`₹${totalDeductions.toLocaleString("en-IN")}`} hint="PF, ESI, TDS etc." />
            <StatCard label="Total net pay" value={`₹${totalNet.toLocaleString("en-IN")}`} hint="Take-home disbursed" />
          </div>
        </section>

        {/* Statutory */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#605A57]">Statutory Contributions</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Employee PF" value={`₹${totalPFEmployee.toLocaleString("en-IN")}`} hint="12% of basic" />
            <StatCard label="Employer PF" value={`₹${totalPFEmployer.toLocaleString("en-IN")}`} hint="12% of basic" />
            <StatCard label="Employee ESI" value={`₹${totalESIEmployee.toLocaleString("en-IN")}`} hint="0.75% of gross" />
            <StatCard label="Employer ESI" value={`₹${totalESIEmployer.toLocaleString("en-IN")}`} hint="3.25% of gross" />
          </div>
        </section>

        {/* Attendance summary */}
        {totalAttendance > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#605A57]">Attendance Summary</h2>
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard label="Present" value={attendanceByStatus["PRESENT"] ?? 0} hint={`${totalAttendance ? Math.round(((attendanceByStatus["PRESENT"] ?? 0) / totalAttendance) * 100) : 0}% of records`} />
              <StatCard label="Absent" value={attendanceByStatus["ABSENT"] ?? 0} hint="Full-day absences" />
              <StatCard label="Half day" value={attendanceByStatus["HALF_DAY"] ?? 0} hint="Half-day records" />
              <StatCard label="On leave" value={attendanceByStatus["ON_LEAVE"] ?? 0} hint="Approved leave" />
              <StatCard label="Holiday" value={attendanceByStatus["HOLIDAY"] ?? 0} hint="Company holidays" />
            </div>
          </section>
        )}

        {/* Run history */}
        {typedRuns.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#605A57]">Payroll Run History</h2>
            <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
                <span>Run</span><span>Period</span><span>Gross</span><span>Deductions</span><span>Net</span><span>Status</span>
              </div>
              {typedRuns.map((run) => (
                <div key={run.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm">
                  <span className="font-medium text-[#37322F]">{run.runNumber}</span>
                  <span>{run.period}</span>
                  <span>₹{Number(run.grossPay).toLocaleString("en-IN")}</span>
                  <span>₹{Number(run.deductions).toLocaleString("en-IN")}</span>
                  <span>₹{Number(run.netPay).toLocaleString("en-IN")}</span>
                  <span className={`text-xs font-medium ${run.status === "PAID" ? "text-green-700" : run.status === "CANCELLED" ? "text-red-600" : run.status === "PROCESSED" ? "text-blue-600" : "text-gray-600"}`}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Phase5Shell>
  )
}
