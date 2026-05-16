import type { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function InventoryPageShell({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-svh w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-[#37322F]">{title}</h1>
            {description ? <p className="text-xs text-[#605A57]">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#37322F]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#605A57]">{hint}</p> : null}
    </div>
  )
}

export function EmptyTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[rgba(55,50,47,0.18)] bg-white px-4 py-10 text-center text-sm text-[#605A57]">
      {children}
    </div>
  )
}
