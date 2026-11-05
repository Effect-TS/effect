/**
 * The cost gate, in the three modes that together make it runnable on any
 * machine:
 *
 *   pnpm bench:check
 *
 * 1. `counts.ts --check`: Map operations and bytes per call, which do not
 *    depend on load. This is the gate proper.
 * 2. `operations.ts --ordinary`: timing ratios for ordinary keys in a process
 *    holding no record.
 * 3. `operations.ts`: timing ratios with records held and read.
 *
 * Each timing mode runs three times, with the pairs in three orders
 * (`BENCH_SEED=0,1,2`): a difference of a few nanoseconds between two closures
 * depends on the order the cases were optimised and laid out in, which the
 * A/A control cannot see. The gate for a pair is the median of its three
 * medians against its limit widened by the largest control envelope of the
 * readable runs; a mode whose three controls are all too noisy reports SKIPPED
 * and does not fail the gate, one with a pair over its limit reports EXCEEDED
 * and does. Every mode runs whatever the previous one reported. The summary at
 * the end lists each mode's result.
 */
import { spawnSync } from "node:child_process"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const benchmark = path.resolve(root, "..", "..", "packages", "effect", "benchmark", "context")
const cwd = path.resolve(root, "..", "..", "packages", "effect")

interface Summary {
  readonly seed: number
  readonly envelope: number
  readonly skipped: boolean
  readonly pairs: ReadonlyArray<{ readonly label: string; readonly median: number; readonly limit: number | null }>
}
const seeds = [0, 1, 2]
const results: Array<{ readonly mode: string; readonly status: string; readonly failed: boolean }> = []

console.log("\n=== counts (load-insensitive gate): node counts.ts --check\n")
{
  const run = spawnSync(process.execPath, [path.join(benchmark, "counts.ts"), "--check"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  })
  process.stdout.write(run.stdout)
  results.push({
    mode: "counts (load-insensitive gate)",
    status: run.status === 0 ? "OK" : "FAILED",
    failed: run.status !== 0
  })
}

const median = (values: ReadonlyArray<number>) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[(sorted.length - 1) >> 1]
}

for (
  const mode of [
    { name: "timing, ordinary keys", args: ["--ordinary"] },
    { name: "timing, records", args: [] as ReadonlyArray<string> }
  ]
) {
  const summaries: Array<Summary> = []
  for (const seed of seeds) {
    console.log(`\n=== ${mode.name}, order ${seed}: BENCH_SEED=${seed} node operations.ts ${mode.args.join(" ")}\n`)
    const run = spawnSync(process.execPath, [path.join(benchmark, "operations.ts"), ...mode.args], {
      cwd,
      encoding: "utf8",
      env: { ...process.env, BENCH_SEED: String(seed), BENCH_JSON: "1" },
      stdio: ["ignore", "pipe", "inherit"]
    })
    const lines = run.stdout.split("\n")
    process.stdout.write(lines.filter((line) => !line.startsWith("BENCH_JSON ")).join("\n"))
    const json = lines.find((line) => line.startsWith("BENCH_JSON "))
    if (json === undefined) {
      results.push({ mode: mode.name, status: "FAILED", failed: true })
      break
    }
    summaries.push(JSON.parse(json.slice("BENCH_JSON ".length)))
  }
  if (summaries.length < seeds.length) continue
  const readable = summaries.filter((summary) => !summary.skipped)
  console.log(
    `\n=== ${mode.name}: the median of the ${readable.length} readable runs (orders ${
      readable.map((summary) => summary.seed).join(", ")
    })\n`
  )
  if (readable.length === 0) {
    console.log("SKIPPED: every run's control was too noisy; this machine cannot be read")
    results.push({ mode: mode.name, status: "SKIPPED", failed: false })
    continue
  }
  const envelope = Math.max(...readable.map((summary) => summary.envelope))
  let failures = 0
  console.log(
    `  ${"ratio (median over runs of the median per run)".padEnd(96)} ${"median".padStart(7)} ${"runs".padStart(20)} ${
      "limit".padStart(7)
    }`
  )
  for (const pair of summaries[0].pairs) {
    const medians = readable.map((summary) => summary.pairs.find((p) => p.label === pair.label)!.median)
    const m = median(medians)
    const limit = pair.limit === null ? null : pair.limit - summaries[0].envelope + envelope
    const ok = limit === null || m <= limit
    if (!ok) failures++
    console.log(
      `  ${pair.label.padEnd(96)} ${m.toFixed(2).padStart(7)} ${
        medians.map((x) => x.toFixed(2)).join(" ").padStart(20)
      } ${(limit === null ? "reported" : limit.toFixed(2)).padStart(8)}${ok ? "" : "  EXCEEDED"}`
    )
  }
  console.log(`\n  largest control envelope: ${envelope.toFixed(2)} (added to every limit)`)
  const status = failures > 0 ? "EXCEEDED" : "OK"
  console.log(
    status === "OK" ? "\nOK: every median ratio is within its limit" : `\nEXCEEDED: ${failures} limit(s) exceeded`
  )
  results.push({ mode: mode.name, status, failed: failures > 0 })
}

console.log("\n=== summary\n")
for (const result of results) console.log(`  ${result.mode.padEnd(40)} ${result.status}`)
if (results.some((result) => result.failed)) {
  console.log("\nthe cost gate failed")
  process.exit(1)
}
console.log("\nthe cost gate holds: every mode is OK or SKIPPED (unreadable machine)")
