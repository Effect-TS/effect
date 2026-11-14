/**
 * Queries on a worker pool give the same results as without one. The pool
 * runs its workers in-process (a loopback `WorkerPlatform` that passes
 * messages through `structuredClone`, which shares `SharedArrayBuffer`
 * memory like `postMessage` does), with `minRows` low enough that every
 * operation over the test data takes the parallel path.
 */
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { DataFrame, Expr, Parallel, Query } from "effect/dataframe"
import * as Result from "effect/Result"
import * as Worker from "effect/workers/Worker"
import * as WorkerRunner from "effect/workers/WorkerRunner"

// -----------------------------------------------------------------------------
// In-process workers
// -----------------------------------------------------------------------------

const later = (f: () => void) => setTimeout(f, 0)

/** Requests the workers received. */
let requests = 0

const spawnLoopback = (): Worker.Worker<any, any> => {
  let toMain: ((message: Worker.PlatformMessage) => void) | undefined
  let toWorker: ((message: unknown) => void) | undefined
  const queued: Array<unknown> = []
  const runner: WorkerRunner.WorkerRunner<any, any> = {
    run: (handler) =>
      Effect.callback<void>(() => {
        toWorker = (message) => {
          const result = handler(0, message)
          if (Effect.isEffect(result)) Effect.runFork(result as Effect.Effect<unknown>)
        }
        for (const message of queued.splice(0)) later(() => toWorker!(message))
      }),
    send: (portId, message, transfers) => Effect.sync(() => runner.sendUnsafe(portId, message, transfers)),
    sendUnsafe: (_portId, message, transfers) => {
      const copy = structuredClone(message, { transfer: (transfers ?? []) as Array<Transferable> })
      later(() => toMain?.([1, copy]))
    }
  }
  Effect.runFork(
    Parallel.runWorker.pipe(
      Effect.provideService(WorkerRunner.WorkerRunnerPlatform, { start: () => Effect.succeed(runner) as any })
    )
  )
  return Worker.makeUnsafe({
    send: (message) =>
      Effect.sync(() => {
        requests++
        const copy = structuredClone(message)
        if (toWorker === undefined) queued.push(copy)
        else later(() => toWorker!(copy))
      }),
    run: (handler) =>
      Effect.callback<never>(() => {
        toMain = (message) => Effect.runFork(handler(message) as Effect.Effect<unknown>)
        later(() => toMain!([0]))
      })
  })
}

const loopback = Layer.mergeAll(
  Layer.succeed(Worker.WorkerPlatform, { spawn: () => Effect.sync(spawnLoopback) }),
  Worker.layerSpawner(() => undefined)
)

const pool = Parallel.layer({ size: 4, minRows: 100 }).pipe(Layer.provide(loopback))

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

type Row = {
  readonly f: number | null
  readonly i: number | null
  readonly b: bigint | null
  readonly s: string | null
  readonly p: boolean | null
  readonly g: number
}

const schema = ArrowSchema.make([
  ArrowSchema.field("f", ArrowSchema.float64),
  ArrowSchema.field("i", ArrowSchema.int32),
  ArrowSchema.field("b", ArrowSchema.int64),
  ArrowSchema.field("s", ArrowSchema.utf8),
  ArrowSchema.field("p", ArrowSchema.bool),
  ArrowSchema.field("g", ArrowSchema.int32, { nullable: false })
])

const generate = (seed: number, n: number): Array<Row> => {
  let state = seed
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const pick = <A>(values: ReadonlyArray<A>) => values[Math.floor(next() * values.length)]
  const maybe = <A>(a: A): A | null => (next() < 0.1 ? null : a)
  return Array.from({ length: n }, () => ({
    f: maybe(pick([NaN, -0, 0, Infinity, -Infinity, Math.floor(next() * 400) - 200, 0.5, -2.5, next() * 1e6])),
    i: maybe(Math.floor(next() * 3000) - 1500),
    b: maybe(BigInt(Math.floor(next() * 3000)) * 4294967311n - 2n ** 40n),
    s: maybe(`${pick(["a", "é", "😀", "", "zz"])}${Math.floor(next() * 3000)}`),
    p: maybe(next() < 0.5),
    g: Math.floor(next() * 7)
  }))
}

const df: Query.Query<Row> = Query.from(
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(schema, generate(0x2545f491, 5000) as any))) as any
)

/** Equal rows, with floats equal up to rounding (and NaN = NaN). */
const assertSameRows = (actual: ReadonlyArray<unknown>, expected: ReadonlyArray<unknown>) => {
  assert.strictEqual(actual.length, expected.length)
  const same = (a: unknown, b: unknown): boolean => {
    if (typeof a === "number" && typeof b === "number") {
      if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) && Number.isNaN(b)
      return a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b))
    }
    if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
      const ka = Object.keys(a)
      return ka.length === Object.keys(b).length && ka.every((k) => same((a as any)[k], (b as any)[k]))
    }
    return Object.is(a, b) || (a === 0 && b === 0)
  }
  for (let r = 0; r < actual.length; r++) {
    if (!same(actual[r], expected[r])) {
      assert.deepStrictEqual(actual[r], expected[r], `row ${r}`)
    }
  }
}

