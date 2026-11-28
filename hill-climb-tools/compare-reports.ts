// Compares two saved hostperf reports with the statistics `pnpm hostperf --baseline`
// uses, so one run can be checked against several baselines without re-running:
//   node hill-climb-tools/compare-reports.ts BASE.json HEAD.json
// Prints the comparison table and a verdict count per host.
import { readFileSync } from "node:fs"
import { speedup } from "../packages/effect/benchmark/hostperf/stats.ts"

interface CaseReport {
  readonly name: string
  readonly medianNs: number
  readonly rounds: ReadonlyArray<{ readonly samples: ReadonlyArray<number> }>
}
interface Report {
  readonly git: { readonly sha: string; readonly dirty: boolean }
  readonly settings: { readonly rounds: number }
  readonly hosts: ReadonlyArray<{ readonly host: string; readonly cases: ReadonlyArray<CaseReport> }>
}

const [basePath, headPath] = process.argv.slice(2)
const read = (path: string): Report => JSON.parse(readFileSync(path, "utf8"))
const base = read(basePath)
const head = read(headPath)

// The same band as `run.ts`
const noiseBand = 0.05
const verdict = ({ high, low }: { readonly low: number; readonly high: number }) =>
  low > 1 + noiseBand
    ? "faster"
    : high < 1 / (1 + noiseBand)
    ? "slower"
    : low >= 1 / (1 + noiseBand) && high <= 1 + noiseBand
    ? "same"
    : "inconclusive"
const formatNs = (ns: number) =>
  ns >= 1e6 ? `${(ns / 1e6).toFixed(2)} ms` : ns >= 1e3 ? `${(ns / 1e3).toFixed(2)} µs` : `${ns.toFixed(1)} ns`
const formatX = (value: number) => `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}x`
const samples = (c: CaseReport) => c.rounds.map((round) => round.samples)

const describe = (label: string, report: Report) =>
  `${label}: ${report.git.sha.slice(0, 10)}${report.git.dirty ? " (dirty)" : ""}, ${report.settings.rounds} rounds`
console.log(describe("base", base))
console.log(describe("head", head))

const rows: Array<{ readonly cells: Array<string>; readonly sort: number }> = []
const counts = new Map<string, Record<string, number>>()
for (const host of head.hosts) {
  for (const result of host.cases) {
    const before = base.hosts.find((h) => h.host === host.host)?.cases.find((c) => c.name === result.name)
    if (before === undefined) continue
    const s = speedup(samples(before), samples(result))
    const v = verdict(s)
    const count = counts.get(host.host) ?? {}
    count[v] = (count[v] ?? 0) + 1
    counts.set(host.host, count)
    rows.push({
      cells: [
        host.host,
        result.name,
        formatNs(before.medianNs),
        formatNs(result.medianNs),
        formatX(s.speedup),
        `${formatX(s.low)}-${formatX(s.high)}`,
        v
      ],
      sort: s.speedup
    })
  }
}
rows.sort((a, b) => b.sort - a.sort)
const table = [["host", "case", "base/op", "head/op", "speedup", "95% CI", ""], ...rows.map((row) => row.cells)]
const widths = table[0].map((_, column) => Math.max(...table.map((row) => row[column].length)))
for (const row of table) console.log(row.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd())
console.log()
for (const [host, count] of counts) {
  console.log(`${host}: ${Object.entries(count).map(([v, n]) => `${n} ${v}`).join(", ")}`)
}
