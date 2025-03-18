import * as path from "node:path"
import type { ViteUserConfig } from "vitest/config"

const alias = (pkg: string, dir = pkg) => {
  const name = pkg === "effect" ? "effect" : `@effect/${pkg}`
  const target = process.env.TEST_DIST !== undefined ? path.join("dist", "dist", "esm") : "src"
  return ({
    [`${name}/test`]: path.join(__dirname, "packages", dir, "test"),
    [`${name}`]: path.join(__dirname, "packages", dir, target)
  })
}

const config: ViteUserConfig = {
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
    alias: {
      ...alias("effect"),
      ...alias("ai", path.join("ai", "ai")),
      ...alias("ai-anthropic", path.join("ai", "anthropic")),
      ...alias("ai-openai", path.join("ai", "openai")),
      ...alias("cli"),
      ...alias("cluster"),
      ...alias("cluster-workflow"),
      ...alias("experimental"),
      ...alias("opentelemetry"),
      ...alias("platform"),
      ...alias("platform-node"),
      ...alias("platform-node-shared"),
      ...alias("platform-bun"),
      ...alias("platform-browser"),
      ...alias("printer"),
      ...alias("printer-ansi"),
      ...alias("rpc"),
      ...alias("sql"),
      ...alias("sql-clickhouse"),
      ...alias("sql-d1"),
      ...alias("sql-drizzle"),
      ...alias("sql-kysely"),
      ...alias("sql-libsql"),
      ...alias("sql-mssql"),
      ...alias("sql-mysql2"),
      ...alias("sql-pg"),
      ...alias("sql-sqlite-bun"),
      ...alias("sql-sqlite-do"),
      ...alias("sql-sqlite-node"),
      ...alias("sql-sqlite-react-native"),
      ...alias("sql-sqlite-wasm"),
      ...alias("typeclass"),
      ...alias("vitest")
    }
  }
}

export default config
