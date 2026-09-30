import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { cpus, platform, release } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { startCluster, startRedis } from "../test/utils/redis-server.ts"

// runtimeperf's JavaScript-compatible .mts utilities are not part of the
// benchmark TypeScript project. Load their runtime implementation by URL.
const { bootstrapMedianLogRatio, median }: {
  readonly bootstrapMedianLogRatio: (ratios: ReadonlyArray<number>) => {
    readonly ratio: number
    readonly lowRatio: number
    readonly highRatio: number
    readonly confidence: number
    readonly iterations: number
    readonly seed: number
  }
  readonly median: (values: ReadonlyArray<number>) => number
} = await import(new URL("../../effect/runtimeperf/stats.mts", import.meta.url).href)

const cases = [
  "standalone-pipeline128",
  "standalone-reserved-pipeline128",
  "cluster-same-slot-pipeline128",
  "cluster-multiple-slots-pipeline128",
  "standalone-sequential",
  "standalone-transactions128",
  "standalone-binary-get128",
  "standalone-binary-set128"
] as const

const { values } = parseArgs({
  options: {
    "reference-dir": { type: "string" },
    "case": { type: "string", multiple: true },
    "rounds": { type: "string", default: "9" },
    "time": { type: "string", default: "1000" },
    "warmup-time": { type: "string", default: "250" },
    "margin": { type: "string", default: "5" },
    "output": { type: "string" },
    "fail-on-regression": { type: "boolean", default: false },
    "require-parity": { type: "boolean", default: false },
    "help": { type: "boolean", default: false }
  }
})
if (values.help) {
  console.log(`Usage: node packages/redis/benchmark/RedisClient.ts --reference-dir <directory> [options]

--case <name>             Repeat to select workloads; defaults to all eight
--rounds <n>              Alternating paired fresh processes (default 9)
--time <ms>               Shared calibrated work targeting at least this duration (default 1000)
--warmup-time <ms>        Warmup in every fresh process (default 250)
--margin <percent>       Maximum native elapsed-time overhead for parity (default 5)
--output <file>          Report path (default tmp/runtimeperf/results/redis-<timestamp>.json)
--fail-on-regression     Nonzero exit on statistically classified regression
--require-parity         Nonzero exit unless all selected cases establish parity

Cases: ${cases.join(", ")}`)
  process.exit(0)
}
if (!values["reference-dir"]) throw new Error("--reference-dir must contain an isolated redis@5.0.1 installation")
const positive = (value: string, label: string) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be positive`)
  return number
}
const rounds = positive(values.rounds, "rounds")
if (!Number.isInteger(rounds) || rounds < 2) throw new Error("rounds must be an integer >= 2")
const time = positive(values.time, "time")
const warmupTime = positive(values["warmup-time"], "warmup-time")
const margin = positive(values.margin, "margin")
const selected = values.case ?? [...cases]
for (const name of selected) {
  if (!cases.includes(name as typeof cases[number])) throw new Error(`Unknown case: ${name}`)
}
if (new Set(selected).size !== selected.length) throw new Error("Duplicate selected case")
const referenceDir = resolve(values["reference-dir"])
const require = createRequire(join(referenceDir, "package.json"))
const referenceVersion = require("redis/package.json").version
if (referenceVersion !== "5.0.1") throw new Error(`Expected redis@5.0.1; found ${referenceVersion}`)
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const worker = fileURLToPath(new URL("./RedisClientWorker.ts", import.meta.url))
const output = resolve(values.output ?? join(repoRoot, "tmp/runtimeperf/results", `redis-${Date.now()}.json`))
const git = (args: ReadonlyArray<string>) => {
  const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}
const hashFile = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex")
const statsPath = fileURLToPath(new URL("../../effect/runtimeperf/stats.mts", import.meta.url))
const coordinator = fileURLToPath(import.meta.url)
const runtimeSourceHash = async () => {
  const files = git([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "packages/effect/src",
    "packages/redis/src",
    "packages/platform/node/src",
    "packages/platform/node-shared/src"
  ]).split("\n").filter(Boolean).sort()
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(`${file}\0`)
    try {
      hash.update(await readFile(join(repoRoot, file)))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      hash.update("<deleted>")
    }
    hash.update("\0")
  }
  return hash.digest("hex")
}
const report: any = {
  protocol: "redis-client-paired-v1",
  startedAt: new Date().toISOString(),
  head: git(["rev-parse", "HEAD"]),
  worktreeDiffHash: createHash("sha256").update(
    git([
      "diff",
      "HEAD",
      "--",
      "packages/effect",
      "packages/redis",
      "packages/platform/node",
      "packages/platform/node-shared"
    ])
  ).digest("hex"),
  runtimeSourceHash: await runtimeSourceHash(),
  workerHash: await hashFile(worker),
  coordinatorHash: await hashFile(coordinator),
  statsHash: await hashFile(statsPath),
  node: process.version,
  cpu: cpus()[0]?.model,
  platform: platform(),
  osRelease: release(),
  reference: `redis@${referenceVersion}`,
  settings: { rounds, time, warmupTime, margin, confidence: 0.95, bootstrapIterations: 10_000 },
  results: []
}
const fixtures: Array<{ stop: () => Promise<void> }> = []
let active: ReturnType<typeof spawn> | undefined
let interrupted = false
const interrupt = () => {
  interrupted = true
  active?.kill("SIGTERM")
}
process.on("SIGINT", interrupt)
process.on("SIGTERM", interrupt)
const save = async () => {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
}
try {
  const standalone = selected.some((name) => name.startsWith("standalone-")) ? await startRedis() : undefined
  if (standalone) fixtures.push(standalone)
  const cluster = selected.some((name) => name.startsWith("cluster-")) ? await startCluster() : undefined
  if (cluster) fixtures.push(cluster)
  const info = String(await (standalone ?? cluster!.nodes[0]).command("INFO", "SERVER"))
  report.redis = info.match(/^redis_version:(.+)$/m)?.[1]?.trim()
  report.fixtureBackend = process.env.REDIS_SERVER_BIN ?? process.env.REDIS_TEST_IMAGE ?? "PATH redis-server or Docker"
  for (const name of selected) {
    const endpoints = name.startsWith("cluster-") ? cluster!.seeds : [standalone!]
    const runWorker = (implementation: "native" | "reference", iterations?: number): Promise<any> => {
      if (interrupted) throw new Error("Benchmark interrupted")
      return new Promise((resolveWorker, reject) => {
        active = spawn(process.execPath, [
          worker,
          JSON.stringify({
            implementation,
            referenceDir,
            name,
            endpoints: endpoints.map(({ host, port }) => ({ host, port })),
            warmupTime,
            calibrationTime: Math.min(250, time),
            iterations
          })
        ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"], timeout: Math.max(30_000, time * 10 + warmupTime * 2) })
        let stdout = ""
        let stderr = ""
        active.stdout!.on("data", (chunk) => stdout += chunk)
        active.stderr!.on("data", (chunk) => stderr += chunk)
        active.once("error", reject)
        active.once("close", (code, signal) => {
          active = undefined
          if (code !== 0) return reject(new Error(`${implementation} ${name} failed (${signal ?? code}): ${stderr}`))
          try {
            const result = JSON.parse(stdout)
            if (!result.verified || !(result.elapsedMs > 0)) throw new Error("Worker did not verify useful work")
            resolveWorker(result)
          } catch (error) {
            reject(error)
          }
        })
      })
    }
    console.log(`Calibrating ${name}`)
    const calibration = [await runWorker("native"), await runWorker("reference")]
    const iterations = Math.max(...calibration.map((result) => Math.ceil(result.iterations * time / result.elapsedMs)))
    const result: any = { name, iterations, calibration, pairs: [] }
    report.results.push(result)
    for (let round = 0; round < rounds; round++) {
      const order = round % 2 === 0 ? ["native", "reference"] as const : ["reference", "native"] as const
      const pair: any = { round, order }
      for (const implementation of order) pair[implementation] = await runWorker(implementation, iterations)
      result.pairs.push(pair)
      console.log(
        `${name} round ${round + 1}/${rounds}: native ${pair.native.elapsedMs.toFixed(1)} ms, reference ${
          pair.reference.elapsedMs.toFixed(1)
        } ms`
      )
      await save()
    }
    const interval = bootstrapMedianLogRatio(
      result.pairs.map((pair: any) => pair.native.nsPerCommand / pair.reference.nsPerCommand)
    )
    result.analysis = {
      ...interval,
      status: interval.highRatio <= 1 + margin / 100
        ? "parity"
        : interval.lowRatio > 1 + margin / 100
        ? "regression"
        : "inconclusive",
      nativeCommandsPerSecond: 1_000_000_000 / median(result.pairs.map((pair: any) => pair.native.nsPerCommand)),
      referenceCommandsPerSecond: 1_000_000_000 / median(result.pairs.map((pair: any) => pair.reference.nsPerCommand))
    }
    await save()
  }
  report.sourceStable = report.runtimeSourceHash === await runtimeSourceHash() &&
    report.workerHash === await hashFile(worker) && report.coordinatorHash === await hashFile(coordinator) &&
    report.statsHash === await hashFile(statsPath)
  report.completedAt = new Date().toISOString()
  await save()
  if (!report.sourceStable) {
    throw new Error(`Source or harness changed during measurement; report is invalid: ${output}`)
  }
  console.table(report.results.map(({ name, analysis }: any) => ({
    workload: name,
    "native commands/s": Math.round(analysis.nativeCommandsPerSecond),
    "reference commands/s": Math.round(analysis.referenceCommandsPerSecond),
    "elapsed ratio": analysis.ratio.toFixed(3),
    "95% interval": `${analysis.lowRatio.toFixed(3)}–${analysis.highRatio.toFixed(3)}`,
    status: analysis.status
  })))
  console.log(`Report: ${output}`)
  if (values["require-parity"] && report.results.some((result: any) => result.analysis.status !== "parity")) {
    process.exitCode = 1
  }
  if (values["fail-on-regression"] && report.results.some((result: any) => result.analysis.status === "regression")) {
    process.exitCode = 1
  }
} finally {
  active?.kill("SIGTERM")
  for (const fixture of fixtures.reverse()) await fixture.stop()
  process.off("SIGINT", interrupt)
  process.off("SIGTERM", interrupt)
}
