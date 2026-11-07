/**
 * The cost of record services and operations counted rather than timed: the
 * `Map` and `WeakMap` operations and the bytes allocated by one call of each
 * `Context` function, on this branch and at the branch point, in one process.
 *
 *   node benchmark/context/counts.ts            # the tables
 *   node benchmark/context/counts.ts --check    # exit 1 when a count differs from what the spec states
 *
 * Counts do not depend on the machine's load, so this is the gate a continuous
 * integration runner applies; the timing benchmark beside it
 * (`operations.ts`) reports ratios and skips its gate when its control is too
 * noisy to read.
 *
 * Method. `Map.prototype.get`, `has` and `set`, `Set.prototype.has`, and
 * `WeakMap.prototype.get` and `set`, are replaced by counting wrappers for the duration of one call,
 * after a warm-up call and, for operations with a per-storage cache, after
 * the first call so that the steady state is counted. A `Map` copied with
 * `new Map(map)` calls the replaced `set` once per entry, so a copy of a
 * context's map counts as its size. Bytes are the growth of the heap over
 * calls whose results are kept, after a full collection and with none in
 * between (a run in which one happens is discarded), per call, after enough
 * warm-up for the code to be optimized; the smallest of five runs, rounded to
 * eight bytes, because a run that catches the code before it is optimized
 * reads a hundred bytes of interpreter bookkeeping per call. Reads that
 * allocate nothing read as 0.
 *
 * Gate. Every ordinary-key operation performs the same operations and
 * allocates the same bytes on this branch as at the branch point. A record
 * written into a context performs no `Map` operation (one `WeakMap.set`, the
 * object it assembled remembered for the storage it created) and allocates the
 * same bytes into a context of thirty-three slots and of three hundred. A
 * member read through a record's overlays performs no `Map` operation. A
 * record read is remembered per storage: one `Set.has` per overlay walked above
 * the storage and nothing else after the first read of a storage, and one
 * object (a copy with the member replaced, kept in the one-entry cache and
 * not in the `WeakMap`) once per new override. The record rows are checked
 * against the limits in the spec.
 */
/* oxlint-disable no-extend-native -- the counting wrappers replace Map and WeakMap methods for the run */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { PerformanceObserver } from "node:perf_hooks"
import * as v8 from "node:v8"
import * as vm from "node:vm"
import { base, loadBaseline } from "./baseline.ts"

const Baseline = await loadBaseline()
const check = process.argv.includes("--check")

v8.setFlagsFromString("--expose_gc")
const gc: () => void = vm.runInNewContext("gc")
let collections = 0
new PerformanceObserver((entries) => {
  collections += entries.getEntries().length
}).observe({ entryTypes: ["gc"] })

// The real file system record, 32 members. `Plain` stores the same object the way a record service is stored today.
const memberKeys = Object.values(FileSystem.FileSystem.members) as ReadonlyArray<Context.Slot<any, unknown>>
const shape = Object.fromEntries(
  Object.keys(FileSystem.FileSystem.members).map((name) => [name, () => Effect.void])
) as unknown as FileSystem.Shape
const members = memberKeys.length
const fake = (() => Effect.void) as unknown as FileSystem.Shape["readFile"]

interface Module {
  readonly ctx: typeof Context
  readonly Plain: Context.Key<any, FileSystem.Shape>
  readonly RequestId: Context.Key<any, number>
  readonly Absent: Context.Key<any, number>
  readonly plainContext: Context.Context<any>
  readonly wideContext: Context.Context<any>
  readonly wideParts: ReadonlyArray<Context.Context<any>>
  readonly perRequest: Context.Context<any>
}
const module = (ctx: typeof Context): Module => {
  const Plain = ctx.Service<FileSystem.Shape>("bench/FileSystem/plain")
  const RequestId = ctx.Service<number>("bench/RequestId")
  const Absent = ctx.Reference<number>("bench/Absent", { defaultValue: () => 1 })
  const plainContext = ctx.make(Plain, shape)
  const wideParts = Array.from({ length: 33 }, (_, i) => ctx.make(ctx.Service<number>(`bench/Service/${i}`), i))
  const wideContext = ctx.mergeAll(...wideParts)
  return {
    ctx,
    Plain,
    RequestId,
    Absent,
    plainContext,
    wideContext,
    wideParts,
    perRequest: ctx.add(plainContext, RequestId, 1)
  }
}
const branch = module(Context)
const baseline = module(Baseline)

