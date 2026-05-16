import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, EnumSelect, Field, Panel, Phase6Shell, TextArea } from "../../beyond-tally/_components/phase6-ui"
import { createOcrJob, deleteOcrJob, updateOcrJob } from "../../beyond-tally/actions"
import type { OcrJobStatus } from "@prisma/client"

export default async function OcrJobsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const jobs = await prisma.ocrJob.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })
  const statuses: OcrJobStatus[] = ["QUEUED", "PROCESSING", "REVIEW", "COMPLETED", "FAILED"]

  return (
    <Phase6Shell title="Document AI" description="OCR extraction jobs for bills and invoices">
      <div className="space-y-6">
        <Panel title="Create OCR job">
          <form action={createOcrJob.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Source key" name="sourceKey" required />
            <Field label="Source name" name="sourceName" />
            <EnumSelect label="Status" name="status" values={statuses} defaultValue="QUEUED" />
            <div className="md:col-span-2"><TextArea label="Extracted data JSON" name="extractedData" /></div>
            <Field label="Error" name="errorMessage" />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create job</button>
          </form>
        </Panel>
        {jobs.length === 0 ? <EmptyState>No OCR jobs yet.</EmptyState> : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <form key={job.id} action={updateOcrJob.bind(null, orgSlug, job.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1.5fr_1fr_2fr_1fr_auto]">
                <div><p className="text-sm font-semibold">{job.sourceName ?? job.sourceKey}</p><p className="text-xs text-[#605A57]">{job.sourceKey}</p></div>
                <EnumSelect label="Status" name="status" values={statuses} defaultValue={job.status} />
                <TextArea label="Extracted JSON" name="extractedData" defaultValue={job.extractedData ? JSON.stringify(job.extractedData) : ""} />
                <Field label="Error" name="errorMessage" defaultValue={job.errorMessage} />
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteOcrJob.bind(null, orgSlug, job.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Delete</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
