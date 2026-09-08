import { assert, it } from "@effect/rstest"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

it("interrupts timed-out layer setup and releases resources after setup failure", () => {
  const root = join(import.meta.dirname, "..")
  const output = mkdtempSync(join(tmpdir(), "effect-rstest-"))
  try {
    const reportFile = join(output, "report.json")
    const configFile = join(output, "rstest.config.mjs")
    writeFileSync(
      configFile,
      `export default ${
        JSON.stringify({
          root,
          include: ["test/fixtures/layer-lifetime.fixture.ts"],
          resolve: { alias: { "@effect/rstest": join(root, "src/index.ts") } },
          // Keep workers inside the child process so the deadline cannot orphan forks.
          pool: "threads",
          hookTimeout: 100,
          reporters: [["json", { outputPath: reportFile }]]
        })
      }`
    )
    const result = spawnSync(process.execPath, [
      join(root, "node_modules/@rstest/core/bin/rstest.js"),
      "run",
      "--config",
      configFile
    ], { cwd: root, encoding: "utf8", timeout: 20_000, killSignal: "SIGKILL" })
    assert.strictEqual(result.status, 1, `${result.error ?? ""}\n${result.stdout}\n${result.stderr}`)
    const report: {
      summary: { failedTests: number; passedTests: number; skippedTests: number; tests: number }
      files: Array<{ errors: Array<{ message: string }> }>
      unhandledErrors: Array<unknown>
    } = JSON.parse(readFileSync(reportFile, "utf8"))
    assert.include(report.summary, { failedTests: 0, passedTests: 6, skippedTests: 6, tests: 12 })
    assert.deepStrictEqual(report.unhandledErrors, [])
    assert.strictEqual(report.files.length, 1)
    assert.deepStrictEqual(report.files.flatMap((file) => file.errors.map((error) => error.message)), [
      "beforeAll hook timed out in 100ms",
      "beforeAll hook timed out in 100ms",
      "early-setup-failure",
      "beforeAll hook timed out in 100ms",
      "beforeAll hook timed out in 100ms",
      "early-setup-failure"
    ])
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
}, 30_000)
