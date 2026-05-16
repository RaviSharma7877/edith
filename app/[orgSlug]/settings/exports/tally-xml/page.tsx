import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, Field, Panel, Phase6Shell, TextArea, dateValue } from "../../../beyond-tally/_components/phase6-ui"
import { createTallyExportJob, deleteTallyExportJob, updateTallyExportJob } from "../../../beyond-tally/actions"

export default async function TallyXmlPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const jobs = await prisma.tallyExportJob.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })

  return (
    <Phase6Shell title="Tally XML Export" description="Export transaction windows as Tally-compatible XML jobs">
      <div className="space-y-6">
        <Panel title="Create export job">
          <form action={createTallyExportJob.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-4">
            <Field label="Export number" name="exportNumber" required />
            <Field label="From" name="fromDate" type="date" required />
            <Field label="To" name="toDate" type="date" required />
            <Field label="Status" name="status" defaultValue="draft" />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create export</button>
          </form>
        </Panel>
        {jobs.length === 0 ? <EmptyState>No export jobs yet.</EmptyState> : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <form key={job.id} action={updateTallyExportJob.bind(null, orgSlug, job.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <div><p className="text-sm font-semibold">{job.exportNumber}</p><p className="text-xs text-[#605A57]">{dateValue(job.fromDate)} to {dateValue(job.toDate)}</p></div>
                <Field label="Status" name="status" defaultValue={job.status} />
                <Field label="File URL" name="fileUrl" defaultValue={job.fileUrl} />
                <TextArea label="XML payload" name="xmlPayload" defaultValue={job.xmlPayload} />
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteTallyExportJob.bind(null, orgSlug, job.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Delete</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
