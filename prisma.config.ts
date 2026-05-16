import "dotenv/config"
import { defineConfig, env } from "prisma/config"

// Prisma 7 removed directUrl — both the Prisma client and Migrate use
// DIRECT_URL (port 5432, no PgBouncer). The pooled URL (port 6543) can
// be used by a separate connection layer if needed in production.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
})
