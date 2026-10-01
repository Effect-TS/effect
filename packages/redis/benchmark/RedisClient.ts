import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { cpus, platform, release } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { startCluster, startRedis } from "../test/utils/redis-server.ts"

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
    base: { type: "string" },
    head: { type: "string" },
    case: { type: "string", multiple: true },
    rounds: { type: "string", default: "13" },
    time: { type: "string", default: "1500" },
    "warmup-time": { type: "string", default: "500" },
    "fail-on-regression": { type: "boolean", default: false },
    validate: { type: "boolean", default: false },
    profile: { type: "boolean", default: false },
    "profile-time": { type: "string", default: "10000" },
    "sampling-interval": { type: "string", default: "1000" },
    output: { type: "string" },
    help: { type: "boolean", default: false }
  }
})
if (values.help) {
  console.log([
    "Usage: node packages/redis/benchmark/RedisClient.ts --base <ref> --head <ref> [options]",
    "",
    "--case <name>             Repeat to select workloads; defaults to all eight",
    "--rounds <n>              Alternating paired fresh processes (default 13)",
    "--time <ms>               Common calibrated work target (default 1500)",
    "--warmup-time <ms>        Warmup in each fresh process (default 500)",
    "--fail-on-regression     Nonzero exit on a paired interval entirely above 1",
    "--validate               Verify two iterations per case on --head; no comparison",
    "--profile                Sample warmed native CPU work on --head; no comparison",
    "--profile-time <ms>       Duration per profile (default 10000)",
    "--sampling-interval <us>  CPU sampling interval (default 1000)",
    "--output <file>          JSON report; CPU profiles are saved beside it",
    "",
    "Cases: " + cases.join(", ")
  ].join("\n"))
  process.exit(0)
}
if (values.validate && values.profile) throw new Error("Select either --validate or --profile")
const mode = values.validate ? "validate" : values.profile ? "profile" : "compare"
if (!values.head || (mode === "compare" && !values.base)) {
  throw new Error(
    mode === "compare" ? "--base and --head committed refs are required" : "--head committed ref is required"
  )
}
if (mode !== "compare" && values.base) throw new Error("--base applies only to comparison")
const positive = (value: string, label: string) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(label + " must be positive")
  return number
}
const settings = {
  rounds: positive(values.rounds, "rounds"),
  time: positive(values.time, "time"),
  warmupTime: positive(values["warmup-time"], "warmup-time"),
  calibrationTime: 250,
  profileTime: positive(values["profile-time"], "profile-time"),
  samplingInterval: positive(values["sampling-interval"], "sampling-interval"),
  confidence: 0.95,
  bootstrapIterations: 10_000
}
if (!Number.isInteger(settings.rounds) || settings.rounds < 2) throw new Error("rounds must be an integer >= 2")
if (!Number.isInteger(settings.samplingInterval)) throw new Error("sampling-interval must be an integer")
const selected = values.case ?? [...cases]
if (new Set(selected).size !== selected.length) throw new Error("Select distinct cases")
for (const name of selected) {
  if (!cases.includes(name as typeof cases[number])) throw new Error("Unknown case: " + name)
}
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const workerPath = fileURLToPath(new URL("./RedisClientWorker.ts", import.meta.url))
const workerRelative = "packages/redis/benchmark/RedisClientWorker.ts"
const statsPath = join(repoRoot, "packages/effect/runtimeperf/stats.mts")
const fixturePath = join(repoRoot, "packages/redis/test/utils/redis-server.ts")
const git = (root: string, args: ReadonlyArray<string>) => {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}
type Side = "base" | "head"
const sides: ReadonlyArray<Side> = mode === "compare" ? ["base", "head"] : ["head"]
const resolved: Partial<Record<Side, string>> = {
  ...(mode === "compare" ? { base: git(repoRoot, ["rev-parse", "--verify", values.base + "^{commit}"]) } : {}),
  head: git(repoRoot, ["rev-parse", "--verify", values.head + "^{commit}"])
}
const output = resolve(
  values.output ?? join(repoRoot, "tmp/runtimeperf/results", "redis-native-" + mode + "-" + Date.now() + ".json")
)
const hashFile = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex")
const sourcePaths = [
  "packages/effect/src",
  "packages/redis/src",
  "packages/platform/node/src",
  "packages/platform/node-shared/src"
]
const fingerprint = async (root: string) => {
  // Only the canonical worker overlay may differ from the committed checkout.
  const changed = git(root, ["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean)
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean)
  if ([...changed, ...untracked].some((file) => file !== workerRelative)) {
    throw new Error("Unexpected worktree change: " + root)
  }
  const files = git(root, ["ls-files", "--cached", "--", ...sourcePaths]).split("\n").filter(Boolean).sort()
  const hash = createHash("sha256")
  for (const file of files) hash.update(file + "\0").update(await readFile(join(root, file))).update("\0")
  return {
    root,
    head: git(root, ["rev-parse", "HEAD"]),
    runtimeSourceHash: hash.digest("hex"),
    workerHash: await hashFile(join(root, workerRelative))
  }
}
const resolutionGuards = (root: string) => {
  const fromWorker = createRequire(join(root, workerRelative))
  const fromNode = createRequire(join(root, "packages/platform/node/src/NodeRedis.ts"))
  const fromShared = createRequire(join(root, "packages/platform/node-shared/src/NodeRedis.ts"))
  const fromTransport = createRequire(join(root, "packages/platform/node-shared/src/internal/redisTransport.ts"))
  const actual = {
    workerEffect: fromWorker.resolve("effect/Effect"),
    workerCommand: fromWorker.resolve("@effect/redis/RedisCommand"),
    facadeShared: fromNode.resolve("@effect/platform-node-shared/NodeRedis"),
    sharedEffect: fromShared.resolve("effect/Effect"),
    sharedClient: fromShared.resolve("@effect/redis/RedisClient"),
    transportEffect: fromTransport.resolve("effect/Effect"),
    transportError: fromTransport.resolve("@effect/redis/RedisError")
  }
  const expected = {
    workerEffect: join(root, "packages/effect/src/Effect.ts"),
    workerCommand: join(root, "packages/redis/src/RedisCommand.ts"),
    facadeShared: join(root, "packages/platform/node-shared/src/NodeRedis.ts"),
    sharedEffect: join(root, "packages/effect/src/Effect.ts"),
    sharedClient: join(root, "packages/redis/src/RedisClient.ts"),
    transportEffect: join(root, "packages/effect/src/Effect.ts"),
    transportError: join(root, "packages/redis/src/RedisError.ts")
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Foreign workspace module resolution: " + root)
  }
  return actual
}
const harnessFingerprint = async () => ({
  coordinatorHash: await hashFile(fileURLToPath(import.meta.url)),
  workerHash: await hashFile(workerPath),
  statsHash: await hashFile(statsPath),
  fixtureHash: await hashFile(fixturePath)
})
const profileSummary = async (path: string, root: string) => {
  const profile = JSON.parse(await readFile(path, "utf8"))
  const nodes = new Map<number, any>(profile.nodes.map((node: any) => [node.id, node]))
  const selfTime = new Map<number, number>()
  for (let index = 0; index < profile.samples.length; index++) {
    const id = profile.samples[index]
    selfTime.set(id, (selfTime.get(id) ?? 0) + profile.timeDeltas[index])
  }
  const total = [...selfTime.values()].reduce((sum, value) => sum + value, 0)
  return {
    samples: profile.samples.length,
    durationMs: total / 1000,
    topSelf: [...selfTime].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([id, micros]) => {
      const frame = nodes.get(id).callFrame
      return {
        function: frame.functionName || "(anonymous)",
        url: frame.url.replace(root, "<worktree>"),
        line: frame.lineNumber + 1,
        selfMs: micros / 1000,
        percent: 100 * micros / total
      }
    })
  }
}
await mkdir(join(repoRoot, "tmp/runtimeperf/worktrees"), { recursive: true })
const directory = await mkdtemp(join(repoRoot, "tmp/runtimeperf/worktrees/redis-native-"))
const roots = { base: join(directory, "base"), head: join(directory, "head") }
const added: Array<Side> = []
const fixtures: Array<{ readonly stop: () => Promise<void> }> = []
let active: ReturnType<typeof spawn> | undefined
let interrupted = false
const interrupt = () => {
  interrupted = true
  active?.kill("SIGTERM")
}
process.on("SIGINT", interrupt)
process.on("SIGTERM", interrupt)
const report: any = {
  protocol: "redis-native-" + mode + "-v1",
  startedAt: new Date().toISOString(),
  mode,
  resolved,
  node: process.version,
  cpu: cpus()[0]?.model,
  platform: platform(),
  osRelease: release(),
  settings,
  selectedCases: selected,
  results: [],
  sourceStable: false,
  fixturesStopped: false,
  worktreesRemoved: false
}
const save = async () => {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + "\n")
}
try {
  const canonicalWorker = await readFile(workerPath)
  const harness = await harnessFingerprint()
  report.harness = {
    ...harness,
    head: git(repoRoot, ["rev-parse", "HEAD"]),
    diffHash: createHash("sha256").update(git(repoRoot, ["diff", "HEAD", "--", "packages/redis/benchmark"])).digest(
      "hex"
    ),
    workerSource: workerPath,
    overlay: workerRelative
  }
  for (const side of sides) {
    git(repoRoot, ["worktree", "add", "--detach", roots[side], resolved[side]!])
    added.push(side)
    await mkdir(join(roots[side], "node_modules/@effect"), { recursive: true })
    const links = {
      effect: "packages/effect",
      "@effect/redis": "packages/redis",
      "@effect/platform-node": "packages/platform/node",
      "@effect/platform-node-shared": "packages/platform/node-shared"
    }
    for (const [name, path] of Object.entries(links)) {
      await symlink(join(roots[side], path), join(roots[side], "node_modules", name), "dir")
    }
    await writeFile(join(roots[side], workerRelative), canonicalWorker)
  }
  const initial = Object.fromEntries(
    await Promise.all(sides.map(async (side) => [side, await fingerprint(roots[side])]))
  )
  const guards = Object.fromEntries(sides.map((side) => [side, resolutionGuards(roots[side])]))
  for (const side of sides) {
    if (initial[side].head !== resolved[side] || initial[side].workerHash !== harness.workerHash) {
      throw new Error("Frozen ref or worker overlay differs")
    }
  }
  report.sources = initial
  report.resolutionGuards = guards
  const standalone = selected.some((name) => name.startsWith("standalone-")) ? await startRedis() : undefined
  if (standalone) fixtures.push(standalone)
  const cluster = selected.some((name) => name.startsWith("cluster-")) ? await startCluster() : undefined
  if (cluster) fixtures.push(cluster)
  const info = String(await (standalone ?? cluster!.nodes[0]).command("INFO", "SERVER"))
  report.redis = info.match(/^redis_version:(.+)$/m)?.[1]?.trim()
  report.fixtureBackend = process.env.REDIS_SERVER_BIN ?? process.env.REDIS_TEST_IMAGE ?? "PATH redis-server or Docker"
  report.fixtureTopologies = [standalone ? "Standalone" : undefined, cluster ? "Cluster" : undefined].filter(Boolean)
  for (const name of selected) {
    const endpoints = (name.startsWith("cluster-") ? cluster!.seeds : [standalone!]).map(({ host, port }) => ({
      host,
      port
    }))
    const runWorker = (side: Side, iterations?: number, profilePath?: string): Promise<any> => {
      if (interrupted) throw new Error("Benchmark interrupted")
      return new Promise((accept, reject) => {
        active = spawn(process.execPath, [
          join(roots[side], workerRelative),
          JSON.stringify({
            name,
            endpoints,
            warmupTime: settings.warmupTime,
            calibrationTime: settings.calibrationTime,
            iterations,
            profilePath,
            profileTime: settings.profileTime,
            samplingInterval: settings.samplingInterval
          })
        ], {
          cwd: roots[side],
          stdio: ["ignore", "pipe", "pipe"],
          timeout: Math.max(30_000, (profilePath ? settings.profileTime : settings.time) * 10 + settings.warmupTime * 2)
        })
        let stdout = "", stderr = ""
        active.stdout!.on("data", (chunk) => stdout += chunk)
        active.stderr!.on("data", (chunk) => stderr += chunk)
        active.once("error", reject)
        active.once("close", (code, signal) => {
          active = undefined
          if (code !== 0) return reject(new Error(side + " " + name + " failed (" + (signal ?? code) + "): " + stderr))
          try {
            const result = JSON.parse(stdout)
            const batchSize = name === "standalone-sequential" ? 1 : 128
            if (
              !result.verified || !(result.elapsedMs > 0) || result.implementation !== "native" ||
              result.name !== name ||
              result.node !== process.version || result.commands !== result.iterations * batchSize ||
              (iterations !== undefined && result.iterations !== iterations) ||
              (profilePath !== undefined && result.profilePath !== profilePath)
            ) {
              throw new Error("Invalid native worker observation")
            }
            accept({ side, ...result })
          } catch (error) {
            reject(error)
          }
        })
      })
    }
    if (mode === "validate") {
      report.results.push({ name, observation: await runWorker("head", 2) })
      console.log("Verified " + name)
    } else if (mode === "profile") {
      const profilePath = output.replace(/\.json$/, "") + "." + name + ".cpuprofile"
      await mkdir(dirname(profilePath), { recursive: true })
      const observation = await runWorker("head", undefined, profilePath)
      const result = {
        name,
        observation,
        profileHash: await hashFile(profilePath),
        profile: await profileSummary(profilePath, roots.head)
      }
      report.results.push(result)
      console.log("Profiled " + name + ": " + result.profile.samples + " samples; " + profilePath)
    } else {
      console.log("Calibrating " + name)
      const calibration = { base: await runWorker("base"), head: await runWorker("head") }
      const iterations = Math.max(
        ...Object.values(calibration).map((sample: any) =>
          Math.ceil(sample.iterations * settings.time / sample.elapsedMs)
        )
      )
      const result: any = { name, calibration, iterations, pairs: [] }
      report.results.push(result)
      for (let round = 0; round < settings.rounds; round++) {
        const order: ReadonlyArray<Side> = round % 2 === 0 ? ["base", "head"] : ["head", "base"]
        const pair: any = { round, order }
        for (const side of order) pair[side] = await runWorker(side, iterations)
        result.pairs.push(pair)
        console.log(
          name + " round " + (round + 1) + "/" + settings.rounds + ": base " + pair.base.elapsedMs.toFixed(1) +
            " ms, head " + pair.head.elapsedMs.toFixed(1) + " ms"
        )
        await save()
      }
      const interval = bootstrapMedianLogRatio(
        result.pairs.map((pair: any) => pair.head.nsPerCommand / pair.base.nsPerCommand)
      )
      result.analysis = {
        ...interval,
        status: interval.highRatio < 1 ? "improvement" : interval.lowRatio > 1 ? "regression" : "inconclusive",
        baseCommandsPerSecond: 1_000_000_000 / median(result.pairs.map((pair: any) => pair.base.nsPerCommand)),
        headCommandsPerSecond: 1_000_000_000 / median(result.pairs.map((pair: any) => pair.head.nsPerCommand))
      }
    }
    await save()
  }
  const final = Object.fromEntries(await Promise.all(sides.map(async (side) => [side, await fingerprint(roots[side])])))
  const finalGuards = Object.fromEntries(sides.map((side) => [side, resolutionGuards(roots[side])]))
  report.sourceStable = JSON.stringify(final) === JSON.stringify(initial) &&
    JSON.stringify(await harnessFingerprint()) === JSON.stringify(harness) &&
    JSON.stringify(finalGuards) === JSON.stringify(guards)
  if (!report.sourceStable) throw new Error("Runtime or harness changed during measurement")
  report.completedAt = new Date().toISOString()
  if (mode === "compare") {
    console.table(
      report.results.map(({ name, analysis }: any) => ({
        workload: name,
        "base commands/s": Math.round(analysis.baseCommandsPerSecond),
        "head commands/s": Math.round(analysis.headCommandsPerSecond),
        "elapsed ratio": analysis.ratio.toFixed(3),
        "95% interval": analysis.lowRatio.toFixed(3) + "–" + analysis.highRatio.toFixed(3),
        status: analysis.status
      }))
    )
    if (values["fail-on-regression"] && report.results.some((result: any) => result.analysis.status === "regression")) {
      process.exitCode = 1
    }
  }
  console.log("Report: " + output)
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error)
  throw error
} finally {
  active?.kill("SIGTERM")
  const stopped = await Promise.allSettled(fixtures.reverse().map((fixture) => fixture.stop()))
  report.fixturesStopped = stopped.every((result) => result.status === "fulfilled")
  const cleanupErrors = stopped.filter((result) => result.status === "rejected").map((result) => String(result.reason))
  let worktreesRemoved = true
  for (const side of added.reverse()) {
    try {
      git(repoRoot, ["worktree", "remove", "--force", roots[side]])
    } catch (error) {
      worktreesRemoved = false
      cleanupErrors.push(String(error))
    }
  }
  report.worktreesRemoved = worktreesRemoved
  if (worktreesRemoved) await rm(directory, { recursive: true, force: true })
  process.off("SIGINT", interrupt)
  process.off("SIGTERM", interrupt)
  report.cleanupErrors = cleanupErrors
  await save()
  if (cleanupErrors.length > 0) {
    console.error("Benchmark cleanup failed: " + cleanupErrors.join("; "))
    process.exitCode = 1
  }
}
