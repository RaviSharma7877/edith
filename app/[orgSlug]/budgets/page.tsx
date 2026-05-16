import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"

export default async function BudgetsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  
  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  return (
    <div className="flex flex-col h-full bg-[#f8f8f8] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1a1a1a]">Budgets</h1>
          <p className="text-sm text-[#605A57]">Manage and track budgets vs actuals</p>
        </div>
      </div>
      
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[rgba(55,50,47,0.14)] bg-white text-sm text-[#605A57]">
        Budgets module is under development.
      </div>
    </div>
  )
}
