import * as path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    target: "es2020"
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  test: {
    setupFiles: [path.join(__dirname, "vitest.setup.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    projects: [
      "packages/*/vitest.config.ts",
      "packages/ai/*/vitest.config.ts"
    ]
  }
})
