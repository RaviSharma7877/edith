import "dotenv/config"
import { defineConfig, env } from "prisma/config"

// Runtime: DATABASE_URL → Supabase PgBouncer pooler (port 6543, transaction mode)
// Migrations that need a direct connection: temporarily set DATABASE_URL=DIRECT_URL value
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
