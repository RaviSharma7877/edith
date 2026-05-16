import { streamText, convertToModelMessages } from "ai"
import type { UIMessage } from "ai"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { AGENT_REGISTRY } from "@/lib/ai/agents"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string
    agentId: string
    orgSlug: string
    messages: UIMessage[]
    contextHints?: Record<string, string>
  }
  const { agentId, orgSlug, messages, contextHints } = body

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 })
  }

  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) {
    return new Response("Forbidden", { status: 403 })
  }

  const agent = AGENT_REGISTRY[agentId]
  if (!agent) {
    return new Response(`Unknown agent: ${agentId}`, { status: 400 })
  }

  const contextBlock = await agent.fetchContext(ctx.company.id, contextHints ?? {})
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: agent.model,
    system: `${agent.systemPrompt}\n\n## Live Data Context\n\`\`\`\n${contextBlock}\n\`\`\``,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
