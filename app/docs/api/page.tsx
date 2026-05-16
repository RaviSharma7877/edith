import { DetailPage } from "@/components/detail-page"

export default function ApiDocsPage() {
  return (
    <DetailPage eyebrow="Docs" title="API and webhook guide." description="How integrations should authenticate, send idempotent requests, subscribe to events, and recover from failures." parentHref="/docs" parentLabel="Docs" blocks={[
      { title: "Authentication", description: "Keys and sessions must be scoped.", items: ["API keys", "Scopes", "Reveal once", "Revocation", "Tenant ID", "Audit"] },
      { title: "Requests", description: "Requests that affect business state need validation.", items: ["Idempotency", "Validation errors", "Rate limits", "JSON payloads", "Status codes", "Retries"] },
      { title: "Webhooks", description: "Event delivery should be verifiable and recoverable.", items: ["Signed payload", "Delivery log", "Retry policy", "Event types", "Endpoint status", "Failures"] },
    ]} />
  )
}
