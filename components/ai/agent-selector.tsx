"use client"

import { Bot, FileText, RefreshCcw, Mail, Receipt, Upload } from "lucide-react"
import type { Agent } from "@/lib/ai/agents"

const AGENT_ICONS: Record<string, React.ElementType> = {
  "ar-summary": FileText,
  "report-explainer": Bot,
  "recon-suggester": RefreshCcw,
  "reminder-drafter": Mail,
  "tax-explainer": Receipt,
  "import-mapper": Upload,
}

type Props = {
  agents: Agent[]
  onSelect: (agentId: string) => void
}

export function AgentSelector({ agents, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <p className="px-1 text-xs font-medium uppercase tracking-wide text-[#605A57]">
        Choose an assistant
      </p>
      {agents.map((agent) => {
        const Icon = AGENT_ICONS[agent.id] ?? Bot
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className="flex items-start gap-3 rounded-xl border border-[rgba(55,50,47,0.12)] bg-white p-3 text-left transition-colors hover:border-[rgba(55,50,47,0.25)] hover:bg-[#FAF9F8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#37322F]"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0EDE9]">
              <Icon className="h-4 w-4 text-[#605A57]" />
            </span>
            <div>
              <p className="text-sm font-medium text-[#37322F]">{agent.name}</p>
              <p className="mt-0.5 text-xs text-[#605A57]">{agent.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
