"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, ChevronRight, ChevronLeft, Check, Users, MapPin, Settings2, ShieldCheck, Mail } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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

export const COUNTRIES = [
  { value: "IN", label: "India"            },
  { value: "US", label: "United States"    },
  { value: "GB", label: "United Kingdom"   },
  { value: "AU", label: "Australia"        },
  { value: "CA", label: "Canada"           },
  { value: "SG", label: "Singapore"        },
  { value: "AE", label: "UAE"              },
]

export const CURRENCIES = [
  { value: "INR", label: "INR — Indian Rupee"       },
  { value: "USD", label: "USD — US Dollar"          },
  { value: "GBP", label: "GBP — British Pound"      },
  { value: "AUD", label: "AUD — Australian Dollar"  },
  { value: "CAD", label: "CAD — Canadian Dollar"    },
  { value: "SGD", label: "SGD — Singapore Dollar"   },
  { value: "AED", label: "AED — UAE Dirham"         },
]

export const TAX_MODES = [
  { value: "GST",  label: "GST (India)" },
  { value: "VAT",  label: "VAT"          },
  { value: "NONE", label: "No Tax"       },
]

export const COA_TEMPLATES = [
  { value: "STANDARD_INDIA", label: "Standard India (3-tier)" },
  { value: "SIMPLE",         label: "Simple (Cash-based)"    },
]

export const MONTHS = [
  { value: "1",  label: "January" },
  { value: "4",  label: "April"   },
  { value: "7",  label: "July"    },
  { value: "10", label: "October" },
]

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1: Basics
  name:         z.string().min(2, "Organisation name is required.").max(80),
  country:      z.string().min(2),
  currency:     z.string().min(3).max(3),
  
  // Step 2: Profile
  legalName:    z.string().max(120).optional().or(z.literal("")),
  displayName:  z.string().max(80).optional().or(z.literal("")),
  phone:        z.string().max(30).optional().or(z.literal("")),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  website:      z.string().url("Invalid URL").optional().or(z.literal("")),
  
  // Step 3: Address
  addressLine1: z.string().max(120).optional().or(z.literal("")),
  addressLine2: z.string().max(120).optional().or(z.literal("")),
  city:         z.string().max(80).optional().or(z.literal("")),
  state:        z.string().max(80).optional().or(z.literal("")),
  postalCode:   z.string().max(20).optional().or(z.literal("")),
  
  // Step 4: Accounting & Team
  fiscalYearStart: z.string().default("4"),
  taxMode:         z.string().default("GST"),
  coaTemplate:     z.string().default("STANDARD_INDIA"),
  inviteEmails:    z.string().optional().or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

// ── Multi-Step Wizard Component ───────────────────────────────────────────────

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
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
    
    // Parse invite emails into array
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
    onOpenChange(false)
    window.location.href = `/${slug}/dashboard?welcome=1`
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val)
      if (!val) {
        setStep(1)
        form.reset()
      }
    }}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden gap-0">
        <div className="bg-primary/5 px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Building2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">New Organisation</DialogTitle>
              <DialogDescription className="text-xs">
                Step {step} of {totalSteps}: {
                  step === 1 ? "Workspace Basics" :
                  step === 2 ? "Company Identity" :
                  step === 3 ? "Registered Office" :
                  "Accounting & Team"
                }
              </DialogDescription>
            </div>
          </div>
        </div>
        
        <Progress value={progress} className="h-1 rounded-none bg-primary/10" />

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* STEP 1: BASICS */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="name">Organisation Name</Label>
                  <Input 
                    id="name" 
                    {...register("name")} 
                    placeholder="e.g. Acme Corporation" 
                    className="h-11 text-base"
                    autoFocus
                  />
                  {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={currentCountry} onValueChange={(v) => setValue("country", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base Currency</Label>
                    <Select value={currentCurrency} onValueChange={(v) => setValue("currency", v)}>
                      <SelectTrigger className="h-11">
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
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Entity Name</Label>
                    <Input id="legalName" {...register("legalName")} placeholder="Full registered name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Short Display Name</Label>
                    <Input id="displayName" {...register("displayName")} placeholder="e.g. Acme" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Official Phone</Label>
                    <Input id="phone" {...register("phone")} placeholder="+91 00000 00000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Public Email</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="info@acme.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input id="website" {...register("website")} placeholder="https://acme.com" />
                  {errors.website && <p className="text-xs text-destructive font-medium">{errors.website.message}</p>}
                </div>
              </div>
            )}

            {/* STEP 3: ADDRESS */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Registered Address Line 1</Label>
                  <Input id="addressLine1" {...register("addressLine1")} placeholder="Building, Street, Area" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                  <Input id="addressLine2" {...register("addressLine2")} placeholder="Suite, Landmark, etc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">PIN / Postal Code</Label>
                    <Input id="postalCode" {...register("postalCode")} placeholder="Zip code" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Input id="state" {...register("state")} placeholder="State" />
                </div>
              </div>
            )}

            {/* STEP 4: ACCOUNTING & TEAM */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fiscal Year Starts</Label>
                    <Select value={currentFY} onValueChange={(v) => setValue("fiscalYearStart", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax System</Label>
                    <Select value={currentTaxMode} onValueChange={(v) => setValue("taxMode", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_MODES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Chart of Accounts Template</Label>
                  <Select value={currentCOA} onValueChange={(v) => setValue("coaTemplate", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COA_TEMPLATES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2 border-t mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="size-3.5 text-primary" />
                    <Label htmlFor="inviteEmails" className="text-xs uppercase tracking-wider font-bold opacity-60">Invite Team Members</Label>
                  </div>
                  <Textarea 
                    id="inviteEmails" 
                    {...register("inviteEmails")} 
                    placeholder="Enter emails separated by commas"
                    rows={2}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground italic">They will receive an invitation email once the organisation is ready.</p>
                </div>
              </div>
            )}

            {serverError && (
              <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive font-medium">
                {serverError}
              </p>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-3 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="flex-1 h-11"
                >
                  <ChevronLeft className="mr-2 size-4" />
                  Back
                </Button>
              )}
              
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 h-11 shadow-lg shadow-primary/10"
                >
                  Continue
                  <ChevronRight className="ml-2 size-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? "Initialising Workspace..." : "Create Organisation"}
                  {!isSubmitting && <Check className="ml-2 size-4" />}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
