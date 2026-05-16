import Link from "next/link"

type DetailPageProps = {
  eyebrow: string
  title: string
  description: string
  parentHref: string
  parentLabel: string
  blocks: Array<{
    title: string
    description: string
    items: string[]
    href?: string
    hrefLabel?: string
  }>
}

export function DetailPage({ eyebrow, title, description, parentHref, parentLabel, blocks }: DetailPageProps) {
  return (
    <main className="min-h-screen bg-[#F7F5F3] text-[#37322F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1060px] flex-col border-x border-[rgba(55,50,47,0.12)]">
        <header className="flex h-20 items-center justify-between border-b border-[rgba(55,50,47,0.12)] px-6">
          <Link href="/" className="text-xl font-semibold">Edith</Link>
          <Link href={parentHref} className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-[0px_1px_2px_rgba(55,50,47,0.12)]">
            Back to {parentLabel}
          </Link>
        </header>
        <section className="border-b border-[rgba(55,50,47,0.12)] px-6 py-16">
          <div className="rounded-full border border-[rgba(2,6,23,0.08)] bg-white px-[14px] py-[6px] text-xs font-medium shadow-[0px_0px_0px_4px_rgba(55,50,47,0.05)] inline-flex">
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-[820px] font-serif text-5xl leading-tight md:text-[72px]">{title}</h1>
          <p className="mt-5 max-w-[680px] text-base font-medium leading-7 text-[rgba(55,50,47,0.80)] md:text-lg">{description}</p>
        </section>
        <section className="divide-y divide-[rgba(55,50,47,0.12)]">
          {blocks.map((block) => (
            <article key={block.title} className="grid gap-6 px-6 py-10 md:grid-cols-[0.85fr_1.15fr] md:px-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#49423D]">{block.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#605A57]">{block.description}</p>
                {block.href && (
                  <Link href={block.href} className="mt-3 inline-block text-sm font-semibold text-[#37322F] underline underline-offset-4">
                    {block.hrefLabel ?? `Explore ${block.title.toLowerCase()}`}
                  </Link>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {block.items.map((item) => (
                  <div key={item} className="rounded-md border border-[rgba(55,50,47,0.10)] bg-white px-3 py-2 text-sm text-[#49423D]">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
        <footer className="mt-auto border-t border-[rgba(55,50,47,0.12)] px-6 py-8 text-sm text-[#605A57]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>Edith connects accounting depth with operational context.</span>
            <div className="flex gap-4">
              <Link href="/security">Security</Link>
              <Link href="/docs">Docs</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
