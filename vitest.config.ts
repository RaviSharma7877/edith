import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include:     ["lib/**/__tests__/**/*.test.ts", "lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include:  ["lib/ledger/**"],
      exclude:  ["lib/ledger/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
