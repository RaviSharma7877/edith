"use client"

import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { X, ChevronLeft } from "lucide-react"
import { AGENT_REGISTRY, DEFAULT_AGENT_ID } from "@/lib/ai/agents"
import { AgentSelector } from "./agent-selector"
import { ContextChips, deriveContextHints, type ContextHints } from "./context-chips"
import { ChatThread } from "./chat-thread"

type Props = {
  orgSlug: string
  onClose: () => void
}

function eligibleAgents(pathname: string) {
  return Object.values(AGENT_REGISTRY).filter((agent) =>
    agent.pages.some((prefix) => pathname.includes(prefix)),
  )
}

export function CopilotDrawer({ orgSlug, onClose }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const agents = eligibleAgents(pathname)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [contextHints, setContextHints] = useState<ContextHints>({})

  useEffect(() => {
    setContextHints(deriveContextHints(pathname, searchParams))
  }, [pathname, searchParams])

  const selectedAgent = selectedAgentId ? AGENT_REGISTRY[selectedAgentId] : null

  return (
    <div className="fixed bottom-[72px] right-4 z-50 flex h-[540px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[rgba(55,50,47,0.14)] bg-[#FAFAF9] shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(55,50,47,0.10)] bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgentId(null)}
              className="mr-1 text-[#605A57] hover:text-[#37322F]"
              aria-label="Back to agent list"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <span className="text-sm font-semibold text-[#37322F]">
            {selectedAgent ? selectedAgent.name : "AI Copilot"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[#9E9891] hover:text-[#37322F]"
          aria-label="Close AI Copilot"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Context chips — only when agent selected and hints exist */}
      {selectedAgent && Object.keys(contextHints).length > 0 && (
        <ContextChips onHintsChange={setContextHints} />
      )}

      {/* Body */}
      {!selectedAgent ? (
        <div className="flex-1 overflow-y-auto">
          {agents.length > 0 ? (
            <AgentSelector agents={agents} onSelect={setSelectedAgentId} />
          ) : (
            <AgentSelector
              agents={[AGENT_REGISTRY[DEFAULT_AGENT_ID]]}
              onSelect={setSelectedAgentId}
            />
          )}
        </div>
      ) : (
        <ChatThread
          key={selectedAgentId}
          agentId={selectedAgentId!}
          orgSlug={orgSlug}
          contextHints={contextHints}
        />
      )}
    </div>
  )
}
