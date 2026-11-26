import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import { fileURLToPath } from "node:url"
import { aggregate, analyzePairs, median } from "../../stats.mts"
import { bundle, entries, esbuildVersion } from "./bundle.mts"
import { analyzeProfile, groups, mergeProfiles } from "./profile.mts"

export const cases = [
  { name: "baseline", entry: "baseline", size: "" },
  ...["small", "medium", "large"].map((size) => ({ name: `graph-${size}`, entry: "graph", size })),
  ...["none", "one", "all"].map((size) => ({ name: `ui-${size}`, entry: "ui", size })),
  ...["small", "medium", "large"].map((size) => ({ name: `httpapi-${size}`, entry: "httpapi", size }))
]

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    rounds: { type: "string", default: "10" },
    "heap-rounds": { type: "string", default: "3" },
    "profile-rounds": { type: "string", default: "2" },
    "warm-time": { type: "string", default: "300" },
    cases: { type: "string" },
    base: { type: "string" },
    head: { type: "string" }
  }
})
const [outputArgument] = positionals
assert.ok(outputArgument, "Usage: run.mts <new-output-dir> [--rounds n] [--base ref [--head ref]] [--cases a,b]")
const count = (name: string) => {
  const value = Number(values[name as keyof typeof values])
  assert.ok(Number.isSafeInteger(value) && value >= 0, `--${name} must be a non-negative integer`)
  return value
}
const rounds = count("rounds")
const heapRounds = count("heap-rounds")
const profileRounds = count("profile-rounds")
const warmTime = count("warm-time")
assert.ok(rounds > 0)
const selected = values.cases ? values.cases.split(",") : cases.map((item) => item.name)
for (const name of selected) assert.ok(cases.some((item) => item.name === name), `Unknown case: ${name}`)
const measured = cases.filter((item) => selected.includes(item.name))

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url))
const output = resolve(outputArgument)
assert.ok(!existsSync(output), `${output} already exists`)
const worker = fileURLToPath(new URL("./worker.mts", import.meta.url))
const git = (...args: Array<string>) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim()
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex")

mkdirSync(output)
const worktrees: Array<string> = []
// A variant is a packages/effect directory: the current checkout or a detached worktree of a ref.
const variant = (name: string, ref: string | undefined) => {
  if (ref === undefined) {
    return {
      name,
      ref: "worktree",
      revision: git("rev-parse", "HEAD"),
      dirty: git("status", "--porcelain", "--", "packages/effect/src") !== "",
      effectDir: join(repoRoot, "packages/effect")
    }
  }
  const revision = git("rev-parse", "--verify", `${ref}^{commit}`)
  const path = join(output, "worktrees", name)
  git("worktree", "add", "--detach", path, revision)
  worktrees.push(path)
  return { name, ref, revision, dirty: false, effectDir: join(path, "packages/effect") }
}

const report: any = {
  complete: false,
  environment: {
    date: new Date().toISOString(),
    node: process.version,
    v8: process.versions.v8,
    esbuild: esbuildVersion,
    platform: `${process.platform} ${os.release()} ${process.arch}`,
    cpu: os.cpus()[0]?.model,
    cpus: os.cpus().length,
    loadAverageStart: os.loadavg()
  },
  harness: Object.fromEntries(
    ["run.mts", "worker.mts", "bundle.mts", "profile.mts", ...entries.map((name) => `fixtures/${name}.ts`), "fixtures/domain.ts"]
      .map((file) => [file, sha256(fileURLToPath(new URL(file, import.meta.url)))])
  ),
  settings: { rounds, heapRounds, profileRounds, warmTime, cases: selected, profileIntervalUs: 100 },
  variants: [] as Array<any>,
  samples: [] as Array<any>
}
const save = () => writeFileSync(join(output, "results.json"), JSON.stringify(report, null, 2))

const runWorker = (bundlePath: string, size: string, mode: string, extra: Array<string> = []) =>
  JSON.parse(execFileSync(
    process.execPath,
    [...(mode === "heap" ? ["--expose-gc"] : []), worker, bundlePath, size, mode, ...extra],
    { encoding: "utf8", timeout: 300_000, maxBuffer: 64 * 1024 * 1024 }
  ))

