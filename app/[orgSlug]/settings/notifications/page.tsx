import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, EnumSelect, Field, Panel, Phase6Shell, TextArea } from "../../beyond-tally/_components/phase6-ui"
import { createNotificationRule, deleteNotificationRule, updateNotificationRule } from "../../beyond-tally/actions"
import type { NotificationChannelType } from "@prisma/client"

export default async function NotificationRulesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const rules = await prisma.notificationRule.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })
  const channels: NotificationChannelType[] = ["EMAIL", "WHATSAPP", "SMS"]

  return (
    <Phase6Shell title="Notification Rules" description="Email, WhatsApp and SMS triggers">
      <div className="space-y-6">
        <Panel title="Create rule">
          <form action={createNotificationRule.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Name" name="name" required />
            <Field label="Trigger" name="trigger" defaultValue="low_stock" required />
            <EnumSelect label="Channel" name="channelType" values={channels} defaultValue="EMAIL" />
            <Field label="Recipients CSV" name="recipients" />
            <div className="md:col-span-2"><TextArea label="Template" name="template" required /></div>
            <Checkbox />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create rule</button>
          </form>
        </Panel>
        {rules.length === 0 ? <EmptyState>No notification rules yet.</EmptyState> : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <form key={rule.id} action={updateNotificationRule.bind(null, orgSlug, rule.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto_auto]">
                <Field label="Name" name="name" defaultValue={rule.name} required />
                <Field label="Trigger" name="trigger" defaultValue={rule.trigger} required />
                <EnumSelect label="Channel" name="channelType" values={channels} defaultValue={rule.channelType} />
                <Field label="Recipients" name="recipients" defaultValue={rule.recipients.join(", ")} />
                <div className="self-end"><Checkbox defaultChecked={rule.isActive} /></div>
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteNotificationRule.bind(null, orgSlug, rule.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Disable</button></div>
                <div className="md:col-span-6"><TextArea label="Template" name="template" defaultValue={rule.template} required /></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
