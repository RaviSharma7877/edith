import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import { Checkbox, EmptyState, EnumSelect, Field, Panel, Phase6Shell, TextArea } from "../../beyond-tally/_components/phase6-ui"
import { createEcommerceChannel, deleteEcommerceChannel, updateEcommerceChannel } from "../../beyond-tally/actions"
import type { EcommercePlatform } from "@prisma/client"

export default async function EcommercePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  const channels = await prisma.ecommerceChannel.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" } })
  const platforms: EcommercePlatform[] = ["SHOPIFY", "WOOCOMMERCE", "CUSTOM"]

  return (
    <Phase6Shell title="eCommerce Sync" description="Store channels, webhooks and SKU mapping">
      <div className="space-y-6">
        <Panel title="Connect channel">
          <form action={createEcommerceChannel.bind(null, orgSlug)} className="grid gap-4 md:grid-cols-3">
            <Field label="Name" name="name" required />
            <EnumSelect label="Platform" name="platform" values={platforms} defaultValue="SHOPIFY" />
            <Field label="Store URL" name="storeUrl" required />
            <Field label="Webhook secret" name="webhookSecret" />
            <div className="md:col-span-2"><TextArea label="Item mapping JSON" name="itemMapping" defaultValue={'{"SKU-001":"stockItemId"}'} /></div>
            <Checkbox />
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Create channel</button>
          </form>
        </Panel>
        {channels.length === 0 ? <EmptyState>No eCommerce channels yet.</EmptyState> : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <form key={channel.id} action={updateEcommerceChannel.bind(null, orgSlug, channel.id)} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_1.5fr_1fr_auto_auto]">
                <Field label="Name" name="name" defaultValue={channel.name} required />
                <EnumSelect label="Platform" name="platform" values={platforms} defaultValue={channel.platform} />
                <Field label="Store URL" name="storeUrl" defaultValue={channel.storeUrl} required />
                <Field label="Secret" name="webhookSecret" defaultValue={channel.webhookSecret} />
                <div className="self-end"><Checkbox defaultChecked={channel.isActive} /></div>
                <div className="flex self-end gap-2"><button className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-white">Save</button><button formAction={deleteEcommerceChannel.bind(null, orgSlug, channel.id)} className="h-9 rounded-md border px-3 text-xs font-medium">Disable</button></div>
              </form>
            ))}
          </div>
        )}
      </div>
    </Phase6Shell>
  )
}
