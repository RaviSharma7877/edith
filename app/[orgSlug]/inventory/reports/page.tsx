import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { BarChart2, BookOpen, Warehouse, ScanBarcode, TrendingUp, Repeat, AlertTriangle } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { InventoryPageShell } from "../_components/inventory-page-shell"

const reports = [
  { title: "Stock Summary", icon: BarChart2, copy: "Opening, inward, outward, closing quantity and value by item." },
  { title: "Stock Ledger", icon: BookOpen, copy: "Date-wise movement with voucher, godown, batch and running balance." },
  { title: "Godown Summary", icon: Warehouse, copy: "Quantity and value by location for each stock item." },
  { title: "Batch / Expiry", icon: ScanBarcode, copy: "Batch balances with manufacturing and expiry warning windows." },
  { title: "Valuation", icon: TrendingUp, copy: "Current quantity, effective method, average rate and stock value." },
  { title: "Movement Analysis", icon: Repeat, copy: "Period-wise inward, outward and net movement trends." },
  { title: "Reorder", icon: AlertTriangle, copy: "Items below reorder level and suggested shortage quantities." },
]

export default async function InventoryReportsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const { orgSlug } = await params
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")

  return (
    <InventoryPageShell title="Inventory Reports" description="Stock summary, ledger, valuation and reorder views">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <div key={report.title} className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F7F5F3] text-[#37322F]">
                <report.icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-[#37322F]">{report.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#605A57]">{report.copy}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </InventoryPageShell>
  )
}