const wide = (slots: number) =>
  Context.mergeAll(
    ...Array.from({ length: slots }, (_, i) => Context.make(Context.Service<number>(`bench/Wide/${i}`), i))
  )
const wide33 = wide(33)
const wide300 = wide(300)
const RequestId = Context.Service<number>("bench/RequestId")
const recordContext = Context.make(FileSystem.FileSystem, shape)
const recordPerRequest = Context.add(recordContext, RequestId, 1)
const recordAdded = Context.add(wide33, FileSystem.FileSystem, shape)
const overridden = Context.add(recordContext, FileSystem.readFile, fake)
const overriddenPerRequest = Context.add(overridden, RequestId, 1)
const membersContext = Context.mergeAll(...memberKeys.map((member) => Context.make(member, () => Effect.void)))

interface Counts {
  readonly get: number
  readonly has: number
  readonly set: number
  readonly setHas: number
  readonly weakGet: number
  readonly weakSet: number
}
const zero: Counts = { get: 0, has: 0, set: 0, setHas: 0, weakGet: 0, weakSet: 0 }
let counting = false
let counts = { ...zero }
const original = {
  get: Map.prototype.get,
  has: Map.prototype.has,
  set: Map.prototype.set,
  setHas: Set.prototype.has,
  weakGet: WeakMap.prototype.get,
  weakSet: WeakMap.prototype.set
}
Map.prototype.get = function(this: Map<unknown, unknown>, key: unknown) {
  if (counting) counts.get++
  return original.get.call(this, key)
}
Map.prototype.has = function(this: Map<unknown, unknown>, key: unknown) {
  if (counting) counts.has++
  return original.has.call(this, key)
}
Map.prototype.set = function(this: Map<unknown, unknown>, key: unknown, value: unknown) {
  if (counting) counts.set++
  return original.set.call(this, key, value)
}
Set.prototype.has = function(this: Set<unknown>, key: unknown) {
  if (counting) counts.setHas++
  return original.setHas.call(this, key)
}
WeakMap.prototype.get = function(this: WeakMap<object, unknown>, key: object) {
  if (counting) counts.weakGet++
  return original.weakGet.call(this, key)
}
WeakMap.prototype.set = function(this: WeakMap<object, unknown>, key: object, value: unknown) {
  if (counting) counts.weakSet++
  return original.weakSet.call(this, key, value)
}

interface Case {
  readonly name: string
  /** A fresh input per call, when the operation's cost depends on not having run before. */
  readonly fresh?: () => unknown
  readonly run: (input: any) => unknown
  /** Calls before the counted one; two for operations whose first call fills a cache. */
  readonly warm: number
}
const steady = (name: string, run: () => unknown): Case => ({ name, run, warm: 2 })
const first = <A>(name: string, fresh: () => A, run: (input: A) => unknown): Case => ({ name, fresh, run, warm: 1 })

let sink: unknown
const count = (kase: Case): Counts => {
  for (let i = 0; i < kase.warm; i++) sink = kase.run(kase.fresh?.())
  const input = kase.fresh?.()
  counts = { ...zero }
  counting = true
  sink = kase.run(input)
  counting = false
  return counts
}
const bytes = (kase: Case): number => {
  const n = 4000
  let least = Infinity
  for (let attempt = 0; attempt < 5; attempt++) {
    const inputs = kase.fresh ? Array.from({ length: n }, () => kase.fresh!()) : undefined
    const results = new Array<unknown>(n).fill(undefined)
    // enough calls for the code to be optimized; before that, the interpreter allocates an arguments object per call
    for (let i = 0; i < 100000; i++) sink = kase.run(kase.fresh?.())
    gc()
    const before = process.memoryUsage().heapUsed
    const collected = collections
    for (let i = 0; i < n; i++) results[i] = kase.run(inputs === undefined ? undefined : inputs[i])
    const after = process.memoryUsage().heapUsed
    sink = results
    if (collections !== collected) {
      attempt--
      continue
    }
    least = Math.min(least, Math.max(0, Math.round((after - before) / n / 8) * 8))
  }
  return least
}

