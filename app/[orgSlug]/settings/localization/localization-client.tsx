"use client"

import { useState } from "react"
import { Globe, Calendar, DollarSign, AlertCircle, Save } from "lucide-react"

import { AppShell, type OrgItem } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Data ──────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "","January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee"       },
  { value: "USD", label: "USD — US Dollar"          },
  { value: "GBP", label: "GBP — British Pound"      },
  { value: "AUD", label: "AUD — Australian Dollar"  },
  { value: "CAD", label: "CAD — Canadian Dollar"    },
  { value: "SGD", label: "SGD — Singapore Dollar"   },
  { value: "AED", label: "AED — UAE Dirham"         },
]

const TIMEZONES = [
  { value: "Asia/Kolkata",      label: "Asia/Kolkata (IST, UTC+5:30)"       },
  { value: "America/New_York",  label: "America/New_York (EST, UTC-5)"      },
  { value: "Europe/London",     label: "Europe/London (GMT, UTC+0)"         },
  { value: "Australia/Sydney",  label: "Australia/Sydney (AEST, UTC+10)"    },
  { value: "Asia/Singapore",    label: "Asia/Singapore (SGT, UTC+8)"        },
  { value: "Asia/Dubai",        label: "Asia/Dubai (GST, UTC+4)"            },
]

const COA_TEMPLATES = [
  { value: "STANDARD_INDIA", label: "Standard — India",          desc: "GST-ready"     },
  { value: "STANDARD_US",    label: "Standard — United States",  desc: "GAAP-aligned"  },
  { value: "STANDARD_UK",    label: "Standard — United Kingdom", desc: "VAT-ready"     },
  { value: "BLANK",          label: "Blank",                     desc: "Custom"        },
]

const TAX_MODES = [
  { value: "GST",       label: "GST",        desc: "India"         },
  { value: "VAT",       label: "VAT",        desc: "UK / EU / UAE" },
  { value: "SALES_TAX", label: "Sales Tax",  desc: "United States" },
  { value: "NONE",      label: "No tax",     desc: "Tax-exempt"    },
]

// ── Field primitive ───────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"

const selectCls = cn(inputCls, "appearance-none cursor-pointer")

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function Section({
  icon: Icon, title, desc, children, locked,
}: {
  icon: React.ElementType; title: string; desc?: string; children: React.ReactNode; locked?: boolean
}) {
  return (
    <Card className={locked ? "opacity-70" : ""}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {desc && <CardDescription className="text-xs mt-0.5">{desc}</CardDescription>}
            </div>
          </div>
          {locked && <Badge variant="secondary" className="text-xs">Requires approval to change</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

// ── Tax registrations table ───────────────────────────────────────────────────

interface TaxReg {
  id: string; type: string; number: string; effectiveFrom: string; isActive: boolean
}

function TaxRegistrationsTable({ registrations }: { registrations: TaxReg[] }) {
  if (registrations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No tax registrations added yet.</p>
        <Button variant="outline" size="sm" className="mt-3">Add registration</Button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border divide-y">
      {registrations.map((r) => (
        <div key={r.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium text-foreground">{r.type}</span>
            <span className="ml-3 font-mono text-sm text-muted-foreground">{r.number}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              from {new Date(r.effectiveFrom).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </span>
            <Badge variant={r.isActive ? "default" : "secondary"} className="text-xs">
              {r.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main client ───────────────────────────────────────────────────────────────

interface CompanySnapshot {
  id?: string
  currency?: string
  fiscalYearStart?: number
  timezone?: string
  locale?: string
  coaTemplate?: string
  taxMode?: string
  taxRegistrations?: TaxReg[]
}

interface Props {
  orgSlug:   string
  orgName:   string
  orgs:      OrgItem[]
  userName?: string
  userEmail?: string
  company:   CompanySnapshot | null
}

export function LocalizationClient({ orgSlug, orgName, orgs, userName, userEmail, company }: Props) {
  const [currency,   setCurrency]   = useState(company?.currency        ?? "INR")
  const [timezone,   setTimezone]   = useState(company?.timezone        ?? "Asia/Kolkata")
  const [taxMode,    setTaxMode]    = useState(company?.taxMode         ?? "GST")
  const [coa,        setCoa]        = useState(company?.coaTemplate     ?? "STANDARD_INDIA")
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState("")

  const fiscalYearStart = company?.fiscalYearStart ?? 4

  async function handleSave() {
    setSaving(true); setError("")
    const res = await fetch(`/api/organizations/${orgSlug}/company`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ currency, timezone }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Something went wrong.")
      return
    }
    setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppShell
      orgSlug={orgSlug} orgName={orgName} orgs={orgs}
      userName={userName} userEmail={userEmail}
      activeHref={`/${orgSlug}/settings`}
    >
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><a href={`/${orgSlug}/settings/company`} className="text-muted-foreground hover:text-foreground text-sm">Settings</a></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage className="font-medium">Localisation</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1.5">
              <Save className="size-3.5" />
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-6 p-6 max-w-2xl">
          <div>
            <h1 className="text-lg font-semibold">Localisation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Currency, fiscal year, timezone, tax setup, and chart of accounts.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex gap-2 items-start">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Currency & Timezone */}
          <Section icon={DollarSign} title="Currency & timezone" desc="Base currency cannot be changed after transactions are posted">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Base currency" hint="Used for all accounting entries">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
                  {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Timezone" hint="Used for period boundaries and scheduling">
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectCls}>
                  {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Fiscal year */}
          <Section icon={Calendar} title="Fiscal year" desc="The fiscal year start month cannot be changed after posting" locked>
            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Starts in {MONTH_NAMES[fiscalYearStart]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current fiscal year runs {MONTH_NAMES[fiscalYearStart]} {new Date().getFullYear()} — {MONTH_NAMES[fiscalYearStart === 1 ? 12 : fiscalYearStart - 1]} {fiscalYearStart === 1 ? new Date().getFullYear() : new Date().getFullYear() + 1}
                </p>
              </div>
              <Badge variant="secondary">Locked after posting</Badge>
            </div>
          </Section>

          {/* Tax mode */}
          <Section icon={Globe} title="Tax framework" desc="Changing this requires approval and audit entry" locked>
            <div className="grid grid-cols-2 gap-2">
              {TAX_MODES.map((t) => (
                <div
                  key={t.value}
                  className={cn(
                    "rounded-lg border px-4 py-3 cursor-not-allowed",
                    taxMode === t.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                  )}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  {taxMode === t.value && (
                    <Badge variant="default" className="mt-2 text-xs">Active</Badge>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              To change the tax framework, raise an approval request in Settings → Audit.
            </p>
          </Section>

          {/* COA template */}
          <Section icon={Globe} title="Chart of accounts" desc="Template applied at setup; accounts can be customised any time">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">
                {COA_TEMPLATES.find((t) => t.value === coa)?.label ?? coa}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {COA_TEMPLATES.find((t) => t.value === coa)?.desc}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={`/${orgSlug}/accounting/accounts`}>Manage chart of accounts →</a>
            </Button>
          </Section>

          {/* Tax registrations */}
          <Section icon={Globe} title="Tax registrations" desc="GSTIN, VAT, PAN, TDS registrations with effective dates">
            <TaxRegistrationsTable
              registrations={(company?.taxRegistrations ?? []) as TaxReg[]}
            />
          </Section>
        </div>
      </SidebarInset>
    </AppShell>
  )
}
