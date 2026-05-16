"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import type { AssetStatus, DepreciationMethod, EmploymentStatus, PayrollRunStatus, POSSessionStatus, TenderType } from "@prisma/client"

async function context(orgSlug: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")
  const ctx = await resolveCompany(orgSlug, session.user.email)
  if (!ctx) redirect("/workspace")
  return ctx
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function decimal(formData: FormData, key: string, fallback?: string) {
  return text(formData, key) ?? fallback ?? null
}

function date(formData: FormData, key: string) {
  const value = text(formData, key)
  return value ? new Date(value) : null
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on"
}

export async function createEmployee(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const employeeCode = text(formData, "employeeCode")
  const firstName = text(formData, "firstName")
  const joiningDate = date(formData, "joiningDate")
  const monthlyCtc = decimal(formData, "monthlyCtc")
  if (!employeeCode || !firstName || !joiningDate || !monthlyCtc) throw new Error("Employee code, first name, joining date and monthly CTC are required.")

  await prisma.employee.create({
    data: {
      companyId: ctx.company.id,
      employeeCode,
      firstName,
      lastName: text(formData, "lastName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      department: text(formData, "department"),
      designation: text(formData, "designation"),
      joiningDate,
      exitDate: date(formData, "exitDate"),
      status: (text(formData, "status") ?? "ACTIVE") as EmploymentStatus,
      pan: text(formData, "pan"),
      uan: text(formData, "uan"),
      esiNumber: text(formData, "esiNumber"),
      monthlyCtc,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/payroll/employees`)
  redirect(`/${orgSlug}/payroll/employees`)
}

export async function updateEmployee(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const employeeCode = text(formData, "employeeCode")
  const firstName = text(formData, "firstName")
  const joiningDate = date(formData, "joiningDate")
  const monthlyCtc = decimal(formData, "monthlyCtc")
  if (!employeeCode || !firstName || !joiningDate || !monthlyCtc) throw new Error("Employee code, first name, joining date and monthly CTC are required.")

  await prisma.employee.update({
    where: { id, companyId: ctx.company.id },
    data: {
      employeeCode,
      firstName,
      lastName: text(formData, "lastName"),
      email: text(formData, "email"),
      phone: text(formData, "phone"),
      department: text(formData, "department"),
      designation: text(formData, "designation"),
      joiningDate,
      exitDate: date(formData, "exitDate"),
      status: (text(formData, "status") ?? "ACTIVE") as EmploymentStatus,
      pan: text(formData, "pan"),
      uan: text(formData, "uan"),
      esiNumber: text(formData, "esiNumber"),
      monthlyCtc,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/payroll/employees`)
  redirect(`/${orgSlug}/payroll/employees`)
}

export async function deleteEmployee(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.employee.update({ where: { id, companyId: ctx.company.id }, data: { deletedAt: new Date(), isActive: false, status: "EXITED" } })
  revalidatePath(`/${orgSlug}/payroll/employees`)
  redirect(`/${orgSlug}/payroll/employees`)
}

export async function createPayrollRun(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const runNumber = text(formData, "runNumber")
  const period = text(formData, "period")
  if (!runNumber || !period) throw new Error("Run number and period are required.")

  await prisma.payrollRun.create({
    data: {
      companyId: ctx.company.id,
      runNumber,
      period,
      paymentDate: date(formData, "paymentDate"),
      status: (text(formData, "status") ?? "DRAFT") as PayrollRunStatus,
      grossPay: decimal(formData, "grossPay", "0")!,
      deductions: decimal(formData, "deductions", "0")!,
      employerCost: decimal(formData, "employerCost", "0")!,
      netPay: decimal(formData, "netPay", "0")!,
      notes: text(formData, "notes"),
      createdById: ctx.userId,
    },
  })

  revalidatePath(`/${orgSlug}/payroll/runs`)
  redirect(`/${orgSlug}/payroll/runs`)
}

export async function updatePayrollRun(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const runNumber = text(formData, "runNumber")
  const period = text(formData, "period")
  if (!runNumber || !period) throw new Error("Run number and period are required.")

  await prisma.payrollRun.update({
    where: { id, companyId: ctx.company.id },
    data: {
      runNumber,
      period,
      paymentDate: date(formData, "paymentDate"),
      status: (text(formData, "status") ?? "DRAFT") as PayrollRunStatus,
      grossPay: decimal(formData, "grossPay", "0")!,
      deductions: decimal(formData, "deductions", "0")!,
      employerCost: decimal(formData, "employerCost", "0")!,
      netPay: decimal(formData, "netPay", "0")!,
      notes: text(formData, "notes"),
    },
  })

  revalidatePath(`/${orgSlug}/payroll/runs`)
  redirect(`/${orgSlug}/payroll/runs`)
}

export async function deletePayrollRun(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.payrollRun.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/payroll/runs`)
  redirect(`/${orgSlug}/payroll/runs`)
}

export async function createFixedAsset(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const assetCode = text(formData, "assetCode")
  const name = text(formData, "name")
  const purchaseDate = date(formData, "purchaseDate")
  const purchaseCost = decimal(formData, "purchaseCost")
  const usefulLifeMonths = Number(text(formData, "usefulLifeMonths") ?? "0")
  if (!assetCode || !name || !purchaseDate || !purchaseCost || usefulLifeMonths <= 0) throw new Error("Asset code, name, purchase date, purchase cost and useful life are required.")

  await prisma.fixedAsset.create({
    data: {
      companyId: ctx.company.id,
      assetCode,
      name,
      category: text(formData, "category"),
      location: text(formData, "location"),
      purchaseDate,
      putToUseDate: date(formData, "putToUseDate"),
      purchaseCost,
      salvageValue: decimal(formData, "salvageValue", "0")!,
      usefulLifeMonths,
      depreciationMethod: (text(formData, "depreciationMethod") ?? "STRAIGHT_LINE") as DepreciationMethod,
      accumulatedDepreciation: decimal(formData, "accumulatedDepreciation", "0")!,
      status: (text(formData, "status") ?? "ACTIVE") as AssetStatus,
      vendorId: text(formData, "vendorId"),
      notes: text(formData, "notes"),
    },
  })

  revalidatePath(`/${orgSlug}/fixed-assets`)
  redirect(`/${orgSlug}/fixed-assets`)
}

export async function updateFixedAsset(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const assetCode = text(formData, "assetCode")
  const name = text(formData, "name")
  const purchaseDate = date(formData, "purchaseDate")
  const purchaseCost = decimal(formData, "purchaseCost")
  const usefulLifeMonths = Number(text(formData, "usefulLifeMonths") ?? "0")
  if (!assetCode || !name || !purchaseDate || !purchaseCost || usefulLifeMonths <= 0) throw new Error("Asset code, name, purchase date, purchase cost and useful life are required.")

  await prisma.fixedAsset.update({
    where: { id, companyId: ctx.company.id },
    data: {
      assetCode,
      name,
      category: text(formData, "category"),
      location: text(formData, "location"),
      purchaseDate,
      putToUseDate: date(formData, "putToUseDate"),
      purchaseCost,
      salvageValue: decimal(formData, "salvageValue", "0")!,
      usefulLifeMonths,
      depreciationMethod: (text(formData, "depreciationMethod") ?? "STRAIGHT_LINE") as DepreciationMethod,
      accumulatedDepreciation: decimal(formData, "accumulatedDepreciation", "0")!,
      status: (text(formData, "status") ?? "ACTIVE") as AssetStatus,
      vendorId: text(formData, "vendorId"),
      notes: text(formData, "notes"),
    },
  })

  revalidatePath(`/${orgSlug}/fixed-assets`)
  redirect(`/${orgSlug}/fixed-assets`)
}

export async function deleteFixedAsset(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.fixedAsset.update({ where: { id, companyId: ctx.company.id }, data: { deletedAt: new Date(), status: "DISPOSED" } })
  revalidatePath(`/${orgSlug}/fixed-assets`)
  redirect(`/${orgSlug}/fixed-assets`)
}

export async function createPOSTill(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Till name is required.")
  await prisma.pOSTill.create({ data: { companyId: ctx.company.id, name, location: text(formData, "location"), isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function updatePOSTill(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Till name is required.")
  await prisma.pOSTill.update({ where: { id, companyId: ctx.company.id }, data: { name, location: text(formData, "location"), isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function deletePOSTill(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.pOSTill.update({ where: { id, companyId: ctx.company.id }, data: { isActive: false } })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function createPOSSession(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const tillId = text(formData, "tillId")
  const sessionNumber = text(formData, "sessionNumber")
  if (!tillId || !sessionNumber) throw new Error("Till and session number are required.")
  await prisma.pOSSession.create({
    data: {
      companyId: ctx.company.id,
      tillId,
      sessionNumber,
      cashierId: ctx.userId,
      openedAt: date(formData, "openedAt") ?? new Date(),
      closedAt: date(formData, "closedAt"),
      openingCash: decimal(formData, "openingCash", "0")!,
      closingCash: decimal(formData, "closingCash"),
      expectedCash: decimal(formData, "expectedCash"),
      status: (text(formData, "status") ?? "OPEN") as POSSessionStatus,
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function updatePOSSession(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const tillId = text(formData, "tillId")
  const sessionNumber = text(formData, "sessionNumber")
  if (!tillId || !sessionNumber) throw new Error("Till and session number are required.")
  await prisma.pOSSession.update({
    where: { id, companyId: ctx.company.id },
    data: {
      tillId,
      sessionNumber,
      openedAt: date(formData, "openedAt") ?? new Date(),
      closedAt: date(formData, "closedAt"),
      openingCash: decimal(formData, "openingCash", "0")!,
      closingCash: decimal(formData, "closingCash"),
      expectedCash: decimal(formData, "expectedCash"),
      status: (text(formData, "status") ?? "OPEN") as POSSessionStatus,
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function deletePOSSession(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.pOSSession.update({ where: { id, companyId: ctx.company.id }, data: { status: "CANCELLED" } })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function createPOSTransaction(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const sessionId = text(formData, "sessionId")
  const transactionNumber = text(formData, "transactionNumber")
  const totalAmount = decimal(formData, "totalAmount")
  const paidAmount = decimal(formData, "paidAmount")
  if (!sessionId || !transactionNumber || !totalAmount || !paidAmount) throw new Error("Session, transaction number, total amount and paid amount are required.")
  await prisma.pOSTransaction.create({
    data: {
      companyId: ctx.company.id,
      sessionId,
      transactionNumber,
      customerId: text(formData, "customerId"),
      tenderType: (text(formData, "tenderType") ?? "CASH") as TenderType,
      subtotal: decimal(formData, "subtotal", "0")!,
      taxAmount: decimal(formData, "taxAmount", "0")!,
      discountAmount: decimal(formData, "discountAmount", "0")!,
      totalAmount,
      paidAmount,
      changeDue: decimal(formData, "changeDue", "0")!,
      transactionAt: date(formData, "transactionAt") ?? new Date(),
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function updatePOSTransaction(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const sessionId = text(formData, "sessionId")
  const transactionNumber = text(formData, "transactionNumber")
  const totalAmount = decimal(formData, "totalAmount")
  const paidAmount = decimal(formData, "paidAmount")
  if (!sessionId || !transactionNumber || !totalAmount || !paidAmount) throw new Error("Session, transaction number, total amount and paid amount are required.")
  await prisma.pOSTransaction.update({
    where: { id, companyId: ctx.company.id },
    data: {
      sessionId,
      transactionNumber,
      customerId: text(formData, "customerId"),
      tenderType: (text(formData, "tenderType") ?? "CASH") as TenderType,
      subtotal: decimal(formData, "subtotal", "0")!,
      taxAmount: decimal(formData, "taxAmount", "0")!,
      discountAmount: decimal(formData, "discountAmount", "0")!,
      totalAmount,
      paidAmount,
      changeDue: decimal(formData, "changeDue", "0")!,
      transactionAt: date(formData, "transactionAt") ?? new Date(),
      isVoided: bool(formData, "isVoided"),
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}

export async function deletePOSTransaction(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.pOSTransaction.update({ where: { id, companyId: ctx.company.id }, data: { isVoided: true } })
  revalidatePath(`/${orgSlug}/pos`)
  redirect(`/${orgSlug}/pos`)
}
