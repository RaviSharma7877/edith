import Link from "next/link"
import type { StockVoucherType, ValuationMethod } from "@prisma/client"

type Option = { id: string; name: string }

const valuationMethods: ValuationMethod[] = ["FIFO", "WAC", "LIFO", "STANDARD", "BATCH"]
const stockVoucherTypes: StockVoucherType[] = [
  "RECEIPT",
  "DELIVERY",
  "TRANSFER",
  "ADJUSTMENT",
  "WRITE_OFF",
  "OPENING",
  "DELIVERY_NOTE",
  "GOODS_RECEIPT_NOTE",
  "SALES_ORDER",
  "PURCHASE_ORDER",
  "REJECTION_IN",
  "REJECTION_OUT",
  "PHYSICAL_VERIFY",
]

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
}: {
  label: string
  name: string
  defaultValue?: string | number | null
  required?: boolean
  type?: string
  step?: string
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40"
      />
    </label>
  )
}

function Select({
  label,
  name,
  options,
  defaultValue,
  required,
  emptyLabel = "None",
}: {
  label: string
  name: string
  options: Option[]
  defaultValue?: string | null
  required?: boolean
  emptyLabel?: string
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  )
}

function ActiveCheckbox({ defaultChecked = true }: { defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#37322F]">
      <input name="isActive" type="checkbox" defaultChecked={defaultChecked} className="size-4 rounded border-[rgba(55,50,47,0.18)]" />
      Active
    </label>
  )
}

function FormActions({ orgSlug, backPath, submitLabel }: { orgSlug: string; backPath: string; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
        {submitLabel}
      </button>
      <Link href={`/${orgSlug}/inventory/${backPath}`} className="inline-flex h-9 items-center rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-4 text-sm text-[#37322F]">
        Cancel
      </Link>
    </div>
  )
}

export function StockGroupForm({
  orgSlug,
  action,
  groups,
  group,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  groups: Option[]
  group?: { name: string; parentId: string | null; valuationMethod: ValuationMethod; isActive: boolean }
}) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group name" name="name" defaultValue={group?.name} required />
        <Select label="Parent group" name="parentId" options={groups} defaultValue={group?.parentId} />
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-[#37322F]">Default valuation</span>
          <select name="valuationMethod" defaultValue={group?.valuationMethod ?? "FIFO"} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
            {valuationMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
      </div>
      <ActiveCheckbox defaultChecked={group?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="stock-groups" submitLabel={group ? "Save group" : "Create group"} />
    </form>
  )
}

export function StockUnitForm({
  orgSlug,
  action,
  unit,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  unit?: { name: string; symbol: string; decimalPlaces: number; isActive: boolean }
}) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Unit name" name="name" defaultValue={unit?.name} required />
        <Field label="Symbol" name="symbol" defaultValue={unit?.symbol} required />
        <Field label="Decimal places" name="decimalPlaces" type="number" defaultValue={unit?.decimalPlaces ?? 2} required />
      </div>
      <ActiveCheckbox defaultChecked={unit?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="stock-units" submitLabel={unit ? "Save unit" : "Create unit"} />
    </form>
  )
}

export function StockCategoryForm({
  orgSlug,
  action,
  category,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  category?: { name: string; isActive: boolean }
}) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <Field label="Category name" name="name" defaultValue={category?.name} required />
      <ActiveCheckbox defaultChecked={category?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="stock-categories" submitLabel={category ? "Save category" : "Create category"} />
    </form>
  )
}

export function GodownForm({
  orgSlug,
  action,
  godowns,
  godown,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  godowns: Option[]
  godown?: { code: string | null; name: string; parentId: string | null; address: string | null; isActive: boolean }
}) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" defaultValue={godown?.code} />
        <Field label="Name" name="name" defaultValue={godown?.name} required />
        <Select label="Parent godown" name="parentId" options={godowns} defaultValue={godown?.parentId} />
        <Field label="Address" name="address" defaultValue={godown?.address} />
      </div>
      <ActiveCheckbox defaultChecked={godown?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="godowns" submitLabel={godown ? "Save godown" : "Create godown"} />
    </form>
  )
}

