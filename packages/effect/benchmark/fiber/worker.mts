// One fresh-process measurement of a single workload against one checkout.
//
//   node worker.mts --root <checkout> --workload <name> --time <ms> --warmup <ms> [--min-iterations n]
//                   [--size key=value,...] [--json]
//
// Works under node, `bun worker.mts` and `deno run -A worker.mts`.
import * as os from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  engineInfo,
  formatNs,
  numberOption,
  parseArgs,
  parseSizeOverrides,
  resolveRoot,
  sourceIdentity
} from "./shared.mts"
import { findWorkload } from "./workloads.ts"

const options = parseArgs()
const root = resolveRoot(options.root)
if (typeof options.workload !== "string") throw new Error("--workload <name> is required")
const timeMs = numberOption(options, "time", 1500)
const warmupMs = numberOption(options, "warmup", 500)
const minIterations = numberOption(options, "min-iterations", 5)

const loadavgStart = os.loadavg()
const identity = sourceIdentity(root)
const E = await import(pathToFileURL(join(root, "packages/effect/src/index.ts")).href)
const workload = findWorkload(options.workload)
const size = { ...workload.size, ...parseSizeOverrides(options.size) }
const instance = workload.make(E, size)

const nowNs = () => process.hrtime.bigint()

// Validation run before warmup (also the first warmup iteration).
await instance.run()
instance.validate()

const warmupStart = nowNs()
const warmupEnd = warmupStart + BigInt(Math.round(warmupMs * 1e6))
let warmupIterations = 1
while (nowNs() < warmupEnd) {
  await instance.run()
  warmupIterations++
}

// GC observation (measurement window only). Degrades to `available: false`.
// Node's perf_hooks.constants.NODE_PERFORMANCE_GC_* values.
const gcKinds = { 1: "minor", 4: "major", 8: "incremental", 16: "weakcb" }
const gc = { available: false, count: 0, totalPauseMs: 0, byKind: {} }
const recordGc = (entry) => {
  const raw = entry.detail?.kind ?? entry.kind
  const kind = gcKinds[raw] ?? String(raw)
  gc.count++
  gc.totalPauseMs += entry.duration
  const bucket = gc.byKind[kind] ??= { count: 0, pauseMs: 0 }
  bucket.count++
  bucket.pauseMs += entry.duration
}
let observer
try {
  const perfHooks = await import("node:perf_hooks")
  const supported = perfHooks.PerformanceObserver.supportedEntryTypes ?? []
  if (supported.includes("gc")) {
    let measuring = true
    observer = new perfHooks.PerformanceObserver((list) => {
      if (!measuring) return
      for (const entry of list.getEntries()) recordGc(entry)
    })
    observer.observe({ entryTypes: ["gc"] })
    observer.stop = () => {
      measuring = false
    }
    gc.available = true
  }
} catch (error) {
  gc.error = String(error)
}
const heapBefore = process.memoryUsage()

const samples = []
const measureStart = nowNs()
const measureEnd = measureStart + BigInt(Math.round(timeMs * 1e6))
while (true) {
  const start = nowNs()
  await instance.run()
  const end = nowNs()
  samples.push(Number(end - start))
  if (end >= measureEnd && samples.length >= minIterations) break
}
const measureStop = nowNs()
const totalNs = Number(measureStop - measureStart)
const heapAfter = process.memoryUsage()

// Let pending gc entries be delivered, then stop observing.
await new Promise((resolve) => setTimeout(resolve, 0))
if (observer !== undefined) {
  const pending = typeof observer.takeRecords === "function" ? observer.takeRecords() : []
  for (const entry of pending) recordGc(entry)
  observer.stop()
  observer.disconnect()
  if (gc.count === 0 && engineInfo().engine !== "node") {
    gc.available = false
    gc.note = "observer accepted 'gc' but delivered no entries on this engine"
  }
}

instance.validate()

const sorted = samples.slice().sort((a, b) => a - b)
const quantile = (p) => {
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}
const meanNs = samples.reduce((a, b) => a + b, 0) / samples.length
const stddevNs = Math.sqrt(samples.reduce((a, b) => a + (b - meanNs) ** 2, 0) / Math.max(samples.length - 1, 1))
const identityAfter = sourceIdentity(root)

const output = {
  workload: workload.name,
  group: workload.group,
  size,
  root,
  source: identity,
  srcChangedDuringRun: identityAfter.srcHash !== identity.srcHash,
  engine: engineInfo(),
  pid: process.pid,
  timeMs,
  warmupMs,
  warmupIterations,
  iterations: samples.length,
  totalNs,
  // process.hrtime (CLOCK_MONOTONIC) bounds of the measured window, used to crop CPU profiles.
  measureWindowNs: [String(measureStart), String(measureStop)],
  meanNs,
  medianNs: quantile(0.5),
  minNs: sorted[0],
  p90Ns: quantile(0.9),
  p99Ns: quantile(0.99),
  maxNs: sorted[sorted.length - 1],
  stddevNs,
  cvPercent: stddevNs / meanNs * 100,
  gc,
  heap: {
    note: "process.memoryUsage() without forced GC; heapUsed delta mostly reflects GC timing",
    heapUsedBefore: heapBefore.heapUsed,
    heapUsedAfter: heapAfter.heapUsed,
    rssBefore: heapBefore.rss,
    rssAfter: heapAfter.rss
  },
  metrics: instance.metrics?.() ?? {},
  loadavgStart,
  loadavgEnd: os.loadavg()
}

if (options.json === true) {
  console.log(JSON.stringify(output))
} else {
  console.log(
    `${output.workload} [${output.engine.engine} ${output.engine.version}] ${output.iterations} iterations: ` +
      `mean ${formatNs(meanNs)} median ${formatNs(output.medianNs)} p99 ${formatNs(output.p99Ns)} ` +
      `cv ${output.cvPercent.toFixed(1)}% gc ${gc.available ? `${gc.count} (${gc.totalPauseMs.toFixed(1)}ms)` : "n/a"}`
  )
  if (Object.keys(output.metrics).length > 0) console.log("metrics", output.metrics)
  if (output.srcChangedDuringRun) console.log("WARNING: effect source changed during the run")
}
// Exit explicitly so stray timers from a workload cannot keep the process alive.
process.exit(0)
