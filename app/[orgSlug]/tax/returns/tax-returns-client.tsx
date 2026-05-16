"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Plus, ExternalLink, Loader2 } from "lucide-react"

interface TaxReturn {
  id:       string
  type:     string
  period:   string
  status:   string
  filedAt:  string | null
  ackNumber: string | null
  createdAt: string
}

const RETURN_TYPES = ["GSTR1", "GSTR3B", "GSTR9", "ITR"] as const

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "filed")  return "default"
  if (s === "draft")  return "secondary"
  return "outline"
}

function periodLabel(p: string) {
  const [y, m] = p.split("-")
  if (!m) return p
  return new Date(+y, +m - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" })
}

export function TaxReturnsClient({
  orgSlug,
  initialReturns,
}: {
  orgSlug: string
  initialReturns: TaxReturn[]
}) {
  const router  = useRouter()
  const [returns, setReturns] = useState(initialReturns)
  const [genOpen,  setGenOpen]  = useState(false)
  const [genType,  setGenType]  = useState<string>("GSTR1")
  const [genPeriod, setGenPeriod] = useState("")
  const [genning,  setGenning]  = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenning(true)
    setGenError(null)
    const res = await fetch(`/api/organizations/${orgSlug}/tax/returns`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type: genType, period: genPeriod }),
    })
    if (res.ok) {
      const created = await res.json()
      setReturns((r) => {
        const idx = r.findIndex((x) => x.id === created.id)
        return idx >= 0 ? r.map((x) => x.id === created.id ? created : x) : [created, ...r]
      })
      setGenOpen(false)
      router.push(`/${orgSlug}/tax/returns/${created.id}`)
    } else {
      const body = await res.json()
      setGenError(body.error ?? "Failed to generate.")
    }
    setGenning(false)
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#605A57]">{returns.length} return{returns.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => { setGenOpen(true); setGenError(null) }}>
          <Plus className="size-3.5 mr-1" /> Generate return
        </Button>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white overflow-hidden">
        {returns.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#8B8580]">
            No returns yet. Generate your first GSTR-1 or GSTR-3B.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(55,50,47,0.08)] bg-[#FAFAF9]">
                {["Type", "Period", "Status", "Filed at", "Ack. number", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-[#605A57]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[rgba(55,50,47,0.06)] last:border-0 hover:bg-[#FAFAF9] cursor-pointer"
                  onClick={() => router.push(`/${orgSlug}/tax/returns/${r.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-xs">{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-[#37322F]">{periodLabel(r.period)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(r.status)} className="text-xs capitalize">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#605A57] text-xs">
                    {r.filedAt ? new Date(r.filedAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#605A57] font-mono text-xs">{r.ackNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ExternalLink className="size-3.5 text-[#9B8E88] inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={genOpen} onOpenChange={(o) => { setGenOpen(o); setGenError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate tax return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {genError && <p className="text-sm text-destructive">{genError}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="genType">Return type</Label>
              <Select value={genType} onValueChange={setGenType}>
                <SelectTrigger id="genType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="genPeriod">Period (YYYY-MM)</Label>
              <Input
                id="genPeriod"
                type="month"
                value={genPeriod}
                onChange={(e) => setGenPeriod(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={genning}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={genning || !genPeriod}>
              {genning ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Generating…</> : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
