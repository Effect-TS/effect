import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { bundle } from "../suites/schema-boot/bundle.mts"
import { analyzeProfile, groupOf } from "../suites/schema-boot/profile.mts"
import { effectDir } from "../utils.mts"

const worker = fileURLToPath(new URL("../suites/schema-boot/worker.mts", import.meta.url))
const runWorker = (args: Array<string>, nodeArgs: Array<string> = []) =>
  JSON.parse(execFileSync(process.execPath, [...nodeArgs, worker, ...args], { encoding: "utf8" }))
const cases = [
  ["baseline", ""],
  ["graph", "small"],
  ["ui", "one"],
  ["httpapi", "small"]
]

describe("schema-boot", () => {
  it("groups source files by module", () => {
    assert.equal(groupOf("/r/packages/effect/src/Schema.ts"), "Schema")
    assert.equal(groupOf("/r/packages/effect/src/SchemaAST.ts"), "SchemaAST")
    assert.equal(groupOf("/r/packages/effect/src/SchemaTransformation.ts"), "schema-other")
    assert.equal(groupOf("/r/packages/effect/src/internal/schema/toCodec.ts"), "schema-other")
    assert.equal(groupOf("/r/packages/effect/src/http-api/OpenApi.ts"), "http-api")
    assert.equal(groupOf("/r/packages/effect/src/http/HttpRouter.ts"), "http")
    assert.equal(groupOf("/r/packages/effect/src/Effect.ts"), "effect-core")
    assert.equal(groupOf("/r/packages/effect/runtimeperf/suites/schema-boot/fixtures/ui.ts"), "fixture")
    assert.equal(groupOf(undefined), "runtime")
  })

  it("runs every workload and attributes profiles to Schema", async () => {
    const root = mkdtempSync(join(tmpdir(), "effect-schema-boot-"))
    try {
      const bundles = await bundle(effectDir, root)
      for (const [entry, size] of cases) {
        const output = runWorker([bundles[entry].path, size, "time", "1"])
        assert.ok(output.timings.import > 0 && output.timings.define >= 0, entry)
        assert.ok(output.cpu.import > 0 && output.cpu.define >= 0, entry)
        assert.ok(output.warm.nsPerOp > 0, entry)
      }
      const heap = runWorker([bundles.graph.path, "small", "heap"], ["--expose-gc"])
      assert.deepEqual(Object.keys(heap.heapUsed), ["start", "import", "define", "decode", "encode"])
      const profiled = runWorker([bundles.graph.path, "medium", "profile", "0", join(root, "graph")])
      const define = profiled.profiles.find((path: string) => path.endsWith("-define.cpuprofile"))
      const analysis = analyzeProfile(JSON.parse(readFileSync(define, "utf8")), bundles.graph.path)
      assert.ok(analysis.samples > 0)
      assert.ok(analysis.schemaSamples > 0)
      assert.ok(analysis.schemaEntries.some(({ label }) => label.includes("src/Schema.ts")))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
