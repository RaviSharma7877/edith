"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Upload, FileText, CheckCircle2, XCircle, Clock, RotateCcw,
  ChevronRight, AlertTriangle, ArrowLeft, Plus,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button }  from "@/components/ui/button"
import { Badge }   from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportJob {
  id:           string
  type:         string
  fileType:     string | null
  status:       string
  fileName:     string | null
  totalRows:    number | null
  successRows:  number
  errorRows:    number
  createdAt:    string
  completedAt:  string | null
}

// ── Status display ────────────────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
  done:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-blue-50   text-blue-700   border-blue-200",
  failed:     "bg-red-50    text-red-700    border-red-200",
  pending:    "bg-zinc-100  text-zinc-600   border-zinc-200",
  mapped:     "bg-amber-50  text-amber-700  border-amber-200",
}
const STATUS_ICON: Record<string, React.ElementType> = {
  done:       CheckCircle2,
  processing: Clock,
  failed:     XCircle,
  pending:    Clock,
  mapped:     AlertTriangle,
}

// ── Import wizard steps ───────────────────────────────────────────────────────

type Step = "upload" | "map" | "preview" | "confirm"

const IMPORT_TYPES = [
  { value: "customers",         label: "Customers"              },
  { value: "vendors",           label: "Vendors"                },
  { value: "chart_of_accounts", label: "Chart of Accounts"      },
  { value: "opening_balances",  label: "Opening Balances"       },
  { value: "invoices",          label: "Sales Invoices"         },
  { value: "bills",             label: "Purchase Bills"         },
  { value: "journals",          label: "Journal Entries"        },
]

const FIELD_LABELS: Record<string, Record<string, string>> = {
  customers: {
    name: "Name*", email: "Email", phone: "Phone", gstin: "GSTIN",
    pan: "PAN", addressLine1: "Address", city: "City",
    state: "State", pincode: "Pincode", country: "Country",
    currency: "Currency", creditLimit: "Credit Limit",
  },
  vendors: {
    name: "Name*", email: "Email", phone: "Phone", gstin: "GSTIN",
    pan: "PAN", addressLine1: "Address", city: "City",
    state: "State", pincode: "Pincode", country: "Country", currency: "Currency",
  },
  chart_of_accounts: {
    code: "Account Code*", name: "Account Name*", type: "Account Type*",
    subtype: "Sub-type", parentCode: "Parent Code", description: "Description",
    currency: "Currency", taxCode: "Tax Code",
  },
  opening_balances: {
    accountCode: "Account Code*", accountName: "Account Name",
    debit: "Debit", credit: "Credit", asOfDate: "As Of Date*", currency: "Currency",
  },
  invoices: {
    invoiceNumber: "Invoice No*", customerName: "Customer*",
    invoiceDate: "Invoice Date*", dueDate: "Due Date",
    amount: "Amount*", taxAmount: "Tax Amount",
    currency: "Currency", description: "Description", status: "Status",
  },
  bills: {
    billNumber: "Bill No*", vendorName: "Vendor*",
    billDate: "Bill Date*", dueDate: "Due Date",
    amount: "Amount*", taxAmount: "Tax Amount",
    currency: "Currency", description: "Description",
  },
  journals: {
    journalNumber: "Journal No", date: "Date*", narration: "Narration",
    accountCode: "Account Code*", accountName: "Account Name",
    debit: "Debit", credit: "Credit", currency: "Currency",
  },
}

// ── Main wizard ───────────────────────────────────────────────────────────────

