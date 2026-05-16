"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveCompany } from "@/lib/api/resolve-company"
import { prisma } from "@/lib/prisma"
import type { BulkOperationStatus, CustomFieldType, EcommercePlatform, NotificationChannelType, OcrJobStatus } from "@prisma/client"

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

function csv(formData: FormData, key: string) {
  return (text(formData, key) ?? "").split(",").map((v) => v.trim()).filter(Boolean)
}

function json(formData: FormData, key: string) {
  const value = text(formData, key)
  if (!value) return undefined
  return JSON.parse(value)
}

export async function createStockForecast(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const stockItemId = text(formData, "stockItemId")
  const period = text(formData, "period")
  const forecastQty = decimal(formData, "forecastQty")
  if (!stockItemId || !period || !forecastQty) throw new Error("Item, period and forecast quantity are required.")
  await prisma.stockForecast.create({
    data: {
      companyId: ctx.company.id,
      stockItemId,
      period,
      forecastQty,
      suggestedReorderQty: decimal(formData, "suggestedReorderQty", "0")!,
      confidencePct: decimal(formData, "confidencePct"),
      algorithm: text(formData, "algorithm") ?? "exponential_smoothing",
      sourceWindowStart: date(formData, "sourceWindowStart"),
      sourceWindowEnd: date(formData, "sourceWindowEnd"),
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/inventory/forecasts`)
  redirect(`/${orgSlug}/inventory/forecasts`)
}

export async function updateStockForecast(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.stockForecast.update({
    where: { id, companyId: ctx.company.id },
    data: {
      forecastQty: decimal(formData, "forecastQty", "0")!,
      suggestedReorderQty: decimal(formData, "suggestedReorderQty", "0")!,
      confidencePct: decimal(formData, "confidencePct"),
      notes: text(formData, "notes"),
    },
  })
  revalidatePath(`/${orgSlug}/inventory/forecasts`)
  redirect(`/${orgSlug}/inventory/forecasts`)
}

export async function deleteStockForecast(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.stockForecast.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/inventory/forecasts`)
}

export async function createEcommerceChannel(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const storeUrl = text(formData, "storeUrl")
  if (!name || !storeUrl) throw new Error("Name and store URL are required.")
  await prisma.ecommerceChannel.create({
    data: {
      companyId: ctx.company.id,
      name,
      storeUrl,
      platform: (text(formData, "platform") ?? "CUSTOM") as EcommercePlatform,
      webhookSecret: text(formData, "webhookSecret"),
      itemMapping: json(formData, "itemMapping"),
      lastSyncAt: date(formData, "lastSyncAt"),
      isActive: bool(formData, "isActive"),
    },
  })
  revalidatePath(`/${orgSlug}/integrations/ecommerce`)
  redirect(`/${orgSlug}/integrations/ecommerce`)
}

export async function updateEcommerceChannel(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.ecommerceChannel.update({
    where: { id, companyId: ctx.company.id },
    data: {
      name: text(formData, "name")!,
      storeUrl: text(formData, "storeUrl")!,
      platform: (text(formData, "platform") ?? "CUSTOM") as EcommercePlatform,
      webhookSecret: text(formData, "webhookSecret"),
      itemMapping: json(formData, "itemMapping"),
      isActive: bool(formData, "isActive"),
    },
  })
  revalidatePath(`/${orgSlug}/integrations/ecommerce`)
}

export async function deleteEcommerceChannel(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.ecommerceChannel.update({ where: { id, companyId: ctx.company.id }, data: { isActive: false } })
  revalidatePath(`/${orgSlug}/integrations/ecommerce`)
}

export async function createOcrJob(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const sourceKey = text(formData, "sourceKey")
  if (!sourceKey) throw new Error("Source key is required.")
  await prisma.ocrJob.create({
    data: {
      companyId: ctx.company.id,
      sourceKey,
      sourceName: text(formData, "sourceName"),
      status: (text(formData, "status") ?? "QUEUED") as OcrJobStatus,
      extractedData: json(formData, "extractedData"),
      billId: text(formData, "billId"),
      invoiceId: text(formData, "invoiceId"),
      errorMessage: text(formData, "errorMessage"),
      createdById: ctx.userId,
    },
  })
  revalidatePath(`/${orgSlug}/documents/ocr`)
  redirect(`/${orgSlug}/documents/ocr`)
}

export async function updateOcrJob(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.ocrJob.update({
    where: { id, companyId: ctx.company.id },
    data: { status: (text(formData, "status") ?? "QUEUED") as OcrJobStatus, extractedData: json(formData, "extractedData"), errorMessage: text(formData, "errorMessage") },
  })
  revalidatePath(`/${orgSlug}/documents/ocr`)
}

export async function deleteOcrJob(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.ocrJob.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/documents/ocr`)
}

export async function createNotificationRule(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const trigger = text(formData, "trigger")
  const template = text(formData, "template")
  if (!name || !trigger || !template) throw new Error("Name, trigger and template are required.")
  await prisma.notificationRule.create({
    data: { companyId: ctx.company.id, name, trigger, template, channelType: (text(formData, "channelType") ?? "EMAIL") as NotificationChannelType, recipients: csv(formData, "recipients"), isActive: bool(formData, "isActive") },
  })
  revalidatePath(`/${orgSlug}/settings/notifications`)
  redirect(`/${orgSlug}/settings/notifications`)
}

export async function updateNotificationRule(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.notificationRule.update({
    where: { id, companyId: ctx.company.id },
    data: { name: text(formData, "name")!, trigger: text(formData, "trigger")!, template: text(formData, "template")!, channelType: (text(formData, "channelType") ?? "EMAIL") as NotificationChannelType, recipients: csv(formData, "recipients"), isActive: bool(formData, "isActive") },
  })
  revalidatePath(`/${orgSlug}/settings/notifications`)
}

export async function deleteNotificationRule(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.notificationRule.update({ where: { id, companyId: ctx.company.id }, data: { isActive: false } })
  revalidatePath(`/${orgSlug}/settings/notifications`)
}

export async function createConsolidationGroup(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Group name is required.")
  await prisma.consolidationGroup.create({ data: { workspaceId: ctx.workspaceId, name, companyIds: formData.getAll("companyIds").map(String), currency: text(formData, "currency") ?? ctx.company.currency, isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/settings/consolidation`)
  redirect(`/${orgSlug}/settings/consolidation`)
}

export async function updateConsolidationGroup(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.consolidationGroup.update({ where: { id, workspaceId: ctx.workspaceId }, data: { name: text(formData, "name")!, companyIds: formData.getAll("companyIds").map(String), currency: text(formData, "currency") ?? ctx.company.currency, isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/settings/consolidation`)
}

export async function deleteConsolidationGroup(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.consolidationGroup.update({ where: { id, workspaceId: ctx.workspaceId }, data: { isActive: false } })
  revalidatePath(`/${orgSlug}/settings/consolidation`)
}

export async function createTallyExportJob(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const exportNumber = text(formData, "exportNumber")
  const fromDate = date(formData, "fromDate")
  const toDate = date(formData, "toDate")
  if (!exportNumber || !fromDate || !toDate) throw new Error("Export number and date range are required.")
  await prisma.tallyExportJob.create({ data: { companyId: ctx.company.id, exportNumber, fromDate, toDate, status: text(formData, "status") ?? "draft", xmlPayload: text(formData, "xmlPayload"), fileUrl: text(formData, "fileUrl"), createdById: ctx.userId } })
  revalidatePath(`/${orgSlug}/settings/exports/tally-xml`)
  redirect(`/${orgSlug}/settings/exports/tally-xml`)
}

export async function updateTallyExportJob(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.tallyExportJob.update({ where: { id, companyId: ctx.company.id }, data: { status: text(formData, "status") ?? "draft", xmlPayload: text(formData, "xmlPayload"), fileUrl: text(formData, "fileUrl") } })
  revalidatePath(`/${orgSlug}/settings/exports/tally-xml`)
}

export async function deleteTallyExportJob(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.tallyExportJob.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/settings/exports/tally-xml`)
}

export async function createDashboardLayout(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Layout name is required.")
  await prisma.dashboardLayout.create({ data: { companyId: ctx.company.id, userId: ctx.userId, name, widgets: json(formData, "widgets") ?? [], isDefault: bool(formData, "isDefault") } })
  revalidatePath(`/${orgSlug}/analytics`)
  redirect(`/${orgSlug}/analytics`)
}

export async function deleteDashboardLayout(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.dashboardLayout.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/analytics`)
}

export async function createCustomFieldDefinition(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const entityType = text(formData, "entityType")
  const fieldName = text(formData, "fieldName")
  if (!entityType || !fieldName) throw new Error("Entity type and field name are required.")
  await prisma.customFieldDefinition.create({ data: { companyId: ctx.company.id, entityType, fieldName, fieldType: (text(formData, "fieldType") ?? "TEXT") as CustomFieldType, options: csv(formData, "options"), isRequired: bool(formData, "isRequired"), isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/settings/custom-fields`)
  redirect(`/${orgSlug}/settings/custom-fields`)
}

export async function updateCustomFieldDefinition(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.customFieldDefinition.update({ where: { id, companyId: ctx.company.id }, data: { fieldName: text(formData, "fieldName")!, fieldType: (text(formData, "fieldType") ?? "TEXT") as CustomFieldType, options: csv(formData, "options"), isRequired: bool(formData, "isRequired"), isActive: bool(formData, "isActive") } })
  revalidatePath(`/${orgSlug}/settings/custom-fields`)
}

export async function deleteCustomFieldDefinition(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.customFieldDefinition.update({ where: { id, companyId: ctx.company.id }, data: { isActive: false } })
  revalidatePath(`/${orgSlug}/settings/custom-fields`)
}

export async function createBulkOperation(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const operationType = text(formData, "operationType")
  const entityType = text(formData, "entityType")
  if (!operationType || !entityType) throw new Error("Operation and entity type are required.")
  await prisma.bulkOperation.create({ data: { companyId: ctx.company.id, operationType, entityType, status: (text(formData, "status") ?? "DRAFT") as BulkOperationStatus, inputData: json(formData, "inputData"), resultData: json(formData, "resultData"), errorMessage: text(formData, "errorMessage"), createdById: ctx.userId } })
  revalidatePath(`/${orgSlug}/bulk-operations`)
  redirect(`/${orgSlug}/bulk-operations`)
}

export async function updateBulkOperation(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  await prisma.bulkOperation.update({ where: { id, companyId: ctx.company.id }, data: { status: (text(formData, "status") ?? "DRAFT") as BulkOperationStatus, resultData: json(formData, "resultData"), errorMessage: text(formData, "errorMessage") } })
  revalidatePath(`/${orgSlug}/bulk-operations`)
}

export async function deleteBulkOperation(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.bulkOperation.delete({ where: { id, companyId: ctx.company.id } })
  revalidatePath(`/${orgSlug}/bulk-operations`)
}
