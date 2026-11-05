/**
 * The cost of record services and operations, measured as paired ratios
 * against the `Context.ts` of the branch point, loaded beside this one so both
 * run in one process against the same `effect` runtime.
 *
 *   node benchmark/context/operations.ts              # 21 rounds; each loop about 30 ms
 *   node benchmark/context/operations.ts --check      # exit 1 when a median ratio exceeds its limit
 *   node benchmark/context/operations.ts --ordinary   # the ordinary-key pairs alone, in a process that holds no record
 *   BENCH_ROUNDS=31 BENCH_TIME=60 BENCH_BASELINE=<sha> node benchmark/context/operations.ts
 *
 * Method. Every ratio is paired and interleaved: within a round, the two sides
 * of a pair run as A, B, B, A in tight loops of a calibrated iteration count,
 * and the round's ratio is the CPU time of the two A loops over the two B
 * loops. CPU time (`process.cpuUsage`, user plus system) rather than wall time:
 * a loop preempted by another process is not charged for the time it was off
 * the CPU, which is most of what a loaded machine adds. The number reported for
 * a pair is the median of its per-round ratios, with the 25th and 75th
 * percentiles beside it; the order of pairs rotates each round.
 *
 * Gate. The first pair is an A/A control, the same loop on both sides. Its
 * deviation from 1.00 and its spread are what the machine adds to any ratio in
 * the run, so every limit is widened by the control's envelope (the larger of
 * its median's distance from 1.00 and its interquartile range). A run whose
 * control is outside 1.05 is repeated once with ten more rounds; if the
 * control is still outside, `--check` reports SKIPPED and exits 0: the machine
 * cannot be read, and nothing has been shown either way. The gate that does
 * not depend on the machine is `counts.ts`, beside this file. Absolute costs
 * are reported and not gated.
 *
 * Regimes. The default run is a process that holds record services, reads them
 * and reads ordinary keys through the same getters, which is every process
 * that imports `effect/FileSystem`. V8 compiles a property load for up to four
 * receiver shapes and falls back to a slower generic lookup past that;
 * `Context.add` and the getters read `key.key`, a process that provides a
 * reference, a class-style service, a service with `make` and a plain service
 * already uses four, and an operation and a record service are two more. Both
 * modules are warmed with the same six shapes so the pairs compare like with
 * like. `--ordinary` leaves both at four: the regime of a program that uses no
 * operation.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { base, loadBaseline } from "./baseline.ts"

const Baseline = await loadBaseline()

const rounds = Number(process.env.BENCH_ROUNDS ?? 21)
const time = Number(process.env.BENCH_TIME ?? 30)
const check = process.argv.includes("--check")
const ordinary = process.argv.includes("--ordinary")
// a second attempt has ten more rounds; a control still outside 1.05 after it is a SKIPPED result
const attempts = 2
const noise = 0.05

// The real file system record: 32 members, each a function returning `Effect.void`. `Plain` stores the same object
// the way a record service is stored today, in one slot; `FileSystem` stores it as a record service.
const memberKeys = Object.values(FileSystem.FileSystem.members) as ReadonlyArray<Context.Slot<any, unknown>>
const shape = Object.fromEntries(
  Object.keys(FileSystem.FileSystem.members).map((name) => [name, () => Effect.void])
) as unknown as FileSystem.Shape
const Plain = Context.Service<FileSystem.Shape>("bench/FileSystem/plain")
const PlainBaseline = Baseline.Service<FileSystem.Shape>("bench/FileSystem/plain")
const RequestId = Context.Service<number>("bench/RequestId")
const RequestIdBaseline = Baseline.Service<number>("bench/RequestId")
const Absent = Context.Reference<number>("bench/Absent", { defaultValue: () => 1 })
const AbsentBaseline = Baseline.Reference<number>("bench/Absent", { defaultValue: () => 1 })
const fake = (() => Effect.void) as unknown as FileSystem.Shape["readFile"]

const plainContext = Context.make(Plain, shape)
const plainBaselineContext = Baseline.make(PlainBaseline, shape)

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
const membersContext = ordinary
  ? recordContext
  : Context.mergeAll(...memberKeys.map((member) => Context.make(member, () => Effect.void)))
const wideParts = (ctx: typeof Context, slots = 33) =>
  Array.from({ length: slots }, (_, i) => ctx.make(ctx.Service<number>(`bench/Service/${i}`), i))
const wideContextParts = wideParts(Context)
const wideBaselineParts = wideParts(Baseline)
const wideContext = Context.mergeAll(...wideContextParts)
const wideBaselineContext = Baseline.mergeAll(...wideBaselineParts)
const wide300Context = Context.mergeAll(...wideParts(Context, 300))
const runWide = Effect.runSyncWith(wideContext)

const perRequest = <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideService(effect, RequestId, 1)
const runPlain = Effect.runSyncWith(plainContext)
const runRecord = Effect.runSyncWith(recordContext)
const runMembers = Effect.runSyncWith(membersContext)
const yieldPlainPerRequest = perRequest(Plain)
const yieldRecordPerRequest = perRequest(FileSystem.FileSystem)
const yieldRecordOverriddenPerRequest = Effect.provideService(FileSystem.FileSystem, FileSystem.readFile, fake)
const provideRecordPerRequest = Effect.provideService(FileSystem.FileSystem, FileSystem.FileSystem, shape)
const providePlainPerRequest = Effect.provideService(Plain, Plain, shape)
const viaOperation = FileSystem.readFile("a")
const viaRecord = Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFile("a"))
const viaPlain = Effect.flatMap(Plain, (fs) => fs.readFile("a"))

interface Case {
  readonly name: string
  readonly run: () => unknown
}
interface Pair {
  readonly label: string
  readonly a: Case
  readonly b: Case
  /** The median ratio a/b must not exceed this, widened by the control's envelope. */
  readonly limit: number
}
const c = (name: string, run: () => unknown): Case => ({ name, run })

