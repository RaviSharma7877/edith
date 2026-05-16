"use client"

import { signOut } from "next-auth/react"

interface DashboardClientProps {
  email?: string | null
  name?: string | null
}

export function DashboardClient({ email, name }: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      <div className="mx-auto max-w-[1060px] px-4 py-12">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-serif">Dashboard</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2 rounded-full bg-white border border-[rgba(55,50,47,0.16)] text-sm font-medium hover:bg-[#F7F5F3] transition-colors"
          >
            Sign out
          </button>
        </div>
        
        <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-8">
          <h2 className="text-xl font-semibold mb-4">Welcome back</h2>
          <div className="space-y-2 text-[#605A57]">
            <p><span className="font-medium text-[#37322F]">Email:</span> {email}</p>
            <p><span className="font-medium text-[#37322F]">Name:</span> {name || "Not set"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}