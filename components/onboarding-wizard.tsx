"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Users, 
  Settings2, 
  ShieldCheck, 
  LayoutDashboard,
  Globe,
  Phone,
  Mail,
  MapPin
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

// ── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "IN", label: "India"            },
  { value: "US", label: "United States"    },
  { value: "GB", label: "United Kingdom"   },
  { value: "AU", label: "Australia"        },
  { value: "CA", label: "Canada"           },
  { value: "SG", label: "Singapore"        },
  { value: "AE", label: "UAE"              },
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

const TAX_MODES = [
  { value: "GST",  label: "GST (India)", desc: "Goods & Services Tax" },
  { value: "VAT",  label: "VAT",          desc: "Value Added Tax"      },
  { value: "NONE", label: "No Tax",       desc: "No tax registration"  },
]

const COA_TEMPLATES = [
  { value: "STANDARD_INDIA", label: "Standard India", desc: "Recommended for Indian companies" },
  { value: "SIMPLE",         label: "Simple",         desc: "Basic accounts for small business" },
]

const MONTHS = [
  { value: "1",  label: "January" },
  { value: "4",  label: "April"   },
  { value: "7",  label: "July"    },
  { value: "10", label: "October" },
]

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:         z.string().min(2, "Organisation name is required.").max(80),
  country:      z.string().min(2),
  currency:     z.string().min(3).max(3),
  legalName:    z.string().max(120).optional().or(z.literal("")),
  displayName:  z.string().max(80).optional().or(z.literal("")),
  phone:        z.string().max(30).optional().or(z.literal("")),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  website:      z.string().url("Invalid URL").optional().or(z.literal("")),
  addressLine1: z.string().max(120).optional().or(z.literal("")),
  addressLine2: z.string().max(120).optional().or(z.literal("")),
  city:         z.string().max(80).optional().or(z.literal("")),
  state:        z.string().max(80).optional().or(z.literal("")),
  postalCode:   z.string().max(20).optional().or(z.literal("")),
  fiscalYearStart: z.string().default("4"),
  taxMode:         z.string().default("GST"),
  coaTemplate:     z.string().default("STANDARD_INDIA"),
  inviteEmails:    z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

// ── Shared Components ─────────────────────────────────────────────────────────

function OptionCard({ 
  selected, 
  label, 
  desc, 
  onClick 
}: { 
  selected: boolean; 
  label: string; 
  desc: string; 
  onClick: () => void 
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 p-4 rounded-xl border text-left transition-all",
        selected 
          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" 
          : "bg-background border-border hover:border-muted-foreground/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {selected && <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><Check className="size-2.5" /></div>}
      </div>
      <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
    </button>
  )
}

// ── Main Wizard Component ─────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onSuccess: (slug: string) => void
}

