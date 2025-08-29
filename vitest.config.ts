import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Use projects instead of deprecated workspace file
    projects: [
      "packages-native/*/vitest.config.ts",
    ],
    // CI often shards across multiple runners; allow empty shards to pass
    passWithNoTests: true,
  },
})

