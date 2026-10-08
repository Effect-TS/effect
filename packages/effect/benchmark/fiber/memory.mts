// Controlled memory experiments (Node only). Every measurement runs in a fresh
// `node --expose-gc` child; heap readings are taken after FORCED GC, so outputs
// carry `forcedGc: true` and must never be mixed with throughput results.
//
// Single root:  node memory.mts [--root <dir>] --scenario <name> [--n 50000] [--repeats 5] [--child-yields k] [--json]
// Paired:       node memory.mts --base <dir> --head <dir> --scenario <name> [--n 50000] [--repeats 5]
// allocation:   node memory.mts --scenario allocation --workload <name> [--iterations 20] [--rewarm-iterations 0] [--size k=v]
//
// Scenarios: suspended, suspended-never, completed-handles, released, peak-fanout, allocation
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import {
  environment,
  formatBytes,
  numberOption,
  parseArgs,
  parseSizeOverrides,
  printTable,
  resolveOutput,
  resolveRoot,
  sourceIdentity,
  timestamp,
  warnIfLoaded,
  writeJson
} from "./shared.mts"

const scenarios = ["suspended", "suspended-never", "completed-handles", "released", "peak-fanout", "allocation"]

const fieldNotes = {
  heapUsed: "V8 heap bytes in use (process.memoryUsage().heapUsed). Read after forced full GC it approximates live " +
    "retained bytes; deltas are relative to a settled baseline taken after an identical warm-up pass.",
  rss: "Resident set size of the whole process: V8 heap pages, code, native/malloc memory. Pages are not returned " +
    "to the OS promptly, so RSS shows peaks/footprint, not retention.",
  allocated: "Cumulative bytes allocated on the V8 heap regardless of lifetime " +
    "(v8.getHeapStatistics().total_allocated_bytes delta): GC pressure, not footprint."
}

// -----------------------------------------------------------------------------
// child: one measurement
// -----------------------------------------------------------------------------

const settle = async (rounds = 4) => {
  for (let i = 0; i < rounds; i++) {
    await new Promise((resolve) => setImmediate(resolve))
    globalThis.gc()
  }
}

const heapUsed = () => process.memoryUsage().heapUsed