interface Row {
  readonly name: string
  readonly counts: Counts
  readonly bytes: number
}
const measure = (kase: Case): Row => ({ name: kase.name, counts: count(kase), bytes: bytes(kase) })

// Ordinary keys: the same operation on both modules.
const ordinary = (m: Module): ReadonlyArray<Case> => [
  steady("getUnsafe, ordinary key, flat context", () => m.ctx.getUnsafe(m.plainContext, m.Plain)),
  steady("getUnsafe, ordinary key, through one overlay", () => m.ctx.getUnsafe(m.perRequest, m.Plain)),
  steady("getUnsafe, reference default (slot absent)", () => m.ctx.getUnsafe(m.plainContext, m.Absent)),
  steady("getOption, absent key", () => m.ctx.getOption(m.plainContext, m.RequestId)),
  steady("add, ordinary key to 33 slots", () => m.ctx.add(m.wideContext, m.Plain, shape)),
  steady("add then getUnsafe, ordinary key", () => m.ctx.getUnsafe(m.ctx.add(m.plainContext, m.RequestId, 1), m.Plain)),
  steady("make, ordinary key", () => m.ctx.make(m.RequestId, 1)),
  steady("mergeAll, 33 one-slot contexts", () => m.ctx.mergeAll(...m.wideParts))
]

// Records, this branch only.
const records: ReadonlyArray<Case> = [
  steady("add, record (32 members) to 33 slots", () => Context.add(wide33, FileSystem.FileSystem, shape)),
  steady("add, record (32 members) to 300 slots", () => Context.add(wide300, FileSystem.FileSystem, shape)),
  steady("make, record (32 members)", () => Context.make(FileSystem.FileSystem, shape)),
  steady("getUnsafe, member through a record's overlays", () => Context.getUnsafe(recordAdded, FileSystem.readFile)),
  steady("getUnsafe, record through a record's overlays", () => Context.getUnsafe(recordAdded, FileSystem.FileSystem)),
  steady(
    "getUnsafe, record in a flat map, same context",
    () => Context.getUnsafe(recordContext, FileSystem.FileSystem)
  ),
  steady(
    "getUnsafe, record in a flat map, through one overlay",
    () => Context.getUnsafe(recordPerRequest, FileSystem.FileSystem)
  ),
  first(
    "add then getUnsafe, record in a flat map, context rebuilt per request",
    () => Context.add(recordContext, RequestId, 1),
    (context) => Context.getUnsafe(context, FileSystem.FileSystem)
  ),
  steady(
    "add, member override to a context holding the record",
    () => Context.add(recordContext, FileSystem.readFile, fake)
  ),
  steady(
    "getUnsafe, record with a member overridden underneath, through one overlay",
    () => Context.getUnsafe(overriddenPerRequest, FileSystem.FileSystem)
  ),
  first(
    "add member override then getUnsafe record, per request (new override each time)",
    () => Context.add(recordContext, FileSystem.readFile, fake),
    (context) => Context.getUnsafe(context, FileSystem.FileSystem)
  ),
  first(
    "getUnsafe, record never written, first read of a storage",
    () => Context.add(membersContext, FileSystem.stat, fake as unknown as FileSystem.Shape["stat"]),
    (context) => Context.getUnsafe(context, FileSystem.FileSystem)
  ),
  steady("getUnsafe, record never written, later read", () => Context.getUnsafe(membersContext, FileSystem.FileSystem))
]

const branchRows = ordinary(branch).map(measure)
const baselineRows = ordinary(baseline).map(measure)
const recordRows = records.map(measure)
void sink

const header = `  ${"case".padEnd(80)} ${"Map.get".padStart(8)} ${"Map.has".padStart(8)} ${"Map.set".padStart(8)} ${
  "Set.has".padStart(8)
} ${"Weak.get".padStart(9)} ${"Weak.set".padStart(9)} ${"bytes".padStart(7)}`
const line = (row: Row, name = row.name) =>
  `  ${name.padEnd(80)} ${String(row.counts.get).padStart(8)} ${String(row.counts.has).padStart(8)} ${
    String(row.counts.set).padStart(8)
  } ${String(row.counts.setHas).padStart(8)} ${String(row.counts.weakGet).padStart(9)} ${
    String(row.counts.weakSet).padStart(9)
  } ${row.bytes.toFixed(0).padStart(7)}`

