"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"

export async function createCostCentre(orgSlug: string, userEmail: string, data: any) {
  const ctx = await resolveCompany(orgSlug, userEmail)
  if (!ctx) throw new Error("Unauthorized")

  const result = await prisma.costCentre.create({
    data: {
      companyId: ctx.company.id,
      name: data.name,
      type: data.type || "cost",
      parentId: data.parentId || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  })

  revalidatePath(`/${orgSlug}/cost-centres`)
  return result
}

export async function createBudget(orgSlug: string, userEmail: string, data: any) {
  const ctx = await resolveCompany(orgSlug, userEmail)
  if (!ctx) throw new Error("Unauthorized")

  const result = await prisma.budget.create({
    data: {
      companyId: ctx.company.id,
      name: data.name,
      fiscalYearId: data.fiscalYearId,
      costCentreId: data.costCentreId || null,
      accountId: data.accountId || null,
      periodType: data.periodType || "monthly",
      lines: {
        create: data.lines.map((line: any) => ({
          period: line.period,
          amount: line.amount,
        })),
      },
    },
  })

  revalidatePath(`/${orgSlug}/budgets`)
  return result
}

export async function createCheque(orgSlug: string, userEmail: string, data: any) {
  const ctx = await resolveCompany(orgSlug, userEmail)
  if (!ctx) throw new Error("Unauthorized")

  const result = await prisma.cheque.create({
    data: {
      companyId: ctx.company.id,
      bankAccountId: data.bankAccountId,
      paymentId: data.paymentId || null,
      chequeNumber: data.chequeNumber,
      chequeDate: new Date(data.chequeDate),
      amount: data.amount,
      payee: data.payee || null,
      status: data.status || "issued",
      notes: data.notes || null,
    },
  })

  revalidatePath(`/${orgSlug}/cheques`)
  return result
}

export async function createInterestRule(orgSlug: string, userEmail: string, data: any) {
  const ctx = await resolveCompany(orgSlug, userEmail)
  if (!ctx) throw new Error("Unauthorized")

  const result = await prisma.interestRule.create({
    data: {
      companyId: ctx.company.id,
      name: data.name,
      ratePercent: data.ratePercent,
      basis: data.basis || "365",
      graceDays: data.graceDays || 0,
      appliesTo: data.appliesTo || "both",
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  })

  revalidatePath(`/${orgSlug}/interest`)
  return result
}
