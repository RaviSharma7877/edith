import { prisma } from "@/lib/prisma"

export async function fetchARContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const now = new Date()
  const invoices = await prisma.salesInvoice.findMany({
    where: {
      companyId,
      status: "POSTED",
      dueDate: { lt: now },
      amountDue: { gt: 0 },
    },
    include: { customer: { select: { name: true } } },
    orderBy: { dueDate: "asc" },
    take: 20,
  })
  if (invoices.length === 0) return "No overdue invoices found."
  return invoices
    .map((inv) => {
      const days = Math.floor(
        (now.getTime() - inv.dueDate!.getTime()) / 86_400_000,
      )
      return `${inv.invoiceNumber} | ${inv.customer.name} | ₹${Number(inv.amountDue).toLocaleString("en-IN")} due | ${days} days overdue`
    })
    .join("\n")
}

export async function fetchReportContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const period = hints.period ?? new Date().toISOString().slice(0, 7)
  const [year, month] = period.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const entries = await prisma.journalEntry.findMany({
    where: { companyId, status: "POSTED", date: { gte: start, lte: end } },
    include: {
      lines: {
        select: { direction: true, amount: true, account: { select: { type: true, name: true } } },
      },
    },
  })

  type Totals = { revenue: number; expense: number; asset: number; liability: number }
  const totals = entries.reduce<Totals>(
    (acc, entry) => {
      for (const line of entry.lines) {
        const amt = Number(line.amount)
        const isCredit = line.direction === "CREDIT"
        if (line.account.type === "REVENUE") acc.revenue += isCredit ? amt : -amt
        else if (line.account.type === "EXPENSE") acc.expense += isCredit ? -amt : amt
        else if (line.account.type === "ASSET") acc.asset += isCredit ? -amt : amt
        else if (line.account.type === "LIABILITY") acc.liability += isCredit ? amt : -amt
      }
      return acc
    },
    { revenue: 0, expense: 0, asset: 0, liability: 0 },
  )

  return `Period: ${period}
Revenue: ₹${totals.revenue.toLocaleString("en-IN")}
Expenses: ₹${totals.expense.toLocaleString("en-IN")}
Net Profit: ₹${(totals.revenue - totals.expense).toLocaleString("en-IN")}
Total Assets: ₹${totals.asset.toLocaleString("en-IN")}
Total Liabilities: ₹${totals.liability.toLocaleString("en-IN")}`
}

export async function fetchReconContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const unmatchedLines = await prisma.bankStatementLine.findMany({
    where: {
      reconciliationStatus: "UNRECONCILED",
      statement: {
        bankAccount: { companyId },
      },
    },
    include: {
      statement: {
        select: { bankAccount: { select: { bankName: true, maskedNumber: true } } },
      },
    },
    orderBy: { date: "desc" },
    take: 30,
  })

  if (unmatchedLines.length === 0) return "No unmatched bank statement lines found."

  const lines = unmatchedLines.map((line) => {
    const amount =
      line.debitAmount != null
        ? `-₹${Number(line.debitAmount).toLocaleString("en-IN")}`
        : `+₹${Number(line.creditAmount).toLocaleString("en-IN")}`
    return `${line.date.toISOString().slice(0, 10)} | ${line.statement.bankAccount.bankName} (...${line.statement.bankAccount.maskedNumber}) | ${amount} | ${line.description}`
  })

  return `Unmatched bank lines (${unmatchedLines.length}):\n${lines.join("\n")}`
}

export async function fetchReminderContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })

  if (hints.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: hints.customerId, companyId },
      select: { name: true, email: true, phone: true },
    })
    if (!customer) return "Customer not found."

    const invoices = await prisma.salesInvoice.findMany({
      where: { companyId, customerId: hints.customerId, status: "POSTED", amountDue: { gt: 0 } },
      orderBy: { dueDate: "asc" },
      select: { invoiceNumber: true, totalAmount: true, amountDue: true, dueDate: true },
    })

    const invoiceList = invoices
      .map(
        (inv) =>
          `${inv.invoiceNumber} | ₹${Number(inv.amountDue).toLocaleString("en-IN")} due | ${inv.dueDate?.toISOString().slice(0, 10) ?? "no due date"}`,
      )
      .join("\n")

    return `Company: ${company?.name ?? "Your Company"}
Customer: ${customer.name}
Email: ${customer.email ?? "—"}
Phone: ${customer.phone ?? "—"}
Open invoices:
${invoiceList || "None"}`
  }

  const invoices = await prisma.salesInvoice.findMany({
    where: { companyId, status: "POSTED", amountDue: { gt: 0 } },
    include: { customer: { select: { name: true } } },
    orderBy: { amountDue: "desc" },
    take: 5,
  })

  const summary = invoices
    .map(
      (inv) =>
        `${inv.customer.name} | ${inv.invoiceNumber} | ₹${Number(inv.amountDue).toLocaleString("en-IN")}`,
    )
    .join("\n")

  return `Company: ${company?.name ?? "Your Company"}\nTop outstanding invoices:\n${summary || "None"}`
}

export async function fetchTaxContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workspaceId: true },
  })
  if (!company) return "Company not found."

  const [taxCodes, latestReturn] = await Promise.all([
    prisma.taxCode.findMany({
      where: { workspaceId: company.workspaceId, isActive: true },
      select: { code: true, name: true, rate: true, type: true },
      orderBy: { code: "asc" },
    }),
    prisma.taxReturn.findFirst({
      where: { companyId },
      orderBy: { period: "desc" },
      select: { type: true, period: true, status: true },
    }),
  ])

  const codeList = taxCodes
    .map((tc) => `${tc.code} | ${tc.name} | ${Number(tc.rate)}% | ${tc.type}`)
    .join("\n")

  const returnInfo = latestReturn
    ? `Latest return: ${latestReturn.type} | Period ${latestReturn.period} | Status: ${latestReturn.status}`
    : "No tax returns filed yet."

  return `Active tax codes:\n${codeList || "None"}\n\n${returnInfo}`
}

export async function fetchImportContext(
  companyId: string,
  hints: Record<string, string> = {},
): Promise<string> {
  const job = hints.importJobId
    ? await prisma.importJob.findFirst({
        where: { id: hints.importJobId, companyId },
        select: { type: true, fileName: true, detectedColumns: true, status: true },
      })
    : await prisma.importJob.findFirst({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        select: { type: true, fileName: true, detectedColumns: true, status: true },
      })

  if (!job) return "No import job found."

  const columns = Array.isArray(job.detectedColumns) ? job.detectedColumns : []

  const [accounts, customers, vendors] = await Promise.all([
    prisma.chartAccount.findMany({
      where: { companyId, isActive: true, isPosting: true },
      select: { code: true, name: true },
      take: 30,
    }),
    prisma.customer.findMany({
      where: { companyId },
      select: { name: true },
      take: 20,
    }),
    prisma.vendor.findMany({
      where: { companyId },
      select: { name: true },
      take: 20,
    }),
  ])

  return `Import job: ${job.fileName ?? "unknown"} | Type: ${job.type} | Status: ${job.status}
Detected columns: ${columns.join(", ") || "none detected yet"}

Available accounts (${accounts.length}): ${accounts.map((a) => `${a.code} ${a.name}`).join(", ")}
Available customers (${customers.length}): ${customers.map((c) => c.name).join(", ")}
Available vendors (${vendors.length}): ${vendors.map((v) => v.name).join(", ")}`
}
