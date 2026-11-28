// Merges hostperf reports of the same tree into one, as if their rounds had come from a
// single run, so chunks measured at different times can be compared as one sample:
//   node hill-climb-tools/merge-reports.ts OUT.json CHUNK.json [CHUNK.json ...]
import { readFileSync, writeFileSync } from "node:fs"
import { median } from "../packages/effect/benchmark/hostperf/stats.ts"

const [out, ...chunks] = process.argv.slice(2)
const reports = chunks.map((path) => JSON.parse(readFileSync(path, "utf8")))
const merged = reports[0]
for (const report of reports.slice(1)) {
  merged.settings.rounds += report.settings.rounds
  merged.durationMs += report.durationMs
  merged.git.dirty ||= report.git.dirty
  for (const host of report.hosts) {
    const target = merged.hosts.find((h: any) => h.host === host.host)
    target.durationMs += host.durationMs
    target.errors.push(...host.errors)
    for (const result of host.cases) {
      target.cases.find((c: any) => c.name === result.name).rounds.push(...result.rounds)
    }
  }
}
for (const host of merged.hosts) {
  for (const result of host.cases) {
    const samples: Array<number> = result.rounds.flatMap((round: any) => round.samples)
    result.medianNs = median(samples)
    result.minNs = Math.min(...samples)
    result.maxNs = Math.max(...samples)
  }
}
writeFileSync(out, JSON.stringify(merged, null, 2))
