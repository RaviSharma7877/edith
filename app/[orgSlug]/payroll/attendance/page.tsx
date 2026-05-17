import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Phase5Shell } from "../_components/phase5-ui"

export default async function AttendancePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const records = await prisma.attendance.findMany({
    where: { companyId: ctx.company.id },
    include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } },
    orderBy: [{ date: "desc" }, { employee: { employeeCode: "asc" } }],
    take: 200,
  })

  const statusColor: Record<string, string> = {
    PRESENT: "text-green-700",
    ABSENT: "text-red-600",
    HALF_DAY: "text-yellow-600",
    ON_LEAVE: "text-blue-600",
    HOLIDAY: "text-purple-600",
  }

  return (
    <Phase5Shell
      title="Attendance"
      description="Daily attendance register — mark and review employee attendance"
      action={
        <Link href={`/${orgSlug}/payroll/attendance/new`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          Mark attendance
        </Link>
      }
    >
      {records.length === 0 ? (
        <EmptyState>No attendance records yet. Click &quot;Mark attendance&quot; to add the first entry.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[rgba(55,50,47,0.10)] bg-white">
          <div className="grid grid-cols-[1fr_2fr_1.2fr_1fr_1fr] gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#605A57]">
            <span>Date</span>
            <span>Employee</span>
            <span>Status</span>
            <span>Hours</span>
            <span>Notes</span>
          </div>
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/${orgSlug}/payroll/attendance/${r.id}`}
              className="grid grid-cols-[1fr_2fr_1.2fr_1fr_1fr] items-center gap-3 border-t border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9]"
            >
              <span className="font-medium text-[#37322F]">{new Date(r.date).toLocaleDateString("en-IN")}</span>
              <span>{r.employee.firstName} {r.employee.lastName ?? ""} <span className="text-xs text-[#605A57]">({r.employee.employeeCode})</span></span>
              <span className={`font-medium ${statusColor[r.status] ?? ""}`}>{r.status.replaceAll("_", " ")}</span>
              <span>{r.hoursWorked ? `${r.hoursWorked}h` : "-"}</span>
              <span className="truncate text-[#605A57]">{r.notes ?? "-"}</span>
            </Link>
          ))}
        </div>
      )}
    </Phase5Shell>
  )
}
