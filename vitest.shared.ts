import path from "node:path"
import type { ViteUserConfig } from "vitest/config"

const exclude = [
  "**/.*/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/benchmark/**",
  "**/bundle/**",
  "**/typetest/**",
  "**/coverage/**",
  "**/test/utils/**",
  "**/*.d.ts",
  "**/*.config.*",
  "**/vitest.*"
]

const config: ViteUserConfig = {
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  server: {
    watch: {
      ignored: exclude
    }
  },
  resolve: {
    tsconfigPaths: true
  },
  test: {
    exclude,
    setupFiles: [path.join(__dirname, "vitest.setup.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["html"],
      reportsDirectory: "coverage",
      exclude
    }
  }
}

export default config
