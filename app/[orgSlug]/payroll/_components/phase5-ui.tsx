import Link from "next/link"
import type { ReactNode } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { AssetStatus, AttendanceStatus, DepreciationMethod, EmploymentStatus, PayrollRunStatus, POSSessionStatus, TenderType } from "@prisma/client"

type Option = { id: string; name: string }

export function Phase5Shell({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-svh w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F5F3]">
      <header className="flex items-center justify-between border-b border-[rgba(55,50,47,0.12)] bg-white px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="-ml-2 text-[#605A57]" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-[#37322F]">{title}</h1>
            {description ? <p className="text-xs text-[#605A57]">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-[rgba(55,50,47,0.12)] bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#605A57]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#37322F]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#605A57]">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-[rgba(55,50,47,0.18)] bg-white px-4 py-10 text-center text-sm text-[#605A57]">{children}</div>
}

function Field({ label, name, defaultValue, required, type = "text", step }: { label: string; name: string; defaultValue?: string | number | null; required?: boolean; type?: string; step?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <input name={name} type={type} step={step} required={required} defaultValue={defaultValue ?? ""} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40" />
    </label>
  )
}

function Select({ label, name, options, defaultValue, required, emptyLabel = "None" }: { label: string; name: string; options: Option[]; defaultValue?: string | null; required?: boolean; emptyLabel?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <select name={name} required={required} defaultValue={defaultValue ?? ""} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40">
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  )
}

function EnumSelect<T extends string>({ label, name, values, defaultValue }: { label: string; name: string; values: readonly T[]; defaultValue?: T }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-medium text-[#37322F]">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm">
        {values.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  )
}

function ActiveCheckbox({ name = "isActive", label = "Active", defaultChecked = true }: { name?: string; label?: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm text-[#37322F]"><input name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 rounded border-[rgba(55,50,47,0.18)]" />{label}</label>
}

function FormActions({ orgSlug, backPath, submitLabel }: { orgSlug: string; backPath: string; submitLabel: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">{submitLabel}</button>
      <Link href={`/${orgSlug}/${backPath}`} className="inline-flex h-9 items-center rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-4 text-sm text-[#37322F]">Cancel</Link>
    </div>
  )
}

const dateValue = (date: Date | string | null | undefined) => date ? new Date(date).toISOString().slice(0, 10) : ""
const dtValue = (date: Date | string | null | undefined) => date ? new Date(date).toISOString().slice(0, 16) : ""

interface EmployeeFormData {
  employeeCode?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  department?: string | null
  designation?: string | null
  joiningDate?: Date | string | null
  exitDate?: Date | string | null
  status?: EmploymentStatus | null
  pan?: string | null
  uan?: string | null
  esiNumber?: string | null
  monthlyCtc?: number | string | null
  isActive?: boolean
}

interface PayrollRunFormData {
  runNumber?: string | null
  period?: string | null
  paymentDate?: Date | string | null
  status?: PayrollRunStatus | null
  grossPay?: number | string | null
  deductions?: number | string | null
  employerCost?: number | string | null
  netPay?: number | string | null
  notes?: string | null
}

interface FixedAssetFormData {
  assetCode?: string | null
  name?: string | null
  category?: string | null
  location?: string | null
  purchaseDate?: Date | string | null
  putToUseDate?: Date | string | null
  purchaseCost?: number | string | null
  salvageValue?: number | string | null
  usefulLifeMonths?: number | null
  depreciationMethod?: DepreciationMethod | null
  accumulatedDepreciation?: number | string | null
  status?: AssetStatus | null
  notes?: string | null
}

interface POSTillFormData {
  name?: string | null
  location?: string | null
  isActive?: boolean
}

interface POSSessionFormData {
  tillId?: string | null
  sessionNumber?: string | null
  openedAt?: Date | string | null
  closedAt?: Date | string | null
  openingCash?: number | string | null
  expectedCash?: number | string | null
  closingCash?: number | string | null
  status?: POSSessionStatus | null
  notes?: string | null
}

interface AttendanceRecordFormData {
  employeeId?: string | null
  date?: Date | string | null
  status?: AttendanceStatus | null
  hoursWorked?: number | string | null
  notes?: string | null
}

interface POSTransactionFormData {
  sessionId?: string | null
  transactionNumber?: string | null
  transactionAt?: Date | string | null
  customerId?: string | null
  tenderType?: TenderType | null
  subtotal?: number | string | null
  taxAmount?: number | string | null
  discountAmount?: number | string | null
  totalAmount?: number | string | null
  paidAmount?: number | string | null
  changeDue?: number | string | null
  notes?: string | null
  isVoided?: boolean
}

export function EmployeeForm({ orgSlug, action, employee }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; employee?: EmployeeFormData }) {
  const statuses: EmploymentStatus[] = ["ACTIVE", "ON_LEAVE", "EXITED"]
  return (
    <form action={action} className="max-w-5xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Employee code" name="employeeCode" defaultValue={employee?.employeeCode} required />
        <Field label="First name" name="firstName" defaultValue={employee?.firstName} required />
        <Field label="Last name" name="lastName" defaultValue={employee?.lastName} />
        <Field label="Email" name="email" type="email" defaultValue={employee?.email} />
        <Field label="Phone" name="phone" defaultValue={employee?.phone} />
        <Field label="Department" name="department" defaultValue={employee?.department} />
        <Field label="Designation" name="designation" defaultValue={employee?.designation} />
        <Field label="Joining date" name="joiningDate" type="date" defaultValue={dateValue(employee?.joiningDate) || new Date().toISOString().slice(0, 10)} required />
        <Field label="Exit date" name="exitDate" type="date" defaultValue={dateValue(employee?.exitDate)} />
        <EnumSelect label="Status" name="status" values={statuses} defaultValue={employee?.status ?? "ACTIVE"} />
        <Field label="PAN" name="pan" defaultValue={employee?.pan} />
        <Field label="UAN" name="uan" defaultValue={employee?.uan} />
        <Field label="ESI number" name="esiNumber" defaultValue={employee?.esiNumber} />
        <Field label="Monthly CTC" name="monthlyCtc" type="number" step="0.0001" defaultValue={employee?.monthlyCtc ? String(employee.monthlyCtc) : ""} required />
      </div>
      <ActiveCheckbox defaultChecked={employee?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="payroll/employees" submitLabel={employee ? "Save employee" : "Create employee"} />
    </form>
  )
}

export function PayrollRunForm({ orgSlug, action, run }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; run?: PayrollRunFormData }) {
  const statuses: PayrollRunStatus[] = ["DRAFT", "PROCESSED", "PAID", "CANCELLED"]
  return (
    <form action={action} className="max-w-4xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Run number" name="runNumber" defaultValue={run?.runNumber} required />
        <Field label="Period" name="period" defaultValue={run?.period ?? new Date().toISOString().slice(0, 7)} required />
        <Field label="Payment date" name="paymentDate" type="date" defaultValue={dateValue(run?.paymentDate)} />
        <EnumSelect label="Status" name="status" values={statuses} defaultValue={run?.status ?? "DRAFT"} />
        <Field label="Gross pay" name="grossPay" type="number" step="0.0001" defaultValue={run?.grossPay ? String(run.grossPay) : "0"} />
        <Field label="Deductions" name="deductions" type="number" step="0.0001" defaultValue={run?.deductions ? String(run.deductions) : "0"} />
        <Field label="Employer cost" name="employerCost" type="number" step="0.0001" defaultValue={run?.employerCost ? String(run.employerCost) : "0"} />
        <Field label="Net pay" name="netPay" type="number" step="0.0001" defaultValue={run?.netPay ? String(run.netPay) : "0"} />
        <Field label="Notes" name="notes" defaultValue={run?.notes} />
      </div>
      <FormActions orgSlug={orgSlug} backPath="payroll/runs" submitLabel={run ? "Save run" : "Create run"} />
    </form>
  )
}

export function FixedAssetForm({ orgSlug, action, asset }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; asset?: FixedAssetFormData }) {
  const statuses: AssetStatus[] = ["ACTIVE", "FULLY_DEPRECIATED", "DISPOSED"]
  const methods: DepreciationMethod[] = ["STRAIGHT_LINE", "WDV"]
  return (
    <form action={action} className="max-w-5xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Asset code" name="assetCode" defaultValue={asset?.assetCode} required />
        <Field label="Name" name="name" defaultValue={asset?.name} required />
        <Field label="Category" name="category" defaultValue={asset?.category} />
        <Field label="Location" name="location" defaultValue={asset?.location} />
        <Field label="Purchase date" name="purchaseDate" type="date" defaultValue={dateValue(asset?.purchaseDate) || new Date().toISOString().slice(0, 10)} required />
        <Field label="Put to use date" name="putToUseDate" type="date" defaultValue={dateValue(asset?.putToUseDate)} />
        <Field label="Purchase cost" name="purchaseCost" type="number" step="0.0001" defaultValue={asset?.purchaseCost ? String(asset.purchaseCost) : ""} required />
        <Field label="Salvage value" name="salvageValue" type="number" step="0.0001" defaultValue={asset?.salvageValue ? String(asset.salvageValue) : "0"} />
        <Field label="Useful life months" name="usefulLifeMonths" type="number" defaultValue={asset?.usefulLifeMonths ?? 60} required />
        <EnumSelect label="Depreciation method" name="depreciationMethod" values={methods} defaultValue={asset?.depreciationMethod ?? "STRAIGHT_LINE"} />
        <Field label="Accumulated depreciation" name="accumulatedDepreciation" type="number" step="0.0001" defaultValue={asset?.accumulatedDepreciation ? String(asset.accumulatedDepreciation) : "0"} />
        <EnumSelect label="Status" name="status" values={statuses} defaultValue={asset?.status ?? "ACTIVE"} />
        <Field label="Notes" name="notes" defaultValue={asset?.notes} />
      </div>
      <FormActions orgSlug={orgSlug} backPath="fixed-assets" submitLabel={asset ? "Save asset" : "Create asset"} />
    </form>
  )
}

export function POSTillForm({ orgSlug, action, till }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; till?: POSTillFormData }) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Till name" name="name" defaultValue={till?.name} required />
        <Field label="Location" name="location" defaultValue={till?.location} />
      </div>
      <ActiveCheckbox defaultChecked={till?.isActive ?? true} />
      <FormActions orgSlug={orgSlug} backPath="pos" submitLabel={till ? "Save till" : "Create till"} />
    </form>
  )
}

