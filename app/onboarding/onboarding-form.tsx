"use client"

import { useRouter } from "next/navigation"
import { OnboardingWizard } from "@/components/onboarding-wizard"

interface OnboardingFormProps {
  email: string
}

export function OnboardingForm({ email }: OnboardingFormProps) {
  const router = useRouter()

  function handleSuccess(slug: string) {
    router.push(`/${slug}/dashboard?welcome=1`)
  }

  return (
    <main className="min-h-screen bg-[#FDFCFB] flex items-center justify-center px-6 py-12 selection:bg-primary/10">
      <div className="w-full max-w-[640px] relative">
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 size-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -right-24 size-64 bg-primary/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-white border shadow-sm mb-6">
            <span className="text-xl font-bold tracking-tighter text-primary">E.</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome to Edith</h1>
          <p className="text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        <OnboardingWizard onSuccess={handleSuccess} />

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need help? <a href="#" className="font-medium text-primary hover:underline">Contact our support team</a>
        </p>
      </div>
    </main>
  )
}