try {
  const variants = values.base === undefined
    ? [variant("current", values.head)]
    : [variant("base", values.base), variant("head", values.head)]
  for (const item of variants) {
    const bundles = join(output, "bundles", item.name)
    mkdirSync(bundles, { recursive: true })
    report.variants.push({ ...item, bundles: await bundle(item.effectDir, bundles) })
  }
  save()
  const bundleOf = (variantIndex: number, entry: string) => report.variants[variantIndex].bundles[entry].path
  const order = (round: number) => {
    const indexes = report.variants.map((_: unknown, index: number) => index)
    return round % 2 === 0 ? indexes : indexes.reverse()
  }
  const rotate = <A,>(items: Array<A>, round: number) => {
    const shift = round % items.length
    return [...items.slice(shift), ...items.slice(0, shift)]
  }
  const pass = (mode: string, total: number, extra: (round: number, item: any, variantIndex: number) => Array<string>) => {
    for (let round = 0; round < total; round++) {
      for (const item of rotate(measured, round)) {
        for (const variantIndex of order(round)) {
          const result = runWorker(bundleOf(variantIndex, item.entry), item.size, mode, extra(round, item, variantIndex))
          report.samples.push({ mode, round, case: item.name, variant: report.variants[variantIndex].name, ...result })
        }
      }
      save()
      process.stderr.write(`${mode} round ${round + 1}/${total}\n`)
    }
  }
  pass("time", rounds, () => [String(warmTime)])
  pass("heap", heapRounds, () => ["0"])
  mkdirSync(join(output, "profiles"))
  pass("profile", profileRounds, (round, item, variantIndex) => [
    "0",
    join(output, "profiles", `${report.variants[variantIndex].name}-${item.name}-${round}`)
  ])
  for (const sample of report.samples.filter((sample: any) => sample.mode === "profile")) {
    const variantIndex = report.variants.findIndex((item: any) => item.name === sample.variant)
    const entry = measured.find((item) => item.name === sample.case)!.entry
    sample.analyses = Object.fromEntries(sample.profiles.map((path: string) => [
      path.slice(path.lastIndexOf("-") + 1, -".cpuprofile".length),
      analyzeProfile(JSON.parse(readFileSync(path, "utf8")), bundleOf(variantIndex, entry))
    ]))
  }
  report.environment.loadAverageEnd = os.loadavg()
  report.summary = summarize()
  report.complete = true
} finally {
  save()
  for (const path of worktrees) git("worktree", "remove", "--force", path)
}
writeFileSync(join(output, "summary.md"), markdown())
process.stdout.write(`${join(output, "summary.md")}\n`)

function samplesOf(mode: string, name: string, variantName: string) {
  return report.samples
    .filter((sample: any) => sample.mode === mode && sample.case === name && sample.variant === variantName)
    .sort((a: any, b: any) => a.round - b.round)
}

function summarize() {
  return measured.map((item) => {
    const byVariant = Object.fromEntries(report.variants.map((variantItem: any) => {
      const time = samplesOf("time", item.name, variantItem.name)
      const heap = samplesOf("heap", item.name, variantItem.name)
      const profile = samplesOf("profile", item.name, variantItem.name)
      const phases = Object.keys(time[0].timings)
      const series = Object.fromEntries([
        ...phases.map((phase) => [phase, time.map((sample: any) => sample.timings[phase])]),
        ["total", time.map((sample: any) => phases.reduce((sum, phase) => sum + sample.timings[phase], 0))],
        ...(time[0].warm ? [["warm", time.map((sample: any) => sample.warm.nsPerOp)]] : []),
        ...phases.map((phase) => [`${phase} cpu`, time.map((sample: any) => sample.cpu[phase])]),
        ["total cpu", time.map((sample: any) => phases.reduce((sum, phase) => sum + sample.cpu[phase], 0))]
      ])
      const heapDelta = heap.length === 0 ? {} : Object.fromEntries(phases.map((phase, index) => [
        phase,
        median(heap.map((sample: any) => sample.heapUsed[phase] - sample.heapUsed[index === 0 ? "start" : phases[index - 1]]))
      ]))
      return [variantItem.name, {
        phases,
        series,
        timings: Object.fromEntries(Object.entries(series).map(([key, values]) => [key, aggregate(values as any)])),
        heapDelta,
        profiles: profile.length === 0 ? {} : Object.fromEntries(phases.map((phase) => [
          phase,
          mergeProfiles(profile.map((sample: any) => sample.analyses[phase]))
        ]))
      }]
    }))
    const comparison = report.variants.length === 2
      ? Object.fromEntries(Object.keys(byVariant.base.series).map((key) => {
        const { ratios: _, ...pair } = analyzePairs(byVariant.base.series[key], byVariant.head.series[key])
        return [key, pair]
      }))
      : undefined
    return { case: item.name, variants: byVariant, comparison }
  })
}

