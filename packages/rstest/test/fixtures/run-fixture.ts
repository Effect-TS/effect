import { Schema } from "effect"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const runnerReport = Schema.fromJsonString(Schema.Struct({
  files: Schema.Array(Schema.Struct({
    errors: Schema.Array(Schema.Struct({ message: Schema.String }))
  })),
  summary: Schema.Struct({
    failedTests: Schema.Finite,
    passedTests: Schema.Finite,
    skippedTests: Schema.Finite,
    tests: Schema.Finite
  }),
  tests: Schema.Array(Schema.Struct({
    errors: Schema.optional(Schema.Array(Schema.Struct({ message: Schema.String }))),
    name: Schema.String,
    status: Schema.String
  })),
  unhandledErrors: Schema.Array(Schema.Unknown)
}))

// Native Node APIs belong only at this outer runner-conformance boundary.
export const runFixture = async (fixture: string, hookTimeout: number) => {
  const root = fileURLToPath(new URL("../../", import.meta.url))
  const directory = await mkdtemp(join(root, ".effect-rstest-fixture-"))
  try {
    const reportPath = join(directory, "report.json")
    const configPath = join(directory, "rstest.config.mjs")
    await writeFile(
      configPath,
      `export default ${
        JSON.stringify({
          root,
          include: [`test/fixtures/${fixture}.fixture.ts`],
          resolve: { alias: { "@effect/rstest": join(root, "src/index.ts") } },
          // Keep workers in the owned CLI process so its deadline cannot orphan forks.
          pool: "threads",
          hookTimeout,
          reporters: [["json", { outputPath: reportPath }]]
        })
      }`
    )
    const result = await new Promise<{ status: number; stdout: string; stderr: string }>((resolve, reject) => {
      execFile(process.execPath, [
        join(root, "node_modules/@rstest/core/bin/rstest.js"),
        "run",
        "--config",
        configPath
      ], {
        cwd: root,
        // Normal CLI mode emits a banner; read the JSON report, not stdout.
        env: { ...process.env, RSTEST_NO_AGENT: "1" },
        timeout: 20_000,
        killSignal: "SIGKILL",
        maxBuffer: 1024 * 1024
      }, (error, stdout, stderr) => {
        if (!error) {
          resolve({ status: 0, stdout, stderr })
        } else if (!error.killed && !error.signal && typeof error.code === "number") {
          resolve({ status: error.code, stdout, stderr })
        } else {
          reject(error)
        }
      })
    })
    const report = Schema.decodeUnknownSync(runnerReport)(await readFile(reportPath, "utf8"))
    return { ...result, report }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
