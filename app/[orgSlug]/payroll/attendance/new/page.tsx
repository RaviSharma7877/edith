import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { AttendanceForm, Phase5Shell } from "../../_components/phase5-ui"
import { createAttendance } from "../../actions"

export default async function NewAttendancePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  const employees = await prisma.employee.findMany({
    where: { companyId: ctx.company.id, deletedAt: null, status: "ACTIVE" },
    orderBy: { employeeCode: "asc" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  })

  const employeeOptions = employees.map((e) => ({
    id: e.id,
    name: `${e.employeeCode} — ${e.firstName}${e.lastName ? ` ${e.lastName}` : ""}`,
  }))

  return (
    <Phase5Shell title="Mark Attendance" description="Record attendance for an employee">
      <AttendanceForm orgSlug={orgSlug} action={createAttendance.bind(null, orgSlug)} employees={employeeOptions} />
    </Phase5Shell>
  )
}
