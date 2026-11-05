/**
 * The cost of record services and operations, measured as paired ratios
 * against the `Context.ts` of the branch point, loaded beside this one so both
 * run in one process against the same `effect` runtime.
 *
 *   node benchmark/context/operations.ts              # 21 rounds; each loop about 30 ms
 *   node benchmark/context/operations.ts --check      # exit 1 when a median ratio exceeds its limit
 *   node benchmark/context/operations.ts --ordinary   # the ordinary-key pairs alone, in a process that holds no record
 *   BENCH_ROUNDS=31 BENCH_TIME=60 BENCH_BASELINE=<sha> node benchmark/context/operations.ts
 *   BENCH_SEED=1 node benchmark/context/operations.ts       # the pairs in another order (see below)
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
 * Order. The same two closures, in the same process, can differ by a few
 * nanoseconds depending on the order in which the cases were calibrated,
 * optimised and laid out, with the A/A control none the wiser (it compares a
 * closure with itself): on one machine the ordinary read measured 1.32× in
 * list order and 1.06× with the pairs reversed. `bench-check.ts` therefore
 * runs each timing mode in three orders (`BENCH_SEED=0,1,2`) and gates the
 * median of the three medians; `BENCH_JSON=1` prints the summary it reads.
 *
 * Regimes. The default run is a process that holds record services, reads them
 * and reads ordinary keys through the same getters, which is every process
 * that imports `effect/FileSystem`; `--ordinary` is a process that holds no
 * record, the regime of a program that uses no operation. The ordinary rows
 * are gated against the branch point in both: a record key is dispatched by
 * one `typeof` in each getter, before any property of the key is read, and a
 * record's overlays are ordinary overlays, so the ordinary path is the branch
 * point's code. Both modules are warmed with the same key shapes, and with
 * references read while absent, so the pairs compare like with like.
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { base, loadBaseline, loadTwin } from "./baseline.ts"

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
// records mode only: a pristine copy of this branch's Context.ts, serving the benchmark's calls alone; the ratio of
// the live module over it is what serving the runtime costs a getter with the code held equal (reported, not gated)
const Twin = ordinary ? Context : await loadTwin()
const PlainTwin = Twin.Service<FileSystem.Shape>("bench/FileSystem/plain")
const RequestIdTwin = Twin.Service<number>("bench/RequestId")
const AbsentTwin = Twin.Reference<number>("bench/Absent", { defaultValue: () => 1 })
const plainTwinContext = Twin.make(PlainTwin, shape)

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
  // references read while absent, as the fiber runtime reads its own through this branch's getters
  const reference = ctx.Reference<number>("bench/warm/reference", { defaultValue: () => 1 })
  const cachedReference = ctx.Reference<number>("bench/warm/cachedReference", {
    defaultValue: () => 1,
    fiberCached: true
  })
  const added = ctx.add(ctx.add(context, functionKey, 1), objectKey, 2)
  for (let i = 0; i < 1000; i++) {
    ctx.add(context, functionKey, 1)
    ctx.add(context, objectKey, 1)
    ctx.getUnsafe(added, functionKey)
    ctx.getUnsafe(added, objectKey)
    ctx.getOption(context, functionKey)
    ctx.getOption(context, objectKey)
    ctx.getUnsafe(context, reference)
    ctx.getUnsafe(context, cachedReference)
    ctx.getOption(context, reference)
    ctx.getOrElse(context, cachedReference, () => 0)
  }
}
// this branch's getters also meet record keys and the fiber runtime's reads in a records process: give them that
// feedback before anything is optimised, so that the ordinary pairs compare code optimised for the same shapes
const warmRecords = (ctx: typeof Context) => {
  const a = ctx.Operation<() => Effect.Effect<void>>()("bench/warm/a")
  const Record = ctx.Operations("bench/warm/Record", { a })
  const context = ctx.add(ctx.make(Record, { a: () => Effect.void }), a, () => Effect.void)
  for (let i = 0; i < 1000; i++) {
    ctx.getUnsafe(context, Record)
    ctx.getUnsafe(context, a)
    ctx.getOption(context, Record)
    ctx.add(context, Record, { a: () => Effect.void })
  }
}
if (!ordinary) {
  warm(Context, Context.empty())
  warm(Baseline, Baseline.empty())
  warm(Twin, Twin.empty())
  warmRecords(Context)
  warmRecords(Twin)
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
const wideTwinContext = Twin.mergeAll(...wideParts(Twin))
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
  /** The median ratio a/b must not exceed this, widened by the control's envelope; `Infinity` for a reported row. */
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
// an ordinary read or write is the branch point's code behind one `typeof` of the key: parity, within the noise the
// control measures, where both modules serve the same calls (`--ordinary`). In a process that runs fibers and reads
// records, this branch's module serves the whole runtime while the copy of the branch point serves the benchmark
// alone; the twin rows below show the same gap for a pristine copy of this branch's own code, so the rows against
// the branch point are bounded at 1.25 there and the ordinary process is where the code is held to parity.
const ordinaryLimit = ordinary ? 1.05 : 1.25
// a record read is a few comparisons more than an ordinary read: the key's one-entry cache, or one `Set.has` per
// overlay walked above the storage and a `WeakMap` lookup
const recordReadLimit = 1.25
const recordReadRebuiltLimit = 1.5

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
  // this branch against a pristine copy of itself (records mode): what serving the runtime costs, code held equal
  {
    label: "getUnsafe, ordinary key: this branch / a pristine copy of this branch",
    a: c("getUnsafe, ordinary key, this branch (twin pair)", () => Context.getUnsafe(plainContext, Plain)),
    b: c("getUnsafe, ordinary key, pristine copy of this branch", () => Twin.getUnsafe(plainTwinContext, PlainTwin)),
    limit: Infinity
  },
  {
    label: "getUnsafe, reference default (slot absent): this branch / a pristine copy of this branch",
    a: c("getUnsafe, reference default, this branch (twin pair)", () => Context.getUnsafe(plainContext, Absent)),
    b: c(
      "getUnsafe, reference default, pristine copy of this branch",
      () => Twin.getUnsafe(plainTwinContext, AbsentTwin)
    ),
    limit: Infinity
  },
  {
    label: "add, ordinary key to 33 slots: this branch / a pristine copy of this branch",
    a: c("add, ordinary key, this branch (twin pair)", () => Context.add(wideContext, Plain, shape)),
    b: c("add, ordinary key, pristine copy of this branch", () => Twin.add(wideTwinContext, PlainTwin, shape)),
    limit: Infinity
  },
  {
    label: "add then getUnsafe, ordinary key: this branch / a pristine copy of this branch",
    a: c(
      "add then getUnsafe, ordinary key, this branch (twin pair)",
      () => Context.getUnsafe(derive(plainContext, Context, RequestId), Plain)
    ),
    b: c(
      "add then getUnsafe, ordinary key, pristine copy of this branch",
      () => Twin.getUnsafe(derive(plainTwinContext, Twin, RequestIdTwin), PlainTwin)
    ),
    limit: Infinity
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
    limit: recordReadLimit
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
    limit: recordReadRebuiltLimit
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
    // one slot check per overlay walked, then the object remembered for the override
    limit: recordReadRebuiltLimit
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
    // a new override: a copy of the record below it with the member replaced (one object of the members and one
    // cache lookup), kept in the one-entry cache only
    limit: 5.0
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
    limit: recordReadRebuiltLimit
  },
  // record writes: one ordinary overlay per member and the object the read returns, whatever the context's size
  {
    label: "record write / ordinary write, into 33 slots",
    a: c("add, record (32 members) to 33 slots", () => Context.add(wideContext, FileSystem.FileSystem, shape)),
    b: c("add, ordinary key to 33 slots (write pair)", () => Context.add(wideContext, Plain, shape)),
    // one property read, one overlay and one property of the assembled object per member: two ordinary writes per
    // slot written
    limit: 2 * memberCount
  },
  {
    label: "record write / ordinary write, into 300 slots",
    a: c("add, record (32 members) to 300 slots", () => Context.add(wide300Context, FileSystem.FileSystem, shape)),
    b: c("add, ordinary key to 300 slots", () => Context.add(wide300Context, Plain, shape)),
    limit: 2 * memberCount
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
    limit: 1.25
  },
  // fiber paths
  {
    label: "yield* FileSystem / yield* Plain, same context",
    a: c("runSync: yield* FileSystem (record service)", () => runRecord(FileSystem.FileSystem)),
    b: c("runSync: yield* Plain (today's record service)", () => runPlain(Plain)),
    limit: recordReadLimit
  },
  {
    label: "yield* FileSystem / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem, context rebuilt per request", () => runRecord(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request", () => runPlain(yieldPlainPerRequest)),
    limit: recordReadRebuiltLimit
  },
  {
    label: "yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request",
    a: c(
      "runSync: yield* FileSystem with a member overridden underneath, per request",
      () => runOverridden(yieldRecordPerRequest)
    ),
    b: c("runSync: yield* Plain, context rebuilt per request (override pair)", () => runPlain(yieldPlainPerRequest)),
    limit: recordReadRebuiltLimit
  },
  {
    label: "yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request",
    a: c("runSync: provideService(readFile) then yield* FileSystem", () => runRecord(yieldRecordOverriddenPerRequest)),
    b: c(
      "runSync: yield* Plain, context rebuilt per request (per-request override pair)",
      () => runPlain(yieldPlainPerRequest)
    ),
    // the override is new each request, so each request copies the record once (one cache lookup, one copy)
    limit: 3.0
  },
  {
    label: "provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request",
    a: c("runSync: provideService(FileSystem, record) then yield* FileSystem", () => runWide(provideRecordPerRequest)),
    b: c("runSync: provideService(Plain, record) then yield* Plain", () => runWide(providePlainPerRequest)),
    // a record provided per request pays one overlay per member and the assembled object per request
    limit: 5.0
  },
  {
    label: "yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request",
    a: c("runSync: yield* FileSystem from member layers, per request", () => runMembers(yieldRecordPerRequest)),
    b: c("runSync: yield* Plain, context rebuilt per request (members pair)", () => runPlain(yieldPlainPerRequest)),
    limit: recordReadRebuiltLimit
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
    // a record read and a method call on it
    limit: recordReadLimit
  }
]