// A member override written into a context holding the record is an ordinary overlay; the contexts a server derives
// from it per request read the record through that overlay, once per override.
const overriddenContext = ordinary ? recordContext : Context.add(recordContext, FileSystem.readFile, fake)
const runOverridden = Effect.runSyncWith(overriddenContext)
let escaped: unknown
const derive = <A>(context: Context.Context<A>, ctx: typeof Context, key: Context.Key<any, number>) => {
  const derived = ctx.add(context, key, 1)
  escaped = derived
  return derived
}
const memberCount = memberKeys.length
// an ordinary read is one typeof and, per overlay walked, one more field check than at the branch point
const ordinaryLimit = 1.25

const allPairs: ReadonlyArray<Pair> = [
  {
    label: "control, getUnsafe ordinary key: this branch / this branch",
    a: c("control A: getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    b: c("control B: getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    limit: 1.05
  },
  // ordinary keys: this branch over the branch point
  {
    label: "getUnsafe, ordinary key: this branch / baseline",
    a: c("getUnsafe, ordinary key, this branch", () => Context.getUnsafe(plainContext, Plain)),
    b: c("getUnsafe, ordinary key, baseline", () => Baseline.getUnsafe(plainBaselineContext, PlainBaseline)),
    limit: ordinaryLimit
  },
  {
    label: "getUnsafe, mixed key kinds: this branch / baseline",
    a: c("getUnsafe, mixed key kinds, this branch", mixed.read),
    b: c("getUnsafe, mixed key kinds, baseline", mixedBaseline.read),
    limit: ordinaryLimit
  },
  {
    label: "getUnsafe, reference default (slot absent): this branch / baseline",
    a: c("getUnsafe, reference default, this branch", () => Context.getUnsafe(plainContext, Absent)),
    b: c("getUnsafe, reference default, baseline", () => Baseline.getUnsafe(plainBaselineContext, AbsentBaseline)),
    limit: ordinaryLimit
  },
  {
    label: "add, ordinary key to 33 slots: this branch / baseline",
    a: c("add, ordinary key, this branch", () => Context.add(wideContext, Plain, shape)),
    b: c("add, ordinary key, baseline", () => Baseline.add(wideBaselineContext, PlainBaseline, shape)),
    limit: ordinaryLimit
  },
  {
    label: "add, mixed key kinds: this branch / baseline",
    a: c("add, mixed key kinds, this branch", mixed.add),
    b: c("add, mixed key kinds, baseline", mixedBaseline.add),
    limit: ordinaryLimit
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
    limit: ordinaryLimit
  },
  {
    label: "mergeAll, 33 one-slot contexts: this branch / baseline",
    a: c("mergeAll, 33 contexts, this branch", () => Context.mergeAll(...wideContextParts)),
    b: c("mergeAll, 33 contexts, baseline", () => Baseline.mergeAll(...wideBaselineParts)),
    limit: ordinaryLimit
  },
  // records against ordinary keys, both on this branch
  {
    label: "record read (provided whole) / ordinary key read, same context",
    a: c(
      "getUnsafe, record provided whole, same context",
      () => Context.getUnsafe(recordContext, FileSystem.FileSystem)
    ),
    b: c("getUnsafe, ordinary key (record context)", () => Context.getUnsafe(plainContext, Plain)),
    // a record in a flat map is remembered on the key: one check of the last storage read
    limit: 1.25
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
    // one slot check for the overlay, then the remembered object
    limit: 1.25
  },
  {
    label: "record read (member overridden underneath) / ordinary key read, context rebuilt per request",
    a: c(
      "add then getUnsafe, record with a member overridden underneath",
      () => Context.getUnsafe(derive(overriddenContext, Context, RequestId), FileSystem.FileSystem)
    ),
    b: c(
      "add then getUnsafe, ordinary key (override pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    // one slot check per overlay walked, one name lookup and one small object per read
    limit: 2.0
  },
  {
    label: "member override into a context holding the record / ordinary add",
    a: c("add, member override to the record context", () => Context.add(recordContext, FileSystem.readFile, fake)),
    b: c("add, ordinary key (override pair)", () => Context.add(plainContext, RequestId, 1)),
    limit: ordinaryLimit
  },
  {
    label: "member override then record read, per request / ordinary add then read",
    a: c(
      "add member override then getUnsafe record, per request",
      () => Context.getUnsafe(Context.add(recordContext, FileSystem.readFile, fake), FileSystem.FileSystem)
    ),
    b: c(
      "add then getUnsafe, ordinary key (per-request override pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    // the view, one object inheriting from the provided one, is built on each read
    limit: 3.0
  },
  {
    label: "record assembled from 32 member layers, context rebuilt per request / ordinary add then read",
    a: c(
      "add then getUnsafe, record from 32 member layers (assembled)",
      () => Context.getUnsafe(derive(membersContext, Context, RequestId), FileSystem.FileSystem)
    ),
    b: c(
      "add then getUnsafe, ordinary key (members pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    // assembled once per flat map and remembered
    limit: 1.5
  },
  // record writes: one overlay holding a snapshot of the members, whatever the context's size
  {
    label: "record write / ordinary write, into 33 slots",
    a: c("add, record (32 members) to 33 slots", () => Context.add(wideContext, FileSystem.FileSystem, shape)),
    b: c("add, ordinary key to 33 slots (write pair)", () => Context.add(wideContext, Plain, shape)),
    // one property read per member and one snapshot; at most one ordinary write per slot written
    limit: memberCount + 1
  },
  {
    label: "record write / ordinary write, into 300 slots",
    a: c("add, record (32 members) to 300 slots", () => Context.add(wide300Context, FileSystem.FileSystem, shape)),
    b: c("add, ordinary key to 300 slots", () => Context.add(wide300Context, Plain, shape)),
    limit: memberCount + 1
  },
  {
    label: "record write into 300 slots / into 33 slots",
    a: c(
      "add, record (32 members) to 300 slots (size pair)",
      () => Context.add(wide300Context, FileSystem.FileSystem, shape)
    ),
    b: c(
      "add, record (32 members) to 33 slots (size pair)",
      () => Context.add(wideContext, FileSystem.FileSystem, shape)
    ),
    // the write does not depend on the context's size
    limit: 1.15
  },
  {
    label: "record write / mergeAll of 33 one-slot contexts",
    a: c(
      "add, record (32 members) to 33 slots (merge pair)",
      () => Context.add(wideContext, FileSystem.FileSystem, shape)
    ),
    b: c("mergeAll, 33 contexts (merge pair)", () => Context.mergeAll(...wideContextParts)),
    // the branch point's way of providing 33 slots at once
    limit: 1.0
  },
  // fiber paths
  {
    label: "yield* FileSystem / yield* Plain, same context",
    a: c("runSync: yield* FileSystem (record service)", () => runRecord(FileSystem.FileSystem)),
    b: c("runSync: yield* Plain (today's record service)", () => runPlain(Plain)),
    limit: 1.25
  },
  {
    label: "yield* FileSystem / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem, context rebuilt per request", () => runRecord(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request", () => runPlain(yieldPlainPerRequest)),
    limit: 1.25
  },
  {
    label: "yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request",
    a: c(
      "runSync: yield* FileSystem with a member overridden underneath, per request",
      () => runOverridden(yieldRecordPerRequest)
    ),
    b: c("runSync: yield* Plain, context rebuilt per request (override pair)", () => runPlain(yieldPlainPerRequest)),
    limit: 1.5
  },
  {
    label: "yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request",
    a: c("runSync: provideService(readFile) then yield* FileSystem", () => runRecord(yieldRecordOverriddenPerRequest)),
    b: c(
      "runSync: yield* Plain, context rebuilt per request (per-request override pair)",
      () => runPlain(yieldPlainPerRequest)
    ),
    // the override is new each request, so each request builds one view
    limit: 1.5
  },
  {
    label: "provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request",
    a: c("runSync: provideService(FileSystem, record) then yield* FileSystem", () => runWide(provideRecordPerRequest)),
    b: c("runSync: provideService(Plain, record) then yield* Plain", () => runWide(providePlainPerRequest)),
    // a record provided per request pays its snapshot per request
    limit: 3.0
  },
  {
    label: "yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem from member layers, per request", () => runMembers(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request (members pair)", () => runPlain(yieldPlainPerRequest)),
    limit: 1.5
  },
  {
    label: "operation call / method call on a yielded plain record",
    a: c("runSync: readFile(path) operation call", () => runRecord(viaOperation)),
    b: c("runSync: (yield* Plain).readFile(path)", () => runPlain(viaPlain)),
    limit: 1.0
  },
  {
    label: "method call on the record service / on a plain record",
    a: c("runSync: (yield* FileSystem).readFile(path)", () => runRecord(viaRecord)),
    b: c("runSync: (yield* Plain).readFile(path) (record pair)", () => runPlain(viaPlain)),
    limit: ordinaryLimit
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
  c("getUnsafe, operation key (1 of 33 slots)", () => Context.getUnsafe(recordContext, FileSystem.readFile)),
  c("make, record (32 members)", () => Context.make(FileSystem.FileSystem, shape)),
  c("add, record (32 members): one overlay", () => Context.add(wideContext, FileSystem.FileSystem, shape)),
  c(
    "add a member override to a context holding the record (overlay)",
    () => Context.add(recordContext, FileSystem.readFile, fake)
  ),
  c(
    "first record read after a member override (one view built)",
    () => Context.getUnsafe(Context.add(recordContext, FileSystem.readFile, fake), FileSystem.FileSystem)
  ),
  c(
    "record read, never written, remembered per flat map",
    () => Context.getUnsafe(derive(membersContext, Context, RequestId), FileSystem.FileSystem)
  )
]
const singles = ordinary || only !== undefined ? [] : allSingles

let sink: unknown
// CPU nanoseconds per iteration
const measure = (run: () => unknown, iterations: number): number => {
  const start = process.cpuUsage()
  for (let i = 0; i < iterations; i++) sink = run()
  const used = process.cpuUsage(start)
  return ((used.user + used.system) * 1e3) / iterations
}
const allCases = [...pairs.flatMap((pair) => [pair.a, pair.b]), ...singles]
const iterations = new Map<string, number>()
for (const { name, run } of allCases) {
  measure(run, 2000)
  const perIteration = measure(run, 2000)
  iterations.set(name, Math.max(500, Math.round((time * 1e6) / perIteration)))
}
const timed = (kase: Case) => measure(kase.run, iterations.get(kase.name)!)

const quantile = (values: ReadonlyArray<number>, q: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}
const median = (values: ReadonlyArray<number>) => quantile(values, 0.5)

interface Run {
  readonly samples: ReadonlyMap<string, ReadonlyArray<number>>
  readonly ratios: ReadonlyMap<string, ReadonlyArray<number>>
  /** The control's envelope: the larger of its median's distance from 1.00 and its interquartile range. */
  readonly envelope: number
  readonly rounds: number
}
const run = (attempt: number, rounds: number): Run => {
  const samples = new Map<string, Array<number>>(allCases.map(({ name }) => [name, []]))
  const ratios = new Map<string, Array<number>>(pairs.map(({ label }) => [label, []]))
  for (let round = 0; round < rounds; round++) {
    const offset = round % pairs.length
    const rotated = [...pairs.slice(offset), ...pairs.slice(0, offset)]
    for (const pair of rotated) {
      const a1 = timed(pair.a)
      const b1 = timed(pair.b)
      const b2 = timed(pair.b)
      const a2 = timed(pair.a)
      samples.get(pair.a.name)!.push(a1, a2)
      samples.get(pair.b.name)!.push(b1, b2)
      ratios.get(pair.label)!.push((a1 + a2) / (b1 + b2))
    }
    for (const single of singles) samples.get(single.name)!.push(timed(single))
    process.stderr.write(`attempt ${attempt}, round ${round + 1}/${rounds}\n`)
  }
  const control = ratios.get(pairs[0].label)!
  const envelope = Math.max(Math.abs(median(control) - 1), quantile(control, 0.75) - quantile(control, 0.25))
  return { samples, ratios, envelope, rounds }
}

let result = run(1, rounds)
const attempted = [rounds]
for (let attempt = 2; attempt <= attempts && result.envelope > noise; attempt++) {
  const more = rounds + 10 * (attempt - 1)
  process.stderr.write(
    `control envelope ${result.envelope.toFixed(2)} is over ${noise}: repeating with ${more} rounds\n`
  )
  result = run(attempt, more)
  attempted.push(more)
}
void sink
void escaped

const { envelope, ratios, samples } = result
console.log(
  `baseline: ${
    base.slice(0, 10)
  }; ${result.rounds} rounds, each loop about ${time} ms of CPU time, A/B/B/A within a round; ns/op${
    ordinary
      ? "; ordinary keys only (no record is held or read in this process)"
      : "; records held and read in this process"
  }\n`
)
console.log(`  ${"case".padEnd(76)} ${"median".padStart(9)} ${"min".padStart(9)} ${"max".padStart(9)}`)
for (const { name } of allCases) {
  const values = samples.get(name)!
  console.log(
    `  ${name.padEnd(76)} ${median(values).toFixed(1).padStart(9)} ${Math.min(...values).toFixed(1).padStart(9)} ${
      Math.max(...values).toFixed(1).padStart(9)
    }`
  )
}

let failures = 0
console.log(
  `\n  ${"ratio (median of per-round ratios)".padEnd(96)} ${"median".padStart(7)} ${"p25".padStart(7)} ${
    "p75".padStart(7)
  } ${"limit".padStart(7)}`
)
for (const pair of pairs) {
  const values = ratios.get(pair.label)!
  const m = median(values)
  const limit = pair === pairs[0] ? pair.limit : pair.limit + envelope
  const ok = m <= limit
  if (!ok) failures++
  console.log(
    `  ${pair.label.padEnd(96)} ${m.toFixed(2).padStart(7)} ${quantile(values, 0.25).toFixed(2).padStart(7)} ${
      quantile(values, 0.75).toFixed(2).padStart(7)
    } ${limit.toFixed(2).padStart(7)}${ok ? "" : "  EXCEEDED"}`
  )
}
console.log(`\n  control envelope: ${envelope.toFixed(2)} (added to every limit)`)
if (singles.length > 0) {
  console.log(
    `\n  ${"absolute (median ns, reported, not gated)".padEnd(96)} ${"median".padStart(7)} ${"p25".padStart(7)} ${
      "p75".padStart(7)
    }`
  )
  for (const single of singles) {
    const values = samples.get(single.name)!
    console.log(
      `  ${single.name.padEnd(96)} ${median(values).toFixed(0).padStart(7)} ${
        quantile(values, 0.25).toFixed(0).padStart(7)
      } ${quantile(values, 0.75).toFixed(0).padStart(7)}`
    )
  }
}
if (check) {
  if (envelope > noise) {
    console.log(
      `\nSKIPPED: the control stayed outside ${(1 + noise).toFixed(2)} after ${attempted.length} attempts (${
        attempted.join(" and ")
      } rounds); this machine cannot be read, so nothing has been shown either way. The gate that does not depend on the machine is counts.ts.`
    )
    process.exit(0)
  }
  if (failures > 0) {
    console.log(`\nEXCEEDED: ${failures} limit(s) exceeded`)
    process.exit(1)
  }
  console.log("\nOK: every median ratio is within its limit")
}
