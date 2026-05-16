"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCompany } from "@/lib/api/resolve-company"
import type { StockDirection, StockVoucherType, ValuationMethod } from "@prisma/client"

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

function decimal(formData: FormData, key: string) {
  const value = text(formData, key)
  return value ? value : null
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on"
}

export async function createStockGroup(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Stock group name is required.")

  await prisma.stockGroup.create({
    data: {
      companyId: ctx.company.id,
      name,
      parentId: text(formData, "parentId"),
      valuationMethod: (text(formData, "valuationMethod") ?? "FIFO") as ValuationMethod,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-groups`)
  redirect(`/${orgSlug}/inventory/stock-groups`)
}

export async function updateStockGroup(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Stock group name is required.")

  await prisma.stockGroup.update({
    where: { id, companyId: ctx.company.id },
    data: {
      name,
      parentId: text(formData, "parentId"),
      valuationMethod: (text(formData, "valuationMethod") ?? "FIFO") as ValuationMethod,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-groups`)
  redirect(`/${orgSlug}/inventory/stock-groups`)
}

export async function createStockUnit(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const symbol = text(formData, "symbol")
  if (!name || !symbol) throw new Error("Unit name and symbol are required.")

  await prisma.stockUnit.create({
    data: {
      companyId: ctx.company.id,
      name,
      symbol,
      decimalPlaces: Number(text(formData, "decimalPlaces") ?? "2"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-units`)
  redirect(`/${orgSlug}/inventory/stock-units`)
}

export async function updateStockUnit(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const symbol = text(formData, "symbol")
  if (!name || !symbol) throw new Error("Unit name and symbol are required.")

  await prisma.stockUnit.update({
    where: { id, companyId: ctx.company.id },
    data: {
      name,
      symbol,
      decimalPlaces: Number(text(formData, "decimalPlaces") ?? "2"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-units`)
  redirect(`/${orgSlug}/inventory/stock-units`)
}

export async function createStockCategory(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Category name is required.")

  await prisma.stockCategory.create({
    data: { companyId: ctx.company.id, name, isActive: bool(formData, "isActive") },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-categories`)
  redirect(`/${orgSlug}/inventory/stock-categories`)
}

export async function updateStockCategory(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Category name is required.")

  await prisma.stockCategory.update({
    where: { id, companyId: ctx.company.id },
    data: { name, isActive: bool(formData, "isActive") },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-categories`)
  redirect(`/${orgSlug}/inventory/stock-categories`)
}

export async function createGodown(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Godown name is required.")

  await prisma.godown.create({
    data: {
      companyId: ctx.company.id,
      code: text(formData, "code"),
      name,
      parentId: text(formData, "parentId"),
      address: text(formData, "address"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/godowns`)
  redirect(`/${orgSlug}/inventory/godowns`)
}

export async function updateGodown(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  if (!name) throw new Error("Godown name is required.")

  await prisma.godown.update({
    where: { id, companyId: ctx.company.id },
    data: {
      code: text(formData, "code"),
      name,
      parentId: text(formData, "parentId"),
      address: text(formData, "address"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/godowns`)
  redirect(`/${orgSlug}/inventory/godowns`)
}

export async function createStockItem(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const groupId = text(formData, "groupId")
  const primaryUnitId = text(formData, "primaryUnitId")
  if (!name || !groupId || !primaryUnitId) throw new Error("Name, group and primary unit are required.")

  await prisma.stockItem.create({
    data: {
      companyId: ctx.company.id,
      code: text(formData, "code"),
      name,
      groupId,
      categoryId: text(formData, "categoryId"),
      primaryUnitId,
      alternateUnitId: text(formData, "alternateUnitId"),
      conversionFactor: decimal(formData, "conversionFactor"),
      hsnCode: text(formData, "hsnCode"),
      barcode: text(formData, "barcode"),
      qrCode: text(formData, "qrCode"),
      valuationMethod: text(formData, "valuationMethod") as ValuationMethod | null,
      standardCost: decimal(formData, "standardCost"),
      reorderLevel: decimal(formData, "reorderLevel"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-items`)
  redirect(`/${orgSlug}/inventory/stock-items`)
}

export async function updateStockItem(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const groupId = text(formData, "groupId")
  const primaryUnitId = text(formData, "primaryUnitId")
  if (!name || !groupId || !primaryUnitId) throw new Error("Name, group and primary unit are required.")

  await prisma.stockItem.update({
    where: { id, companyId: ctx.company.id },
    data: {
      code: text(formData, "code"),
      name,
      groupId,
      categoryId: text(formData, "categoryId"),
      primaryUnitId,
      alternateUnitId: text(formData, "alternateUnitId"),
      conversionFactor: decimal(formData, "conversionFactor"),
      hsnCode: text(formData, "hsnCode"),
      barcode: text(formData, "barcode"),
      qrCode: text(formData, "qrCode"),
      valuationMethod: text(formData, "valuationMethod") as ValuationMethod | null,
      standardCost: decimal(formData, "standardCost"),
      reorderLevel: decimal(formData, "reorderLevel"),
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-items`)
  redirect(`/${orgSlug}/inventory/stock-items`)
}

export async function deleteStockItem(orgSlug: string, id: string) {
  const ctx = await context(orgSlug)
  await prisma.stockItem.update({
    where: { id, companyId: ctx.company.id },
    data: { deletedAt: new Date(), isActive: false },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-items`)
  redirect(`/${orgSlug}/inventory/stock-items`)
}

export async function createBatch(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const stockItemId = text(formData, "stockItemId")
  const batchNumber = text(formData, "batchNumber")
  const costPrice = decimal(formData, "costPrice")
  if (!stockItemId || !batchNumber || !costPrice) throw new Error("Item, batch number and cost price are required.")

  await prisma.batch.create({
    data: {
      companyId: ctx.company.id,
      stockItemId,
      batchNumber,
      mfgDate: text(formData, "mfgDate") ? new Date(text(formData, "mfgDate")!) : null,
      expiryDate: text(formData, "expiryDate") ? new Date(text(formData, "expiryDate")!) : null,
      costPrice,
      currentQty: decimal(formData, "currentQty") ?? "0",
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/batches`)
  redirect(`/${orgSlug}/inventory/batches`)
}

export async function updateBatch(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const stockItemId = text(formData, "stockItemId")
  const batchNumber = text(formData, "batchNumber")
  const costPrice = decimal(formData, "costPrice")
  if (!stockItemId || !batchNumber || !costPrice) throw new Error("Item, batch number and cost price are required.")

  await prisma.batch.update({
    where: { id, companyId: ctx.company.id },
    data: {
      stockItemId,
      batchNumber,
      mfgDate: text(formData, "mfgDate") ? new Date(text(formData, "mfgDate")!) : null,
      expiryDate: text(formData, "expiryDate") ? new Date(text(formData, "expiryDate")!) : null,
      costPrice,
      currentQty: decimal(formData, "currentQty") ?? "0",
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/batches`)
  redirect(`/${orgSlug}/inventory/batches`)
}

export async function createPriceList(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const effectiveFrom = text(formData, "effectiveFrom")
  if (!name || !effectiveFrom) throw new Error("Name and effective from date are required.")

  await prisma.priceList.create({
    data: {
      companyId: ctx.company.id,
      name,
      currency: text(formData, "currency") ?? ctx.company.currency,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: text(formData, "effectiveTo") ? new Date(text(formData, "effectiveTo")!) : null,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/price-lists`)
  redirect(`/${orgSlug}/inventory/price-lists`)
}

export async function updatePriceList(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const effectiveFrom = text(formData, "effectiveFrom")
  if (!name || !effectiveFrom) throw new Error("Name and effective from date are required.")

  await prisma.priceList.update({
    where: { id, companyId: ctx.company.id },
    data: {
      name,
      currency: text(formData, "currency") ?? ctx.company.currency,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: text(formData, "effectiveTo") ? new Date(text(formData, "effectiveTo")!) : null,
      isActive: bool(formData, "isActive"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/price-lists`)
  redirect(`/${orgSlug}/inventory/price-lists`)
}

export async function createStockVoucher(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const voucherNumber = text(formData, "voucherNumber")
  const voucherType = text(formData, "voucherType") as StockVoucherType | null
  const date = text(formData, "date")
  const stockItemId = text(formData, "stockItemId")
  const godownId = text(formData, "godownId")
  const direction = text(formData, "direction") as StockDirection | null
  const actualQty = decimal(formData, "actualQty")
  const billedQty = decimal(formData, "billedQty") ?? actualQty
  const rate = decimal(formData, "rate") ?? "0"

  if (!voucherNumber || !voucherType || !date) throw new Error("Voucher number, type and date are required.")
  if (!stockItemId || !godownId || !direction || !actualQty || !billedQty) throw new Error("At least one complete voucher line is required.")

  const computedAmount = Number(actualQty) * Number(rate)

  await prisma.stockVoucher.create({
    data: {
      companyId: ctx.company.id,
      voucherNumber,
      voucherType,
      date: new Date(date),
      status: "DRAFT",
      narration: text(formData, "narration"),
      createdById: ctx.userId,
      lines: {
        create: {
          stockItemId,
          godownId,
          batchId: text(formData, "batchId"),
          direction,
          actualQty,
          billedQty,
          rate,
          amount: text(formData, "amount") ?? String(computedAmount),
          landedCost: decimal(formData, "landedCost") ?? "0",
        },
      },
    },
  })

  revalidatePath(`/${orgSlug}/inventory/stock-vouchers`)
  redirect(`/${orgSlug}/inventory/stock-vouchers`)
}

export async function createBom(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const finishedItemId = text(formData, "finishedItemId")
  const outputQty = decimal(formData, "outputQty")
  const componentItemId = text(formData, "componentItemId")
  const componentQty = decimal(formData, "componentQty")
  const componentUnitId = text(formData, "componentUnitId")
  if (!name || !finishedItemId || !outputQty) throw new Error("BOM name, finished item and output quantity are required.")

  await prisma.billOfMaterials.create({
    data: {
      companyId: ctx.company.id,
      name,
      finishedItemId,
      outputQty,
      isActive: bool(formData, "isActive"),
      components: componentItemId && componentQty && componentUnitId ? {
        create: {
          stockItemId: componentItemId,
          qty: componentQty,
          unitId: componentUnitId,
          isScrap: bool(formData, "componentIsScrap"),
        },
      } : undefined,
    },
  })

  revalidatePath(`/${orgSlug}/inventory/bom`)
  redirect(`/${orgSlug}/inventory/bom`)
}

export async function updateBom(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const name = text(formData, "name")
  const finishedItemId = text(formData, "finishedItemId")
  const outputQty = decimal(formData, "outputQty")
  if (!name || !finishedItemId || !outputQty) throw new Error("BOM name, finished item and output quantity are required.")

  await prisma.billOfMaterials.update({
    where: { id, companyId: ctx.company.id },
    data: { name, finishedItemId, outputQty, isActive: bool(formData, "isActive") },
  })

  revalidatePath(`/${orgSlug}/inventory/bom`)
  redirect(`/${orgSlug}/inventory/bom`)
}

export async function createManufacturingJournal(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const journalNumber = text(formData, "journalNumber")
  const bomId = text(formData, "bomId")
  const date = text(formData, "date")
  const outputQty = decimal(formData, "outputQty")
  const outputGodownId = text(formData, "outputGodownId")
  const stockItemId = text(formData, "stockItemId")
  const godownId = text(formData, "godownId")
  const qty = decimal(formData, "qty")
  const rate = decimal(formData, "rate") ?? "0"
  if (!journalNumber || !bomId || !date || !outputQty || !outputGodownId) throw new Error("Journal number, BOM, date, output quantity and output godown are required.")

  await prisma.manufacturingJournal.create({
    data: {
      companyId: ctx.company.id,
      journalNumber,
      bomId,
      date: new Date(date),
      outputQty,
      outputGodownId,
      narration: text(formData, "narration"),
      createdById: ctx.userId,
      consumptions: stockItemId && godownId && qty ? {
        create: {
          stockItemId,
          godownId,
          batchId: text(formData, "batchId"),
          qty,
          rate,
          amount: String(Number(qty) * Number(rate)),
        },
      } : undefined,
    },
  })

  revalidatePath(`/${orgSlug}/inventory/manufacturing`)
  redirect(`/${orgSlug}/inventory/manufacturing`)
}

export async function updateManufacturingJournal(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const journalNumber = text(formData, "journalNumber")
  const bomId = text(formData, "bomId")
  const date = text(formData, "date")
  const outputQty = decimal(formData, "outputQty")
  const outputGodownId = text(formData, "outputGodownId")
  if (!journalNumber || !bomId || !date || !outputQty || !outputGodownId) throw new Error("Journal number, BOM, date, output quantity and output godown are required.")

  await prisma.manufacturingJournal.update({
    where: { id, companyId: ctx.company.id },
    data: { journalNumber, bomId, date: new Date(date), outputQty, outputGodownId, narration: text(formData, "narration") },
  })

  revalidatePath(`/${orgSlug}/inventory/manufacturing`)
  redirect(`/${orgSlug}/inventory/manufacturing`)
}

export async function createJobWorkOrder(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const orderNumber = text(formData, "orderNumber")
  const jobWorkerId = text(formData, "jobWorkerId")
  const date = text(formData, "date")
  const stockItemId = text(formData, "stockItemId")
  const godownId = text(formData, "godownId")
  const direction = text(formData, "direction") as StockDirection | null
  const qty = decimal(formData, "qty")
  const rate = decimal(formData, "rate") ?? "0"
  if (!orderNumber || !jobWorkerId || !date) throw new Error("Order number, job worker and date are required.")

  await prisma.jobWorkOrder.create({
    data: {
      companyId: ctx.company.id,
      orderNumber,
      type: text(formData, "type") ?? "principal",
      jobWorkerId,
      date: new Date(date),
      dueDate: text(formData, "dueDate") ? new Date(text(formData, "dueDate")!) : null,
      narration: text(formData, "narration"),
      createdById: ctx.userId,
      lines: stockItemId && godownId && direction && qty ? {
        create: { stockItemId, godownId, direction, qty, rate },
      } : undefined,
    },
  })

  revalidatePath(`/${orgSlug}/inventory/job-work`)
  redirect(`/${orgSlug}/inventory/job-work`)
}

export async function updateJobWorkOrder(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const orderNumber = text(formData, "orderNumber")
  const jobWorkerId = text(formData, "jobWorkerId")
  const date = text(formData, "date")
  if (!orderNumber || !jobWorkerId || !date) throw new Error("Order number, job worker and date are required.")

  await prisma.jobWorkOrder.update({
    where: { id, companyId: ctx.company.id },
    data: {
      orderNumber,
      type: text(formData, "type") ?? "principal",
      jobWorkerId,
      date: new Date(date),
      dueDate: text(formData, "dueDate") ? new Date(text(formData, "dueDate")!) : null,
      narration: text(formData, "narration"),
    },
  })

  revalidatePath(`/${orgSlug}/inventory/job-work`)
  redirect(`/${orgSlug}/inventory/job-work`)
}

export async function createInterCompanyTransfer(orgSlug: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const transferNumber = text(formData, "transferNumber")
  const toCompanyId = text(formData, "toCompanyId")
  const date = text(formData, "date")
  const stockItemId = text(formData, "stockItemId")
  const fromGodownId = text(formData, "fromGodownId")
  const toGodownId = text(formData, "toGodownId")
  const qty = decimal(formData, "qty")
  const rate = decimal(formData, "rate") ?? "0"
  if (!transferNumber || !toCompanyId || !date) throw new Error("Transfer number, destination company and date are required.")

  await prisma.interCompanyTransfer.create({
    data: {
      fromCompanyId: ctx.company.id,
      toCompanyId,
      transferNumber,
      date: new Date(date),
      narration: text(formData, "narration"),
      createdById: ctx.userId,
      lines: stockItemId && fromGodownId && toGodownId && qty ? {
        create: { stockItemId, fromGodownId, toGodownId, qty, rate },
      } : undefined,
    },
  })

  revalidatePath(`/${orgSlug}/inventory/inter-company-transfers`)
  redirect(`/${orgSlug}/inventory/inter-company-transfers`)
}

export async function updateInterCompanyTransfer(orgSlug: string, id: string, formData: FormData) {
  const ctx = await context(orgSlug)
  const transferNumber = text(formData, "transferNumber")
  const toCompanyId = text(formData, "toCompanyId")
  const date = text(formData, "date")
  if (!transferNumber || !toCompanyId || !date) throw new Error("Transfer number, destination company and date are required.")

  await prisma.interCompanyTransfer.update({
    where: { id, fromCompanyId: ctx.company.id },
    data: { transferNumber, toCompanyId, date: new Date(date), narration: text(formData, "narration") },
  })

  revalidatePath(`/${orgSlug}/inventory/inter-company-transfers`)
  redirect(`/${orgSlug}/inventory/inter-company-transfers`)
}