export function POSSessionForm({ orgSlug, action, tills, session }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; tills: Option[]; session?: POSSessionFormData }) {
  const statuses: POSSessionStatus[] = ["OPEN", "CLOSED", "CANCELLED"]
  return (
    <form action={action} className="max-w-4xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Till" name="tillId" options={tills} defaultValue={session?.tillId} required emptyLabel="Select till" />
        <Field label="Session number" name="sessionNumber" defaultValue={session?.sessionNumber} required />
        <Field label="Opened at" name="openedAt" type="datetime-local" defaultValue={dtValue(session?.openedAt) || new Date().toISOString().slice(0, 16)} />
        <Field label="Closed at" name="closedAt" type="datetime-local" defaultValue={dtValue(session?.closedAt)} />
        <Field label="Opening cash" name="openingCash" type="number" step="0.0001" defaultValue={session?.openingCash ? String(session.openingCash) : "0"} />
        <Field label="Expected cash" name="expectedCash" type="number" step="0.0001" defaultValue={session?.expectedCash ? String(session.expectedCash) : ""} />
        <Field label="Closing cash" name="closingCash" type="number" step="0.0001" defaultValue={session?.closingCash ? String(session.closingCash) : ""} />
        <EnumSelect label="Status" name="status" values={statuses} defaultValue={session?.status ?? "OPEN"} />
        <Field label="Notes" name="notes" defaultValue={session?.notes} />
      </div>
      <FormActions orgSlug={orgSlug} backPath="pos" submitLabel={session ? "Save session" : "Open session"} />
    </form>
  )
}

