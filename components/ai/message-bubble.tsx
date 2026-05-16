"use client"

import ReactMarkdown from "react-markdown"

type Props = {
  role: "user" | "assistant"
  content: string
}

export function MessageBubble({ role, content }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#37322F] px-3 py-2 text-sm text-white">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-[rgba(55,50,47,0.12)] bg-white px-3 py-2 text-sm text-[#37322F]">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => (
              <code className="rounded bg-[#F0EDE9] px-1 py-0.5 font-mono text-xs">{children}</code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