export function OnboardingWizard({ onSuccess }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState("")
  
  const totalSteps = 4
  const progress = (step / totalSteps) * 100

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: "IN",
      currency: "INR",
      fiscalYearStart: "4",
      taxMode: "GST",
      coaTemplate: "STANDARD_INDIA",
    },
  })

  const { register, handleSubmit, formState: { errors, isSubmitting }, trigger, setValue, watch } = form

  const currentCountry = watch("country")
  const currentCurrency = watch("currency")
  const currentFY = watch("fiscalYearStart")
  const currentTaxMode = watch("taxMode")
  const currentCOA = watch("coaTemplate")

  async function nextStep() {
    let fieldsToValidate: Array<keyof FormValues> = []
    if (step === 1) fieldsToValidate = ["name", "country", "currency"]
    if (step === 2) fieldsToValidate = ["legalName", "displayName", "phone", "email", "website"]
    if (step === 3) fieldsToValidate = ["addressLine1", "city", "state", "postalCode"]
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) setStep((s) => Math.min(s + 1, totalSteps))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function onSubmit(values: FormValues) {
    setServerError("")
    
    const inviteEmails = values.inviteEmails
      ? values.inviteEmails.split(",").map(e => e.trim()).filter(e => e.includes("@"))
      : []

    const payload = {
      ...values,
      inviteEmails,
      fiscalYearStart: parseInt(values.fiscalYearStart, 10),
    }

    const res = await fetch("/api/organizations", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setServerError(data.error ?? "Something went wrong. Please try again.")
      return
    }

    const { slug } = await res.json()
    onSuccess(slug)
  }

  const stepTitles = [
    "Workspace Basics",
    "Company Identity",
    "Registered Office",
    "Accounting & Team"
  ]

  const stepIcons = [
    <LayoutDashboard className="size-5" key="1" />,
    <Building2 className="size-5" key="2" />,
    <MapPin className="size-5" key="3" />,
    <Settings2 className="size-5" key="4" />
  ]

  return (
    <div className="bg-white rounded-2xl border shadow-xl shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 px-8 py-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              {stepIcons[step - 1]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{stepTitles[step - 1]}</h2>
              <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
            </div>
          </div>
        </div>
        <Progress value={progress} className="h-1.5 bg-primary/10" />
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Organisation Name</Label>
                <Input 
                  id="name" 
                  {...register("name")} 
                  placeholder="e.g. Acme Corporation" 
                  className="h-12 text-lg px-4"
                  autoFocus
                />
                {errors.name && <p className="text-sm text-destructive font-medium">{errors.name.message}</p>}
                <p className="text-xs text-muted-foreground">This is your internal workspace name. You can change this later.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Country</Label>
                  <Select value={currentCountry} onValueChange={(v) => setValue("country", v)}>
                    <SelectTrigger className="h-12 bg-muted/30 border-transparent hover:bg-muted/50 transition-colors">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Base Currency</Label>
                  <Select value={currentCurrency} onValueChange={(v) => setValue("currency", v)}>
                    <SelectTrigger className="h-12 bg-muted/30 border-transparent hover:bg-muted/50 transition-colors">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IDENTITY */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="legalName" className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Legal Entity Name
                  </Label>
                  <Input id="legalName" {...register("legalName")} placeholder="Full registered name" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="flex items-center gap-2">
                    <LayoutDashboard className="size-4 text-primary" />
                    Short Display Name
                  </Label>
                  <Input id="displayName" {...register("displayName")} placeholder="e.g. Acme" className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="size-4 text-primary" />
                    Official Phone
                  </Label>
                  <Input id="phone" {...register("phone")} placeholder="+91 00000 00000" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    Public Email
                  </Label>
                  <Input id="email" type="email" {...register("email")} placeholder="info@acme.com" className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="size-4 text-primary" />
                  Website URL
                </Label>
                <Input id="website" {...register("website")} placeholder="https://acme.com" className="h-11" />
                {errors.website && <p className="text-sm text-destructive font-medium">{errors.website.message}</p>}
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Registered Address Line 1</Label>
                <Input id="addressLine1" {...register("addressLine1")} placeholder="Building, Street, Area" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input id="addressLine2" {...register("addressLine2")} placeholder="Suite, Landmark, etc." className="h-11" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register("city")} placeholder="City" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">PIN / Postal Code</Label>
                  <Input id="postalCode" {...register("postalCode")} placeholder="Zip code" className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State / Province</Label>
                <Input id="state" {...register("state")} placeholder="State" className="h-11" />
              </div>
            </div>
          )}

          {/* STEP 4: ACCOUNTING & TEAM */}
          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accounting Period</Label>
                  <div className="space-y-2">
                    <Label className="text-xs">Fiscal Year Starts In</Label>
                    <Select value={currentFY} onValueChange={(v) => setValue("fiscalYearStart", v)}>
                      <SelectTrigger className="h-11 bg-muted/30 border-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tax Mode</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {TAX_MODES.map(t => (
                      <OptionCard 
                        key={t.value}
                        label={t.label}
                        desc={t.desc}
                        selected={currentTaxMode === t.value}
                        onClick={() => setValue("taxMode", t.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 border-t pt-8">
                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chart of Accounts Template</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {COA_TEMPLATES.map(c => (
                    <OptionCard 
                      key={c.value}
                      label={c.label}
                      desc={c.desc}
                      selected={currentCOA === c.value}
                      onClick={() => setValue("coaTemplate", c.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t pt-8">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="size-4 text-primary" />
                  <Label htmlFor="inviteEmails" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Invite Your Team</Label>
                </div>
                <Textarea 
                  id="inviteEmails" 
                  {...register("inviteEmails")} 
                  placeholder="Paste emails separated by commas (e.g. john@acme.com, sarah@acme.com)"
                  rows={3}
                  className="resize-none text-base p-4 bg-muted/20 border-transparent focus:bg-background transition-all"
                />
                <p className="text-xs text-muted-foreground italic">Teammates will receive an invitation email once you complete the setup.</p>
              </div>
            </div>
          )}

          {serverError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 animate-in shake-1 duration-300">
              <p className="text-sm text-destructive font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4" />
                {serverError}
              </p>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-4 pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={prevStep}
                disabled={isSubmitting}
                className="h-12 px-6 hover:bg-muted/50 text-muted-foreground"
              >
                <ChevronLeft className="mr-2 size-5" />
                Back
              </Button>
            )}
            
            <div className="flex-1" />

            {step < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                className="h-12 px-10 text-base shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
                <ChevronRight className="ml-2 size-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-10 text-base shadow-xl shadow-primary/30 bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? "Setting up your workspace..." : "Finish & Launch"}
                {!isSubmitting && <Check className="ml-2 size-5" />}
              </Button>
            )}
          </div>
        </form>
      </div>
      
      {/* Footer */}
      <div className="bg-muted/30 px-8 py-4 border-t flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Secure Infrastructure Powered by Edith AI</p>
        <div className="flex gap-4">
          <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          <div className="size-1.5 rounded-full bg-primary/20" />
          <div className="size-1.5 rounded-full bg-primary/20" />
        </div>
      </div>
    </div>
  )
}
