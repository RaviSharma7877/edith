"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Save, Phone, Mail, MapPin, FileText, Globe } from "lucide-react"

import { AppShell, type OrgItem } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-50"

const textareaCls = cn(inputCls, "h-24 resize-none py-2.5 leading-relaxed")

// ── Components ────────────────────────────────────────────────────────────────

function Field({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint  && !error && <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">{hint}</span>}
      {error && <span className="text-xs text-destructive font-medium">{error}</span>}
    </label>
  )
}

function Section({
  icon: Icon, title, desc, children, className,
}: {
  icon: React.ElementType; title: string; desc?: string; children: React.ReactNode; className?: string
}) {
  return (
    <Card className={cn("shadow-sm border-muted-foreground/10 overflow-hidden", className)}>
      <CardHeader className="pb-4 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/5 text-primary">
            <Icon className="size-4.5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {desc && <CardDescription className="text-xs mt-0.5">{desc}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col gap-5">{children}</CardContent>
    </Card>
  )
}

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:         z.string().min(2, "Required").max(80),
  legalName:    z.string().max(120).optional().or(z.literal("")),
  displayName:  z.string().max(80).optional().or(z.literal("")),
  phone:        z.string().max(30).optional().or(z.literal("")),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  website:      z.string().url("Invalid URL").optional().or(z.literal("")),
  taxId:        z.string().max(30).optional().or(z.literal("")),
  panNumber:    z.string().max(20).optional().or(z.literal("")),
  cin:          z.string().max(30).optional().or(z.literal("")),
  addressLine1: z.string().max(120).optional().or(z.literal("")),
  addressLine2: z.string().max(120).optional().or(z.literal("")),
  city:         z.string().max(80).optional().or(z.literal("")),
  state:        z.string().max(80).optional().or(z.literal("")),
  postalCode:   z.string().max(20).optional().or(z.literal("")),
  invoiceNotes: z.string().max(500).optional().or(z.literal("")),
  invoiceTerms: z.string().max(500).optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

// ── Main Client Component ─────────────────────────────────────────────────────

interface Props {
  orgSlug:   string
  orgName:   string
  orgs:      OrgItem[]
  userName?: string
  userEmail?: string
  company:   Record<string, unknown> | null
}

