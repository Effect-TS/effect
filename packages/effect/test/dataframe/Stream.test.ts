/**
 * Queries over streamed tables (a `Stream` of frames in the `Catalog`) run
 * batch by batch and give the same result as over the whole table.
 */
import { assert, describe, it } from "@effect/vitest"
import { Effect, Schema, Stream } from "effect"
import { ArrowIpc } from "effect/arrow"
import { Catalog, DataFrame, Expr, Query } from "effect/dataframe"
import * as Result from "effect/Result"

const Row = Schema.Struct({
  k: Schema.NullOr(Schema.String),
  g: Schema.Number,
  x: Schema.NullOr(Schema.Number)
})
type Row = typeof Row.Type

const generate = (seed: number, n: number): Array<Row> => {
  let state = seed
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  return Array.from({ length: n }, () => ({
    k: next() < 0.1 ? null : `k${Math.floor(next() * 40)}`,
    g: Math.floor(next() * 5),
    x: next() < 0.1 ? null : Math.round(next() * 2000 - 1000) / 8
  }))
}

const rows = generate(0x5eed, 2000)
const whole = DataFrame.fromRows(Row, rows)
const batchRows = 250
const batches = Array.from(
  { length: rows.length / batchRows },
  (_, b) => DataFrame.fromRows(Row, rows.slice(b * batchRows, (b + 1) * batchRows))
)

const Lookup = Schema.Struct({ k: Schema.String, label: Schema.String })
const lookup = DataFrame.fromRows(Lookup, Array.from({ length: 30 }, (_, i) => ({ k: `k${i}`, label: `#${i}` })))

const table = Query.table("t", Row)

/** Runs a query over the streamed table and over the whole table. */
const both = Effect.fnUntraced(function*<R>(query: Query.Query<R>) {
  let pulled = 0
  const streamed = Stream.fromIterable(batches).pipe(Stream.tap(() => Effect.sync(() => pulled++)))
  const fromStream = DataFrame.toRows(yield* query.pipe(Effect.provide(Catalog.layer({ t: streamed, lookup }))))
  const fromFrame = DataFrame.toRows(yield* query.pipe(Effect.provide(Catalog.layer({ t: whole, lookup }))))
  assertClose(fromStream, fromFrame)
  return { rows: fromStream, pulled }
})