export function AttendanceForm({ orgSlug, action, employees, record }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; employees: Option[]; record?: AttendanceRecordFormData }) {
  const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"]
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Employee" name="employeeId" options={employees} defaultValue={record?.employeeId} required emptyLabel="Select employee" />
        <Field label="Date" name="date" type="date" defaultValue={dateValue(record?.date) || new Date().toISOString().slice(0, 10)} required />
        <EnumSelect label="Status" name="status" values={statuses} defaultValue={record?.status ?? "PRESENT"} />
        <Field label="Hours worked" name="hoursWorked" type="number" step="0.5" defaultValue={record?.hoursWorked ? String(record.hoursWorked) : ""} />
        <Field label="Notes" name="notes" defaultValue={record?.notes} />
      </div>
      <FormActions orgSlug={orgSlug} backPath="payroll/attendance" submitLabel={record ? "Save record" : "Mark attendance"} />
    </form>
  )
}

export function PayslipLineForm({ orgSlug, action, employees, runId }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; employees: Option[]; runId: string }) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Employee" name="employeeId" options={employees} required emptyLabel="Select employee" />
        <Field label="Component" name="component" required defaultValue="" />
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-[#37322F]">Type</span>
          <select name="type" defaultValue="earning" className="h-9 w-full rounded-md border border-[rgba(55,50,47,0.14)] bg-white px-3 text-sm text-[#37322F] outline-none focus:border-[#37322F]/40">
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
        </label>
        <Field label="Amount (₹)" name="amount" type="number" step="0.01" required defaultValue="" />
        <label className="flex items-center gap-2 text-sm text-[#37322F] pt-6">
          <input name="taxable" type="checkbox" defaultChecked className="size-4 rounded border-[rgba(55,50,47,0.18)]" />
          Taxable
        </label>
      </div>
      <FormActions orgSlug={orgSlug} backPath={`payroll/payslips/${runId}`} submitLabel="Add line" />
    </form>
  )
}

