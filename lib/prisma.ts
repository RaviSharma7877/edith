import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  // DATABASE_URL uses PgBouncer (port 6543, transaction mode) — strip the
  // Prisma-engine-only hint before passing to pg which doesn't understand it.
  const url = (process.env.DATABASE_URL ?? "").replace(/([?&])pgbouncer=true&?/, "$1").replace(/[?&]$/, "")
  const adapter = new PrismaPg(url)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
