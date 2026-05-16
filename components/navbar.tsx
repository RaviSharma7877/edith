"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

export function Navbar() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated" && session?.user

  return (
    <div className="h-6 sm:h-7 md:h-8 flex justify-start items-start gap-2 sm:gap-3">
      {isAuthenticated ? (
        <Link
          href="/dashboard"
          className="px-2 sm:px-3 md:px-[14px] py-1 sm:py-[6px] bg-white shadow-[0px_1px_2px_rgba(55,50,47,0.12)] overflow-hidden rounded-full flex justify-center items-center"
        >
          <span className="flex flex-col justify-center text-[#37322F] text-xs md:text-[13px] font-medium leading-5 font-sans">
            Dashboard
          </span>
        </Link>
      ) : (
        <Link
          href="/login"
          className="px-2 sm:px-3 md:px-[14px] py-1 sm:py-[6px] bg-white shadow-[0px_1px_2px_rgba(55,50,47,0.12)] overflow-hidden rounded-full flex justify-center items-center"
        >
          <span className="flex flex-col justify-center text-[#37322F] text-xs md:text-[13px] font-medium leading-5 font-sans">
            Log in
          </span>
        </Link>
      )}
    </div>
  )
}