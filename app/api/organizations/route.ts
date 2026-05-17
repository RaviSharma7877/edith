import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { seedCompanyVoucherTypes } from "@/lib/ledger/seed-voucher-types"

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 40)
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

// Returns the current FY boundaries + 12 period definitions given a start month (1–12)
function buildFiscalYear(fiscalYearStart: number) {
  const now         = new Date()
  const currentMonth = now.getMonth() + 1 // 1-indexed
  const currentYear  = now.getFullYear()

  // Determine which year the FY started in
  const fyStartYear = currentMonth >= fiscalYearStart ? currentYear : currentYear - 1
  const fyEndYear   = fyStartYear + (fiscalYearStart === 1 ? 0 : 1)
  const fyEndMonth  = fiscalYearStart === 1 ? 12 : fiscalYearStart - 1

  const fyStart = new Date(fyStartYear, fiscalYearStart - 1, 1)
  // Last day of the end month
  const fyEnd   = new Date(fyEndYear, fyEndMonth, 0)

  const fyName =
    fiscalYearStart === 1
      ? `FY ${fyStartYear}`
      : `FY ${fyStartYear}–${String(fyEndYear).slice(-2)}`

  // Build 12 monthly period objects
  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ]

  const periods: Array<{
    name: string; startDate: Date; endDate: Date
  }> = []

  for (let i = 0; i < 12; i++) {
    const month     = ((fiscalYearStart - 1 + i) % 12)          // 0-indexed
    const yearOffset = Math.floor((fiscalYearStart - 1 + i) / 12)
    const year       = fyStartYear + yearOffset

    const start = new Date(year, month, 1)
    const end   = new Date(year, month + 1, 0) // last day of month

    periods.push({
      name:      `${MONTH_NAMES[month]} ${year}`,
      startDate: start,
      endDate:   end,
    })
  }

  return { fyStart, fyEnd, fyName, periods }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  // ── Step 1 fields ──────────────────────────────────────────────────────────
  const name:     string = (body.name     ?? "").trim()
  const country:  string = (body.country  ?? "IN").trim()
  const currency: string = (body.currency ?? "INR").trim()

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Organisation name is required." }, { status: 400 })
  }

  // ── Step 2 fields ──────────────────────────────────────────────────────────
  const legalName:    string | undefined = body.legalName    || undefined
  const displayName:  string | undefined = body.displayName  || undefined
  const phone:        string | undefined = body.phone        || undefined
  const email:        string | undefined = body.email        || undefined
  const website:      string | undefined = body.website      || undefined
  const addressLine1: string | undefined = body.addressLine1 || undefined
  const addressLine2: string | undefined = body.addressLine2 || undefined
  const city:         string | undefined = body.city         || undefined
  const state:        string | undefined = body.state        || undefined
  const postalCode:   string | undefined = body.postalCode   || undefined

  // ── Step 3 fields ──────────────────────────────────────────────────────────
  const fiscalYearStart:      number = parseInt(body.fiscalYearStart ?? "4", 10)
  const coaTemplate:          string = body.coaTemplate          ?? "STANDARD_INDIA"
  const taxMode:              string = body.taxMode              ?? "GST"
  const openingBalanceChoice: string = body.openingBalanceChoice ?? "fresh"

  // ── Step 4 fields ──────────────────────────────────────────────────────────
  const inviteEmails: string[] = Array.isArray(body.inviteEmails)
    ? body.inviteEmails.filter(Boolean)
    : []

  // ── Upsert user ────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where:  { email: session.user.email },
    update: {},
    create: {
      email:     session.user.email,
      firstName: session.user.name?.split(" ")[0] ?? null,
      lastName:  session.user.name?.split(" ").slice(1).join(" ") || null,
    },
  })

  // ── Generate unique workspace slug ─────────────────────────────────────────
  const baseSlug  = toSlug(name) || "org"
  let   slug      = baseSlug
  const existing  = await prisma.workspace.findUnique({ where: { slug } })
  if (existing) slug = `${baseSlug}-${randomSuffix()}`

  // ── Fiscal year calculation ────────────────────────────────────────────────
  const fyStartMonth = isNaN(fiscalYearStart) || fiscalYearStart < 1 || fiscalYearStart > 12
    ? 4
    : fiscalYearStart

  const { fyStart, fyEnd, fyName, periods } = buildFiscalYear(fyStartMonth)

  // ── Create workspace, company, fiscal year, and periods atomically ─────────
  const { ws: workspace, company } = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        slug,
        name,
        ownerId:        user.id,
        country,
        currency,
        fiscalYearStart: fyStartMonth,
        isOnboarded:    true,
        members: {
          create: {
            userId:     user.id,
            systemRole: "ORG_OWNER",
            joinedAt:   new Date(),
            isActive:   true,
          },
        },
      },
    })

    const company = await tx.company.create({
      data: {
        workspaceId:         ws.id,
        name,
        legalName,
        displayName,
        phone,
        email,
        website,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        currency,
        timezone:            "Asia/Kolkata",
        fiscalYearStart:     fyStartMonth,
        locale:              country === "IN" ? "en-IN" : "en-US",
        coaTemplate:         coaTemplate as any,
        taxMode:             taxMode as any,
        openingBalanceChoice,
        isDefault:           true,
        setupCompleted:      true,
        setupStep:           4,
      },
    })

    const fy = await tx.fiscalYear.create({
      data: {
        companyId: company.id,
        name:      fyName,
        startDate: fyStart,
        endDate:   fyEnd,
        isCurrent: true,
        status:    "ACTIVE",
      },
    })

    await tx.accountingPeriod.createMany({
      data: periods.map((p) => ({
        fiscalYearId: fy.id,
        name:         p.name,
        startDate:    p.startDate,
        endDate:      p.endDate,
        status:       "OPEN",
      })),
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        workspaceId:  ws.id,
        actorId:      user.id,
        action:       "COMPANY_CREATED",
        severity:     "INFO",
        resourceType: "company",
        resourceId:   company.id,
        resourceName: name,
        description:  `Company "${name}" created with ${fyName}`,
      },
    })

    return { ws, company }
  })

  // ── Seed system voucher types ──────────────────────────────────────────────
  await seedCompanyVoucherTypes(company.id, workspace.id)

  // ── Send invites (fire and forget — no blocking) ───────────────────────────
  // TODO: integrate with email provider (Resend/SendGrid)
  // inviteEmails are stored here for future processing

  return NextResponse.json({ slug: workspace.slug })
}
