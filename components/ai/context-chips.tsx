"use client"

import { usePathname, useSearchParams } from "next/navigation"

export type ContextHints = {
  customerId?: string
  invoiceId?: string
  runId?: string
  period?: string
  importJobId?: string
}

export function deriveContextHints(
  pathname: string,
  searchParams: URLSearchParams,
): ContextHints {
  const hints: ContextHints = {}

  const reconMatch = pathname.match(/\/reconciliation\/([^/]+)/)
  if (reconMatch) hints.runId = reconMatch[1]

  const customerMatch = pathname.match(/\/customers\/([^/]+)/)
  if (customerMatch && customerMatch[1] !== "new") hints.customerId = customerMatch[1]

  const invoiceMatch = pathname.match(/\/sales-invoices\/([^/]+)/)
  if (invoiceMatch && invoiceMatch[1] !== "new") hints.invoiceId = invoiceMatch[1]

  const importMatch = pathname.match(/\/imports\/([^/]+)/)
  if (importMatch) hints.importJobId = importMatch[1]

  const period = searchParams.get("period")
  if (period) hints.period = period

  return hints
}

function chipLabel(key: keyof ContextHints, value: string): string {
  const labels: Record<keyof ContextHints, string> = {
    customerId: "Customer",
    invoiceId: "Invoice",
    runId: "Recon Run",
    period: "Period",
    importJobId: "Import Job",
  }
  return `${labels[key]}: ${value.length > 12 ? value.slice(0, 8) + "…" : value}`
}

type Props = {
  onHintsChange: (hints: ContextHints) => void
}

export function ContextChips({ onHintsChange: _ }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hints = deriveContextHints(pathname, searchParams)
  const entries = Object.entries(hints).filter(([, v]) => Boolean(v)) as [
    keyof ContextHints,
    string,
  ][]

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center rounded-full border border-[rgba(55,50,47,0.18)] bg-[#F0EDE9] px-2.5 py-0.5 text-xs font-medium text-[#605A57]"
        >
          {chipLabel(key, value)}
        </span>
      ))}
    </div>
  )
}
