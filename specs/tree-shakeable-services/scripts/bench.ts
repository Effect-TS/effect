/**
 * Microbenchmarks for the costs the spec quotes, measured as ratios against
 * the `Context.ts` of the branch point loaded beside this one, so both run in
 * one process against the same `effect` runtime.
 *
 *   pnpm bench                        # 21 rounds; each case about 40 ms per round
 *   pnpm bench --check                # exit 1 when a median ratio exceeds its limit
 *   pnpm bench --ordinary             # the ordinary-key pairs alone, in a process that holds no record
 *   BENCH_ROUNDS=31 BENCH_TIME=80 pnpm bench
 *
 * Every ratio is paired and interleaved: within a round, the two sides of a
 * pair run as A, B, B, A in tight loops of a calibrated iteration count, and
 * the round's ratio is the time of the two A loops over the two B loops. The
 * number reported for a pair is the median of its per-round ratios, with the
 * 25th and 75th percentiles beside it. Pairing cancels the drift a shared
 * machine adds to both sides; the median of ratios is stable where the ratio
 * of medians is not. The order of pairs rotates each round.
 *
 * The default run is the one the spec's limits are about: a process that holds
 * record services, reads them and reads ordinary keys through the same getters,
 * which is every process that imports `effect/FileSystem`. Its first pair is
 * an A/A control, the same loop on both sides, whose spread is the noise floor
 * the other limits sit above. The absolute costs at the end are reported and
 * not gated: a nanosecond count moves with the machine's load where a paired
 * ratio does not.
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

const rounds = Number(process.env.BENCH_ROUNDS ?? 21)
const time = Number(process.env.BENCH_TIME ?? 40)
const check = process.argv.includes("--check")
// `--ordinary`: only the pairs against the branch point, in a process that never constructs a record context, so
// both modules see the same key shapes at every property load (see the note under "ratios" in the output).
const ordinary = process.argv.includes("--ordinary")

// A thirty-member record. `Plain` stores it the way a record service is stored today: one slot. `FileSystem`
// stores it as a record service: one slot per member and one for the record.
const record: Record<string, unknown> = {}
for (const name of Object.keys(FileSystem.FileSystem.members)) record[name] = () => Effect.void
const shape = record as unknown as FileSystem.Shape
const Plain = Context.Service<Record<string, unknown>>("effect/FileSystem/plain")
const PlainBaseline = Baseline.Service<Record<string, unknown>>("effect/FileSystem/plain")
const RequestId = Context.Service<number>("bench/RequestId")
const RequestIdBaseline = Baseline.Service<number>("bench/RequestId")
const Absent = Context.Reference<number>("bench/Absent", { defaultValue: () => 1 })
const AbsentBaseline = Baseline.Reference<number>("bench/Absent", { defaultValue: () => 1 })
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

// V8 compiles a property load for up to four receiver shapes and falls back to a slower generic lookup past that.
// `Context.add` reads `key.key`, and a process that provides a reference, a class-style service, a service with
// `make` and a plain service through it already uses four shapes; an operation and a record service are two more.
// Both modules' `add` sites are warmed with the same six shapes here, so the pairs below compare like with like;
// `--ordinary` leaves both at four, the best case for either.
const warm = (ctx: typeof Context, context: Context.Context<never>) => {
  const functionKey = Object.assign(function() {}, { key: "bench/warm/function" }) as unknown as Context.Key<
    any,
    number
  >
  const objectKey = { key: "bench/warm/object" } as unknown as Context.Key<any, number>
  const added = ctx.add(ctx.add(context, functionKey, 1), objectKey, 2)
  for (let i = 0; i < 1000; i++) {
    ctx.add(context, functionKey, 1)
    ctx.add(context, objectKey, 1)
    ctx.getUnsafe(added, functionKey)
    ctx.getUnsafe(added, objectKey)
    ctx.getOption(context, functionKey)
    ctx.getOption(context, objectKey)
  }
}
if (!ordinary) {
  warm(Context, Context.empty())
  warm(Baseline, Baseline.empty())
}
const recordContext = ordinary ? Context.empty() as Context.Context<any> : Context.make(FileSystem.FileSystem, shape)
const membersContext = ordinary ? recordContext : Context.mergeAll(
  ...Object.values(FileSystem.FileSystem.members).map((member) =>
    Context.make(member as Context.Slot<any, unknown>, () => Effect.void)
  )
)
// Thirty-one one-slot contexts, for `mergeAll`, and their merge, so `add` is measured on a context of realistic size.
const wideParts = (ctx: typeof Context) =>
  Array.from({ length: 31 }, (_, i) => ctx.make(ctx.Service<number>(`bench/Service/${i}`), i))
const wideContextParts = wideParts(Context)
const wideBaselineParts = wideParts(Baseline)
const wideContext = Context.mergeAll(...wideContextParts)
const wideBaselineContext = Baseline.mergeAll(...wideBaselineParts)

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

interface Case {
  readonly name: string
  readonly run: () => unknown
}
interface Pair {
  readonly label: string
  readonly a: Case
  readonly b: Case
  /** The median ratio a/b must not exceed this. */
  readonly threshold: number
}
const c = (name: string, run: () => unknown): Case => ({ name, run })
const limitOf = (pair: Pair) => pair.threshold

