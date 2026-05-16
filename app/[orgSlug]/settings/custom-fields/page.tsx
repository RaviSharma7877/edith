import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, EnumSelect, Field, Panel, Phase6Shell } from "../../beyond-tally/_components/phase6-ui"
import { createCustomFieldDefinition, deleteCustomFieldDefinition, updateCustomFieldDefinition } from "../../beyond-tally/actions"
import type { CustomFieldType } from "@prisma/client"

export default async function CustomFieldsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const fields = await prisma.customFieldDefinition.findMany({ where: { companyId: ctx.company.id }, orderBy: [{ entityType: "asc" }, { fieldName: "asc" }] })
  const types: CustomFieldType[] = ["TEXT", "NUMBER", "DATE", "SELECT", "BOOLEAN"]

  return (
    <Phase6Shell title="Custom Fields" description="Entity extension fields for inventory, parties and documents">
      <div className="space-y-6">
        <Panel title="Create field">
          <form action={createCustomFieldDefinition.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-4">
            <Field label="Entity type" name="entityType" defaultValue="StockItem" required />
            <Field label="Field name" name="fieldName" required />
            <EnumSelect label="Field type" name="fieldType" values={types} defaultValue="TEXT" />
            <Field label="Options CSV" name="options" />
            <Checkbox name="isRequired" label="Required" defaultChecked={false} />
            <Checkbox />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create field</button>
          </form>
        </Panel>
        {fields.length === 0 ? <EmptyState>No custom fields yet.</EmptyState> : (
          <div className="space-y-3">
            {fields.map((field) => (
              <form key={field.id} action={updateCustomFieldDefinition.bind(null, orgSlug, field.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
                <div><p className="text-sm font-semibold">{field.entityType}</p></div>
                <Field label="Field name" name="fieldName" defaultValue={field.fieldName} required />
                <EnumSelect label="Type" name="fieldType" values={types} defaultValue={field.fieldType} />
                <Field label="Options" name="options" defaultValue={field.options.join(", ")} />
                <div className="self-end space-y-2"><Checkbox name="isRequired" label="Required" defaultChecked={field.isRequired} /><Checkbox defaultChecked={field.isActive} /></div>
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteCustomFieldDefinition.bind(null, orgSlug, field.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Disable</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