function ImportWizard({ orgSlug, onDone }: { orgSlug: string; onDone: () => void }) {
  const [step,         setStep]         = useState<Step>("upload")
  const [importType,   setImportType]   = useState("customers")
  const [file,         setFile]         = useState<File | null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [parsing,      setParsing]      = useState(false)
  const [parseError,   setParseError]   = useState("")

  // parse results
  const [columns,      setColumns]      = useState<string[]>([])
  const [previewRows,  setPreviewRows]  = useState<Record<string, string>[]>([])
  const [mapping,      setMapping]      = useState<Record<string, string>>({})
  const [tableOptions, setTableOptions] = useState<{ index: number; headers: string[]; rowCount: number }[]>([])
  const [selectedTable, setSelectedTable] = useState(0)

  // confirm results
  const [submitting,   setSubmitting]   = useState(false)
  const [result,       setResult]       = useState<{ successRows: number; errorRows: number; rows: { rowIndex: number; status: string; error?: string }[] } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleParse() {
    if (!file) return
    setParsing(true)
    setParseError("")
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", importType)
    const res = await fetch(`/api/organizations/${orgSlug}/imports/parse`, { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok) { setParseError(data.error ?? "Parse failed"); setParsing(false); return }
    setColumns(data.detectedColumns ?? [])
    setPreviewRows(data.previewRows ?? [])
    setMapping(data.autoMapping ?? {})
    setTableOptions(data.allTables ?? [])
    setSelectedTable(0)
    setStep("map")
    setParsing(false)
  }

  async function handleConfirm() {
    if (!file) return
    setSubmitting(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", importType)
    fd.append("mapping", JSON.stringify(mapping))
    fd.append("tableIndex", String(selectedTable))
    const res  = await fetch(`/api/organizations/${orgSlug}/imports`, { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok) {
      setResult({ successRows: data.successRows, errorRows: data.errorRows, rows: data.rows ?? [] })
      setStep("confirm")
    } else {
      setParseError(data.error ?? "Import failed")
    }
    setSubmitting(false)
  }

  const fieldLabels = FIELD_LABELS[importType] ?? {}
  const fieldOptions = Object.entries(fieldLabels).map(([k, v]) => ({ value: k, label: v }))

  const STEP_LABELS: Record<Step, string> = {
    upload:  "1. Upload",
    map:     "2. Map columns",
    preview: "3. Preview",
    confirm: "4. Result",
  }
  const STEPS: Step[] = ["upload", "map", "preview", "confirm"]

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              step === s ? "text-foreground" : "text-muted-foreground",
            )}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">Import type</label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger className="mt-1.5 w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop your file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSV, Excel (.xlsx/.xls), PDF, Word (.docx) — max 20 MB
            </p>
            {file && (
              <div className="mt-3 inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm font-medium">
                <FileText className="size-4" />
                {file.name}
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.ods,.pdf,.docx,.doc"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }}
            />
          </div>

          {parseError && (
            <p className="text-sm text-destructive flex gap-1.5 items-center">
              <XCircle className="size-4 shrink-0" /> {parseError}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleParse} disabled={!file || parsing}>
              {parsing ? "Parsing…" : "Continue →"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && (
        <div className="flex flex-col gap-5">
          {tableOptions.length > 1 && (
            <div>
              <label className="text-sm font-medium">Select table to import</label>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {tableOptions.map((t) => (
                  <button
                    key={t.index}
                    onClick={() => setSelectedTable(t.index)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      selectedTable === t.index
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-muted hover:border-primary/50",
                    )}
                  >
                    Table {t.index + 1}
                    <span className="text-xs text-muted-foreground ml-1.5">{t.rowCount} rows</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3">Map columns</h3>
            <div className="rounded-lg border divide-y">
              {columns.map((col) => (
                <div key={col} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="flex-1 text-sm font-mono bg-muted/50 rounded px-2 py-0.5 text-xs">{col}</span>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={mapping[col] ?? "__skip"}
                    onValueChange={(v) => setMapping((prev) => {
                      const next = { ...prev }
                      if (v === "__skip") delete next[col]
                      else next[col] = v
                      return next
                    })}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Skip column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">— Skip —</SelectItem>
                      {fieldOptions.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>← Back</Button>
            <Button onClick={() => setStep("preview")}>Preview →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold">Data preview</h3>
            <p className="text-xs text-muted-foreground mt-0.5">First {previewRows.length} rows after mapping. Verify before importing.</p>
          </div>

          <div className="overflow-x-auto rounded-lg border text-xs">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  {Object.values(mapping).map((field) => (
                    <th key={field} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {fieldLabels[field] ?? field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/10">
                    {Object.entries(mapping).map(([src, tgt]) => (
                      <td key={tgt} className="px-3 py-2 whitespace-nowrap">
                        {row[src] || <span className="text-muted-foreground italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parseError && (
            <p className="text-sm text-destructive flex gap-1.5"><XCircle className="size-4 shrink-0 mt-0.5" />{parseError}</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("map")}>← Back</Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Importing…" : `Import ${IMPORT_TYPES.find((t) => t.value === importType)?.label}`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "confirm" && result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-6 flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{result.successRows}</div>
              <div className="text-xs text-muted-foreground mt-1">Imported</div>
            </div>
            {result.errorRows > 0 && (
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive">{result.errorRows}</div>
                <div className="text-xs text-muted-foreground mt-1">Errors</div>
              </div>
            )}
          </div>

          {result.rows.filter((r) => r.status === "error").length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Error rows</h4>
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {result.rows.filter((r) => r.status === "error").map((r) => (
                  <div key={r.rowIndex} className="flex items-start gap-3 px-3 py-2">
                    <XCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-xs">Row {r.rowIndex + 2}: {r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onDone}>Done</Button>
            <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setResult(null) }}>
              Import another file
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Import jobs list ───────────────────────────────────────────────────────────

export default function ImportsPage() {
  const params   = useParams<{ orgSlug: string }>()
  const orgSlug  = params.orgSlug
  const router   = useRouter()

  const [jobs,       setJobs]       = useState<ImportJob[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  async function loadJobs() {
    setLoading(true)
    const res  = await fetch(`/api/organizations/${orgSlug}/imports`)
    const data = await res.json()
    setJobs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadJobs() }, [])

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4 shrink-0">
        {showWizard ? (
          <button onClick={() => setShowWizard(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to imports
          </button>
        ) : (
          <>
            <SidebarTrigger className="-ml-2 text-[#605A57]" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-[#37322F]">Imports</h1>
              <p className="text-xs text-[#605A57]">Import customers, vendors, accounts, and transactions from CSV, Excel, PDF, or Word files</p>
            </div>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowWizard(true)}>
              <Plus className="size-3.5" /> New import
            </Button>
          </>
        )}
      </header>

      <div className="flex-1 overflow-auto p-6">
        {showWizard ? (
          <div className="w-full min-w-0">
            <h2 className="text-base font-semibold mb-6">New import</h2>
            <ImportWizard orgSlug={orgSlug} onDone={() => { setShowWizard(false); loadJobs() }} />
          </div>
        ) : (
          <div className="w-full min-w-0 flex flex-col gap-4">
            {loading && (
              <div className="text-sm text-muted-foreground py-12 text-center flex items-center justify-center gap-2">
                <Clock className="size-4 animate-spin" /> Loading…
              </div>
            )}

            {!loading && jobs.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <Upload className="size-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">No imports yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Import your data from CSV, Excel, PDF, or Word files</p>
                  </div>
                  <Button size="sm" onClick={() => setShowWizard(true)} className="gap-1.5">
                    <Plus className="size-3.5" /> Start first import
                  </Button>
                </CardContent>
              </Card>
            )}

            {!loading && jobs.map((job) => {
              const StatusIcon = STATUS_ICON[job.status] ?? Clock
              return (
                <div key={job.id} className="rounded-xl border bg-white p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{job.fileName ?? "Unnamed file"}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        STATUS_CLASS[job.status] ?? STATUS_CLASS.pending,
                      )}>
                        <StatusIcon className="size-2.5" />
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{IMPORT_TYPES.find((t) => t.value === job.type)?.label ?? job.type}</span>
                      {job.totalRows != null && <span>{job.totalRows} rows</span>}
                      {job.successRows > 0 && <span className="text-emerald-600">{job.successRows} ok</span>}
                      {job.errorRows > 0 && <span className="text-destructive">{job.errorRows} errors</span>}
                      <span>{new Date(job.createdAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  {job.errorRows > 0 && job.status === "done" && (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 shrink-0"
                      onClick={async () => {
                        await fetch(`/api/organizations/${orgSlug}/imports/${job.id}/retry`, { method: "POST" })
                        loadJobs()
                      }}>
                      <RotateCcw className="size-3" /> Retry errors
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