// A member override written into a context that holds the record: a flat write that rebuilds the record, so the
// contexts a server derives from it per request read the record in one lookup.
const overriddenContext = ordinary ? recordContext : Context.add(recordContext, FileSystem.readFile, fake)
const runOverridden = Effect.runSyncWith(overriddenContext)
// A context derived per request, kept where the optimiser can see it escape, as a server's request context does:
// otherwise a loop that adds and reads in one body lets V8 delete the allocation on whichever side it inlined fully.
let escaped: unknown
const derive = <A>(context: Context.Context<A>, ctx: typeof Context, key: Context.Key<any, number>) => {
  const derived = ctx.add(context, key, 1)
  escaped = derived
  return derived
}
// Thirty ordinary keys and a context holding them, for the pair that measures assembling a record never written
// against the thirty reads it performs.
const thirtyKeys = wideContextParts.slice(0, 30).map((_, i) => Context.Service<number>(`bench/Service/${i}`))
const readThirty = () => {
  const context = derive(wideContext, Context, RequestId)
  let sum = 0
  for (let i = 0; i < 30; i++) sum += Context.getUnsafe(context, thirtyKeys[i])
  return sum
}

const allPairs: ReadonlyArray<Pair> = [
  // the control: one loop on both sides; its spread is the noise floor
  {
    label: "control, getUnsafe ordinary key: this branch / this branch",
    a: c("control A: getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    b: c("control B: getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    threshold: 1.05
  },
  // ordinary keys: this branch over the branch point, which must not regress
  {
    label: "getUnsafe, ordinary key: this branch / baseline",
    a: c("getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    b: c("getUnsafe, ordinary key, baseline", () => Baseline.getUnsafe(plainBaselineContext, PlainBaseline)),
    threshold: 1.15
  },
  {
    label: "getUnsafe, mixed key kinds: this branch / baseline",
    a: c("getUnsafe, mixed key kinds, this branch", mixed.read),
    b: c("getUnsafe, mixed key kinds, baseline", mixedBaseline.read),
    threshold: 1.15
  },
  {
    label: "getUnsafe, reference default (slot absent): this branch / baseline",
    a: c("getUnsafe, reference default, this branch", () => Context.getUnsafe(plainContext, Absent)),
    b: c("getUnsafe, reference default, baseline", () => Baseline.getUnsafe(plainBaselineContext, AbsentBaseline)),
    threshold: 1.15
  },
  {
    label: "add, ordinary key to 31 slots: this branch / baseline",
    a: c("add, ordinary key, this branch", () => Context.add(wideContext, Plain, record)),
    b: c("add, ordinary key, baseline", () => Baseline.add(wideBaselineContext, PlainBaseline, record)),
    threshold: 1.15
  },
  {
    label: "add, mixed key kinds: this branch / baseline",
    a: c("add, mixed key kinds, this branch", mixed.add),
    b: c("add, mixed key kinds, baseline", mixedBaseline.add),
    threshold: 1.15
  },
  {
    label: "add then getUnsafe, ordinary key: this branch / baseline",
    a: c(
      "add then getUnsafe, ordinary key, this branch",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    b: c(
      "add then getUnsafe, ordinary key, baseline",
      () => Baseline.getUnsafe(derive(plainBaselineContext, Baseline, RequestIdBaseline), PlainBaseline)
    ),
    threshold: 1.15
  },
  {
    label: "mergeAll, 31 one-slot contexts: this branch / baseline",
    a: c("mergeAll, 31 contexts, this branch", () => Context.mergeAll(...wideContextParts)),
    b: c("mergeAll, 31 contexts, baseline", () => Baseline.mergeAll(...wideBaselineParts)),
    threshold: 1.15
  },
  // records against ordinary keys, both on this branch
  {
    label: "record read (provided whole) / ordinary key read, same context",
    a: c(
      "getUnsafe, record provided whole, same context",
      () => Context.getUnsafe(recordContext, FileSystem.FileSystem)
    ),
    b: c("getUnsafe, ordinary key (record context)", () => Context.getUnsafe(plainContext, Plain)),
    threshold: 1.15
  },
  {
    label: "record read (provided whole) / ordinary key read, context rebuilt per request",
    a: c(
      "add then getUnsafe, record provided whole",
      () => Context.getUnsafe(derive(recordContext, Context, RequestId), FileSystem.FileSystem)
    ),
    b: c(
      "add then getUnsafe, ordinary key (record pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    threshold: 1.15
  },
  {
    label: "record read (member overridden on top) / ordinary key read, context rebuilt per request",
    a: c(
      "add then getUnsafe, record with a member overridden",
      () => Context.getUnsafe(derive(overriddenContext, Context, RequestId), FileSystem.FileSystem)
    ),
    b: c(
      "add then getUnsafe, ordinary key (override pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    threshold: 1.15
  },
  {
    label: "record assembled from 30 member layers / 30 ordinary key reads, context rebuilt per request",
    a: c(
      "add then getUnsafe, record from 30 member layers (assembled)",
      () => Context.getUnsafe(derive(membersContext, Context, RequestId), FileSystem.FileSystem)
    ),
    b: c("add then 30 getUnsafe, ordinary keys", readThirty),
    threshold: 2.0
  },
  // fiber paths
  {
    label: "yield* FileSystem / yield* Plain, same context",
    a: c("runSync: yield* FileSystem (record service)", () => runRecord(FileSystem.FileSystem)),
    b: c("runSync: yield* Plain (today's record service)", () => runPlain(Plain)),
    threshold: 1.15
  },
  {
    label: "yield* FileSystem / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem, context rebuilt per request", () => runRecord(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request", () => runPlain(yieldPlainPerRequest)),
    threshold: 1.15
  },
  {
    label: "yield* FileSystem, member overridden on top / yield* Plain, context rebuilt per request",
    a: c(
      "runSync: yield* FileSystem with a member overridden, per request",
      () => runOverridden(yieldRecordPerRequest)
    ),
    b: c("runSync: yield* Plain, context rebuilt per request (override pair)", () => runPlain(yieldPlainPerRequest)),
    threshold: 1.15
  },
  {
    label: "yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem from member layers, per request", () => runMembers(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request (members pair)", () => runPlain(yieldPlainPerRequest)),
    threshold: 2.5
  },
  {
    label: "operation call / method call on a yielded plain record",
    a: c("runSync: readFile(path) operation call", () => runRecord(viaOperation)),
    b: c("runSync: (yield* Plain).readFile(path)", () => runPlain(viaPlain)),
    threshold: 1.0
  },
  {
    label: "method call on the record service / on a plain record",
    a: c("runSync: (yield* FileSystem).readFile(path)", () => runRecord(viaRecord)),
    b: c("runSync: (yield* Plain).readFile(path) (record pair)", () => runPlain(viaPlain)),
    threshold: 1.15
  }
]

const only = process.env.BENCH_ONLY
const skip = process.env.BENCH_SKIP
const pairs = (ordinary
  ? allPairs.filter((pair) => pair.label.includes("/ baseline") || pair.label.startsWith("control"))
  : allPairs).filter((pair) =>
    (only === undefined || pair.label.includes(only)) && (skip === undefined || !pair.label.includes(skip))
  )

// Absolute costs, in nanoseconds, with no counterpart at the branch point. Reported, not gated.
const allSingles: ReadonlyArray<Case> = [
  c("getUnsafe, operation key (1 of 31 slots)", () => Context.getUnsafe(recordContext, FileSystem.readFile)),
  c("make, record (30 members)", () => Context.make(FileSystem.FileSystem, shape)),
  c("add, record (30 members) to 31 slots", () => Context.add(wideContext, FileSystem.FileSystem, shape)),
  c(
    "add a member override to a context holding the record (flat rebuild)",
    () => Context.add(recordContext, FileSystem.readFile, fake)
  ),
  c(
    "assemble a record never written (30 members), fresh context",
    () => Context.getUnsafe(derive(membersContext, Context, RequestId), FileSystem.FileSystem)
  )
]

const singles = ordinary || only !== undefined ? [] : allSingles

let sink: unknown
const measure = (run: () => unknown, iterations: number): number => {
  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) sink = run()
  return Number(process.hrtime.bigint() - start) / iterations
}
// Calibrate: warm each case up, then pick the iteration count that takes about `time` ms.
const allCases = [...pairs.flatMap((pair) => [pair.a, pair.b]), ...singles]
const iterations = new Map<string, number>()
for (const { name, run } of allCases) {
  measure(run, 2000)
  const perIteration = measure(run, 2000)
  iterations.set(name, Math.max(500, Math.round((time * 1e6) / perIteration)))
}
const timed = (kase: Case) => measure(kase.run, iterations.get(kase.name)!)

const samples = new Map<string, Array<number>>(allCases.map(({ name }) => [name, []]))
const ratios = new Map<string, Array<number>>(pairs.map(({ label }) => [label, []]))
for (let round = 0; round < rounds; round++) {
  const offset = round % pairs.length
  const rotated = [...pairs.slice(offset), ...pairs.slice(0, offset)]
  for (const pair of rotated) {
    // A, B, B, A: each side runs once before and once after the other within the round
    const a1 = timed(pair.a)
    const b1 = timed(pair.b)
    const b2 = timed(pair.b)
    const a2 = timed(pair.a)
    samples.get(pair.a.name)!.push(a1, a2)
    samples.get(pair.b.name)!.push(b1, b2)
    ratios.get(pair.label)!.push((a1 + a2) / (b1 + b2))
  }
  for (const single of singles) samples.get(single.name)!.push(timed(single))
  process.stderr.write(`round ${round + 1}/${rounds}\n`)
}
void sink
void escaped

const quantile = (values: Array<number>, q: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}
const median = (values: Array<number>) => quantile(values, 0.5)

console.log(
  `baseline: ${
    base.slice(0, 10)
  }; ${rounds} rounds, each case about ${time} ms per loop, A/B/B/A within a round; ns/op${
    ordinary
      ? "; ordinary keys only (no record is held or read in this process)"
      : "; records held and read in this process"
  }\n`
)
console.log(`  ${"case".padEnd(70)} ${"median".padStart(9)} ${"min".padStart(9)} ${"max".padStart(9)}`)
for (const { name } of allCases) {
  const values = samples.get(name)!
  console.log(
    `  ${name.padEnd(70)} ${median(values).toFixed(1).padStart(9)} ${Math.min(...values).toFixed(1).padStart(9)} ${
      Math.max(...values).toFixed(1).padStart(9)
    }`
  )
}

let failures = 0
console.log(
  `\n  ${"ratio (median of per-round ratios)".padEnd(84)} ${"median".padStart(7)} ${"p25".padStart(7)} ${
    "p75".padStart(7)
  } ${"limit".padStart(7)}`
)
for (const pair of pairs) {
  const values = ratios.get(pair.label)!
  const m = median(values)
  const limit = limitOf(pair)
  const ok = m <= limit
  if (!ok) failures++
  console.log(
    `  ${pair.label.padEnd(84)} ${m.toFixed(2).padStart(7)} ${quantile(values, 0.25).toFixed(2).padStart(7)} ${
      quantile(values, 0.75).toFixed(2).padStart(7)
    } ${limit.toFixed(2).padStart(7)}${ok ? "" : "  EXCEEDED"}`
  )
}
if (singles.length > 0) {
  console.log(
    `\n  ${"absolute (median ns, reported, not gated)".padEnd(84)} ${"median".padStart(7)} ${"p25".padStart(7)} ${
      "p75".padStart(7)
    }`
  )
  for (const single of singles) {
    const values = samples.get(single.name)!
    console.log(
      `  ${single.name.padEnd(84)} ${median(values).toFixed(0).padStart(7)} ${
        quantile(values, 0.25).toFixed(0).padStart(7)
      } ${quantile(values, 0.75).toFixed(0).padStart(7)}`
    )
  }
}
if (check) {
  if (failures > 0) {
    console.error(`\n${failures} limit(s) exceeded`)
    process.exit(1)
  }
  console.log("\nOK: every median ratio is within its limit")
}
