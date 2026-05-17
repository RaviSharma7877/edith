"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, RefreshCw } from "lucide-react"

interface AccountSummary { id: string; code: string; name: string; type: string }
interface GLEntry {
  id: string; journalId: string; date: string; voucherNumber: string
  description: string; debit: number; credit: number; balance: number
}
interface GLData {
  accounts:       AccountSummary[]
  account?:       AccountSummary & { subtype: string }
  from:           string
  to:             string
  openingBalance: number
  entries:        GLEntry[]
  totalDebit:     number
  totalCredit:    number
  closingBalance: number
}

function fmt(n: number) {
  return Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GeneralLedgerPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const today   = new Date()
  const defFrom = `${today.getFullYear()}-01-01`
  const defTo   = today.toISOString().split("T")[0]

  const [from,      setFrom]      = useState(defFrom)
  const [to,        setTo]        = useState(defTo)
  const [accountId, setAccountId] = useState("")
  const [data,      setData]      = useState<GLData | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async (f: string, t: string, acct: string) => {
    setLoading(true); setError(null)
    try {
      const url = `/api/organizations/${orgSlug}/reports/general-ledger?from=${f}&to=${t}${acct ? `&accountId=${acct}` : ""}`
      const res = await fetch(url)
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally { setLoading(false) }
  }, [orgSlug])

  // Load accounts list on mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(defFrom, defTo, "") }, [load, defFrom, defTo])

  const accounts = data?.accounts ?? []

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4 flex-wrap gap-y-2">
        <SidebarTrigger className="-ml-2 text-[#605A57]" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[#37322F]">General Ledger</h1>
          <a href={`/${orgSlug}/reports`} className="text-xs text-[#8B8580] hover:text-[#37322F]">← Reports</a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-64">
            <Select value={accountId} onValueChange={(v) => { setAccountId(v); load(from, to, v) }}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select account…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="glFrom" className="text-xs">From</Label>
            <Input id="glFrom" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="glTo" className="text-xs">To</Label>
            <Input id="glTo" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 text-sm" />
          </div>
          <Button size="sm" variant="outline" onClick={() => load(from, to, accountId)} disabled={loading || !accountId}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">{error}</div>
        )}

        {!accountId && (
          <div className="flex items-center justify-center h-40 text-[#8B8580] text-sm">
            Select an account to view its ledger
          </div>
        )}

        {loading && accountId && !data?.entries.length && (
          <div className="flex items-center justify-center h-40 text-[#8B8580] gap-2">
            <Loader2 className="size-5 animate-spin" /> Loading…
          </div>
        )}

        {data?.account && accountId && (
          <div className="w-full min-w-0">
            {/* Account header */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-sm text-[#605A57]">{data.account.code}</span>
              <span className="font-semibold text-[#37322F]">{data.account.name}</span>
              <span className="text-xs text-[#8B8580]">{data.account.type} · {data.account.subtype.replace(/_/g, " ")}</span>
            </div>

            <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#37322F] text-white">
                    <th className="px-4 py-3 text-left text-xs font-medium w-28">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium w-32">Voucher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-28">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-28">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium w-32">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening balance row */}
                  <tr className="bg-[#FAFAF9] border-b border-[rgba(55,50,47,0.10)]">
                    <td className="px-4 py-2 text-xs text-[#8B8580]">
                      {new Date(data.from).toLocaleDateString("en-IN")}
                    </td>
                    <td colSpan={4} className="px-4 py-2 text-xs text-[#8B8580] italic">Opening balance</td>
                    <td className="px-4 py-2 text-right font-mono text-xs font-semibold text-[#37322F]">
                      {data.openingBalance < 0
                        ? `(${fmt(data.openingBalance)})`
                        : fmt(data.openingBalance)}
                    </td>
                  </tr>

                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-xs text-[#8B8580]">
                        No transactions in this period
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((e) => (
                      <tr key={e.id} className="border-t border-[rgba(55,50,47,0.06)] hover:bg-[#FAFAF9]">
                        <td className="px-4 py-2.5 text-xs text-[#605A57]">
                          {new Date(e.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[#605A57]">
                          <a href={`/${orgSlug}/journals/${e.journalId}`}
                            className="hover:text-[#37322F] hover:underline">
                            {e.voucherNumber}
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-[#37322F] text-xs max-w-xs truncate">
                          {e.description}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {e.debit > 0 ? fmt(e.debit) : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs">
                          {e.credit > 0 ? fmt(e.credit) : ""}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${e.balance < 0 ? "text-destructive" : "text-[#37322F]"}`}>
                          {e.balance < 0 ? `(${fmt(e.balance)})` : fmt(e.balance)}
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Totals */}
                  <tr className="border-t-2 border-[rgba(55,50,47,0.15)] bg-[#F5F4F3] font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-sm">Period total</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(data.totalCredit)}</td>
                    <td className={`px-4 py-3 text-right font-mono text-base font-bold ${
                      data.closingBalance < 0 ? "text-destructive" : "text-[#37322F]"
                    }`}>
                      {data.closingBalance < 0 ? `(${fmt(data.closingBalance)})` : fmt(data.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
