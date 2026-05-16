"use client"

import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"

interface ParsedLine {
  date:         string
  description:  string
  reference:    string
  debitAmount:  string
  creditAmount: string
  balance:      string
}

// Maps common Indian bank CSV column names to our fields
const COLUMN_MAP: Record<string, keyof ParsedLine> = {
  "date":            "date",
  "txn date":        "date",
  "transaction date":"date",
  "value date":      "date",
  "narration":       "description",
  "description":     "description",
  "particulars":     "description",
  "remarks":         "description",
  "chq/ref number":  "reference",
  "reference":       "reference",
  "cheque no":       "reference",
  "ref no":          "reference",
  "withdrawal amt":  "debitAmount",
  "withdrawal":      "debitAmount",
  "debit":           "debitAmount",
  "debit amount":    "debitAmount",
  "dr":              "debitAmount",
  "deposit amt":     "creditAmount",
  "deposit":         "creditAmount",
  "credit":          "creditAmount",
  "credit amount":   "creditAmount",
  "cr":              "creditAmount",
  "closing balance": "balance",
  "balance":         "balance",
  "running balance": "balance",
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
  )
  return { headers, rows }
}

function cleanNumber(v: string): string {
  const n = v.replace(/[₹,\s]/g, "").trim()
  return n && !isNaN(Number(n)) && Number(n) > 0 ? n : ""
}

function parseDate(v: string): string {
  if (!v) return ""
  // dd/mm/yyyy or dd-mm-yyyy
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v
}

export default function ImportStatementPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>()
  const router = useRouter()

  const fileRef = useRef<HTMLInputElement>(null)

  const [parsed,         setParsed]         = useState<ParsedLine[] | null>(null)
  const [headers,        setHeaders]        = useState<string[]>([])
  const [openingBalance, setOpeningBalance] = useState("")
  const [closingBalance, setClosingBalance] = useState("")
  const [startDate,      setStartDate]      = useState("")
  const [endDate,        setEndDate]        = useState("")
  const [error,          setError]          = useState("")
  const [saving,         setSaving]         = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const { headers: hdrs, rows } = parseCSV(text)
        setHeaders(hdrs)

        // Map headers → our fields
        const colIdx: Partial<Record<keyof ParsedLine, number>> = {}
        hdrs.forEach((h, i) => {
          const key = COLUMN_MAP[h.toLowerCase()]
          if (key && colIdx[key] === undefined) colIdx[key] = i
        })

        const lines: ParsedLine[] = []
        for (const row of rows) {
          if (row.length < 2) continue
          const get = (k: keyof ParsedLine) =>
            colIdx[k] !== undefined ? (row[colIdx[k]!] ?? "") : ""

          const debit  = cleanNumber(get("debitAmount"))
          const credit = cleanNumber(get("creditAmount"))
          if (!debit && !credit) continue

          lines.push({
            date:         parseDate(get("date")),
            description:  get("description") || "—",
            reference:    get("reference"),
            debitAmount:  debit,
            creditAmount: credit,
            balance:      cleanNumber(get("balance")),
          })
        }
        setParsed(lines)

        // Auto-fill date range
        const dates = lines.map((l) => l.date).filter(Boolean).sort()
        if (dates.length) { setStartDate(dates[0]); setEndDate(dates[dates.length - 1]) }
      } catch {
        setError("Failed to parse CSV. Check the file format.")
      }
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed?.length) return
    setSaving(true); setError("")
    const res  = await fetch(`/api/organizations/${orgSlug}/bank-accounts/${id}/statements`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate,
        endDate,
        openingBalance: openingBalance || "0",
        closingBalance: closingBalance || "0",
        sourceType: "csv",
        lines: parsed,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Import failed."); return }
    router.push(`/${orgSlug}/bank-accounts/${id}`)
  }

  const input = "w-full rounded border border-[rgba(55,50,47,0.18)] bg-white px-3 py-2 text-sm text-[#37322F] focus:outline-none focus:ring-1 focus:ring-primary"
  const label = "block text-xs font-medium text-[#605A57] mb-1"

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <a href={`/${orgSlug}/bank-accounts/${id}`} className="text-sm text-[#605A57] hover:text-[#37322F]">
          ← Bank Account
        </a>
        <span className="text-[rgba(55,50,47,0.30)]">/</span>
        <span className="text-sm font-medium text-[#37322F]">Import Statement</span>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="w-full min-w-0 space-y-6">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>
          )}

          {/* Upload */}
          <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-3">
            <p className="text-sm font-semibold text-[#37322F]">Upload CSV</p>
            <p className="text-xs text-[#605A57]">
              Supports standard Indian bank CSV exports. Columns detected automatically: Date, Narration/Description, Cheque/Reference, Withdrawal/Debit, Deposit/Credit, Balance.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="block text-sm text-[#605A57] file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            />
            {headers.length > 0 && (
              <p className="text-[11px] text-[#605A57]">
                Detected columns: {headers.join(", ")}
              </p>
            )}
          </div>

          {parsed && parsed.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Statement metadata */}
              <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5 space-y-4">
                <p className="text-sm font-semibold text-[#37322F]">Statement period</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label className={label}>Start date *</label>
                    <input type="date" className={input} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className={label}>End date *</label>
                    <input type="date" className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className={label}>Opening balance</label>
                    <input type="number" step="0.01" className={input} placeholder="0.00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Closing balance</label>
                    <input type="number" step="0.01" className={input} placeholder="0.00" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white overflow-hidden">
                <div className="border-b border-[rgba(55,50,47,0.10)] bg-[#F7F5F3] px-4 py-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#37322F]">Preview — {parsed.length} lines</p>
                  <span className="text-xs text-[#605A57]">
                    {parsed.filter((l) => l.debitAmount).length} debits · {parsed.filter((l) => l.creditAmount).length} credits
                  </span>
                </div>
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#FAFAF9]">
                      <tr className="border-b border-[rgba(55,50,47,0.08)]">
                        {["Date","Description","Reference","Debit","Credit","Balance"].map((h) => (
                          <th key={h} className={`px-3 py-2 text-left font-medium text-[#605A57] ${["Debit","Credit","Balance"].includes(h) ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((l, i) => (
                        <tr key={i} className="border-b border-[rgba(55,50,47,0.05)] hover:bg-[#F7F5F3]">
                          <td className="px-3 py-1.5 font-mono text-[#605A57]">{l.date}</td>
                          <td className="px-3 py-1.5 text-[#37322F] max-w-[200px] truncate">{l.description}</td>
                          <td className="px-3 py-1.5 font-mono text-[#605A57]">{l.reference || "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-destructive">{l.debitAmount  ? `₹${parseFloat(l.debitAmount ).toLocaleString("en-IN",{minimumFractionDigits:2})}` : "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-green-600"> {l.creditAmount ? `₹${parseFloat(l.creditAmount).toLocaleString("en-IN",{minimumFractionDigits:2})}` : "—"}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-[#605A57]">{l.balance      ? `₹${parseFloat(l.balance     ).toLocaleString("en-IN",{minimumFractionDigits:2})}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setParsed(null); setHeaders([]); if (fileRef.current) fileRef.current.value = "" }}
                  className="rounded-md border border-[rgba(55,50,47,0.18)] px-4 py-2 text-sm text-[#605A57] hover:bg-[#F7F5F3]"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Importing…" : `Import ${parsed.length} lines`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
