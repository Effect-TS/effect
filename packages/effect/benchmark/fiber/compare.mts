// Paired base/head comparison in fresh processes with alternating order.
//
//   node compare.mts --base <dir> --head <dir> [--workloads a,b | --group g] [--rounds 10] [--time 1500]
//                    [--warmup 500] [--engine node|bun|deno] [--min-improvement 2] [--max-regression 2]
//                    [--size k=v] [--no-pollute] [--output tmp/fiberperf/<file>.json]
//
// Workers run the type-feedback pollution mix (pollute.ts) before warmup unless --no-pollute is given.
import { analyzePairs, median } from "../../runtimeperf/stats.mts"
import {
  cv,
  environment,
  formatNs,
  formatPercent,
  numberOption,
  parseArgs,
  printTable,
  resolveOutput,
  resolveRoot,
  runWorker,
  selectWorkloads,
  timestamp,
  warnIfLoaded,
  writeJson
} from "./shared.mts"

const options = parseArgs()
if (options.base === undefined || options.head === undefined) {
  throw new Error("--base <dir> and --head <dir> are required")
}
const base = resolveRoot(options.base)
const head = resolveRoot(options.head)
const engine = typeof options.engine === "string" ? options.engine : "node"
const rounds = numberOption(options, "rounds", 10)
const timeMs = numberOption(options, "time", 1500)
const warmupMs = numberOption(options, "warmup", 500)
const minIterations = numberOption(options, "min-iterations", 5)
const thresholds = {
  minImprovementPercent: numberOption(options, "min-improvement", 2),
  maxRegressionPercent: numberOption(options, "max-regression", 2)
}
const selected = await selectWorkloads(options)
const polluteWorkers = options["no-pollute"] !== true

warnIfLoaded()
const env = environment(engine)
const outputPath = resolveOutput(options.output, `compare-${timestamp()}.json`)
console.log(
  `base ${base}\nhead ${head}\nengine ${engine}, ${rounds} rounds x (${warmupMs}ms warmup + ${timeMs}ms), ` +
    `${selected.length} workloads, pollute ${polluteWorkers}, ${env.cpuModel} x${env.nproc}`
)

const results = []
const rows = []
const auxRows = []
const warnings = []
if (rounds < 6) {
  warnings.push(`only ${rounds} rounds: the bootstrap CI is degenerate, statuses are not meaningful (use >= 10)`)
}
for (const workload of selected) {
  const sides = { base: [], head: [] }
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0 ? ["base", "head"] : ["head", "base"]
    for (const side of order) {
      sides[side].push(
        runWorker({
          engine,
          root: side === "base" ? base : head,
          workload: workload.name,
          timeMs,
          warmupMs,
          minIterations,
          size: options.size,
          pollute: polluteWorkers
        })
      )
    }
  }
  const baseMeans = sides.base.map((o) => o.meanNs)
  const headMeans = sides.head.map((o) => o.meanNs)
  const mean = analyzePairs(baseMeans, headMeans, thresholds)
  const p99 = analyzePairs(sides.base.map((o) => o.p99Ns), sides.head.map((o) => o.p99Ns), thresholds)

  for (const side of ["base", "head"]) {
    const hashes = new Set(sides[side].map((o) => o.source.srcHash))
    if (hashes.size > 1 || sides[side].some((o) => o.srcChangedDuringRun)) {
      warnings.push(`${workload.name}: ${side} effect source changed between/during processes (${[...hashes]})`)
    }
  }
  if (sides.base[0].source.srcHash === sides.head[0].source.srcHash) {
    warnings.push(`${workload.name}: base and head have identical effect source (${sides.base[0].source.srcHash})`)
  }

  const gcPerIter = (outputs) =>
    outputs[0].gc.available ? median(outputs.map((o) => o.gc.totalPauseMs / o.iterations)) : NaN
  const metricKeys = Object.keys(sides.base[0].metrics)
  const metrics = Object.fromEntries(
    metricKeys.map((key) => [key, {
      base: median(sides.base.map((o) => o.metrics[key])),
      head: median(sides.head.map((o) => o.metrics[key]))
    }])
  )
  results.push({
    workload: workload.name,
    group: workload.group,
    size: sides.base[0].size,
    analysis: { mean, p99 },
    metrics,
    base: sides.base,
    head: sides.head
  })
  rows.push([
    workload.name,
    formatNs(median(baseMeans)),
    formatNs(median(headMeans)),
    formatPercent(mean.deltaPercent),
    `[${formatPercent(mean.lowPercent)}, ${formatPercent(mean.highPercent)}]`,
    mean.status,
    `${cv(baseMeans).toFixed(1)}%`,
    `${cv(headMeans).toFixed(1)}%`
  ])
  auxRows.push([
    workload.name,
    formatPercent(p99.deltaPercent),
    `[${formatPercent(p99.lowPercent)}, ${formatPercent(p99.highPercent)}]`,
    p99.status,
    Number.isFinite(gcPerIter(sides.base)) ? `${gcPerIter(sides.base).toFixed(2)}ms` : "n/a",
    Number.isFinite(gcPerIter(sides.head)) ? `${gcPerIter(sides.head).toFixed(2)}ms` : "n/a",
    Object.entries(metrics).map(([key, { base, head }]) => `${key} ${base.toFixed(3)}->${head.toFixed(3)}`).join(" ")
  ])
  console.log(
    `${workload.name}: ${formatNs(median(baseMeans))} -> ${formatNs(median(headMeans))} ` +
      `${formatPercent(mean.deltaPercent)} ${mean.status}`
  )
  // Persist after every workload so an interrupted run keeps its data.
  writeJson(outputPath, {
    kind: "fiberperf-compare",
    complete: false,
    args: {
      base,
      head,
      engine,
      rounds,
      timeMs,
      warmupMs,
      minIterations,
      thresholds,
      size: options.size ?? null,
      pollute: polluteWorkers
    },
    environment: env,
    results,
    warnings
  })
}

console.log("\nmean ns/iteration per process (paired bootstrap 95% CI of the median head/base ratio)")
printTable(["workload", "base", "head", "delta", "95% CI", "status", "base cv", "head cv"], rows)
console.log("\np99 per process (paired), gc pause per iteration (median over processes), workload metrics")
printTable(["workload", "p99 delta", "p99 95% CI", "p99 status", "base gc", "head gc", "metrics"], auxRows)
for (const warning of warnings) console.warn(`WARNING: ${warning}`)

const { loadavg } = await import("node:os")
writeJson(outputPath, {
  kind: "fiberperf-compare",
  complete: true,
  args: {
    base,
    head,
    engine,
    rounds,
    timeMs,
    warmupMs,
    minIterations,
    thresholds,
    size: options.size ?? null,
    pollute: polluteWorkers
  },
  environment: { ...env, finishedAt: new Date().toISOString(), loadavgEnd: loadavg() },
  results,
  warnings
})
console.log(`raw results: ${outputPath}`)
