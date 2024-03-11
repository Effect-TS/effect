import * as path from "node:path"
import type { UserConfig } from "vitest/config"

const alias = (pkg: string) => ({
  [`@effect/${pkg}/test`]: path.join(__dirname, "packages", pkg, "test"),
  [`@effect/${pkg}`]: path.join(__dirname, "packages", pkg, "src")
})

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: UserConfig = {
  esbuild: {
    target: "es2020"
  },
  test: {
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    alias: {
      // TODO: Should we use `effect/test` instead of `effect-test`?
      "effect-test": path.join(__dirname, "packages/effect/test"),
      "effect": path.join(__dirname, "packages/effect/src"),
      ...alias("cli"),
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
      ...alias("typeclass")
    }
  }
}

export default config