const runChild = async (options) => {
  if (typeof globalThis.gc !== "function") throw new Error("memory child must run with node --expose-gc")
  const root = resolveRoot(options.root)
  const scenario = options.scenario
  const E = await import(pathToFileURL(join(root, "packages/effect/src/index.ts")).href)
  const { Deferred, Effect, Exit, Fiber } = E
  const n = numberOption(options, "n", scenario === "peak-fanout" ? 100_000 : 50_000)
  const awaitFiber = (fiber) => Effect.runPromise(Fiber.await(fiber))

  // Children optionally yield `childYields` times first, which gives each of
  // them its own scheduler dispatcher.
  const childYields = numberOption(options, "child-yields", 0)
  const afterYields = (effect) => {
    for (let i = 0; i < childYields; i++) effect = Effect.andThen(Effect.yieldNow, effect)
    return effect
  }

  // Starts n children blocked on a Deferred (or never) under one root fiber.
  const startSuspended = async (count, blockOn) => {
    const deferred = Deferred.makeUnsafe()
    let markReady
    const ready = new Promise((resolve) => {
      markReady = resolve
    })
    const blocker = afterYields(blockOn === "never" ? Effect.never : Deferred.await(deferred))
    const rootFiber = Effect.runFork(Effect.gen(function*() {
      for (let i = 0; i < count; i++) yield* Effect.forkChild(blocker)
      yield* Effect.yieldNow
      markReady()
      yield* Deferred.await(deferred)
    }))
    await ready
    return {
      release: async () => {
        if (blockOn === "never") await Effect.runPromise(Fiber.interrupt(rootFiber))
        else Deferred.doneUnsafe(deferred, Exit.void)
        await awaitFiber(rootFiber)
      }
    }
  }

  const measurements = {}
  const perFiber = (bytes) => bytes / n

  switch (scenario) {
    case "suspended":
    case "suspended-never": {
      const blockOn = scenario === "suspended" ? "deferred" : "never"
      const warm = await startSuspended(Math.min(n, 1_000), blockOn)
      await warm.release()
      await settle()
      const before = process.memoryUsage()
      let handle = await startSuspended(n, blockOn)
      await settle()
      const during = process.memoryUsage()
      await handle.release()
      handle = undefined
      await settle(6)
      const after = process.memoryUsage()
      Object.assign(measurements, {
        heapUsedPerSuspendedFiber: perFiber(during.heapUsed - before.heapUsed),
        rssPerSuspendedFiber: perFiber(during.rss - before.rss),
        heapUsedRetainedAfterRelease: after.heapUsed - before.heapUsed,
        heapUsedRetainedAfterReleasePerFiber: perFiber(after.heapUsed - before.heapUsed)
      })
      break
    }
    case "completed-handles": {
      const forkAll = (count) =>
        Effect.runPromise(Effect.gen(function*() {
          const handles = []
          for (let i = 0; i < count; i++) handles.push(yield* Effect.forkChild(afterYields(Effect.succeed(i))))
          yield* Fiber.joinAll(handles)
          return handles
        }))
      await forkAll(Math.min(n, 1_000))
      await settle()
      const before = heapUsed()
      const handles = await forkAll(n)
      await settle()
      const withHandles = heapUsed()
      handles.fill(null)
      await settle()
      const arrayOnly = heapUsed()
      handles.length = 0
      await settle()
      const after = heapUsed()
      Object.assign(measurements, {
        heapUsedPerCompletedHandle: perFiber(withHandles - arrayOnly),
        handleArrayBytesPerFiber: perFiber(arrayOnly - before),
        heapUsedRetainedAfterRelease: after - before
      })
      break
    }
    case "released": {
      const forkInterrupt = (count) =>
        Effect.runPromise(Effect.gen(function*() {
          const handles = []
          for (let i = 0; i < count; i++) handles.push(yield* Effect.forkChild(Effect.never))
          yield* Effect.yieldNow
          yield* Fiber.interruptAll(handles)
        }))
      await forkInterrupt(Math.min(n, 1_000))
      await settle()
      const before = heapUsed()
      await forkInterrupt(n)
      // Several settle passes (gc + macrotask turns, then a short timer) so weak
      // callbacks / FinalizationRegistry cleanups get a chance to run.
      const settledAfter = []
      const passes = numberOption(options, "settles", 6)
      for (let i = 0; i < passes; i++) {
        await settle(2)
        await new Promise((resolve) => setTimeout(resolve, 5))
        settledAfter.push(heapUsed() - before)
      }
      Object.assign(measurements, {
        heapUsedRetainedAfterRelease: settledAfter[settledAfter.length - 1],
        heapUsedRetainedAfterReleasePerFiber: perFiber(settledAfter[settledAfter.length - 1]),
        heapUsedRetainedFirstSettle: settledAfter[0]
      })
      measurements.settleSeries = settledAfter
      break
    }
    case "peak-fanout": {
      const fanout = (count, onTop) => {
        let started = 0
        const items = Array.from({ length: count }, (_, i) => i)
        return Effect.runPromise(Effect.forEach(items, () =>
          Effect.suspend(() => {
            if (++started === count) onTop()
            return Effect.yieldNow
          }), { concurrency: "unbounded", discard: true }))
      }
      await fanout(Math.min(n, 1_000), () => {})
      await settle()
      const before = process.memoryUsage()
      let peakHeap = before.heapUsed
      let peakRss = before.rss
      let samplesTaken = 0
      const sample = () => {
        const usage = process.memoryUsage()
        samplesTaken++
        if (usage.heapUsed > peakHeap) peakHeap = usage.heapUsed
        if (usage.rss > peakRss) peakRss = usage.rss
        return usage
      }
      let top
      const interval = setInterval(sample, 1)
      const start = performance.now()
      await fanout(n, () => {
        top = sample()
      })
      const durationMs = performance.now() - start
      clearInterval(interval)
      Object.assign(measurements, {
        heapUsedAtTopPerItem: perFiber(top.heapUsed - before.heapUsed),
        peakHeapUsedPerItem: perFiber(peakHeap - before.heapUsed),
        peakHeapUsedDelta: peakHeap - before.heapUsed,
        peakRssDelta: peakRss - before.rss,
        durationMs,
        memorySamples: samplesTaken
      })
      break
    }
    case "allocation": {
      if (typeof options.workload !== "string") throw new Error("allocation requires --workload <name>")
      const v8 = await import("node:v8")
      const { PerformanceObserver } = await import("node:perf_hooks")
      const { findWorkload } = await import("./workloads.ts")
      const workload = findWorkload(options.workload)
      const iterations = numberOption(options, "iterations", 20)
      const warmupIterations = numberOption(options, "warmup-iterations", 5)
      // The forced GCs in settle() can discard optimized code, so the first
      // measured iterations otherwise include recompilation and cold-code
      // allocation. Re-warming measures steady state instead.
      const rewarmIterations = numberOption(options, "rewarm-iterations", 0)
      const instance = workload.make(E, { ...workload.size, ...parseSizeOverrides(options.size) })
      for (let i = 0; i < warmupIterations; i++) await instance.run()
      instance.validate()
      await settle()
      for (let i = 0; i < rewarmIterations; i++) await instance.run()
      const gcCounts = { scavenges: 0, majors: 0, other: 0 }
      let counting = true
      const observer = new PerformanceObserver((list) => {
        if (!counting) return
        for (const entry of list.getEntries()) {
          const kind = entry.detail?.kind
          if (kind === 1) gcCounts.scavenges++
          else if (kind === 4) gcCounts.majors++
          else gcCounts.other++
        }
      })
      observer.observe({ entryTypes: ["gc"] })
      const profiler = new v8.GCProfiler()
      profiler.start()
      const usedStart = v8.getHeapStatistics().used_heap_size
      const allocatedStart = v8.getHeapStatistics().total_allocated_bytes
      for (let i = 0; i < iterations; i++) await instance.run()
      const allocatedEnd = v8.getHeapStatistics().total_allocated_bytes
      const usedEnd = v8.getHeapStatistics().used_heap_size
      const profile = profiler.stop()
      await new Promise((resolve) => setTimeout(resolve, 0))
      for (const entry of observer.takeRecords()) {
        const kind = entry.detail?.kind
        if (kind === 1) gcCounts.scavenges++
        else if (kind === 4) gcCounts.majors++
        else gcCounts.other++
      }
      counting = false
      observer.disconnect()
      instance.validate()
      // Cross-check: bytes reclaimed by every GC plus net heap growth.
      let reclaimed = 0
      for (const stat of profile.statistics) {
        reclaimed += stat.beforeGC.heapStatistics.usedHeapSize - stat.afterGC.heapStatistics.usedHeapSize
      }
      const allocated = allocatedStart === undefined ? NaN : allocatedEnd - allocatedStart
      Object.assign(measurements, {
        allocatedBytesPerIteration: allocated / iterations,
        allocatedBytesTotal: allocated,
        gcProfilerEstimatePerIteration: (reclaimed + usedEnd - usedStart) / iterations,
        scavenges: gcCounts.scavenges,
        majorGcs: gcCounts.majors,
        otherGcs: gcCounts.other,
        iterations,
        rewarmIterations
      })
      measurements.method = allocatedStart === undefined
        ? "total_allocated_bytes unavailable; use gcProfilerEstimatePerIteration"
        : "delta of v8.getHeapStatistics().total_allocated_bytes; cross-check = sum of GC reclaimed bytes " +
          "(v8.GCProfiler) + net used_heap_size growth"
      measurements.workload = workload.name
      break
    }
    default:
      throw new Error(`Unknown scenario ${scenario}. Known: ${scenarios.join(", ")}`)
  }

  return {
    scenario,
    forcedGc: true,
    n: scenario === "allocation" ? undefined : n,
    source: sourceIdentity(root),
    node: process.version,
    measurements
  }
}

