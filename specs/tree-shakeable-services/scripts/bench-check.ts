/**
 * The cost gate, in the three modes that together make it runnable on any
 * machine:
 *
 *   pnpm bench:check
 *
 * 1. `counts.ts --check`: Map operations and bytes per call, which do not
 *    depend on load. This is the gate proper.
 * 2. `operations.ts --ordinary --check`: timing ratios for ordinary keys in a
 *    process holding no record.
 * 3. `operations.ts --check`: timing ratios with records held and read.
 *
 * Every mode runs whatever the previous one reported. A timing mode whose A/A
 * control is too noisy reports SKIPPED and does not fail the gate; one whose
 * ratios exceed a limit reports EXCEEDED and does. The summary at the end
 * lists each mode's result.
 */
import { spawnSync } from "node:child_process"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const benchmark = path.resolve(root, "..", "..", "packages", "effect", "benchmark", "context")

interface Mode {
  readonly name: string
  readonly script: string
  readonly args: ReadonlyArray<string>
}
const modes: ReadonlyArray<Mode> = [
  { name: "counts (load-insensitive gate)", script: "counts.ts", args: ["--check"] },
  { name: "timing, ordinary keys", script: "operations.ts", args: ["--ordinary", "--check"] },
  { name: "timing, records", script: "operations.ts", args: ["--check"] }
]

const results: Array<{ readonly mode: string; readonly status: string; readonly failed: boolean }> = []
for (const mode of modes) {
  console.log(`\n=== ${mode.name}: node ${mode.script} ${mode.args.join(" ")}\n`)
  const run = spawnSync(process.execPath, [path.join(benchmark, mode.script), ...mode.args], {
    cwd: path.resolve(root, "..", "..", "packages", "effect"),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  })
  process.stdout.write(run.stdout)
  const last = run.stdout.trim().split("\n").at(-1) ?? ""
  const status = /^(OK|SKIPPED|EXCEEDED)/.exec(last)?.[1] ?? (run.status === 0 ? "OK" : "FAILED")
  results.push({ mode: mode.name, status, failed: run.status !== 0 })
}

console.log("\n=== summary\n")
for (const result of results) console.log(`  ${result.mode.padEnd(40)} ${result.status}`)
if (results.some((result) => result.failed)) {
  console.log("\nthe cost gate failed")
  process.exit(1)
}
console.log("\nthe cost gate holds: every mode is OK or SKIPPED (unreadable machine)")
