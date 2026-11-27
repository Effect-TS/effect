// Times runtime hot paths in two copies of effect, one process per copy and case, alternating
// base and current so that neither copy shares inline caches or machine drift with the other.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/isolated-bench.mjs <base dist> <current dist> [case ...]
// With no cases it runs all of them (about four minutes). Each cell is the median ns per operation
// over the runs.
// Differences under about 5% are noise on a quiet machine, more on a shared one.
import { spawnSync } from "node:child_process"
import * as Path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const cases = (M) => {
  const A = M.Context.Service("Bench/A")
  const B = M.Context.Service("Bench/B")
  const flat = M.Context.makeUnsafe(new Map(Array.from({ length: 16 }, (_, i) => ["Bench/" + i, i])).set(A.key, 1))
  const overlay = M.Context.add(M.Context.add(flat, B, 2), M.Context.Service("Bench/C"), 3)
  const program = M.Effect.succeed(1).pipe(M.Effect.map((n) => n + 1), M.Effect.flatMap((n) => M.Effect.succeed(n)))
  // Adding a fiber-cached key forces a fresh fiber cache on every run
  const refreshed = M.Effect.provideService(program, M.Scheduler.MaxOpsBeforeYield, 1024)
  const provided = M.Effect.provideService(program, B, 2)
  const cause = M.Cause.combine(M.Cause.fail({ code: 1, tags: ["a", "b"] }), M.Cause.die(new Error("boom")))
  const causeCopy = M.Cause.combine(M.Cause.fail({ code: 1, tags: ["a", "b"] }), M.Cause.die(cause.reasons[1].defect))
  const contextCopy = M.Context.makeUnsafe(new Map([...flat.mapUnsafe].reverse()))
  const exit = M.Exit.succeed({ id: 1, tags: ["a", "b"] })
  const exitCopy = M.Exit.succeed({ id: 1, tags: ["a", "b"] })
  const value = { id: 1, name: "x", nested: { list: [1, 2, 3], date: new Date(0) } }
  const mixed = [flat, overlay]
  const guarded = [exit, cause, value, 1, null, "x"]
  let i = 0
  return {
    "runSync": () => M.Effect.runSync(program),
    "runFork": () => M.Effect.runFork(program),
    "runSync, plain service added": () => M.Effect.runSync(provided),
    "runSync, fiber cache refreshed": () => M.Effect.runSync(refreshed),
    "Context.get flat": () => M.Context.get(flat, A),
    "Context.get overlay": () => M.Context.get(overlay, A),
    "Context.get flat+overlay": () => M.Context.get(mixed[i++ & 1], A),
    "Equal.equals(exit)": () => M.Equal.equals(exit, exitCopy),
    "Equal.equals(cause)": () => M.Equal.equals(cause, causeCopy),
    "Equal.equals(context)": () => M.Equal.equals(flat, contextCopy),
    // Fresh contexts, so every call computes the hash instead of reading the cache
    "Hash.hash(context)": () => M.Hash.hash(M.Context.makeUnsafe(new Map([[A.key, i++], [B.key, 2], ["Bench/C", 3]]))),
    "Hash.hash(context overlay)": () => M.Hash.hash(M.Context.add(flat, B, i++)),
    "Hash.hash(cause)": () => M.Hash.hash(M.Cause.fail({ code: i++ })),
    // Fresh values, so every call computes the hash instead of reading the cache
    "Hash.hash(object)": () => M.Hash.hash({ id: i++, name: "x", tags: ["a", "b"] }),
    "Hash.hash(Map)": () => M.Hash.hash(new Map([["a", i++], ["b", 2], ["c", 3]])),
    "Hash.hash(Set)": () => M.Hash.hash(new Set([i++, "b", "c"])),
    "Hash.hash(float)": () => M.Hash.hash(i++ + 0.5),
    "Cause.combine": () => M.Cause.combine(M.Cause.fail(i++), cause),
    "format(object)": () => M.Formatter.format(value),
    "String(cause)": () => String(cause),
    "Exit.isExit mixed": () => M.Exit.isExit(guarded[i++ % guarded.length]),
    "Predicate.hasProperty": () => M.Predicate.hasProperty(value, "id")
  }
}

const load = async (dir) => {
  const names = ["Effect", "Context", "Cause", "Exit", "Equal", "Hash", "Formatter", "Predicate", "Scheduler"]
  const modules = await Promise.all(names.map((name) => import(pathToFileURL(Path.resolve(dir, name + ".js")).href)))
  return Object.fromEntries(names.map((name, i) => [name, modules[i]]))
}

if (process.argv[2] === "--child") {
  const [dir, label] = process.argv.slice(3)
  const fn = cases(await load(dir))[label]
  // CLOCK=thread times the main thread's CPU time instead of wall time, so time spent
  // descheduled on a loaded machine does not count. Both clocks are in nanoseconds.
  const now = process.env.CLOCK === "thread"
    ? () => {
      const { system, user } = process.threadCpuUsage()
      return BigInt(user + system) * 1000n
    }
    : () => process.hrtime.bigint()
  // Size each sample to about 100 ms, so cheap and costly cases take the same wall time
  let sink = 0
  let iterations = 1000
  for (;;) {
    const start = now()
    for (let i = 0; i < iterations; i++) sink += fn() ? 1 : 0
    const elapsed = Number(now() - start)
    if (elapsed > 1e8) break
    iterations *= 2
  }
  const samples = []
  for (let round = 0; round < 5; round++) {
    const start = now()
    for (let i = 0; i < iterations; i++) sink += fn() ? 1 : 0
    samples.push(Number(now() - start) / iterations)
  }
  if (sink === -1) console.log("unreachable")
  console.log(samples.sort((a, b) => a - b)[2])
} else {
  const [baseDir, currentDir, ...selected] = process.argv.slice(2)
  const labels = selected.length > 0 ? selected : Object.keys(cases(await load(currentDir)))
  const runs = 7
  const time = (dir, label) =>
    Number(spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--child", dir, label], { encoding: "utf8" }).stdout)
  const median = (xs) => xs.slice().sort((a, b) => a - b)[xs.length >> 1]
  console.log(`node ${process.version}, one process per sample, ${runs} alternating runs, median ns/op`)
  // With CONTROL=1 every run also samples base a second time, so the base/base column shows
  // the noise of the same window the current/base column was measured in.
  const control = process.env.CONTROL === "1"
  console.log(
    control
      ? "| case | base | current | current/base | base/base control |\n|---|---:|---:|---:|---:|"
      : "| case | base | current | current/base |\n|---|---:|---:|---:|"
  )
  for (const label of labels) {
    const base = []
    const current = []
    const base2 = []
    for (let run = 0; run < runs; run++) {
      // Alternate which copy goes first
      if (run & 1) {
        current.push(time(currentDir, label))
        base.push(time(baseDir, label))
      } else {
        base.push(time(baseDir, label))
        current.push(time(currentDir, label))
      }
      if (control) base2.push(time(baseDir, label))
    }
    const b = median(base)
    const c = median(current)
    const extra = control ? ` ${(median(base2) / b).toFixed(2)} |` : ""
    console.log(`| ${label} | ${b.toFixed(1)} | ${c.toFixed(1)} | ${(c / b).toFixed(2)} |${extra}`)
  }
}
