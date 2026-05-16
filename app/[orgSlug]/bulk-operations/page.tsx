import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { EmptyState, EnumSelect, Field, Panel, Phase6Shell, TextArea } from "../beyond-tally/_components/phase6-ui"
import { createBulkOperation, deleteBulkOperation, updateBulkOperation } from "../beyond-tally/actions"
import type { BulkOperationStatus } from "@prisma/client"

export default async function BulkOperationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const operations = await prisma.bulkOperation.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })
  const statuses: BulkOperationStatus[] = ["DRAFT", "QUEUED", "RUNNING", "COMPLETED", "FAILED"]

  return (
    <Phase6Shell title="Bulk Operations" description="Bulk price updates, voucher posting and exports">
      <div className="space-y-6">
        <Panel title="Create operation">
          <form action={createBulkOperation.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Operation type" name="operationType" defaultValue="bulk_price_update" required />
            <Field label="Entity type" name="entityType" defaultValue="PriceListLine" required />
            <EnumSelect label="Status" name="status" values={statuses} defaultValue="DRAFT" />
            <div className="md:col-span-2"><TextArea label="Input JSON" name="inputData" defaultValue={'{"mode":"percentage","value":5}'} /></div>
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create operation</button>
          </form>
        </Panel>
        {operations.length === 0 ? <EmptyState>No bulk operations yet.</EmptyState> : (
          <div className="space-y-3">
            {operations.map((op) => (
              <form key={op.id} action={updateBulkOperation.bind(null, orgSlug, op.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1.5fr_1fr_2fr_1fr_auto]">
                <div><p className="text-sm font-semibold">{op.operationType}</p><p className="text-xs text-[#605A57]">{op.entityType}</p></div>
                <EnumSelect label="Status" name="status" values={statuses} defaultValue={op.status} />
                <TextArea label="Result JSON" name="resultData" defaultValue={op.resultData ? JSON.stringify(op.resultData) : ""} />
                <Field label="Error" name="errorMessage" defaultValue={op.errorMessage} />
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteBulkOperation.bind(null, orgSlug, op.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Delete</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
