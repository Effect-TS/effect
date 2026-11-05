/**
 * Microbenchmarks for the costs the spec quotes, measured as ratios against
 * the `Context.ts` of the branch point loaded beside this one, so both run in
 * one process against the same `effect` runtime.
 *
 *   pnpm bench                      # 11 rounds of about 100 ms per case
 *   BENCH_ROUNDS=11 BENCH_TIME=300 pnpm bench
 *
 * Each case is a tight loop: the iteration count is calibrated once so a
 * round takes about `BENCH_TIME` milliseconds, and the cost per iteration is
 * the loop's wall time divided by the count, so a 10 ns read is measured as
 * 10 ns and not as 10 ns plus a harness. Every case runs in every round, the
 * order of cases rotates by one each round, and the number reported for a
 * case is the median of its per-round costs; the minimum is printed beside
 * it, and ratios are computed from both. On a shared machine the medians
 * carry the noise and the minimums the floor.
 *
 * The cases cover: the ordinary-key paths that must not regress (`getUnsafe`,
 * `add`), a record read against a plain record service (today's shape), the
 * same read from a context rebuilt per request, the member-layer and
 * overridden cases that assemble a record, and the fiber path for each.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import * as FileSystem from "../src/FileSystem.ts"

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

const rounds = Number(process.env.BENCH_ROUNDS ?? 11)
const time = Number(process.env.BENCH_TIME ?? 100)

// A thirty-member record. `Plain` stores it the way a record service is stored today: one slot. `FileSystem`
// stores it as a record service: one slot per member and one for the record.
const record: Record<string, unknown> = {}
for (const name of Object.keys(FileSystem.FileSystem.members)) record[name] = () => Effect.void
const shape = record as FileSystem.Shape
const Plain = Context.Service<Record<string, unknown>>("effect/FileSystem/plain")
const PlainBaseline = Baseline.Service<Record<string, unknown>>("effect/FileSystem/plain")
const RequestId = Context.Service<number>("bench/RequestId")
const RequestIdBaseline = Baseline.Service<number>("bench/RequestId")
const fake = (() => Effect.void) as unknown as FileSystem.Shape["readFile"]

const plainContext = Context.make(Plain, record)
const plainBaselineContext = Baseline.make(PlainBaseline, record)

// Real programs read through keys of several kinds (function-style services, references, class-style services),
// so the property loads inside `getUnsafe` and `add` are polymorphic. Both modules are exercised with the same
// mix, so neither side is measured with the monomorphic fast path the other lacks.
const kinds = (ctx: typeof Context) => {
  const Ref = ctx.Reference<number>("bench/Ref", { defaultValue: () => 1 })
  class A extends ctx.Service<A, number>()("bench/A") {}
  class B extends ctx.Service<B, number>()("bench/B") {}
  const WithMake = ctx.Service<{ n: number }, number>()("bench/WithMake", { make: Effect.succeed(1) })
  const keys: ReadonlyArray<Context.Key<any, number>> = [Ref, A, B, WithMake]
  const context = keys.reduce((c, key) => ctx.add(c, key, 1), ctx.empty() as Context.Context<any>)
  let i = 0
  return {
    read: () => ctx.getUnsafe(context, keys[i = (i + 1) & 3]),
    add: () => ctx.add(context, keys[i = (i + 1) & 3], 2)
  }
}
const mixed = kinds(Context)
const mixedBaseline = kinds(Baseline)
const recordContext = Context.make(FileSystem.FileSystem, shape)
const membersContext = Context.mergeAll(
  ...Object.values(FileSystem.FileSystem.members).map((member) =>
    Context.make(member as Context.Key<any, unknown>, () => Effect.void)
  )
)
// Thirty-one entries beside the record, so `add` is measured on a context of realistic size.
const wide = (ctx: typeof Context, make: typeof Context.make) =>
  Array.from({ length: 31 }, (_, i) => make(ctx.Service<number>(`bench/Service/${i}`), i)).reduce((a, b) =>
    ctx.merge(a, b)
  )
const wideContext = wide(Context, Context.make)
const wideBaselineContext = wide(Baseline, Baseline.make)

// Fiber-path programs, each run by a runner built once over its context (`Effect.runSyncWith`), so a run measures
// the fiber and the read and not a merge of the context into a fresh fiber. `perRequest` adds one service in front
// of the read, as a server does for each request.
const perRequest = <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideService(effect, RequestId, 1)
const runPlain = Effect.runSyncWith(plainContext)
const runRecord = Effect.runSyncWith(recordContext)
const runMembers = Effect.runSyncWith(membersContext)
const yieldPlainPerRequest = perRequest(Plain)
const yieldRecordPerRequest = perRequest(FileSystem.FileSystem)
const viaOperation = FileSystem.readFile("a")
const viaRecord = Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFile("a"))
const viaPlain = Effect.flatMap(Plain, (fs) => (fs.readFile as () => Effect.Effect<void>)())

const cases: ReadonlyArray<readonly [name: string, run: () => unknown]> = [
  // ordinary keys: the paths that must not regress
  ["getUnsafe, mixed key kinds, baseline", mixedBaseline.read],
  ["getUnsafe, mixed key kinds, this branch", mixed.read],
  ["add, mixed key kinds, baseline", mixedBaseline.add],
  ["add, mixed key kinds, this branch", mixed.add],
  ["getUnsafe, ordinary key, baseline", () => Baseline.getUnsafe(plainBaselineContext, PlainBaseline)],
  ["getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)],
  ["add, ordinary key, baseline", () => Baseline.add(wideBaselineContext, PlainBaseline, record)],
  ["add, ordinary key, this branch", () => Context.add(wideContext, Plain, record)],
  [
    "add then getUnsafe, ordinary key, baseline",
    () => Baseline.getUnsafe(Baseline.add(plainBaselineContext, RequestIdBaseline, 1), PlainBaseline)
  ],
  [
    "add then getUnsafe, ordinary key, this branch",
    () => Context.getUnsafe(Context.add(plainContext, RequestId, 1), Plain)
  ],
  // operations and records
  ["getUnsafe, operation key (1 of 31 slots)", () => Context.getUnsafe(recordContext, FileSystem.readFile)],
  ["getUnsafe, record provided whole, same context", () => Context.getUnsafe(recordContext, FileSystem.FileSystem)],
  [
    "add then getUnsafe, record provided whole",
    () => Context.getUnsafe(Context.add(recordContext, RequestId, 1), FileSystem.FileSystem)
  ],
  [
    "add then getUnsafe, record from 30 member layers",
    () => Context.getUnsafe(Context.add(membersContext, RequestId, 1), FileSystem.FileSystem)
  ],
  [
    "add then getUnsafe, ReadOnly (3 of 30) from the full record",
    () => Context.getUnsafe(Context.add(recordContext, RequestId, 1), FileSystem.ReadOnly)
  ],
  [
    "add a member override, then getUnsafe record (assembled)",
    () => Context.getUnsafe(Context.add(recordContext, FileSystem.readFile, fake), FileSystem.FileSystem)
  ],
  ["make, record (30 members)", () => Context.make(FileSystem.FileSystem, shape)],
  ["make, ordinary key, baseline", () => Baseline.make(PlainBaseline, record)],
  ["add, record (30 members) to 31 slots", () => Context.add(wideContext, FileSystem.FileSystem, shape)],
  // fiber paths
  ["runSync: yield* Plain (today's record service)", () => runPlain(Plain)],
  ["runSync: yield* FileSystem (record service)", () => runRecord(FileSystem.FileSystem)],
  ["runSync: yield* Plain, context rebuilt per request", () => runPlain(yieldPlainPerRequest)],
  ["runSync: yield* FileSystem, context rebuilt per request", () => runRecord(yieldRecordPerRequest)],
  ["runSync: yield* FileSystem from member layers, per request", () => runMembers(yieldRecordPerRequest)],
  ["runSync: readFile(path) operation call", () => runRecord(viaOperation)],
  ["runSync: (yield* Plain).readFile(path)", () => runPlain(viaPlain)],
  ["runSync: (yield* FileSystem).readFile(path)", () => runRecord(viaRecord)]
]

let sink: unknown
const measure = (run: () => unknown, iterations: number): number => {
  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) sink = run()
  return Number(process.hrtime.bigint() - start) / iterations
}
// Calibrate: warm each case up, then pick the iteration count that takes about `time` ms.
const iterations = new Map<string, number>()
for (const [name, run] of cases) {
  measure(run, 2000)
  const perIteration = measure(run, 2000)
  iterations.set(name, Math.max(1000, Math.round((time * 1e6) / perIteration)))
}
const samples = new Map<string, Array<number>>(cases.map(([name]) => [name, []]))
for (let round = 0; round < rounds; round++) {
  const rotated = [...cases.slice(round % cases.length), ...cases.slice(0, round % cases.length)]
  for (const [name, run] of rotated) samples.get(name)!.push(measure(run, iterations.get(name)!))
  process.stderr.write(`round ${round + 1}/${rounds}\n`)
}
void sink

const median = (values: Array<number>) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const medians = new Map(cases.map(([name]) => [name, median(samples.get(name)!)]))
const minimums = new Map(cases.map(([name]) => [name, Math.min(...samples.get(name)!)]))
const ns = (name: string) => medians.get(name)!

console.log(`baseline: ${base.slice(0, 10)}; ${rounds} rounds of about ${time} ms per case; ns/op\n`)
console.log(`  ${"case".padEnd(64)} ${"median".padStart(9)} ${"min".padStart(9)} ${"max".padStart(9)}`)
for (const [name] of cases) {
  const values = samples.get(name)!
  console.log(
    `  ${name.padEnd(64)} ${ns(name).toFixed(1).padStart(9)} ${Math.min(...values).toFixed(1).padStart(9)} ${
      Math.max(...values).toFixed(1).padStart(9)
    }`
  )
}

const ratio = (a: string, b: string) =>
  `${(ns(a) / ns(b)).toFixed(2).padStart(6)}  ${(minimums.get(a)! / minimums.get(b)!).toFixed(2).padStart(6)}`
console.log(`\nRatios${" ".repeat(60)}median     min\n`)
const ratios: ReadonlyArray<readonly [label: string, a: string, b: string]> = [
  [
    "mixed-kind getUnsafe, this branch / baseline",
    "getUnsafe, mixed key kinds, this branch",
    "getUnsafe, mixed key kinds, baseline"
  ],
  ["mixed-kind add, this branch / baseline", "add, mixed key kinds, this branch", "add, mixed key kinds, baseline"],
  [
    "ordinary-key getUnsafe, this branch / baseline",
    "getUnsafe, ordinary key, this branch",
    "getUnsafe, ordinary key, baseline"
  ],
  ["ordinary-key add, this branch / baseline", "add, ordinary key, this branch", "add, ordinary key, baseline"],
  [
    "ordinary-key add then getUnsafe, this branch / baseline",
    "add then getUnsafe, ordinary key, this branch",
    "add then getUnsafe, ordinary key, baseline"
  ],
  [
    "operation key getUnsafe / ordinary key getUnsafe",
    "getUnsafe, operation key (1 of 31 slots)",
    "getUnsafe, ordinary key, this branch"
  ],
  [
    "record read (provided whole) / ordinary key, same context",
    "getUnsafe, record provided whole, same context",
    "getUnsafe, ordinary key, this branch"
  ],
  [
    "record read (provided whole) / ordinary key, context rebuilt",
    "add then getUnsafe, record provided whole",
    "add then getUnsafe, ordinary key, this branch"
  ],
  [
    "record read (from member layers) / ordinary key, context rebuilt",
    "add then getUnsafe, record from 30 member layers",
    "add then getUnsafe, ordinary key, this branch"
  ],
  [
    "yield* FileSystem / yield* Plain, same context",
    "runSync: yield* FileSystem (record service)",
    "runSync: yield* Plain (today's record service)"
  ],
  [
    "yield* FileSystem / yield* Plain, context rebuilt per request",
    "runSync: yield* FileSystem, context rebuilt per request",
    "runSync: yield* Plain, context rebuilt per request"
  ],
  [
    "operation call / method call on a plain record",
    "runSync: readFile(path) operation call",
    "runSync: (yield* Plain).readFile(path)"
  ],
  [
    "method call on the record service / on a plain record",
    "runSync: (yield* FileSystem).readFile(path)",
    "runSync: (yield* Plain).readFile(path)"
  ]
]
for (const [label, a, b] of ratios) console.log(`  ${label.padEnd(66)} ${ratio(a, b)}`)