// -----------------------------------------------------------------------------
// parent: repeated fresh processes, optional base/head pairing
// -----------------------------------------------------------------------------

const scriptPath = fileURLToPath(import.meta.url)

const spawnChild = (root, options) => {
  const forwarded = ["scenario", "n", "workload", "iterations", "warmup-iterations", "rewarm-iterations", "size", "settles", "child-yields"]
  const args = ["--expose-gc", scriptPath, "--child", "--root", root]
  for (const key of forwarded) {
    if (typeof options[key] === "string") args.push(`--${key}`, options[key])
  }
  const result = spawnSync(process.execPath, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`memory child failed: ${result.stderr}\n${result.stdout}`)
  const lines = result.stdout.trim().split("\n")
  return JSON.parse(lines[lines.length - 1])
}

const summarize = (runs) => {
  const summary = {}
  for (const key of Object.keys(runs[0].measurements)) {
    const values = runs.map((run) => run.measurements[key])
    if (typeof values[0] !== "number") continue
    const sorted = values.slice().sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    summary[key] = {
      median: sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    }
  }
  return summary
}

const isBytes = (key) => !/durationMs|Samples|scavenges|Gcs|[iI]terations/.test(key)
const fmt = (key, value) => isBytes(key) ? formatBytes(value) : Number(value).toFixed(2)

