import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    include: ["test/integration/*.test.ts"],
    globalSetup: [fileURLToPath(new URL("./test/integration/globalSetup.ts", import.meta.url))],
    sequence: { concurrent: false },
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000
  }
})
