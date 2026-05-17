import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { AttendanceForm, Phase5Shell } from "../../_components/phase5-ui"
import { updateAttendance, deleteAttendance } from "../../actions"

export default async function EditAttendancePage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const [record, employees] = await Promise.all([
    prisma.attendance.findFirst({ where: { id, companyId: ctx.company.id } }),
    prisma.employee.findMany({
      where: { companyId: ctx.company.id, deletedAt: null },
      orderBy: { employeeCode: "asc" },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    }),
  ])
  if (!record) notFound()

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    name: `${e.employeeCode} — ${e.firstName}${e.lastName ? ` ${e.lastName}` : ""}`,
  }))

  return (
    <Phase5Shell title="Edit Attendance">
      <div className="space-y-5">
        <AttendanceForm orgSlug={orgSlug} action={updateAttendance.bind(null, orgSlug, id)} employees={employeeOptions} record={{ ...record, hoursWorked: record.hoursWorked?.toString() ?? null }} />
        <form action={deleteAttendance.bind(null, orgSlug, id)} className="max-w-3xl rounded-lg border border-red-200 bg-white p-5">
          <p className="font-semibold text-red-700">Delete record</p>
          <p className="mt-1 text-sm text-[#605A57]">Remove this attendance entry permanently.</p>
          <button type="submit" className="mt-4 h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white">Delete</button>
        </form>
      </div>
    </Phase5Shell>
  )
}
