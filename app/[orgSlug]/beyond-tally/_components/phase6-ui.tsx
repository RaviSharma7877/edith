import Link from "next/link"
import type { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export type Option = { id: string; name: string }

export function Phase6Shell({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
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

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#37322F]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#605A57]">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[rgba(55,50,47,0.18)] bg-white px-4 py-10 text-center text-sm text-[#605A57]">{children}</div>
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-[#37322F]">{title}</h2>
      {children}
    </section>
  )
}

export function Field({ label, name, defaultValue, required, type = "text", step }: { label: string; name: string; defaultValue?: string | number | null; required?: boolean; type?: string; step?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <input name={name} type={type} step={step} required={required} defaultValue={defaultValue ?? ""} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40" />
    </label>
  )
}

export function TextArea({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string | null; required?: boolean }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <textarea name={name} required={required} defaultValue={defaultValue ?? ""} rows={4} className="w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 py-2 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40" />
    </label>
  )
}

export function Select({ label, name, options, defaultValue, required, emptyLabel = "None" }: { label: string; name: string; options: Option[]; defaultValue?: string | null; required?: boolean; emptyLabel?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue ?? ""} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  )
}

export function EnumSelect<T extends string>({ label, name, values, defaultValue }: { label: string; name: string; values: readonly T[]; defaultValue?: T }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
        {values.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  )
}

export function Checkbox({ name = "isActive", label = "Active", defaultChecked = true }: { name?: string; label?: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm text-[#37322F]"><input name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 rounded border-[rgba(55,50,47,0.18)]" />{label}</label>
}

export function SubmitRow({ orgSlug, backPath, submitLabel }: { orgSlug: string; backPath: string; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{submitLabel}</button>
      <Link href={`/${orgSlug}/${backPath}`} className="inline-flex h-9 items-center rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-4 text-sm text-[#37322F]">Cancel</Link>
    </div>
  )
}

export const dateValue = (date: Date | string | null | undefined) => date ? new Date(date).toISOString().slice(0, 10) : ""