function markdown() {
  const ms = (value: number) => value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)
  const kib = (value: number | undefined) => value === undefined ? "" : (value / 1024).toFixed(0)
  const warm = (ns: number) => ns >= 1e6 ? `${(ns / 1e6).toFixed(2)} ms` : `${(ns / 1e3).toFixed(1)} µs`
  const lines = [
    `# Schema boot results`,
    "",
    `Node ${report.environment.node}, V8 ${report.environment.v8}, esbuild ${report.environment.esbuild}, ${report.environment.cpu} (${report.environment.cpus} CPUs), ${report.environment.platform}.`,
    `Load average ${report.environment.loadAverageStart.map((v: number) => v.toFixed(1)).join("/")} at start, ${report.environment.loadAverageEnd?.map((v: number) => v.toFixed(1)).join("/")} at end.`,
    `${rounds} timed rounds, ${heapRounds} heap rounds, ${profileRounds} profile rounds, ${warmTime} ms warm measurement.`,
    "",
    ...report.variants.map((item: any) =>
      `- ${item.name}: ${item.ref} ${item.revision.slice(0, 10)}${item.dirty ? " with uncommitted packages/effect/src changes" : ""}; bundles ${
        Object.entries(item.bundles).map(([name, info]: any) => `${name} ${(info.bytes / 1024).toFixed(0)} KiB`).join(", ")
      }`
    ),
    ""
  ]
  for (const summary of report.summary) {
    lines.push(`## ${summary.case}`, "")
    const names = Object.keys(summary.variants)
    const keys = Object.keys(summary.variants[names[0]].series)
    if (summary.comparison) {
      lines.push("| phase | base ms | head ms | head/base | 95% CI | status | heap Δ base KiB | heap Δ head KiB |")
      lines.push("| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |")
      for (const key of keys) {
        const base = summary.variants.base.timings[key]
        const head = summary.variants.head.timings[key]
        const pair = summary.comparison[key]
        const format = key === "warm" ? warm : ms
        lines.push(`| ${key} | ${format(base.median)} | ${format(head.median)} | ${pair.ratio.toFixed(3)} | ${
          pair.lowRatio.toFixed(3)
        }–${pair.highRatio.toFixed(3)} | ${pair.status} | ${kib(summary.variants.base.heapDelta[key])} | ${
          kib(summary.variants.head.heapDelta[key])
        } |`)
      }
    } else {
      const data = summary.variants[names[0]]
      lines.push("| phase | median | MAD | min | max | heap Δ KiB |", "| --- | ---: | ---: | ---: | ---: | ---: |")
      for (const key of keys) {
        const value = data.timings[key]
        const format = key === "warm" ? warm : (v: number) => `${ms(v)} ms`
        lines.push(`| ${key} | ${format(value.median)} | ${format(value.mad)} | ${format(value.min)} | ${
          format(value.max)
        } | ${kib(data.heapDelta[key])} |`)
      }
    }
    lines.push("")
    for (const name of names) {
      const profiles = summary.variants[name].profiles
      if (Object.keys(profiles).length === 0) continue
      lines.push(`Profile (${name}): samples with a Schema frame, self time by module, hottest functions and outermost Schema operations.`, "")
      for (const [phase, profile] of Object.entries(profiles) as Array<[string, any]>) {
        if (profile.samples === 0) continue
        const share = (value: number) => `${((value / profile.samples) * 100).toFixed(0)}%`
        const self = groups.filter((group) => profile.self[group] > 0)
          .sort((a, b) => profile.self[b] - profile.self[a]).slice(0, 4)
          .map((group) => `${group} ${share(profile.self[group])}`).join(", ")
        const top = profile.schemaEntries.slice(0, 3).map((entry: any) => `\`${entry.label}\` ${share(entry.samples)}`)
          .join("; ")
        const hot = profile.selfFunctions.slice(0, 3).map((entry: any) => `\`${entry.label}\` ${share(entry.samples)}`)
          .join("; ")
        lines.push(
          `- ${phase}: ${profile.samples} samples, Schema ${share(profile.schemaSamples)}. Self: ${self}. Hot: ${hot}.${
            top ? ` Entries: ${top}.` : ""
          }`
        )
      }
      lines.push("")
    }
  }
  return lines.join("\n")
}
