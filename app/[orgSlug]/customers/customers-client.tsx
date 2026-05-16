"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Customer = {
  id: string; code: string | null; name: string; email: string | null
  phone: string | null; gstin: string | null; creditLimit: string | null
  creditDays: number | null; isActive: boolean; createdAt: string
  _count: { salesInvoices: number }
}

function fmt(v: string | null) {
  if (!v) return "—"
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CustomersClient({
  orgSlug, customers, page, pages, total, search,
}: {
  orgSlug: string
  customers: Customer[]
  page: number
  pages: number
  total: number
  search: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(search)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (query.trim()) p.set("search", query.trim())
    p.set("page", "1")
    router.push(`${pathname}?${p.toString()}`)
  }

  function goPage(p: number) {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    params.set("page", String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or code…"
          className="bg-white"
        />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white">
        <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] gap-3 border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 text-xs font-medium text-[#605A57]">
          <span>Name</span>
          <span>Email</span>
          <span>GSTIN</span>
          <span className="text-right">Credit limit</span>
          <span className="text-center">Invoices</span>
          <span className="text-center">Status</span>
        </div>

        {customers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[#605A57]">
            No customers found.{" "}
            <Link href={`/${orgSlug}/customers/new`} className="underline">Add one.</Link>
          </div>
        )}

        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/${orgSlug}/customers/${c.id}`}
            className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr] items-center gap-3 border-b border-[rgba(55,50,47,0.06)] px-4 py-3 text-sm hover:bg-[#FAFAF9] transition-colors"
          >
            <div>
              <p className="font-medium text-[#37322F]">{c.name}</p>
              {c.code && <p className="text-xs text-[#605A57]">{c.code}</p>}
            </div>
            <span className="truncate text-[#605A57]">{c.email ?? "—"}</span>
            <span className="font-mono text-xs text-[#605A57]">{c.gstin ?? "—"}</span>
            <span className="text-right font-mono text-xs text-[#37322F]">
              {c.creditLimit ? fmt(c.creditLimit) : "—"}
            </span>
            <span className="text-center text-xs text-[#605A57]">{c._count.salesInvoices}</span>
            <span className="text-center">
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#605A57]">
          <span>Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1}    onClick={() => goPage(page - 1)}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