export function CompanySettingsClient({ orgSlug, orgName, orgs, userName, userEmail, company }: Props) {
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState("")

  const {
    register, handleSubmit, formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         (company?.name         as string) ?? "",
      legalName:    (company?.legalName    as string) ?? "",
      displayName:  (company?.displayName  as string) ?? "",
      phone:        (company?.phone        as string) ?? "",
      email:        (company?.email        as string) ?? "",
      website:      (company?.website      as string) ?? "",
      taxId:        (company?.taxId        as string) ?? "",
      panNumber:    (company?.panNumber    as string) ?? "",
      cin:          (company?.cin          as string) ?? "",
      addressLine1: (company?.addressLine1 as string) ?? "",
      addressLine2: (company?.addressLine2 as string) ?? "",
      city:         (company?.city         as string) ?? "",
      state:        (company?.state        as string) ?? "",
      postalCode:   (company?.postalCode   as string) ?? "",
      invoiceNotes: (company?.invoiceNotes as string) ?? "",
      invoiceTerms: (company?.invoiceTerms as string) ?? "",
    },
  })

  async function onSubmit(values: FormValues) {
    setSaved(false); setError("")
    const res = await fetch(`/api/organizations/${orgSlug}/company`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(values),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Something went wrong.")
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppShell
      orgSlug={orgSlug} orgName={orgName} orgs={orgs}
      userName={userName} userEmail={userEmail}
      activeHref={`/${orgSlug}/settings`}
    >
      <SidebarInset>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-6">
          <SidebarTrigger className="-ml-2" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><a href={`/${orgSlug}/settings`} className="text-muted-foreground hover:text-foreground text-sm transition-colors">Settings</a></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage className="font-semibold text-foreground">Company profile</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            {error && <span className="text-xs text-destructive font-medium mr-2 hidden sm:inline-block">{error}</span>}
            <Button
              size="sm" 
              onClick={handleSubmit(onSubmit)} 
              disabled={isSubmitting || (!isDirty && !saved)}
              className={cn(
                "h-9 px-5 gap-2 transition-all duration-300",
                saved ? "bg-green-600 hover:bg-green-700" : ""
              )}
            >
              <Save className="size-4" />
              <span>{isSubmitting ? "Saving…" : saved ? "Changes Saved ✓" : "Save Changes"}</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 bg-muted/20 pb-20">
          <div className="max-w-6xl mx-auto p-6 sm:p-10 space-y-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Organisation Settings</h1>
              <p className="text-base text-muted-foreground mt-1.5 max-w-2xl">
                Set up your business identity, tax registration, and registered office. These details appear on all invoices and legal documents.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-8">
                {/* Identity Section */}
                <Section icon={Building2} title="Identity" desc="Primary business names and branding">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Organisation name" error={errors.name?.message}>
                      <input {...register("name")} placeholder="Acme Pvt. Ltd." className={inputCls} />
                    </Field>
                    <Field label="Display name" hint="Appears in portals & emails" error={errors.displayName?.message}>
                      <input {...register("displayName")} placeholder="Acme" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Legal name" hint="Full registered entity name" error={errors.legalName?.message}>
                    <input {...register("legalName")} placeholder="Acme Private Limited" className={inputCls} />
                  </Field>
                </Section>

                {/* Contact Section */}
                <Section icon={Phone} title="Contact" desc="Official contact points for your business">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Business phone" error={errors.phone?.message}>
                      <input {...register("phone")} placeholder="+91 98765 43210" className={inputCls} />
                    </Field>
                    <Field label="Business email" error={errors.email?.message}>
                      <input {...register("email")} type="email" placeholder="billing@acme.com" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Website" error={errors.website?.message}>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                      <input {...register("website")} placeholder="https://acme.com" className={cn(inputCls, "pl-10")} />
                    </div>
                  </Field>
                </Section>

                {/* Tax Identifiers */}
                <Section icon={FileText} title="Tax Identifiers" desc="Used for tax invoices and compliance">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="GSTIN / VAT Number" error={errors.taxId?.message}>
                      <input {...register("taxId")} placeholder="22AAAAA0000A1Z5" className={inputCls} />
                    </Field>
                    <Field label="PAN Number" error={errors.panNumber?.message}>
                      <input {...register("panNumber")} placeholder="AAAAA0000A" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="CIN" hint="Corporate Identity Number" error={errors.cin?.message}>
                    <input {...register("cin")} placeholder="U12345MH2020PTC123456" className={inputCls} />
                  </Field>
                </Section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-8">
                {/* Registered Address */}
                <Section icon={MapPin} title="Registered Address" desc="The legal place of business">
                  <div className="flex flex-col gap-5">
                    <Field label="Address line 1" error={errors.addressLine1?.message}>
                      <input {...register("addressLine1")} placeholder="Street / Building / Plot no." className={inputCls} />
                    </Field>
                    <Field label="Address line 2" error={errors.addressLine2?.message}>
                      <input {...register("addressLine2")} placeholder="Area / Locality (optional)" className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="City" error={errors.city?.message}>
                        <input {...register("city")} placeholder="Mumbai" className={inputCls} />
                      </Field>
                      <Field label="Postal code" error={errors.postalCode?.message}>
                        <input {...register("postalCode")} placeholder="400001" className={inputCls} />
                      </Field>
                    </div>
                    <Field label="State / Province" error={errors.state?.message}>
                      <input {...register("state")} placeholder="Maharashtra" className={inputCls} />
                    </Field>
                  </div>
                </Section>

                {/* Invoice Defaults */}
                <Section icon={Mail} title="Invoice Defaults" desc="Standard text added to outgoing documents">
                  <Field label="Default invoice notes" hint="Appears at the footer of invoices" error={errors.invoiceNotes?.message}>
                    <textarea {...register("invoiceNotes")} placeholder="Thank you for your business!" className={textareaCls} />
                  </Field>
                  <Field label="Standard terms" hint="e.g. Payment due within 30 days" error={errors.invoiceTerms?.message}>
                    <textarea {...register("invoiceTerms")} placeholder="Payment is due within 15 days." className={textareaCls} />
                  </Field>
                </Section>

                {/* Mobile/Bottom Save Button */}
                <div className="lg:hidden flex justify-end pt-4">
                  <Button type="submit" disabled={isSubmitting || !isDirty} size="lg" className="w-full sm:w-auto h-12 gap-2 shadow-xl shadow-primary/20">
                    <Save className="size-5" />
                    {isSubmitting ? "Saving changes…" : "Save changes"}
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </div>
      </SidebarInset>
    </AppShell>
  )
}
