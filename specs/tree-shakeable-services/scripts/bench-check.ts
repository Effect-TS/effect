/**
 * The cost gate, in the three modes that together make it runnable on any
 * machine:
 *
 *   pnpm bench:check
 *
 * 1. `counts.ts --check`: Map operations and bytes per call, which do not
 *    depend on load. This is the gate proper: OK or FAILED.
 * 2. `operations.ts --ordinary`: timing ratios for ordinary keys in a process
 *    holding no record, against the branch point.
 * 3. `operations.ts`: timing ratios with records held and read; ordinary keys
 *    against a pristine copy of this branch's `Context.ts` (the twin), the
 *    rows against the branch point reported only.
 *
 * Each timing mode runs in three orders of its pairs (`BENCH_SEED=0,1,2`): a
 * difference of a few nanoseconds between two closures depends on the order
 * the cases were optimised and laid out in, which the A/A control cannot see.
 *
 * Rule. An order is readable when its control envelope is within 1.05 (after
 * `operations.ts`'s own retry). A mode is decided only when all three orders
 * are readable; otherwise it is INCONCLUSIVE: it neither passes nor fails.
 * When it is decided, a gated pair is within when the median of its three
 * per-order medians (of its per-round ratios) is within its limit, widened by
 * the largest envelope: two of the three orders within. The mode is OK when
 * every gated pair is within and EXCEEDED, failing the gate, when any is not.
 * Every order in which a row is over its limit (an unreadable order, or an
 * order of an INCONCLUSIVE mode, against its own envelope) is printed as a
 * WARNING whatever the decision, so no exceedance is hidden.
 *
 * A mode whose benchmark exits without its summary is FAILED. Every mode runs
 * whatever the previous one reported. The gate exits 1 when a mode is FAILED or
 * EXCEEDED, says it holds only when every mode is OK, and otherwise (exit 0)
 * that the counts gate holds and the timing is inconclusive on this machine.
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
type Status = "OK" | "FAILED" | "EXCEEDED" | "INCONCLUSIVE"
interface Result {
  readonly mode: string
  readonly readable: string
  readonly status: Status
  readonly over: string
}
const seeds = [0, 1, 2]
// a timing mode is decided on a true median of three: every order readable
const quorum = 3
const results: Array<Result> = []

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
    readable: "n/a",
    status: run.status === 0 ? "OK" : "FAILED",
    over: run.status === 0 ? "0" : "see above"
  })
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
    if (json === undefined) break
    summaries.push(JSON.parse(json.slice("BENCH_JSON ".length)))
  }
  if (summaries.length < seeds.length) {
    results.push({ mode: mode.name, readable: "-", status: "FAILED", over: "benchmark exited without a summary" })
    continue
  }
  const readable = summaries.filter((summary) => !summary.skipped)
  const readableOrders = `${readable.length} of ${seeds.length}${
    readable.length > 0 ? ` (${readable.map((summary) => summary.seed).join(", ")})` : ""
  }`
  const decided = readable.length >= quorum
  const envelope = decided ? Math.max(...readable.map((summary) => summary.envelope)) : 0
  console.log(
    `\n=== ${mode.name}: per-pair medians in each order; readable orders ${readableOrders}, envelopes ${
      summaries.map((summary) => `${summary.seed}: ${summary.envelope.toFixed(2)}`).join(", ")
    }\n`
  )
  console.log(
    `  ${"ratio (median of per-round ratios, per order)".padEnd(96)} ${
      seeds.map((seed) => `order ${seed}`.padStart(10)).join("")
    } ${"limit".padStart(8)}`
  )
  const exceeded: Array<string> = []
  const warnings: Array<{ readonly label: string; readonly text: string }> = []
  for (const pair of summaries[0].pairs) {
    const cells: Array<string> = []
    let gated: number | null = null
    let within = 0
    for (const summary of summaries) {
      const row = summary.pairs.find((p) => p.label === pair.label)!
      const isReadable = !summary.skipped
      const decides = isReadable && decided
      // an order that decides is held to the limit widened by the largest readable envelope; any other to its own
      const limit = row.limit === null ? null : decides ? row.limit - summary.envelope + envelope : row.limit
      const rowOver = limit !== null && row.median > limit
      if (decides && limit !== null) {
        gated = limit
        if (!rowOver) within++
      }
      if (rowOver) {
        warnings.push({
          label: pair.label,
          text: `${pair.label}: ${row.median.toFixed(2)} > ${limit!.toFixed(2)} in order ${summary.seed}${
            decides ? "" : isReadable ? " (mode undecided)" : " (unreadable order)"
          }`
        })
      }
      // * over its limit; ? unreadable order (its numbers are shown, they do not decide the mode)
      cells.push(`${row.median.toFixed(2)}${rowOver ? "*" : " "}${isReadable ? " " : "?"}`.padStart(10))
    }
    // the median of the three orders: two of three within
    const over = gated !== null && within * 2 <= readable.length
    if (over) exceeded.push(pair.label)
    // undecided: the limit before any envelope, each order's own envelope added to it
    const limitCell = pair.limit === null
      ? "reported"
      : gated === null
      ? `${(pair.limit - summaries[0].envelope).toFixed(2)}+e`
      : gated.toFixed(2)
    const verdict = gated === null ? "" : `  ${within}/${readable.length}${over ? "  EXCEEDED" : ""}`
    console.log(`  ${pair.label.padEnd(96)} ${cells.join("")} ${limitCell.padStart(8)}${verdict}`)
  }
  console.log(
    `\n  * over its limit in that order; ? an unreadable order (control envelope over 1.05)${
      decided
        ? "; k/3: within in k of the three orders, two needed (the median)"
        : "; +e: each order's own envelope added"
    }`
  )
  if (decided) {
    console.log(`  largest control envelope of the readable orders: ${envelope.toFixed(2)} (added to every limit)`)
  }
  if (warnings.length > 0) {
    console.log(
      `\n  WARNING: ${warnings.length} row(s) over their limit in an order (shown whether or not they decide):`
    )
    for (const warning of warnings) console.log(`    WARNING ${warning.text}`)
  }
  const status: Status = !decided ? "INCONCLUSIVE" : exceeded.length > 0 ? "EXCEEDED" : "OK"
  console.log(
    status === "INCONCLUSIVE"
      ? `\nINCONCLUSIVE: ${readable.length} of ${seeds.length} orders readable, ${quorum} needed; nothing has been shown either way`
      : status === "OK"
      ? `\nOK: the median of the three orders of every gated pair is within its limit`
      : `\nEXCEEDED: ${exceeded.length} pair(s) whose median of the three orders is over their limit`
  )
  const warned = warnings.length > 0 ? ` (${warnings.length} warning(s): over in an order)` : ""
  results.push({
    mode: mode.name,
    readable: readableOrders,
    status,
    over: `${decided ? exceeded.length : "-"}${warned}`
  })
}

console.log("\n=== summary\n")
console.log(`  ${"mode".padEnd(32)} ${"readable orders".padEnd(18)} ${"result".padEnd(13)} rows over limit`)
for (const result of results) {
  console.log(`  ${result.mode.padEnd(32)} ${result.readable.padEnd(18)} ${result.status.padEnd(13)} ${result.over}`)
}
if (results.some((result) => result.status === "FAILED" || result.status === "EXCEEDED")) {
  console.log("\nthe cost gate failed")
  process.exit(1)
}
if (results.some((result) => result.status === "INCONCLUSIVE")) {
  const inconclusive = results.filter((result) => result.status === "INCONCLUSIVE").map((result) => result.mode)
  console.log(`\ncounts gate holds; timing inconclusive on this machine (${inconclusive.join(", ")})`)
} else {
  console.log("\nthe cost gate holds: every mode is OK")
}
