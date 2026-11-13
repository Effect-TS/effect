import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { build } from "esbuild"
import { fileURLToPath } from "node:url"

/**
 * A fetch-only runtime such as Cloudflare Workers has no Node built-ins, so
 * the web entry must not reach one. Bundling it for the `neutral` platform
 * makes esbuild fail on the first unresolved `node:*` or bare built-in import,
 * and the metafile lists every module the bundle reached.
 */

const source = (name: string) => fileURLToPath(new URL(`../src/${name}`, import.meta.url))

const bundle = (entry: string) =>
  build({
    entryPoints: [source(entry)],
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "neutral",
    conditions: ["workerd", "worker", "browser"],
    mainFields: ["module", "main"],
    logLevel: "silent"
  })

describe("fetch-only import graph", () => {
  for (const entry of ["ClickhouseWebClient.ts", "ClickhouseMigrator.ts"]) {
    it.live(`${entry} reaches no Node built-in and no Node ClickHouse client`, () =>
      Effect.promise(async () => {
        const result = await bundle(entry)
        const inputs = Object.keys(result.metafile.inputs)

        assert.isTrue(inputs.some((input) => input.endsWith(`src/${entry}`)))
        assert.deepStrictEqual(inputs.filter((input) => /@clickhouse\+client@|platform-node/.test(input)), [])
      }), { timeout: 60_000 })
  }

  it.live("fails on the Node entry, so the check can detect a Node import", () =>
    Effect.promise(async () => {
      const error = await bundle("ClickhouseClient.ts").then(() => undefined, (cause: unknown) => cause)

      assert.match(String(error), /Could not resolve "(node:)?[a-z_/]+"/)
    }), { timeout: 60_000 })
})
