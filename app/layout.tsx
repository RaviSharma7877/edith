import type React from "react"
import type { Metadata } from "next"
import { Inter, Instrument_Serif, Geist } from "next/font/google"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SessionProvider } from "@/components/session-provider"
import { cn } from "@/lib/utils"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: ["400"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Edith - Accounting-first BusinessOS",
  description:
    "Run accounting, clients, invoices, payments, reconciliation, reports, documents, workflows, and AI assistance from one audit-safe workspace.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        inter.variable,
        instrumentSerif.variable,
        geist.variable,
        "font-sans"
      )}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Analytics />
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
