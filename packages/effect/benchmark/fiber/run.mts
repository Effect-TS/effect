// Single-root run of selected workloads in fresh processes (quick baselines).
//
//   node run.mts [--root <dir>] [--workloads a,b | --group g] [--rounds 1] [--time 1500] [--warmup 500]
//                [--engine node|bun|deno] [--output tmp/fiberperf/run.json]
import { median } from "../../runtimeperf/stats.mts"
import {
  cv,
  environment,
  formatNs,
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
const root = resolveRoot(options.root)
const engine = typeof options.engine === "string" ? options.engine : "node"
const rounds = numberOption(options, "rounds", 1)
const timeMs = numberOption(options, "time", 1500)
const warmupMs = numberOption(options, "warmup", 500)
const minIterations = numberOption(options, "min-iterations", 5)
const selected = await selectWorkloads(options)

warnIfLoaded()
const env = environment(engine)
const results = []
const rows = []
for (const workload of selected) {
  const outputs = []
  for (let round = 0; round < rounds; round++) {
    outputs.push(
      runWorker({ engine, root, workload: workload.name, timeMs, warmupMs, minIterations, size: options.size })
    )
  }
  results.push({ workload: workload.name, outputs })
  const means = outputs.map((o) => o.meanNs)
  const metrics = Object.entries(outputs[outputs.length - 1].metrics)
    .map(([key, value]) => `${key}=${Number(value).toFixed(3)}`)
    .join(" ")
  const last = outputs[outputs.length - 1]
  rows.push([
    workload.name,
    workload.group,
    Object.entries(last.size).map(([k, v]) => `${k}=${v}`).join(","),
    String(median(outputs.map((o) => o.iterations))),
    formatNs(median(means)),
    formatNs(median(outputs.map((o) => o.medianNs))),
    formatNs(median(outputs.map((o) => o.p99Ns))),
    `${median(outputs.map((o) => o.cvPercent)).toFixed(1)}%`,
    rounds > 1 ? `${cv(means).toFixed(1)}%` : "-",
    last.gc.available ? `${(last.gc.totalPauseMs / last.iterations).toFixed(2)}ms` : "n/a",
    (last.srcChangedDuringRun ? "SRC-CHANGED " : "") + metrics
  ])
}

console.log(
  `root ${root} (${results[0].outputs[0].source.gitHead?.slice(0, 10)}, src ${results[0].outputs[0].source.srcHash}${
    results[0].outputs[0].source.srcDirty ? ", dirty" : ""
  }) engine ${engine}`
)
printTable(
  ["workload", "group", "size", "iters", "mean", "median", "p99", "cv(in)", "cv(proc)", "gc/iter", "metrics"],
  rows
)
const output = resolveOutput(options.output, `run-${timestamp()}.json`)
writeJson(output, {
  kind: "fiberperf-run",
  args: { root, engine, rounds, timeMs, warmupMs, minIterations, workloads: selected.map((w) => w.name) },
  environment: { ...env, finishedAt: new Date().toISOString(), loadavgEnd: (await import("node:os")).loadavg() },
  results
})
console.log(`raw results: ${output}`)
