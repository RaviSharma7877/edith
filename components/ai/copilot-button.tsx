"use client"

import { useState } from "react"
import { Bot } from "lucide-react"
import { usePathname } from "next/navigation"
import { hasEligibleAgent } from "@/lib/ai/agent-meta"
import { CopilotDrawer } from "./copilot-drawer"

type Props = {
  orgSlug: string
}

export function CopilotButton({ orgSlug }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const eligible = hasEligibleAgent(pathname)

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#37322F] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open AI Copilot"
      >
        <Bot className="h-5 w-5" />
        {eligible && !open && (
          <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        )}
      </button>
      {open && <CopilotDrawer orgSlug={orgSlug} onClose={() => setOpen(false)} />}
    </>
  )
}
