import { DetailPage } from "@/components/detail-page"

export default function AiGuardrailsPage() {
  return (
    <DetailPage
      eyebrow="AI guardrails"
      title="AI assists; controls decide."
      description="The AI layer should explain and draft, but it should not post, file, close, reverse, or expose secrets."
      parentHref="/security"
      parentLabel="Security"
      blocks={[
        { title: "Allowed help", description: "AI should make work faster without owning the system of record.", items: ["Explain variance", "Draft reminders", "Suggest matches", "Summarize documents", "Map imports", "Extract bill details"] },
        { title: "Disallowed authority", description: "Material actions stay deterministic and human-approved.", items: ["No auto-posting", "No auto-filing", "No auto-close", "No secret access", "No broad tenant reads", "No silent external action"] },
        { title: "Traceability", description: "Answers should show context and sources.", items: ["Context chips", "Used sources", "Prompt version", "Tool log", "Approval drawer", "Audit event"] },
      ]}
    />
  )
}