const options = parseArgs()
if (options.child === true) {
  console.log(JSON.stringify(await runChild(options)))
  process.exit(0)
}

if (!scenarios.includes(options.scenario)) {
  throw new Error(`--scenario must be one of ${scenarios.join(", ")}`)
}
const repeats = numberOption(options, "repeats", 5)
warnIfLoaded()
const env = environment("node")

if (options.base !== undefined || options.head !== undefined) {
  const base = resolveRoot(options.base)
  const head = resolveRoot(options.head)
  const sides = { base: [], head: [] }
  for (let r = 0; r < repeats; r++) {
    for (const side of r % 2 === 0 ? ["base", "head"] : ["head", "base"]) {
      sides[side].push(spawnChild(side === "base" ? base : head, options))
    }
  }
  const baseSummary = summarize(sides.base)
  const headSummary = summarize(sides.head)
  const rows = Object.keys(baseSummary).map((key) => {
    const pairedDeltas = sides.base.map((run, i) => sides.head[i].measurements[key] - run.measurements[key])
      .sort((a, b) => a - b)
    const b = baseSummary[key]
    const h = headSummary[key]
    return [
      key,
      `${fmt(key, b.median)} [${fmt(key, b.min)}, ${fmt(key, b.max)}]`,
      `${fmt(key, h.median)} [${fmt(key, h.min)}, ${fmt(key, h.max)}]`,
      fmt(key, h.median - b.median),
      `[${fmt(key, pairedDeltas[0])}, ${fmt(key, pairedDeltas[pairedDeltas.length - 1])}]`
    ]
  })
  console.log(
    `memory ${options.scenario} (forcedGc: true), ${repeats} paired fresh processes\nbase ${base}\nhead ${head}`
  )
  printTable(["field", "base median [min, max]", "head median [min, max]", "delta", "paired delta range"], rows)
  const output = resolveOutput(options.output, `memory-compare-${options.scenario}-${timestamp()}.json`)
  writeJson(output, {
    kind: "fiberperf-memory-compare",
    forcedGc: true,
    fieldNotes,
    args: options,
    environment: env,
    summary: { base: baseSummary, head: headSummary },
    runs: sides
  })
  console.log(`raw results: ${output}`)
} else {
  const root = resolveRoot(options.root)
  const runs = []
  for (let r = 0; r < repeats; r++) runs.push(spawnChild(root, options))
  const summary = summarize(runs)
  const result = {
    kind: "fiberperf-memory",
    forcedGc: true,
    fieldNotes,
    args: options,
    environment: env,
    summary,
    runs
  }
  if (options.json === true) {
    console.log(JSON.stringify(result))
  } else {
    console.log(`memory ${options.scenario} (forcedGc: true), ${repeats} fresh processes, root ${root}`)
    printTable(
      ["field", "median", "min", "max"],
      Object.entries(summary).map(([key, s]) => [key, fmt(key, s.median), fmt(key, s.min), fmt(key, s.max)])
    )
    const output = resolveOutput(options.output, `memory-${options.scenario}-${timestamp()}.json`)
    writeJson(output, result)
    console.log(`raw results: ${output}`)
  }
}
