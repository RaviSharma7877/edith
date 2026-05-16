import { DetailPage } from "@/components/detail-page"

export default function TaxPage() {
  return (
    <DetailPage
      eyebrow="Tax and compliance"
      title="Versioned tax rules and return preparation."
      description="Tax workflows need effective dates, localization packs, return preparation, reconciliation, and filed-period controls."
      parentHref="/accounting"
      parentLabel="Accounting"
      blocks={[
        { title: "Tax setup", description: "Configure registrations and rates before transactions calculate tax.", items: ["Jurisdiction", "Tax registrations", "Tax codes", "Tax rates", "Effective dates", "Invoice behavior"] },
        { title: "India-first depth", description: "If India is the target market, GST workflows become a core product path.", items: ["GST reports", "GST reconciliation", "GSTR prep", "E-invoice", "E-way bill", "ITC matching"] },
        { title: "Filing controls", description: "Filed periods need clear lock, amendment, and audit behavior.", items: ["Return status", "Due dates", "Working papers", "Filing export", "Filed lock", "Amendment flow"] },
      ]}
    />
  )
}