const assertClose = (actual: ReadonlyArray<any>, expected: ReadonlyArray<any>) => {
  assert.strictEqual(actual.length, expected.length)
  const close = (a: unknown, b: unknown) =>
    typeof a === "number" && typeof b === "number"
      ? (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
      : a === b
  for (let r = 0; r < actual.length; r++) {
    const keys = Object.keys(expected[r])
    if (!keys.every((k) => close(actual[r][k], expected[r][k]))) {
      assert.deepStrictEqual(actual[r], expected[r], `row ${r}`)
    }
  }
}

describe("Streaming", () => {
  it.effect("row-wise operations run per batch", () =>
    Effect.gen(function*() {
      const { pulled, rows } = yield* both(table.pipe(
        Query.filter((c) => Expr.gt(c.x, 0)),
        Query.withColumns((c) => ({ y: Expr.multiply(c.x, 2), label: Expr.concat(c.k, "!") })),
        Query.pick("k", "y", "label")
      ))
      assert.isTrue(rows.length > 0)
      assert.strictEqual(pulled, batches.length)
    }))

  it.effect("a head stops reading the stream", () =>
    Effect.gen(function*() {
      const { pulled, rows } = yield* both(table.pipe(Query.filter((c) => Expr.isNotNull(c.k)), Query.head(7)))
      assert.strictEqual(rows.length, 7)
      assert.isTrue(pulled <= 2, `read ${pulled} batches`)
    }))

  it.effect("slices across batch boundaries", () => both(table.pipe(Query.slice(240, 30))))

  it.effect("grouping folds batches into partial aggregates", () =>
    both(table.pipe(
      Query.groupBy("k", "g"),
      Query.agg((c) => ({
        n: Expr.count(),
        nx: Expr.count(c.x),
        sum: Expr.sum(c.x),
        mean: Expr.mean(c.x),
        std: Expr.std(c.x),
        min: Expr.min(c.x),
        max: Expr.max(c.k),
        first: Expr.first(c.x),
        last: Expr.last(c.x)
      }))
    )))

  it.effect("aggregates over the whole stream", () =>
    both(table.pipe(Query.aggregate((c) => ({ n: Expr.count(), total: Expr.sum(c.x), variance: Expr.variance(c.x) })))))

  it.effect("medians and distinct counts collect the stream", () =>
    both(table.pipe(
      Query.groupBy("g"),
      Query.agg((c) => ({ median: Expr.median(c.x), distinct: Expr.countDistinct(c.k) }))
    )))

  it.effect("joins stream their left side", () =>
    both(table.pipe(Query.join(Query.table("lookup", Lookup), { on: "k", how: "left" }))))

  it.effect("sorts collect their input", () =>
    both(
      table.pipe(Query.filter((c) => Expr.isNotNull(c.x)), Query.sort((c) => [Expr.desc(c.x), c.k]), Query.head(20))
    ))

  it.effect("concatenates streams in order", () =>
    both(Query.concat([table.pipe(Query.head(3)), table.pipe(Query.tail(3))])))

  it.effect("an empty stream gives an empty result with the declared columns", () =>
    Effect.gen(function*() {
      const catalog = Catalog.layer({ t: Stream.empty })
      const counted = yield* table.pipe(
        Query.aggregate((c) => ({ n: Expr.count(), total: Expr.sum(c.x) })),
        Effect.provide(catalog)
      )
      assert.deepStrictEqual(DataFrame.toRows(counted), [{ n: 0, total: 0 }])
      const grouped = yield* table.pipe(
        Query.groupBy("g"),
        Query.agg(() => ({ n: Expr.count() })),
        Effect.provide(catalog)
      )
      assert.deepStrictEqual(DataFrame.columnNames(grouped), ["g", "n"])
      assert.strictEqual(grouped.length, 0)
    }))

  it.effect("Query.stream emits batches", () =>
    Effect.gen(function*() {
      const sizes = yield* table.pipe(
        Query.filter((c) => Expr.isNotNull(c.k)),
        Query.stream,
        Stream.map((frame) => frame.length),
        Stream.runCollect,
        Effect.provide(Catalog.layer({ t: Stream.fromIterable(batches) }))
      )
      assert.strictEqual(sizes.length, batches.length)
      const single = yield* Query.from(whole).pipe(Query.stream, Stream.runCollect)
      assert.strictEqual(single.length, 1)
    }))

  it.effect("decodes Arrow IPC stream bytes into batches", () =>
    Effect.gen(function*() {
      const bytes = Result.getOrThrow(ArrowIpc.encodeStream(DataFrame.toArrowTable(whole)))
      // Split the bytes at arbitrary points, as a socket would deliver them.
      const chunks = [bytes.subarray(0, 100), bytes.subarray(100, 5000), bytes.subarray(5000)]
      const frames = yield* DataFrame.decodeArrowStream(Stream.fromIterable(chunks)).pipe(Stream.runCollect)
      const total = frames.reduce((s, f) => s + f.length, 0)
      assert.strictEqual(total, whole.length)
      const viaCatalog = yield* table.pipe(
        Query.aggregate((c) => ({ n: Expr.count(c.x) })),
        Effect.provide(Catalog.layer({ t: DataFrame.decodeArrowStream(Stream.fromIterable(chunks)) as any }))
      )
      assert.deepStrictEqual(DataFrame.toRows(viaCatalog), [{ n: rows.filter((r) => r.x !== null).length }])
    }))

  it.effect("fails with DataFrameError for invalid batches", () =>
    Effect.gen(function*() {
      const bad = Stream.make(DataFrame.fromColumns({ k: ["a"], g: ["not a number"], x: [1] }))
      const error = yield* Effect.flip(table.pipe(Effect.provide(Catalog.layer({ t: bad }))))
      assert.instanceOf(error, DataFrame.DataFrameError)
      assert.strictEqual(error.message, `column "g" is Utf8, expected Float64`)
    }))
})
