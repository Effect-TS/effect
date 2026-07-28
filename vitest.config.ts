import { defineConfig } from "vitest/config"

const isDeno = process.versions.deno !== undefined
const isBun = process.versions.bun !== undefined
const isNode = typeof process !== "undefined" &&
  process.release.name === "node" &&
  !isDeno &&
  !isBun
export default defineConfig({
  test: {
    projects: [
      "packages/*/vitest.config.ts",
      "packages/ai/*/vitest.config.ts",
      "packages/atom/*/vitest.config.ts",
      "packages/tools/*/vitest.config.ts",
      "packages/sql/*/vitest.config.ts",
      ...(isDeno ?
        [
          "!packages/platform-node-shared",
          "!packages/sql/d1",
          "!packages/sql/sqlite-node"
        ] :
        []),
      ...(!isDeno ? ["!packages/platform-deno"] : []),
      ...(!isBun ? ["!packages/platform-bun"] : []),
      ...(!isNode ? ["!packages/platform-node"] : [])
    ]
  }
})