const both = Effect.fnUntraced(function*<R>(query: Query.Query<R>) {
  const sequential = DataFrame.toRows(yield* query)
  const parallel = DataFrame.toRows(yield* query.pipe(Effect.provide(pool)))
  assertSameRows(parallel, sequential)
  return parallel
})

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe("Parallel", () => {
  for (const keys of [["g"], ["p"], ["s"], ["i", "p"], ["b", "s"], ["f"], ["g", "i", "s"]] as const) {
    it.effect(`groupBy ${keys.join(", ")} matches the sequential result`, () =>
      Effect.gen(function*() {
        const rows = yield* both(df.pipe(
          Query.groupBy(...keys),
          Query.agg((c) => ({
            n: Expr.count(),
            ni: Expr.count(c.i),
            sum: Expr.sum(c.i),
            sumb: Expr.sum(c.b),
            mean: Expr.mean(c.f),
            std: Expr.std(c.i),
            variance: Expr.variance(c.b),
            median: Expr.median(c.i),
            distinct: Expr.countDistinct(c.s),
            min: Expr.min(c.s),
            max: Expr.max(c.f),
            first: Expr.first(c.b),
            last: Expr.last(c.p)
          }))
        ))
        assert.isTrue(rows.length > 0)
      }))
  }

  // Without medians and distinct counts, few groups are merged from per-range
  // partials; many groups (b, s) are partitioned by key hash.
  for (const keys of [["g"], ["p"], ["s"], ["i", "p"], ["b", "s"], ["f"]] as const) {
    it.effect(`groupBy ${keys.join(", ")} with combinable aggregates`, () =>
      both(df.pipe(
        Query.groupBy(...keys),
        Query.agg((c) => ({
          n: Expr.count(),
          ni: Expr.count(c.i),
          sum: Expr.sum(c.i),
          sumf: Expr.sum(c.f),
          sumb: Expr.sum(c.b),
          sump: Expr.sum(c.p),
          mean: Expr.mean(c.f),
          std: Expr.std(c.i),
          variance: Expr.variance(c.b),
          min: Expr.min(c.s),
          max: Expr.max(c.f),
          mini: Expr.min(c.b),
          first: Expr.first(c.b),
          last: Expr.last(c.p)
        }))
      )))
  }

  it.effect("runs on the workers", () =>
    Effect.gen(function*() {
      const before = requests
      yield* df.pipe(Query.groupBy("g"), Query.agg(() => ({ n: Expr.count() })), Effect.provide(pool))
      assert.isTrue(requests > before)
    }))

  it.effect("groupBy over derived columns and after a filter", () =>
    both(df.pipe(
      Query.filter((c) => Expr.isNotNull(c.i)),
      Query.withColumns((c) => ({ bucket: Expr.floorDivide(c.i, 100) })),
      Query.groupBy("bucket"),
      Query.agg((c) => ({ total: Expr.sum(Expr.multiply(c.i, 2)), top: Expr.max(c.s) }))
    )))

  for (const name of ["f", "i", "b", "s", "p"] as const) {
    for (const descending of [false, true]) {
      for (const nullsLast of [false, true]) {
        it.effect(`sort by ${name} ${descending ? "desc" : "asc"} nulls ${nullsLast ? "last" : "first"}`, () => {
          const key = Expr.fromPlan({ _tag: "Column", name })
          return both(df.pipe(Query.sort(() => [descending ? Expr.desc(key) : Expr.asc(key)], { nullsLast })))
        })
      }
    }
  }

  it.effect("multi-key sort is stable", () =>
    both(df.pipe(Query.sort((c) => [Expr.desc(c.p), Expr.asc(c.g), Expr.desc(c.f), c.s]))))

  it.effect("gathers the columns of filtered, sorted and joined results", () =>
    Effect.gen(function*() {
      const right = df.pipe(Query.select((c) => ({ i: c.i, rs: c.s, rf: c.f })), Query.unique(["i"]))
      yield* both(df.pipe(
        Query.filter((c) => Expr.gt(c.i, 0)),
        Query.join(right, { on: "i", how: "left" }),
        Query.sort((c) => [c.rs, c.g])
      ))
    }))

  it.effect("reports kernel failures as DataFrameError", () =>
    Effect.gen(function*() {
      const query = df.pipe(Query.groupBy("g"), Query.agg((c) => ({ x: Expr.sum(c.s as any) })))
      const sequential = yield* Effect.flip(query)
      const parallel = yield* Effect.flip(query.pipe(Effect.provide(pool)))
      assert.instanceOf(parallel, DataFrame.DataFrameError)
      assert.strictEqual(parallel.message, sequential.message)
    }))

  it.effect("the default pool runs queries on the calling thread", () =>
    Effect.gen(function*() {
      const pool = yield* Parallel.Pool
      assert.strictEqual(pool.size, 0)
    }))

  it.effect("small inputs stay on the calling thread", () =>
    Effect.gen(function*() {
      const small = Query.from(DataFrame.fromRows(Schema.Struct({ g: Schema.Number }), [{ g: 1 }, { g: 1 }, { g: 2 }]))
      const rows = yield* small.pipe(
        Query.groupBy("g"),
        Query.agg(() => ({ n: Expr.count() })),
        Effect.map(DataFrame.toRows),
        Effect.provide(pool)
      )
      assert.deepStrictEqual(rows, [{ g: 1, n: 2 }, { g: 2, n: 1 }])
    }))
})