console.log(`baseline: ${base.slice(0, 10)}; operations and bytes per call\n`)
console.log("ordinary keys, this branch over the branch point (each pair must be identical)\n")
console.log(header)
const failures: Array<string> = []
for (let i = 0; i < branchRows.length; i++) {
  const a = branchRows[i]
  const b = baselineRows[i]
  console.log(line(a, `${a.name}, this branch`))
  console.log(line(b, `${a.name}, baseline`))
  if (JSON.stringify(a.counts) !== JSON.stringify(b.counts)) {
    failures.push(`${a.name}: this branch performs different Map operations from the branch point`)
  }
  // Large allocations (a map of 33 entries) read with some variance and are reported, not gated.
  if (Math.max(a.bytes, b.bytes) < 1000 && a.bytes > b.bytes) {
    failures.push(`${a.name}: this branch allocates more than the branch point`)
  }
}

console.log("\nrecords, this branch\n")
console.log(header)
for (const row of recordRows) console.log(line(row))

const row = (name: string) => recordRows.find((r) => r.name.startsWith(name))!
const expect = (name: string, predicate: (row: Row) => boolean, text: string) => {
  if (!predicate(row(name))) failures.push(`${name}: ${text}`)
}
const add33 = row("add, record (32 members) to 33 slots")
const add300 = row("add, record (32 members) to 300 slots")
const noMapOps = (r: Row) => r.counts.get + r.counts.has + r.counts.set === 0
expect(
  "add, record (32 members) to 33 slots",
  (r) => noMapOps(r) && r.counts.weakSet === 1,
  "a record write performs no Map operation: one overlay per slot, and one WeakMap.set to remember the object"
)
expect(
  "add, record (32 members) to 300 slots",
  (r) => JSON.stringify(r.counts) === JSON.stringify(add33.counts) && r.bytes === add33.bytes,
  "a record write into 300 slots must cost what one into 33 slots costs"
)
expect(
  "getUnsafe, member through a record's overlays",
  noMapOps,
  "the member is found in the overlays: no Map operation, as for any overlay"
)
expect(
  "getUnsafe, record through a record's overlays",
  (r) => noMapOps(r) && r.counts.setHas === 1 && r.counts.weakGet === 0 && r.bytes === 0,
  "one slot check for the topmost overlay, which is the storage, then remembered: no lookup and no allocation"
)
expect(
  "getUnsafe, record in a flat map, same context",
  (r) => noMapOps(r) && r.counts.setHas + r.counts.weakGet === 0 && r.bytes === 0,
  "remembered in the key's one-entry cache"
)
expect(
  "getUnsafe, record in a flat map, through one overlay",
  (r) => noMapOps(r) && r.counts.setHas === 1 && r.counts.weakGet === 0 && r.bytes === 0,
  "one slot check for the overlay, then remembered"
)
expect(
  "add member override then getUnsafe record, per request",
  (r) =>
    r.counts.get <= 1 && r.counts.has + r.counts.set === 0 && r.counts.weakGet <= 2 && r.counts.weakSet === 0 &&
    r.bytes <= 16 * (members + 1) + 64,
  "a new override: the record below it looked up, one copy with the member replaced, kept in the one-entry cache only"
)
expect(
  "getUnsafe, record with a member overridden underneath",
  (r) => noMapOps(r) && r.counts.setHas === 2 && r.counts.weakGet + r.counts.weakSet === 0 && r.bytes === 0,
  "one slot check per overlay walked, then the remembered object"
)
expect(
  "make, record (32 members)",
  (r) => r.counts.set === members && r.counts.weakSet === 1,
  `one Map.set per slot (${members}) and one WeakMap.set`
)
expect(
  "getUnsafe, record never written, later read",
  (r) => noMapOps(r) && r.counts.setHas + r.counts.weakGet === 0 && r.bytes === 0,
  "remembered"
)
void add300

if (check) {
  if (failures.length > 0) {
    console.error(`\n${failures.length} count(s) off:\n  ${failures.join("\n  ")}`)
    process.exit(1)
  }
  console.log("\nOK: every count is as stated")
}
