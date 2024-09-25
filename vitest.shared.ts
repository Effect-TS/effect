import * as path from "node:path"
import type { UserConfig } from "vitest/config"

const alias = (pkg: string) => {
  const name = pkg === "effect" ? "effect" : `@effect/${pkg}`
  const target = process.env.TEST_DIST !== undefined ? "dist/dist/esm" : "src"
  return ({
    [`${name}/test`]: path.join(__dirname, "packages", pkg, "test"),
    [`${name}`]: path.join(__dirname, "packages", pkg, target)
  })
}

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: UserConfig = {
  esbuild: {
    target: "es2020"
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    alias: {
      ...alias("effect"),
      ...alias("cli"),
      ...alias("cluster"),
      ...alias("cluster-browser"),
      ...alias("cluster-node"),
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
      ...alias("rpc-http"),
      ...alias("schema"),
      ...alias("sql"),
      ...alias("sql-d1"),
      ...alias("sql-drizzle"),
      ...alias("sql-kysely"),
      ...alias("sql-libsql"),
      ...alias("sql-mssql"),
      ...alias("sql-mysql2"),
      ...alias("sql-pg"),
      ...alias("sql-sqlite-bun"),
      ...alias("sql-sqlite-node"),
      ...alias("sql-sqlite-react-native"),
      ...alias("sql-sqlite-wasm"),
      ...alias("typeclass"),
      ...alias("vitest")
    }
  }
}

export default config
