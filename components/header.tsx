import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="w-full border-b border-[#37322f]/6 bg-[#f7f5f3]">
      <div className="max-w-[1060px] mx-auto px-4">
        <nav className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-[#37322f] font-semibold text-lg">Edith</Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/product" className="text-[#37322f] hover:text-[#37322f]/80 text-sm font-medium">Product</Link>
              <Link href="/accounting" className="text-[#37322f] hover:text-[#37322f]/80 text-sm font-medium">Accounting</Link>
              <Link href="/businessos" className="text-[#37322f] hover:text-[#37322f]/80 text-sm font-medium">BusinessOS</Link>
              <Link href="/integrations" className="text-[#37322f] hover:text-[#37322f]/80 text-sm font-medium">Integrations</Link>
            </div>
          </div>
          <Button asChild variant="ghost" className="text-[#37322f] hover:bg-[#37322f]/5">
            <Link href="/login">Log in</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}