const only = process.env.BENCH_ONLY
const skip = process.env.BENCH_SKIP
const filtered = (ordinary
  ? allPairs.filter((pair) => pair.label.includes("/ baseline") || pair.label.startsWith("control"))
  : allPairs).filter((pair) =>
    (only === undefined || pair.label.includes(only)) && (skip === undefined || !pair.label.includes(skip))
  )
// BENCH_SEED shuffles the pairs after the control (a deterministic shuffle), which changes the order the cases are
// calibrated, optimised and laid out in. A difference of a few nanoseconds between two closures is sensitive to that
// order even when the A/A control is tight, so the runner measures each mode in three orders and takes the median.
const seed = Number(process.env.BENCH_SEED ?? 0)
const shuffled = <A>(items: ReadonlyArray<A>): Array<A> => {
  const out = [...items]
  let state = seed * 2654435761 + 1
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const pairs = (seed === 0 ? filtered : [filtered[0], ...shuffled(filtered.slice(1))])
  // the twin pairs exist in records mode only
  .filter((pair) => !ordinary || !pair.label.includes("pristine copy"))

// Absolute costs, in nanoseconds, with no counterpart at the branch point. Reported, not gated.
const allSingles: ReadonlyArray<Case> = [
  c("getUnsafe, operation key (1 of 33 slots)", () => Context.getUnsafe(recordContext, FileSystem.readFile)),
  c("make, record (32 members)", () => Context.make(FileSystem.FileSystem, shape)),
  c("add, record (32 members): one overlay per member", () => Context.add(wideContext, FileSystem.FileSystem, shape)),
  c(
    "add a member override to a context holding the record (overlay)",
    () => Context.add(recordContext, FileSystem.readFile, fake)
  ),
  c(
    "first record read after a member override (one copy)",
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
// Every case runs a little, round-robin, before any runs enough to be optimised: the optimiser then compiles the
// getters having seen every key shape and every path, as it would in a program past its start-up, instead of
// compiling them for the first case alone and recompiling, with more general code, when a later case deoptimises them.
for (let round = 0; round < 20; round++) {
  for (const { run } of allCases) {
    for (let i = 0; i < 25; i++) sink = run()
  }
}
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
    } ${(Number.isFinite(limit) ? limit.toFixed(2) : "reported").padStart(8)}${ok ? "" : "  EXCEEDED"}`
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
if (process.env.BENCH_JSON !== undefined) {
  const summary = {
    seed,
    envelope,
    skipped: envelope > noise,
    pairs: pairs.slice(1).map((pair) => ({
      label: pair.label,
      median: median(ratios.get(pair.label)!),
      limit: Number.isFinite(pair.limit) ? pair.limit + envelope : null
    }))
  }
  console.log(`BENCH_JSON ${JSON.stringify(summary)}`)
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
