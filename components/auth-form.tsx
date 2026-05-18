"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"

type AuthFormProps = {
  mode: "login" | "signup"
}

// ── Icons ───────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden>
      <rect x="1"  y="1"  width="9" height="9" fill="#F25022" />
      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00" />
      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

// ── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  minLength,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  minLength?: number
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#37322F]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className="h-11 rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-3 text-[#37322F] placeholder:text-[#B0AAA6] outline-none transition-colors focus:border-[#37322F] focus:ring-1 focus:ring-[#37322F]"
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  options,
  required,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#37322F]">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        className="h-11 rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-3 text-[#37322F] outline-none transition-colors focus:border-[#37322F] focus:ring-1 focus:ring-[#37322F] appearance-none"
      >
        <option value="" disabled>Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

// ── Main form ────────────────────────────────────────────────────────────────

export function AuthForm({ mode }: AuthFormProps) {
  const [error, setError]           = useState("")
  const [isSubmitting, setSubmitting] = useState(false)
  const [oauthLoading, setOAuthLoading] = useState<string | null>(null)
  const isSignup = mode === "signup"

  // OAuth button handler
  const handleOAuth = async (provider: "google" | "github" | "microsoft") => {
    setOAuthLoading(provider)
    setError("")
    await signIn(provider, { callbackUrl: "/onboarding" })
    setOAuthLoading(null)
  }

  // Credentials submit
  async function handleSubmit(formData: FormData) {
    setError("")
    setSubmitting(true)

    const email    = String(formData.get("email")    || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    if (!email || !password || password.length < 6) {
      setError("Enter a valid email and a password with at least 6 characters.")
      setSubmitting(false)
      return
    }

    if (isSignup) {
      const firstName = String(formData.get("firstName") || "").trim()
      const lastName  = String(formData.get("lastName")  || "").trim()

      if (!firstName) {
        setError("First name is required.")
        setSubmitting(false)
        return
      }

      // TODO: call POST /api/auth/register to create the user in DB
      // For now fall through to signIn which uses the credentials stub
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/onboarding",
        redirect: false,
      })
      setSubmitting(false)
      if (result?.error) {
        setError("Could not create account. Please try again.")
        return
      }
      window.location.href = result?.url || "/onboarding"
    } else {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/onboarding",
        redirect: false,
      })
      setSubmitting(false)
      if (result?.error) {
        setError("Incorrect email or password.")
        return
      }
      window.location.href = result?.url || "/onboarding"
    }
  }

  const showGoogle    = process.env.NEXT_PUBLIC_FEATURE_OAUTH_GOOGLE    !== "false"
  const showGitHub    = process.env.NEXT_PUBLIC_FEATURE_OAUTH_GITHUB    !== "false"
  const showMicrosoft = process.env.NEXT_PUBLIC_FEATURE_OAUTH_MICROSOFT === "true"
  const hasOAuth      = showGoogle || showGitHub || showMicrosoft

  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1060px] items-center justify-center border-x border-[rgba(55,50,47,0.12)] px-6 py-12">
        <div className="grid w-full max-w-[900px] overflow-hidden rounded-lg border border-[rgba(55,50,47,0.12)] bg-white md:grid-cols-[0.85fr_1.15fr]">

          {/* ── Left panel ─────────────────────────────────────────────── */}
          <section className="border-b border-[rgba(55,50,47,0.12)] bg-[#FBFAF9] p-8 md:border-b-0 md:border-r flex flex-col">
            <Link href="/" className="text-xl font-semibold font-sans">
              Edith
            </Link>
            <h1 className="mt-10 font-serif text-4xl leading-tight text-[#37322F]">
              {isSignup
                ? "Create your accounting workspace."
                : "Welcome back to Edith."}
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#605A57]">
              {isSignup
                ? "Ledgers, invoices, reconciliation, CRM, projects, and AI — all connected."
                : "Open your workspace for accounting, clients, reports, and AI-assisted work."}
            </p>

            {/* Feature list */}
            <ul className="mt-8 flex flex-col gap-2.5 text-sm text-[#605A57]">
              {[
                "Double-entry accounting & GST",
                "Bank reconciliation & reports",
                "CRM, proposals & client portal",
                "AI copilot with approval controls",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="6.5" stroke="#37322F" strokeOpacity=".2" />
                    <path d="M4 7l2 2 4-4" stroke="#37322F" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 p-8 overflow-y-auto max-h-[85vh]">
            <div>
              <div className="text-2xl font-semibold tracking-tight">
                {isSignup ? "Start free" : "Log in"}
              </div>
              <p className="mt-1 text-sm text-[#605A57]">
                {isSignup
                  ? "No credit card required."
                  : "Use your email or a connected account."}
              </p>
            </div>

            {/* ── OAuth buttons ─────────────────────────────────────────── */}
            {hasOAuth && (
              <>
                <div className="flex flex-col gap-2.5">
                  {showGoogle && (
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      disabled={!!oauthLoading || isSubmitting}
                      className="h-11 w-full rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-4 flex items-center justify-center gap-3 text-sm font-medium text-[#37322F] hover:bg-[#F7F5F3] transition-colors disabled:opacity-60"
                    >
                      <GoogleIcon />
                      {oauthLoading === "google"
                        ? "Connecting…"
                        : isSignup
                        ? "Sign up with Google"
                        : "Continue with Google"}
                    </button>
                  )}
                  {showGitHub && (
                    <button
                      type="button"
                      onClick={() => handleOAuth("github")}
                      disabled={!!oauthLoading || isSubmitting}
                      className="h-11 w-full rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-4 flex items-center justify-center gap-3 text-sm font-medium text-[#37322F] hover:bg-[#F7F5F3] transition-colors disabled:opacity-60"
                    >
                      <GitHubIcon />
                      {oauthLoading === "github"
                        ? "Connecting…"
                        : isSignup
                        ? "Sign up with GitHub"
                        : "Continue with GitHub"}
                    </button>
                  )}
                  {showMicrosoft && (
                    <button
                      type="button"
                      onClick={() => handleOAuth("microsoft")}
                      disabled={!!oauthLoading || isSubmitting}
                      className="h-11 w-full rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-4 flex items-center justify-center gap-3 text-sm font-medium text-[#37322F] hover:bg-[#F7F5F3] transition-colors disabled:opacity-60"
                    >
                      <MicrosoftIcon />
                      {oauthLoading === "microsoft"
                        ? "Connecting…"
                        : isSignup
                        ? "Sign up with Microsoft"
                        : "Continue with Microsoft"}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[rgba(55,50,47,0.10)]" />
                  <span className="text-xs text-[#B0AAA6] font-medium">or</span>
                  <div className="flex-1 h-px bg-[rgba(55,50,47,0.10)]" />
                </div>
              </>
            )}

            {/* ── Credentials form ──────────────────────────────────────── */}
            <form action={handleSubmit} className="flex flex-col gap-4">

              {/* Signup-only fields */}
              {isSignup && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="First name"
                      name="firstName"
                      placeholder="Ada"
                      required
                      autoComplete="given-name"
                    />
                    <Field
                      label="Last name"
                      name="lastName"
                      placeholder="Lovelace"
                      autoComplete="family-name"
                    />
                  </div>

                  <Field
                    label="Work email"
                    name="email"
                    type="email"
                    placeholder="ada@company.com"
                    required
                    autoComplete="email"
                  />

                  <Field
                    label="Phone number"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />

                  <Field
                    label="Company / organisation name"
                    name="companyName"
                    placeholder="Acme Pvt. Ltd."
                    autoComplete="organization"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <SelectField
                      label="Industry"
                      name="industry"
                      options={[
                        { value: "accounting_finance", label: "Accounting / Finance" },
                        { value: "retail_ecommerce",   label: "Retail / E-commerce"  },
                        { value: "manufacturing",      label: "Manufacturing"         },
                        { value: "services",           label: "Professional Services" },
                        { value: "healthcare",         label: "Healthcare"            },
                        { value: "technology",         label: "Technology"            },
                        { value: "construction",       label: "Construction"          },
                        { value: "education",          label: "Education"             },
                        { value: "ngo",                label: "NGO / Non-profit"      },
                        { value: "other",              label: "Other"                 },
                      ]}
                    />
                    <SelectField
                      label="Team size"
                      name="teamSize"
                      options={[
                        { value: "1",       label: "Just me"    },
                        { value: "2-10",    label: "2 – 10"     },
                        { value: "11-50",   label: "11 – 50"    },
                        { value: "51-200",  label: "51 – 200"   },
                        { value: "200+",    label: "200+"       },
                      ]}
                    />
                  </div>

                  <SelectField
                    label="Primary use case"
                    name="primaryUseCase"
                    options={[
                      { value: "accounting",    label: "Accounting & bookkeeping"        },
                      { value: "crm",           label: "CRM & sales pipeline"            },
                      { value: "projects",      label: "Projects & team collaboration"   },
                      { value: "invoicing",     label: "Invoicing & payments"            },
                      { value: "all",           label: "All of the above"                },
                    ]}
                  />

                  <SelectField
                    label="How did you hear about us?"
                    name="referralSource"
                    options={[
                      { value: "google",        label: "Google / search"       },
                      { value: "social",        label: "Social media"          },
                      { value: "friend",        label: "Friend / colleague"    },
                      { value: "ads",           label: "Online ad"             },
                      { value: "newsletter",    label: "Newsletter / blog"     },
                      { value: "other",         label: "Other"                 },
                    ]}
                  />

                  <Field
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
                    minLength={8}
                  />
                </>
              )}

              {/* Login fields */}
              {!isSignup && (
                <>
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-[#37322F]">
                      Password
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="current-password"
                        placeholder="Your password"
                        className="h-11 rounded-md border border-[rgba(55,50,47,0.16)] bg-white px-3 text-[#37322F] placeholder:text-[#B0AAA6] outline-none transition-colors focus:border-[#37322F] focus:ring-1 focus:ring-[#37322F]"
                      />
                    </label>
                    <div className="text-right">
                      <Link
                        href="/forgot-password"
                        className="text-xs text-[#605A57] hover:text-[#37322F] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <p className="rounded-md bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !!oauthLoading}
                className="h-11 rounded-full bg-[#37322F] px-6 text-sm font-medium text-white hover:bg-[#2a2623] transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? "Please wait…"
                  : isSignup
                  ? "Create account"
                  : "Log in"}
              </button>

              {isSignup && (
                <p className="text-xs text-[#B0AAA6] leading-5">
                  By creating an account you agree to our{" "}
                  <Link href="/terms" className="text-[#605A57] underline underline-offset-2">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" className="text-[#605A57] underline underline-offset-2">Privacy Policy</Link>.
                </p>
              )}
            </form>

            <p className="text-sm text-[#605A57]">
              {isSignup ? "Already have an account?" : "New to Edith?"}{" "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-medium text-[#37322F] underline underline-offset-2"
              >
                {isSignup ? "Log in" : "Create an account"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
