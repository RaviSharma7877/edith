import Link from "next/link"

type MarketingPageProps = {
  badge: string
  title: string
  description: string
  sections: Array<{
    title: string
    description: string
    items: string[]
    href?: string
  }>
  deepDive?: Array<{
    title: string
    description: string
    points: string[]
  }>
}

export function MarketingPage({ badge, title, description, sections, deepDive = [] }: MarketingPageProps) {
  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1060px] flex-col border-x border-[rgba(55,50,47,0.12)]">
        <header className="flex h-20 items-center justify-between border-b border-[rgba(55,50,47,0.12)] px-6">
          <Link href="/" className="text-xl font-semibold">
            Edith
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-[rgba(49,45,43,0.80)] md:flex">
            <Link href="/product">Product</Link>
            <Link href="/accounting">Accounting</Link>
            <Link href="/businessos">BusinessOS</Link>
            <Link href="/integrations">Integrations</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/docs">Docs</Link>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-[0px_1px_2px_rgba(55,50,47,0.12)]"
          >
            Log in
          </Link>
        </header>

        <section className="flex flex-col items-center gap-5 border-b border-[rgba(55,50,47,0.12)] px-6 py-20 text-center">
          <div className="rounded-full border border-[rgba(2,6,23,0.08)] bg-white px-[14px] py-[6px] text-xs font-medium shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)]">
            {badge}
          </div>
          <h1 className="max-w-[760px] font-serif text-5xl leading-tight md:text-[72px]">{title}</h1>
          <p className="max-w-[620px] text-base font-medium leading-7 text-[rgba(55,50,47,0.80)] md:text-lg">
            {description}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-[#37322F] px-8 py-3 text-sm font-medium text-white shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
            >
              Start free
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[rgba(55,50,47,0.16)] bg-white px-8 py-3 text-sm font-medium text-[#37322F]"
            >
              Book demo
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className={`flex flex-col gap-5 border-[rgba(55,50,47,0.12)] p-8 ${
                index % 2 === 0 ? "md:border-r" : ""
              } ${index < sections.length - 2 ? "border-b" : ""}`}
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-[#49423D]">{section.title}</h2>
                <p className="text-sm leading-6 text-[#605A57]">{section.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-md border border-[rgba(55,50,47,0.10)] bg-white px-3 py-2 text-sm font-medium text-[#49423D]"
                  >
                    {item}
                  </div>
                ))}
              </div>
              {section.href && (
                <Link href={section.href} className="mt-auto text-sm font-semibold text-[#37322F] underline underline-offset-4">
                  Explore {section.title.toLowerCase()}
                </Link>
              )}
            </article>
          ))}
        </section>

        {deepDive.length > 0 && (
          <section className="border-t border-[rgba(55,50,47,0.12)]">
            <div className="border-b border-[rgba(55,50,47,0.12)] px-6 py-12 text-center">
              <div className="mx-auto max-w-[620px] space-y-3">
                <div className="text-sm font-semibold text-[#605A57]">Deep product detail</div>
                <h2 className="text-3xl font-semibold tracking-tight text-[#49423D] md:text-5xl">
                  What this page covers in practice
                </h2>
              </div>
            </div>
            <div className="divide-y divide-[rgba(55,50,47,0.12)]">
              {deepDive.map((item) => (
                <article key={item.title} className="grid gap-6 px-6 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-8">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-[#49423D]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#605A57]">{item.description}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {item.points.map((point) => (
                      <div key={point} className="rounded-md border border-[rgba(55,50,47,0.10)] bg-white px-3 py-2 text-sm text-[#49423D]">
                        {point}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-[rgba(55,50,47,0.12)]">
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.2fr_2fr] md:px-8">
            <div className="space-y-3">
              <Link href="/" className="text-xl font-semibold text-[#49423D]">
                Edith
              </Link>
              <p className="max-w-[300px] text-sm leading-6 text-[#605A57]">
                Accounting-first BusinessOS for teams that need financial control and operational context in one workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-4">
              <div className="space-y-2">
                <div className="font-semibold text-[rgba(73,66,61,0.55)]">Product</div>
                <Link href="/product" className="block text-[#49423D]">Overview</Link>
                <Link href="/accounting" className="block text-[#49423D]">Accounting</Link>
                <Link href="/businessos" className="block text-[#49423D]">BusinessOS</Link>
                <Link href="/integrations" className="block text-[#49423D]">Integrations</Link>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-[rgba(73,66,61,0.55)]">Accounting</div>
                <Link href="/accounts" className="block text-[#49423D]">Chart of Accounts</Link>
                <Link href="/journals" className="block text-[#49423D]">Journals</Link>
                <Link href="/accounting/reconciliation" className="block text-[#49423D]">Reconciliation</Link>
                <Link href="/accounting/reports" className="block text-[#49423D]">Reports</Link>
                <Link href="/accounting/tax" className="block text-[#49423D]">Tax</Link>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-[rgba(73,66,61,0.55)]">Company</div>
                <Link href="/pricing" className="block text-[#49423D]">Pricing</Link>
                <Link href="/security" className="block text-[#49423D]">Security</Link>
                <Link href="/contact" className="block text-[#49423D]">Contact</Link>
                <Link href="/docs" className="block text-[#49423D]">Docs</Link>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-[rgba(73,66,61,0.55)]">Account</div>
                <Link href="/login" className="block text-[#49423D]">Login</Link>
                <Link href="/signup" className="block text-[#49423D]">Start free</Link>
                <Link href="/workspace" className="block text-[#49423D]">Workspace</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
