"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ArrowUp, Loader2 } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import type { ContextHints } from "./context-chips"

type Props = {
  agentId: string
  orgSlug: string
  contextHints: ContextHints
}

function extractText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("")
}

export function ChatThread({ agentId, orgSlug, contextHints }: Props) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: { agentId, orgSlug, contextHints },
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput("")
    await sendMessage({ text })
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="mt-4 text-center text-xs text-[#9E9891]">
            Ask me anything about this page&apos;s data.
          </p>
        )}
        <div className="space-y-3">
          {messages.map((msg) => {
            const content = extractText(msg.parts as { type: string; text?: string }[])
            if (!content) return null
            return (
              <MessageBubble
                key={msg.id}
                role={msg.role as "user" | "assistant"}
                content={content}
              />
            )
          })}
          {isLoading && (
            <div className="flex justify-start">
              <Loader2 className="h-4 w-4 animate-spin text-[#9E9891]" />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <p className="shrink-0 px-3 pb-1 text-center text-[10px] text-[#C4BFB9]">
        Advisory only — AI never posts to the ledger
      </p>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[rgba(55,50,47,0.10)] p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-[#37322F] outline-none placeholder:text-[#C4BFB9]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#37322F] text-white transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  )
}
