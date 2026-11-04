/**
 * Microbenchmarks for the costs the spec quotes: what the record-service
 * branch adds to `Context.getUnsafe` with an ordinary key, what a 30-member
 * `yield* FileSystem` costs against yielding a plain record service, what
 * `Context.add` costs with a record key, and what an operation call costs
 * against a method call on a yielded record.
 *
 *   pnpm bench
 *
 * The baseline is the `Context.ts` of the branch point (`git merge-base HEAD
 * origin/v4/next-minor`), extracted into `dist/baseline/` with its imports
 * pointed at `packages/effect/src`, so both versions run in one process
 * against the same `effect` runtime.
 */
import * as Effect from "effect/Effect"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { Bench } from "tinybench"
import * as FileSystem from "../src/FileSystem.ts"

import * as Context from "effect/Context"

const root = path.resolve(import.meta.dirname, "..")
const repo = path.resolve(root, "..", "..")
const baselineDirectory = path.join(root, "dist", "baseline")
const baselineFile = path.join(baselineDirectory, "Context.ts")

const base = execFileSync("git", ["merge-base", "HEAD", "origin/v4/next-minor"], { cwd: repo, encoding: "utf8" }).trim()
const baselineSource = execFileSync("git", ["show", `${base}:packages/effect/src/Context.ts`], {
  cwd: repo,
  encoding: "utf8"
})
fs.mkdirSync(baselineDirectory, { recursive: true })
fs.writeFileSync(
  baselineFile,
  baselineSource.replaceAll(
    "from \"./",
    `from "${path.relative(baselineDirectory, path.join(repo, "packages", "effect", "src")).replaceAll(path.sep, "/")}/`
  )
)
const Baseline: typeof Context = await import(baselineFile)

// A thirty-member record, and a context holding it both ways: spread into thirty slots (record service) and as
// one slot under a plain key (how a record service is stored today).
const record: Record<string, unknown> = {}
for (const name of Object.keys(FileSystem.FileSystem.members)) record[name] = () => Effect.void
const Plain = Context.Service<Record<string, unknown>>("effect/FileSystem/plain")
const PlainBaseline = Baseline.Service<Record<string, unknown>>("effect/FileSystem/plain")
const spreadContext = Context.make(FileSystem.FileSystem, record as FileSystem.Shape)
const plainContext = Context.make(Plain, record)
const plainBaselineContext = Baseline.make(PlainBaseline, record)
const readFile = FileSystem.readFile.service

// A fiber-level comparison: the same two-operation program as an operation call, as a method call on a yielded
// record service, and as a method call on a yielded plain record service.
const viaOperation = Effect.provide(FileSystem.readFile("a"), spreadContext)
const viaRecord = Effect.provide(Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFile("a")), spreadContext)
const viaPlain = Effect.provide(
  Effect.flatMap(Plain, (fs) => (fs.readFile as () => Effect.Effect<void>)()),
  plainContext
)
const yieldRecord = Effect.provide(FileSystem.FileSystem, spreadContext)
const yieldRecordFresh = Effect.provide(FileSystem.FileSystem, Context.add(spreadContext, Plain, record)).pipe(
  Effect.provideService(Plain, record)
)
const yieldPlain = Effect.provide(Plain, plainContext)
const yieldReadOnly = Effect.provide(FileSystem.ReadOnly, spreadContext)

const bench = new Bench({ time: 300, warmupTime: 100 })
bench
  .add("getUnsafe, ordinary key, baseline", () => Baseline.getUnsafe(plainBaselineContext, PlainBaseline))
  .add("getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain))
  .add("getUnsafe, operation key (1 of 30 slots)", () => Context.getUnsafe(spreadContext, readFile))
  .add(
    "getUnsafe, ReadOnly record (3 slots), same context",
    () => Context.getUnsafe(spreadContext, FileSystem.ReadOnly)
  )
  .add(
    "getUnsafe, ReadOnly record (3 slots), new context",
    () => Context.getUnsafe(Context.add(spreadContext, Plain, record), FileSystem.ReadOnly)
  )
  .add(
    "getUnsafe, FileSystem record (30 slots), same context",
    () => Context.getUnsafe(spreadContext, FileSystem.FileSystem)
  )
  .add(
    "getUnsafe, FileSystem record (30 slots), new context",
    () => Context.getUnsafe(Context.add(spreadContext, Plain, record), FileSystem.FileSystem)
  )
  .add(
    "add then getUnsafe, ordinary key, new context",
    () => Context.getUnsafe(Context.add(spreadContext, Plain, record), Plain)
  )
  .add("add, ordinary key, baseline", () => Baseline.add(plainBaselineContext, PlainBaseline, record))
  .add("add, ordinary key, this branch", () => Context.add(plainContext, Plain, record))
  .add(
    "add, FileSystem record (30 slots)",
    () => Context.add(spreadContext, FileSystem.FileSystem, record as FileSystem.Shape)
  )
  .add("make, FileSystem record (30 slots)", () => Context.make(FileSystem.FileSystem, record as FileSystem.Shape))
  .add("runSync: yield* Plain (one slot)", () => Effect.runSync(yieldPlain))
  .add("runSync: yield* ReadOnly (3 slots)", () => Effect.runSync(yieldReadOnly))
  .add("runSync: yield* FileSystem (30 slots)", () => Effect.runSync(yieldRecord))
  .add("runSync: yield* FileSystem (30 slots), uncached", () => Effect.runSync(yieldRecordFresh))
  .add("runSync: readFile(path) operation call", () => Effect.runSync(viaOperation))
  .add("runSync: (yield* FileSystem).readFile(path)", () => Effect.runSync(viaRecord))
  .add("runSync: (yield* Plain).readFile(path)", () => Effect.runSync(viaPlain))

await bench.run()

const ns = (task: (typeof bench.tasks)[number]) => (task.result as { latency?: { mean: number } }).latency!.mean * 1e6
console.log(`baseline: ${base.slice(0, 10)}\n`)
for (const task of bench.tasks) {
  console.log(`  ${task.name.padEnd(58)} ${ns(task).toFixed(1).padStart(8)} ns/op`)
}
const ratio = (a: string, b: string) =>
  ns(bench.tasks.find((t) => t.name === a)!) / ns(bench.tasks.find((t) => t.name === b)!)
console.log(
  `\n  ordinary-key getUnsafe, this branch / baseline: ${
    ratio("getUnsafe, ordinary key, this branch", "getUnsafe, ordinary key, baseline").toFixed(2)
  }`
)
console.log(
  `  ordinary-key add, this branch / baseline:       ${
    ratio("add, ordinary key, this branch", "add, ordinary key, baseline").toFixed(2)
  }`
)
console.log(
  `  yield* FileSystem / yield* Plain:               ${
    ratio("runSync: yield* FileSystem (30 slots)", "runSync: yield* Plain (one slot)").toFixed(2)
  }`
)