export function StockItemForm({
  orgSlug,
  action,
  item,
  groups,
  categories,
  units,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  item?: {
    code: string | null
    name: string
    groupId: string
    categoryId: string | null
    primaryUnitId: string
    alternateUnitId: string | null
    conversionFactor: unknown
    hsnCode: string | null
    barcode: string | null
    qrCode: string | null
    valuationMethod: ValuationMethod | null
    standardCost: unknown
    reorderLevel: unknown
    isActive: boolean
  }
  groups: Option[]
  categories: Option[]
  units: Option[]
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">General</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Item name" name="name" defaultValue={item?.name} required />
          <Field label="Code / SKU" name="code" defaultValue={item?.code} />
          <Field label="Barcode" name="barcode" defaultValue={item?.barcode} />
          <Select label="Group" name="groupId" options={groups} defaultValue={item?.groupId} required emptyLabel="Select group" />
          <Select label="Category" name="categoryId" options={categories} defaultValue={item?.categoryId} />
          <Field label="HSN code" name="hsnCode" defaultValue={item?.hsnCode} />
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">Units and valuation</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Primary unit" name="primaryUnitId" options={units} defaultValue={item?.primaryUnitId} required emptyLabel="Select unit" />
          <Select label="Alternate unit" name="alternateUnitId" options={units} defaultValue={item?.alternateUnitId} />
          <Field label="Conversion factor" name="conversionFactor" type="number" step="0.000001" defaultValue={item?.conversionFactor ? String(item.conversionFactor) : ""} />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-[#37322F]">Valuation override</span>
            <select name="valuationMethod" defaultValue={item?.valuationMethod ?? ""} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
              <option value="">Use group default</option>
              {valuationMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <Field label="Standard cost" name="standardCost" type="number" step="0.0001" defaultValue={item?.standardCost ? String(item.standardCost) : ""} />
          <Field label="Reorder level" name="reorderLevel" type="number" step="0.0001" defaultValue={item?.reorderLevel ? String(item.reorderLevel) : ""} />
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="QR code payload" name="qrCode" defaultValue={item?.qrCode} />
        </div>
        <div className="mt-4">
          <ActiveCheckbox defaultChecked={item?.isActive ?? true} />
        </div>
      </div>

      <FormActions orgSlug={orgSlug} backPath="stock-items" submitLabel={item ? "Save stock item" : "Create stock item"} />
    </form>
  )
}

export function BatchForm({
  orgSlug,
  action,
  items,
  batch,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  items: Option[]
  batch?: {
    stockItemId: string
    batchNumber: string
    mfgDate: Date | null
    expiryDate: Date | null
    costPrice: unknown
    currentQty: unknown
    isActive: boolean
  }
}) {
  const dateValue = (date: Date | null | undefined) => date ? date.toISOString().slice(0, 10) : ""
  return (
    <form action={action} className="max-w-4xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Stock item" name="stockItemId" options={items} defaultValue={batch?.stockItemId} required emptyLabel="Select item" />
        <Field label="Batch number" name="batchNumber" defaultValue={batch?.batchNumber} required />
        <Field label="Current quantity" name="currentQty" type="number" step="0.0001" defaultValue={batch?.currentQty ? String(batch.currentQty) : "0"} />
        <Field label="Cost price" name="costPrice" type="number" step="0.0001" defaultValue={batch?.costPrice ? String(batch.costPrice) : ""} required />
        <Field label="Manufacturing date" name="mfgDate" type="date" defaultValue={dateValue(batch?.mfgDate)} />
        <Field label="Expiry date" name="expiryDate" type="date" defaultValue={dateValue(batch?.expiryDate)} />
      </div>
      <ActiveCheckbox defaultChecked={batch?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="batches" submitLabel={batch ? "Save batch" : "Create batch"} />
    </form>
  )
}

export function PriceListForm({
  orgSlug,
  action,
  priceList,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  priceList?: {
    name: string
    currency: string
    effectiveFrom: Date
    effectiveTo: Date | null
    isActive: boolean
  }
}) {
  const dateValue = (date: Date | null | undefined) => date ? date.toISOString().slice(0, 10) : ""
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price list name" name="name" defaultValue={priceList?.name} required />
        <Field label="Currency" name="currency" defaultValue={priceList?.currency ?? "INR"} required />
        <Field label="Effective from" name="effectiveFrom" type="date" defaultValue={dateValue(priceList?.effectiveFrom) || new Date().toISOString().slice(0, 10)} required />
        <Field label="Effective to" name="effectiveTo" type="date" defaultValue={dateValue(priceList?.effectiveTo)} />
      </div>
      <ActiveCheckbox defaultChecked={priceList?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="price-lists" submitLabel={priceList ? "Save price list" : "Create price list"} />
    </form>
  )
}

export function StockVoucherForm({
  orgSlug,
  action,
  items,
  godowns,
  batches,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  items: Option[]
  godowns: Option[]
  batches: Option[]
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">Voucher header</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Voucher number" name="voucherNumber" required />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-[#37322F]">Type</span>
            <select name="voucherType" required defaultValue="OPENING" className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
              {stockVoucherTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <Field label="Date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          <Field label="Narration" name="narration" />
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">First line</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Stock item" name="stockItemId" options={items} required emptyLabel="Select item" />
          <Select label="Godown" name="godownId" options={godowns} required emptyLabel="Select godown" />
          <Select label="Batch" name="batchId" options={batches} />
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-[#37322F]">Direction</span>
            <select name="direction" required defaultValue="IN" className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </label>
          <Field label="Actual quantity" name="actualQty" type="number" step="0.0001" required />
          <Field label="Billed quantity" name="billedQty" type="number" step="0.0001" />
          <Field label="Rate" name="rate" type="number" step="0.0001" defaultValue="0" />
          <Field label="Landed cost" name="landedCost" type="number" step="0.0001" defaultValue="0" />
        </div>
      </div>

      <FormActions orgSlug={orgSlug} backPath="stock-vouchers" submitLabel="Create draft voucher" />
    </form>
  )
}

export function BomForm({
  orgSlug,
  action,
  items,
  units,
  bom,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  items: Option[]
  units: Option[]
  bom?: {
    name: string
    finishedItemId: string
    outputQty: unknown
    isActive: boolean
  }
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">Bill of Materials Details</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="BOM name" name="name" defaultValue={bom?.name} required />
          <Select label="Finished Item" name="finishedItemId" options={items} defaultValue={bom?.finishedItemId} required emptyLabel="Select finished item" />
          <Field label="Output quantity" name="outputQty" type="number" step="0.0001" defaultValue={bom?.outputQty ? String(bom.outputQty) : ""} required />
        </div>
      </div>

      {!bom && (
        <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
          <p className="mb-4 font-semibold text-[#37322F]">First Component</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Component Item" name="componentItemId" options={items} emptyLabel="Select component item" />
            <Field label="Quantity" name="componentQty" type="number" step="0.0001" />
            <Select label="Unit" name="componentUnitId" options={units} emptyLabel="Select unit" />
            <div className="pt-7">
              <label className="flex items-center gap-2 text-sm text-[#37322F]">
                <input name="componentIsScrap" type="checkbox" className="size-4 rounded border-[rgba(55,50,47,0.18)]" />
                Is Scrap
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <ActiveCheckbox defaultChecked={bom?.isActive ?? true} />
      </div>

      <FormActions orgSlug={orgSlug} backPath="bom" submitLabel={bom ? "Save BOM" : "Create BOM"} />
    </form>
  )
}

export function ManufacturingJournalForm({
  orgSlug,
  action,
  boms,
  godowns,
  items,
  batches,
}: {
  orgSlug: string
  action: (formData: FormData) => void | Promise<void>
  boms: Option[]
  godowns: Option[]
  items: Option[]
  batches: Option[]
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">Production Details</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Journal number" name="journalNumber" required />
          <Select label="Bill of Materials" name="bomId" options={boms} required emptyLabel="Select BOM" />
          <Field label="Date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          <Field label="Output quantity" name="outputQty" type="number" step="0.0001" required />
          <Select label="Output godown" name="outputGodownId" options={godowns} required emptyLabel="Select godown" />
          <Field label="Narration" name="narration" />
        </div>
      </div>

      <div className="rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
        <p className="mb-4 font-semibold text-[#37322F]">First Consumption Line</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Stock item" name="stockItemId" options={items} emptyLabel="Select item" />
          <Select label="Godown" name="godownId" options={godowns} emptyLabel="Select godown" />
          <Select label="Batch" name="batchId" options={batches} emptyLabel="Select batch" />
          <Field label="Quantity consumed" name="qty" type="number" step="0.0001" />
          <Field label="Rate" name="rate" type="number" step="0.0001" defaultValue="0" />
        </div>
      </div>

      <FormActions orgSlug={orgSlug} backPath="manufacturing" submitLabel="Create Production Journal" />
    </form>
  )
}
