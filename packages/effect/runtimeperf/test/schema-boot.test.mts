import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"
import { bundle } from "../suites/schema-boot/bundle.mts"
import { analyzeProfile } from "../suites/schema-boot/profile.mts"
import { effectDir, repoRoot } from "../utils.mts"

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
  it("runs every workload and attributes profiles to Schema", async () => {
    // Two levels below the repository root, like packages/effect, so the copied tsconfig resolves.
    mkdirSync(join(repoRoot, "tmp"), { recursive: true })
    const root = mkdtempSync(join(repoRoot, "tmp", "schema-boot-"))
    try {
      const bundles = await bundle(effectDir, join(root, "bundles"))
      // The same source checked out elsewhere, like a base worktree, bundles to the same bytes.
      for (const file of ["src", "package.json", "tsconfig.json"]) {
        cpSync(join(effectDir, file), join(root, file), { recursive: true })
      }
      const copied = await bundle(root, join(root, "copied"))
      for (const [entry] of cases) assert.equal(copied[entry].sha256, bundles[entry].sha256, entry)
      for (const [entry, size] of cases) {
        const output = runWorker([bundles[entry].path, size, "time", "1"])
        assert.ok(output.timings.import > 0 && output.cpu.import > 0, entry)
        assert.ok(output.warm.nsPerOp > 0, entry)
      }
      const heap = runWorker([bundles.graph.path, "small", "heap"], ["--expose-gc"])
      assert.deepEqual(Object.keys(heap.heapUsed), ["start", "import", "define", "decode", "encode"])
      const profiled = runWorker([bundles.graph.path, "medium", "profile", "0", join(root, "graph")])
      const define = profiled.profiles.find((path: string) => path.endsWith("-define.cpuprofile"))
      const analysis = analyzeProfile(JSON.parse(readFileSync(define, "utf8")), bundles.graph.path)
      assert.ok(analysis.schemaSamples > 0)
      assert.ok(analysis.schemaEntries.some(({ label }) => label.includes("src/Schema.ts")))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
