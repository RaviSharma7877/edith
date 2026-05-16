import { DetailPage } from "@/components/detail-page"

export default function ApiPage() {
  return (
    <DetailPage
      eyebrow="API and webhooks"
      title="Controlled developer access for business systems."
      description="APIs and webhooks should expose scoped integration points without bypassing validation, approval, or tenant boundaries."
      parentHref="/integrations"
      parentLabel="Integrations"
      blocks={[
        { title: "API keys", description: "Keys should be explicit, revocable, scoped, and audited.", items: ["Key name", "Scopes", "Created by", "Last used", "Reveal once", "Revoke"] },
        { title: "Webhook events", description: "Outgoing events should be reliable and inspectable.", items: ["Invoice posted", "Payment received", "Deal updated", "Job failed", "Signature", "Delivery log"] },
        { title: "Developer UX", description: "Developers need examples and controlled test paths.", items: ["API docs", "JSON examples", "Error codes", "Idempotency keys", "Sandbox", "Rate limits"] },
      ]}
    />
  )
}
