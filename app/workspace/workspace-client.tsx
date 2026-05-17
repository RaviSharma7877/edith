"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { WelcomeScreen } from "@/components/welcome-screen"

interface WorkspaceClientProps {
  email?: string | null
  name?: string | null
}

export function WorkspaceClient({ email, name }: WorkspaceClientProps) {
  const { data: session, update } = useSession()
  const [showWelcome, setShowWelcome] = useState(false)
  const [mounted, setMounted] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true)
    // Show welcome screen if this is the user's first login
    if (session?.user?.showWelcomeScreen) {
      setShowWelcome(true)
    }
  }, [session?.user?.showWelcomeScreen])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleWelcomeDone = useCallback(async () => {
    setShowWelcome(false)
    // Mark welcome screen as seen so it doesn't show again
    await update({ showWelcomeScreen: false, isFirstLogin: false })
    // TODO: persist to DB — PATCH /api/user/onboarding { showWelcomeScreen: false }
  }, [update])

  const duration = Number(process.env.NEXT_PUBLIC_WELCOME_SCREEN_DURATION || "3000")

  return (
    <>
      {mounted && showWelcome && (
        <WelcomeScreen
          userName={name || email?.split("@")[0]}
          onComplete={handleWelcomeDone}
          duration={duration}
        />
      )}

      <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1060px] flex-col border-x border-[rgba(55,50,47,0.12)]">
          <header className="flex h-20 items-center justify-between border-b border-[rgba(55,50,47,0.12)] px-6">
            <Link href="/" className="text-xl font-semibold font-sans">
              Edith
            </Link>
            <Link
              href="/api/auth/signout"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm border border-[rgba(55,50,47,0.10)]"
            >
              Sign out
            </Link>
          </header>
          <section className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <div className="rounded-full border border-[rgba(2,6,23,0.08)] bg-white px-[14px] py-[6px] text-xs font-medium shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)]">
              Workspace
            </div>
            <h1 className="font-serif text-5xl leading-tight md:text-[72px]">
              {email ? "Your Edith workspace is ready." : "Sign in to open your workspace."}
            </h1>
            <p className="max-w-[600px] text-base leading-7 text-[#605A57]">
              {email
                ? `Signed in as ${email}. The accounting dashboard loads here.`
                : "Use the login page to create a session first."}
            </p>
            {!email && (
              <Link
                href="/login"
                className="rounded-full bg-[#37322F] px-8 py-3 text-sm font-medium text-white"
              >
                Log in
              </Link>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