export function PFEntryForm({ orgSlug, action, employees, runId }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; employees: Option[]; runId: string }) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Employee" name="employeeId" options={employees} required emptyLabel="Select employee" />
        <Field label="Wage base (₹)" name="wageBase" type="number" step="0.01" required defaultValue="" />
        <Field label="Employee PF (₹)" name="employeePfAmount" type="number" step="0.01" required defaultValue="" />
        <Field label="Employer PF (₹)" name="employerPfAmount" type="number" step="0.01" required defaultValue="" />
      </div>
      <FormActions orgSlug={orgSlug} backPath={`payroll/statutory/pf/${runId}`} submitLabel="Add PF entry" />
    </form>
  )
}

export function ESIEntryForm({ orgSlug, action, employees, runId }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; employees: Option[]; runId: string }) {
  return (
    <form action={action} className="max-w-3xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Employee" name="employeeId" options={employees} required emptyLabel="Select employee" />
        <Field label="Wage base (₹)" name="wageBase" type="number" step="0.01" required defaultValue="" />
        <Field label="Employee ESI (₹)" name="employeeEsiAmount" type="number" step="0.01" required defaultValue="" />
        <Field label="Employer ESI (₹)" name="employerEsiAmount" type="number" step="0.01" required defaultValue="" />
      </div>
      <FormActions orgSlug={orgSlug} backPath={`payroll/statutory/esi/${runId}`} submitLabel="Add ESI entry" />
    </form>
  )
}

export function POSTransactionForm({ orgSlug, action, sessions, customers, transaction }: { orgSlug: string; action: (formData: FormData) => void | Promise<void>; sessions: Option[]; customers: Option[]; transaction?: POSTransactionFormData }) {
  const tenders: TenderType[] = ["CASH", "UPI", "CARD", "MIXED"]
  return (
    <form action={action} className="max-w-5xl space-y-5 rounded-lg border border-[rgba(55,50,47,0.10)] bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Session" name="sessionId" options={sessions} defaultValue={transaction?.sessionId} required emptyLabel="Select session" />
        <Field label="Transaction number" name="transactionNumber" defaultValue={transaction?.transactionNumber} required />
        <Field label="Transaction at" name="transactionAt" type="datetime-local" defaultValue={dtValue(transaction?.transactionAt) || new Date().toISOString().slice(0, 16)} />
        <Select label="Customer" name="customerId" options={customers} defaultValue={transaction?.customerId} />
        <EnumSelect label="Tender" name="tenderType" values={tenders} defaultValue={transaction?.tenderType ?? "CASH"} />
        <Field label="Subtotal" name="subtotal" type="number" step="0.0001" defaultValue={transaction?.subtotal ? String(transaction.subtotal) : "0"} />
        <Field label="Tax" name="taxAmount" type="number" step="0.0001" defaultValue={transaction?.taxAmount ? String(transaction.taxAmount) : "0"} />
        <Field label="Discount" name="discountAmount" type="number" step="0.0001" defaultValue={transaction?.discountAmount ? String(transaction.discountAmount) : "0"} />
        <Field label="Total" name="totalAmount" type="number" step="0.0001" defaultValue={transaction?.totalAmount ? String(transaction.totalAmount) : ""} required />
        <Field label="Paid" name="paidAmount" type="number" step="0.0001" defaultValue={transaction?.paidAmount ? String(transaction.paidAmount) : ""} required />
        <Field label="Change due" name="changeDue" type="number" step="0.0001" defaultValue={transaction?.changeDue ? String(transaction.changeDue) : "0"} />
        <Field label="Notes" name="notes" defaultValue={transaction?.notes} />
      </div>
      {transaction ? <ActiveCheckbox name="isVoided" label="Voided" defaultChecked={transaction.isVoided} /> : null}
      <FormActions orgSlug={orgSlug} backPath="pos" submitLabel={transaction ? "Save transaction" : "Create sale"} />
    </form>
  )
}
