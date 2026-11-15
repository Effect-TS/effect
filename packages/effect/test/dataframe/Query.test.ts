import { assert, describe, it } from "@effect/vitest"
import {
  BigDecimal,
  type DateTime,
  type Duration,
  Effect,
  Exit,
  Fiber,
  Result,
  Scheduler,
  Schema,
  Stream
} from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { Catalog, DataFrame, Expr, Plan, Query } from "effect/dataframe"
import { vi } from "vitest"
import * as Compare from "./oracle/Compare.ts"
import * as Gold from "./oracle/Gold.ts"
import * as Oracle from "./oracle/Plan.ts"

const Reading = Schema.Struct({
  city: Schema.String,
  temp: Schema.Number,
  rain: Schema.NullOr(Schema.Number)
})

const readings = DataFrame.fromRows(Reading, [
  { city: "Vienna", temp: 21.5, rain: 0 },
  { city: "Berlin", temp: 26.5, rain: null },
  { city: "Vienna", temp: 19, rain: 2 }
])

const City = Schema.Struct({ city: Schema.String, country: Schema.String })
const cities = DataFrame.fromRows(City, [
  { city: "Vienna", country: "AT" },
  { city: "Berlin", country: "DE" }
])

const tables = Catalog.layer({ readings, cities })

const rows = <R>(query: Query.Query<R>) => Effect.map(query, DataFrame.toRows)

/** A frame of Arrow-typed columns. */
const arrowFrame = <R = unknown>(columns: Record<string, readonly [ArrowSchema.DataType, ReadonlyArray<unknown>]>) =>
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(
    ArrowSchema.make(Object.entries(columns).map(([name, [type]]) => ArrowSchema.field(name, type))),
    Object.values(columns).map(([, values]) => values)
  ))) as DataFrame.DataFrame<R>

const Price = Schema.Struct({ d: Schema.BigDecimal })
const price = (d: string, precision: number, scale: number) =>
  DataFrame.fromRows(Price, [{ d: BigDecimal.fromStringUnsafe(d) }], {
    types: { d: ArrowSchema.decimal(precision, scale) }
  })

describe("Query", () => {
  describe("running", () => {
    // DF-Q001 (API contract): Query.Query; pinned source in README.md.
    it.effect("is an Effect producing a frame", () =>
      Effect.gen(function*() {
        const df = yield* Query.from(readings).pipe(Query.filter((c) => Expr.gt(c.temp, 20)))
        assert.deepStrictEqual(DataFrame.toArray(df, "city"), ["Vienna", "Berlin"])
      }))

    // DF-Q042 (API contract): Query yields between operations; pinned source in README.md.
    it.effect("yields a long query so another fiber can interrupt it", () =>
      Effect.gen(function*() {
        // Control elapsed time, not machine speed; disable automatic runtime yields
        // so only the query's cooperative yielding can let the parent resume.
        let now = 0
        const clock = vi.spyOn(performance, "now").mockImplementation(() => (now += 1_000))
        const tasks: Array<() => void> = []
        const scheduler: Scheduler.Scheduler = {
          executionMode: "async",
          shouldYield: () => false,
          makeDispatcher: () => ({
            scheduleTask: (task) => {
              tasks.push(task)
            },
            flush() {}
          })
        }
        let loaded = false
        let completed = false
        try {
          const query = Query.table("readings", Reading).pipe(
            Query.sort((c) => [Expr.asc(c.temp)]),
            Query.select((c) => ({ temp: Expr.add(c.temp, 1) }))
          )
          const child = yield* query.pipe(
            Effect.provideService(
              Catalog.Catalog,
              Catalog.make({
                readings: Effect.sync(() => {
                  loaded = true
                  return readings
                })
              })
            ),
            Effect.tap(() =>
              Effect.sync(() => {
                completed = true
              })
            ),
            Effect.provideService(Scheduler.Scheduler, scheduler),
            Effect.forkChild({ startImmediately: true })
          )
          try {
            assert.isTrue(loaded)
            assert.isUndefined(child.pollUnsafe())
          } finally {
            child.interruptUnsafe()
            while (tasks.length > 0) tasks.shift()!()
          }
          assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(child)))
          assert.isFalse(completed)
        } finally {
          clock.mockRestore()
        }
      }))

    // DF-Q002 (API contract): Query.select; pinned source in README.md.
    it.effect("expression callbacks run once at construction, not on execution", () =>
      Effect.gen(function*() {
        let calls = 0
        const query = Query.from(readings).pipe(Query.select((c) => {
          calls++
          return { city: c.city }
        }))
        assert.strictEqual(calls, 1)
        const expected = [{ city: "Vienna" }, { city: "Berlin" }, { city: "Vienna" }]
        assert.deepStrictEqual(yield* rows(query), expected)
        assert.deepStrictEqual(yield* rows(query), expected)
        assert.strictEqual(calls, 1)
      }))

    // DF-Q003 (API contract): Query.Query; pinned source in README.md.
    it.effect("does no work until it runs", () =>
      Effect.gen(function*() {
        const query = Query.table("missing", City).pipe(Query.filter((c) => Expr.eq(c.city, "Vienna")))
        const error = yield* Effect.flip(query)
        assert.strictEqual(error.message, `unknown table "missing"`)
      }))

    // DF-Q004 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("reads each table once per run, from effects too", () =>
      Effect.gen(function*() {
        let loads = 0
        const catalog = Catalog.make({ cities: Effect.sync(() => (loads++, cities)) })
        const query = Query.table("cities", City).pipe(
          Query.join(Query.table("cities", City).pipe(Query.rename({ country: "other" })), { on: "city" })
        )
        const df = yield* Effect.provideService(query, Catalog.Catalog, catalog)
        assert.strictEqual(df.length, 2)
        assert.strictEqual(loads, 1)
        yield* Effect.provideService(query, Catalog.Catalog, catalog)
        assert.strictEqual(loads, 2)
      }))

    // DF-Q005 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("tables can be queries (views)", () =>
      Effect.gen(function*() {
        const warm = Query.table("readings", Reading).pipe(Query.filter((c) => Expr.gt(c.temp, 20)))
        const query = Query.table("warm", Reading).pipe(Query.pick("city"))
        const result = yield* rows(query).pipe(Effect.provide(Catalog.layer({ readings, warm })))
        assert.deepStrictEqual(result, [{ city: "Vienna" }, { city: "Berlin" }])
      }))

    // DF-Q006 (API contract): Query.table; pinned source in README.md.
    it.effect("checks tables against their declared columns", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(Query.table("readings", City).pipe(Effect.provide(tables)))
        assert.strictEqual(error.message, `missing column "country"`)
        const bad = Stream.make(DataFrame.fromColumns({ city: [1] }))
        const streamed = yield* Effect.flip(Query.table("t", City).pipe(Effect.provide(Catalog.layer({ t: bad }))))
        assert.strictEqual(streamed.message, `column "city" is Float64, expected Utf8`)
        const Kind = Schema.Struct({ kind: Schema.Literals(["a", "b"]) })
        const Range = Schema.Struct({ lo: Schema.Number, hi: Schema.Number }).check(
          Schema.makeFilter((row) => row.lo < row.hi || "lo must be below hi")
        )
        const Utc = Schema.Struct({ t: Schema.DateTimeUtc })
        const berlin = arrowFrame({ t: [ArrowSchema.timestamp("millisecond", "Europe/Berlin"), [0n]] })
        for (
          const [schema, frame, message] of [
            [Kind, DataFrame.fromColumns({ kind: ["a", "c"] }), `column "kind" has values its schema rejects`],
            [Range, DataFrame.fromColumns({ lo: [1, 2], hi: [2, 1] }), "rows have values their schema rejects"],
            [Utc, berlin, `column "t" has time zone Europe/Berlin, expected UTC timestamps`]
          ] as const
        ) {
          for (const t of [frame, Stream.make(frame)]) {
            const error = yield* Effect.flip(Query.table("t", schema).pipe(Effect.provide(Catalog.layer({ t }))))
            assert.strictEqual(error.message, message)
          }
        }
        const ranges = Query.table("t", Range).pipe(
          Effect.provide(Catalog.layer({ t: DataFrame.fromColumns({ lo: [1], hi: [2] }) }))
        )
        assert.deepStrictEqual(DataFrame.toRows(yield* ranges), [{ lo: 1, hi: 2 }])
      }))

    // DF-Q007 (API contract): Query.table; pinned source in README.md.
    it.effect("narrows tables to their declared columns", () =>
      Effect.gen(function*() {
        const Temps = Schema.Struct({ temp: Schema.Number, city: Schema.String })
        const df = yield* Query.table("readings", Temps).pipe(Effect.provide(tables))
        assert.deepStrictEqual(DataFrame.columnNames(df), ["temp", "city"])
      }))

    // DF-Q008 (API contract): DataFrame.DataFrameError; pinned source in README.md.
    it.effect("fails with DataFrameError on invalid expressions", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(Query.from(readings).pipe(Query.filter((c) => c.city as any)))
        assert.instanceOf(error, DataFrame.DataFrameError)
        assert.strictEqual(error.message, "filter predicate must be boolean, got Utf8")
      }))

    // DF-Q009 (API contract): Expr.Expr; pinned source in README.md.
    it.effect("decimal results fail instead of overflowing 64 bits", () =>
      Effect.gen(function*() {
        const nines = (rows: number) =>
          DataFrame.fromColumns({ s: Array.from({ length: rows }, () => "999999999999999999") })
        const d = (c: Query.Columns<{ readonly s: string }>) => Expr.castDecimal(c.s, 19, 0)
        const ten = Query.from(nines(10))
        const min = Query.from(DataFrame.fromColumns({ s: ["-9223372036854775808"] }))
        const streamed = Query.fromPlan({ _tag: "Table", name: "t" }).pipe(
          Query.aggregate((c) => ({ total: Expr.sum(Expr.castDecimal(c.s as Expr.Expr<string>, 18, 0)) })),
          Effect.provide(Catalog.layer({ t: Stream.make(nines(5), nines(5)) }))
        )
        const queries: ReadonlyArray<Effect.Effect<unknown, DataFrame.DataFrameError>> = [
          Query.aggregate(ten, (c) => ({ total: Expr.sum(d(c)) })),
          Query.select(ten, (c) => ({ running: Expr.cumSum(d(c)) })),
          Query.select(ten, (c) => ({ rolling: Expr.rollingSum(d(c), 10) })),
          Query.select(min, (c) => ({ abs: Expr.abs(d(c)) })),
          Query.select(min, (c) => ({ negated: Expr.negate(d(c)) })),
          Query.select(min, () => ({ literal: Expr.lit(BigDecimal.fromBigInt(10n ** 20n)) })),
          streamed
        ]
        for (const query of queries) {
          assert.strictEqual((yield* Effect.flip(query)).message, "decimal value overflows 64 bits")
        }
      }))

    // DF-Q010 (API contract): Expr.round; pinned source in README.md.
    it.effect("round rejects negative or fractional places", () =>
      Effect.gen(function*() {
        for (const places of [-1, 0.5]) {
          const error = yield* Effect.flip(
            Query.from(readings).pipe(Query.select((c) => ({ t: Expr.round(c.temp, places) })))
          )
          assert.strictEqual(error.message, `round needs a non-negative whole number of decimals, got ${places}`)
        }
      }))
  })

  describe("operations", () => {
    // DF-Q011 (API contract): Query.slice; pinned source in README.md.
    it.effect("slice takes an offset and a length; negative offsets count from the end", () =>
      Effect.gen(function*() {
        const n = Query.from(DataFrame.fromColumns({ n: Int32Array.of(0, 1, 2, 3, 4) }))
        const values = (q: Query.Query<{ readonly n: number }>) => Effect.map(q, (df) => DataFrame.toArray(df, "n"))
        assert.deepStrictEqual(yield* values(Query.slice(n, 1, 2)), [1, 2])
        assert.deepStrictEqual(yield* values(Query.slice(n, -2)), [3, 4])
        assert.deepStrictEqual(yield* values(Query.slice(n, -2, 1)), [3])
        assert.deepStrictEqual(yield* values(Query.head(n, 2)), [0, 1])
        assert.deepStrictEqual(yield* values(Query.tail(n, 2)), [3, 4])
        assert.deepStrictEqual(yield* values(Query.tail(n, 0)), [])
        assert.deepStrictEqual(yield* values(Query.slice(n, 9)), [])
      }))

    // DF-Q012 (API contract): Query.append; pinned source in README.md.
    it.effect("append stacks rows; dropNulls removes incomplete rows", () =>
      Effect.gen(function*() {
        const df = yield* Query.from(readings).pipe(Query.append(Query.from(readings)), Query.dropNulls(["rain"]))
        assert.deepStrictEqual(DataFrame.toArray(df, "rain"), [0, 2, 0, 2])
      }))

    // DF-Q013 (API contract): Query.join; pinned source in README.md.
    it.effect("joins on several keys", () =>
      Effect.gen(function*() {
        const right = DataFrame.fromColumns({ city: ["Vienna", "Vienna"], temp: [19, 21.5], note: ["cool", "warm"] })
        const result = yield* rows(
          Query.from(readings).pipe(Query.pick("city", "temp"), Query.join(Query.from(right), { on: ["city", "temp"] }))
        )
        assert.deepStrictEqual(result, [
          { city: "Vienna", temp: 21.5, note: "warm" },
          { city: "Vienna", temp: 19, note: "cool" }
        ])
      }))

    // DF-Q014 (API contract): Expr.cast; pinned source in README.md.
    it.effect("cast reports values that don't fit as null", () =>
      Effect.gen(function*() {
        const df = DataFrame.fromColumns({ x: [1.9, -1.9, 3e10, NaN] })
        const result = yield* rows(
          Query.from(df).pipe(Query.select((c) => ({ i: Expr.cast(c.x, "Int32"), s: Expr.cast(c.x, "Utf8") })))
        )
        assert.deepStrictEqual(result, [
          { i: 1, s: "1.9" },
          { i: -1, s: "-1.9" },
          { i: null, s: "30000000000" },
          { i: null, s: "NaN" }
        ])
        const decimals = DataFrame.fromColumns({ f: [1e308], u: BigUint64Array.of(2n ** 64n - 1n), d: ["-1.5"] })
        const casts = yield* rows(
          Query.from(decimals).pipe(Query.select((c) => ({
            fromFloat: Expr.castDecimal(c.f, 18, 18),
            fromUInt64: Expr.castDecimal(c.u, 20, 0),
            toUInt64: Expr.cast(Expr.castDecimal(c.d, 2, 1), "UInt64")
          })))
        )
        assert.deepStrictEqual(casts, [{ fromFloat: null, fromUInt64: null, toUInt64: null }])
        // Expected values from Polars 2.1.0 non-strict casts.
        const temporal = arrowFrame<{ t: DateTime.Utc; d: Duration.Duration; i: bigint }>({
          t: [ArrowSchema.timestamp("millisecond"), [10n ** 17n]],
          d: [ArrowSchema.duration("millisecond"), [10n ** 17n]],
          i: [ArrowSchema.int64, [2n ** 40n]]
        })
        const overflows = yield* rows(
          Query.from(temporal).pipe(Query.select((c) => ({
            t: Expr.cast(c.t, "Timestamp[ns]"),
            d: Expr.cast(c.d, "Duration[ns]"),
            i: Expr.cast(c.i, "Date")
          })))
        )
        assert.deepStrictEqual(overflows, [{ t: null, d: null, i: null }])
      }))

    // DF-Q015 (API contract): Expr.Expr; pinned source in README.md.
    it.effect("implicit conversions to a common type fail on values it can't hold", () =>
      Effect.gen(function*() {
        const big = Query.from(price("6000000000000000000", 19, 0))
        const small = Query.from(price("1.20", 18, 2))
        const failures: ReadonlyArray<Effect.Effect<unknown, DataFrame.DataFrameError>> = [
          Query.concat([big, small]),
          Query.join(big, small, { on: "d", how: "left" }),
          Query.filter(big, (c) => Expr.eq(c.d, BigDecimal.fromStringUnsafe("1.20")))
        ]
        for (const query of failures) {
          const error = yield* Effect.flip(query)
          assert.strictEqual(error.message, "Decimal[19, 0] values don't fit their common type Decimal[38, 2]")
        }
        // Integer literals a column's type can't hold widen it, wherever they
        // appear among the operands. Expected values from Polars 2.1.0 unless noted.
        const { bool, float64, int8, int16, int32 } = ArrowSchema
        const w = (x: Expr.Expr<number | null>) => Expr.when(Expr.isNull(x), 1, 300)
        const literals: ReadonlyArray<
          readonly [
            string,
            (c: Query.Columns<{ readonly x: number | null; readonly u: number | null }>) => Expr.Expr<unknown>,
            ArrowSchema.DataType,
            ReadonlyArray<unknown>
          ]
        > = [
          ["x + 300", (c) => Expr.add(c.x, 300), int16, [null, 305]],
          ["300 + x", (c) => Expr.add(Expr.lit(300), c.x), int16, [null, 305]],
          ["x > 1000", (c) => Expr.gt(c.x, 1000), bool, [null, false]],
          ["when(x > 0, x, 300)", (c) => Expr.when(Expr.gt(c.x, 0), c.x, 300), int16, [300, 5]],
          ["when(x > 0, 300, x)", (c) => Expr.when(Expr.gt(c.x, 0), 300, c.x), int16, [null, 300]],
          ["coalesce(x, 300)", (c) => Expr.coalesce(c.x, 300), int16, [300, 5]],
          ["coalesce(300, x)", (c) => Expr.coalesce(300, c.x), int16, [300, 300]],
          ["fillNull(x, 300)", (c) => Expr.fillNull(c.x, 300), int16, [300, 5]],
          ["coalesce(null, 300, x)", (c) => Expr.coalesce(null, 300, c.x), int16, [300, 300]],
          ["coalesce(x, null, 300)", (c) => Expr.coalesce(c.x, null, 300), int16, [300, 5]],
          ["coalesce(x, 300, 70000)", (c) => Expr.coalesce(c.x, 300, 70000), int32, [300, 5]],
          // Polars gives Int16, which can't hold 70000.
          ["coalesce(300, 70000, x)", (c) => Expr.coalesce(300, 70000, c.x), int32, [300, 300]],
          ["coalesce(1, x)", (c) => Expr.coalesce(1, c.x), int8, [1, 1]],
          ["coalesce(300, 1.5, x)", (c) => Expr.coalesce(300, 1.5, c.x), float64, [300, 300]],
          ["coalesce(u, -1)", (c) => Expr.coalesce(c.u, -1), int16, [-1, 5]],
          ["coalesce(-1, u)", (c) => Expr.coalesce(-1, c.u), int16, [-1, -1]],
          ["x + cast(5, Int32)", (c) => Expr.add(c.x, Expr.cast(Expr.lit(5), "Int32")), int32, [null, 10]],
          // Literal-only operands are fitted as a whole (w is when(x is null, 1, 300));
          // Polars gives Int8, making 5 + 300 null and (100 + 1) * 2 wrap to -54.
          ["x + w", (c) => Expr.add(c.x, w(c.x)), int16, [null, 305]],
          [
            "(coalesce(x, 100) + w) * 2",
            (c) => Expr.multiply(Expr.add(Expr.coalesce(c.x, 100), w(c.x)), 2),
            int16,
            [202, 610]
          ],
          // Other operands computed from literals count as Int32; Polars gives
          // Int8 with nulls.
          ["x + -w", (c) => Expr.add(c.x, Expr.negate(w(c.x))), int32, [null, -295]]
        ]
        // x is Int8 and u UInt8, both [null, 5]: whole, streamed a row at a
        // time and sliced to the first row, results have the same types.
        const ints = (xs: ReadonlyArray<number>) =>
          DataFrame.fromColumns({ x: Int8Array.from(xs), u: Uint8Array.from(xs) })
        const nullable = (input: Query.Query<{ readonly x: number; readonly u: number }>) =>
          Query.withColumns(input, (c) => ({
            x: Expr.when(Expr.gt(c.x, 0), c.x, null),
            u: Expr.when(Expr.gt(c.u, 0), c.u, null)
          }))
        const whole = nullable(Query.from(ints([0, 5])))
        const streamed = nullable(
          Query.table("t", Schema.Struct({ x: Schema.Number, u: Schema.Number }), {
            types: { x: ArrowSchema.int8, u: ArrowSchema.uint8 }
          })
        )
        const batches = Catalog.layer({ t: Stream.make(ints([0]), ints([5])) })
        const result = (query: Query.Query<{ readonly r: unknown }>) =>
          Effect.map(query, (df) => [df.schema.fields[0].type, DataFrame.toArray(df, "r")])
        for (const [name, expr, type, values] of literals) {
          const select = (input: typeof whole) => Query.select(input, (c) => ({ r: expr(c) }))
          assert.deepStrictEqual(yield* result(select(whole)), [type, values], name)
          assert.deepStrictEqual(yield* result(select(streamed)).pipe(Effect.provide(batches)), [type, values], name)
          assert.deepStrictEqual(yield* result(Query.head(select(whole), 1)), [type, values.slice(0, 1)], name)
        }
      }))

    // DF-Q016 (API contract): Expr.Expr; pinned source in README.md.
    it.effect("temporal operands of mixed units meet in the coarser unit, as in Polars", () =>
      Effect.gen(function*() {
        // Expected values from Polars 2.1.0: timestamps round down, durations toward zero.
        const df = arrowFrame<{ t: DateTime.Utc; s: DateTime.Utc; d: Duration.Duration; e: Duration.Duration }>({
          t: [ArrowSchema.timestamp("millisecond"), [1n, -1n, 2n]],
          s: [ArrowSchema.timestamp("microsecond"), [1500n, 1500n, -1n]],
          d: [ArrowSchema.duration("millisecond"), [1n, -1n, 2n]],
          e: [ArrowSchema.duration("microsecond"), [1500n, 1500n, -1n]]
        })
        const int = (x: Expr.Expr<unknown>) => Expr.cast(x, "Int64")
        const result = yield* rows(
          Query.from(df).pipe(Query.select((c) => ({
            tMinusS: int(Expr.subtract(c.t, c.s)),
            tPlusE: int(Expr.add(c.t, c.e)),
            tMinusE: int(Expr.subtract(c.t, c.e)),
            dPlusE: int(Expr.add(c.d, c.e)),
            dMinusE: int(Expr.subtract(c.d, c.e)),
            eq: Expr.eq(c.t, c.s),
            lt: Expr.lt(c.t, c.s),
            durationsEq: Expr.eq(c.d, c.e),
            s: int(Expr.cast(c.s, "Timestamp[ms]")),
            e: int(Expr.cast(c.e, "Duration[ms]"))
          })))
        )
        assert.deepStrictEqual(result, [
          {
            tMinusS: 0n,
            tPlusE: 2n,
            tMinusE: 0n,
            dPlusE: 2n,
            dMinusE: 0n,
            eq: true,
            lt: false,
            durationsEq: true,
            s: 1n,
            e: 1n
          },
          {
            tMinusS: -2n,
            tPlusE: 0n,
            tMinusE: -2n,
            dPlusE: 0n,
            dMinusE: -2n,
            eq: false,
            lt: true,
            durationsEq: false,
            s: 1n,
            e: 1n
          },
          {
            tMinusS: 3n,
            tPlusE: 2n,
            tMinusE: 2n,
            dPlusE: 2n,
            dMinusE: 2n,
            eq: false,
            lt: false,
            durationsEq: false,
            s: -1n,
            e: 0n
          }
        ])
      }))
  })

  describe("explain", () => {
    // DF-Q017 (local policy): Query.explain; pinned source in README.md.
    it.effect("shows the rewritten plan", () =>
      Effect.gen(function*() {
        const query = Query.table("readings", Reading).pipe(
          Query.withColumns((c) => ({ fahrenheit: Expr.add(Expr.multiply(c.temp, 1.8), 32), loud: Expr.lit(1) })),
          Query.join(Query.table("cities", City), { on: "city" }),
          Query.filter((c) => Expr.and(Expr.eq(c.country, "AT"), Expr.gt(c.temp, 20))),
          Query.sort((c) => [Expr.desc(c.fahrenheit)]),
          Query.select((c) => ({ city: c.city, fahrenheit: c.fahrenheit })),
          Query.head(1)
        )
        const plan = yield* Query.explain(query).pipe(Effect.provide(tables))
        assert.strictEqual(
          plan,
          [
            `Select [city = col("city"), fahrenheit = col("fahrenheit")]`,
            `  TopK 1 [desc(col("fahrenheit"))]`,
            `    Join inner on [city]`,
            `      WithColumns [fahrenheit = add(multiply(col("temp"), 1.8), 32)]`,
            `        Filter gt(col("temp"), 20)`,
            `          Pick [city, temp]`,
            `            Values 3 rows [city, temp, rain]`,
            `      Filter eq(col("country"), "AT")`,
            `        Values 2 rows [city, country]`
          ].join("\n")
        )
        assert.deepStrictEqual(yield* rows(query).pipe(Effect.provide(tables)), [{ city: "Vienna", fahrenheit: 70.7 }])
      }))

    // DF-Q018 (local policy): Query.explain; pinned source in README.md.
    it.effect("pushes key predicates below groups and through renames", () =>
      Effect.gen(function*() {
        const query = Query.from(readings).pipe(
          Query.rename({ city: "town" }),
          Query.groupBy("town"),
          Query.agg((c) => ({ n: Expr.count(), mean: Expr.mean(c.temp) })),
          Query.filter((c) => Expr.and(Expr.neq(c.town, "Berlin"), Expr.gt(c.n, 1)))
        )
        assert.strictEqual(
          yield* Query.explain(query),
          [
            `Filter gt(col("n"), 1)`,
            `  GroupBy [town] [n = count(), mean = mean(col("temp"))]`,
            `    Rename [city -> town]`,
            `      Filter neq(col("city"), "Berlin")`,
            `        Pick [city, temp]`,
            `          Values 3 rows [city, temp, rain]`
          ].join("\n")
        )
        assert.deepStrictEqual(yield* rows(query), [{ town: "Vienna", n: 2, mean: 20.25 }])
      }))

    // DF-Q019 (local policy): Query.explain; pinned source in README.md.
    it.effect("keeps predicates on join keys off the right side, whose keys the join drops", () =>
      Effect.gen(function*() {
        // The result has the left side's Int8 key, where 100 + 100 wraps to -56;
        // in the right side's Int64 it is 200.
        const query = Query.from(DataFrame.fromColumns({ x: Int8Array.of(100), a: [1] })).pipe(
          Query.join(Query.from(DataFrame.fromColumns({ x: BigInt64Array.of(100n), b: [2] })), { on: "x" }),
          Query.filter((c) => Expr.lt(Expr.add(c.x, c.x), 0))
        )
        assert.deepStrictEqual(yield* rows(query), [{ x: 100, a: 1, b: 2 }])
      }))

    // DF-Q020 (local policy): Query.explain; pinned source in README.md.
    it.effect("keeps predicates above left joins when they read the right side", () =>
      Effect.gen(function*() {
        const query = Query.from(readings).pipe(
          Query.join(Query.from(cities), { on: "city", how: "left" }),
          Query.filter((c) => Expr.isNull(c.country))
        )
        assert.strictEqual(
          yield* Query.explain(query),
          [
            `Filter isNull(col("country"))`,
            `  Join left on [city]`,
            `    Values 3 rows [city, temp, rain]`,
            `    Values 2 rows [city, country]`
          ].join("\n")
        )
      }))
  })

  describe("plans", () => {
    // DF-Q021 (API contract): Plan.Node; pinned source in README.md.
    it("are plain data", () => {
      const query = Query.from(readings).pipe(Query.filter((c) => Expr.gt(c.temp, 20)), Query.pick("city"))
      assert.deepStrictEqual(query.plan, {
        _tag: "Pick",
        input: {
          _tag: "Filter",
          input: { _tag: "Values", frame: readings },
          predicate: {
            _tag: "Call",
            fn: "gt",
            args: [{ _tag: "Column", name: "temp" }, { _tag: "Literal", value: 20 }],
            options: undefined
          }
        },
        columns: ["city"]
      })
    })

    // DF-Q022 (API contract): Plan.NodeFromJson; pinned source in README.md.
    it("encode to JSON without losing literal types", () => {
      const values: ReadonlyArray<Plan.Value> = ["NaN", NaN, -0, Infinity, 2n ** 70n, "12", 12, true, null]
      const expression: Plan.Expression = {
        _tag: "Call",
        fn: "isIn",
        args: [{ _tag: "Column", name: "x" }],
        options: { values }
      }
      const json = Schema.encodeSync(Plan.ExpressionFromJson)(expression)
      assert.deepStrictEqual(json, {
        _tag: "Call",
        fn: "isIn",
        args: [{ _tag: "Column", name: "x" }],
        options: {
          values: [
            "NaN",
            { float: "NaN" },
            { float: "-0" },
            { float: "Infinity" },
            {
              bigint: "1180591620717411303424"
            },
            "12",
            12,
            true,
            null
          ]
        }
      })
      const back = Schema.decodeUnknownSync(Plan.ExpressionFromJson)(JSON.parse(JSON.stringify(json)))
      assert.deepStrictEqual(back, expression)
    })

    // DF-Q023 (API contract): Plan.NodeFromJson; pinned source in README.md.
    it.effect("round-trip through JSON with their inputs", () =>
      Effect.gen(function*() {
        const query = Query.from(readings).pipe(Query.groupBy("city"), Query.agg((c) => ({ max: Expr.max(c.temp) })))
        const json = JSON.stringify(Schema.encodeSync(Plan.NodeFromJson)(query.plan))
        const decoded = Query.fromPlan(Schema.decodeUnknownSync(Plan.NodeFromJson)(JSON.parse(json)))
        assert.deepStrictEqual(yield* rows(decoded), yield* rows(query))
      }))

    // DF-Q024 (API contract): Plan.NodeFromJson; pinned source in README.md.
    it("reject malformed JSON when decoding", () => {
      const json = { _tag: "Filter", input: { _tag: "Table", name: "t" }, predicate: { _tag: "Call", fn: "explode" } }
      assert.throws(() => Schema.decodeUnknownSync(Plan.NodeFromJson)(json))
    })

    // DF-Q025 (API contract): Plan.Expression; pinned source in README.md.
    it.effect("fail at run time on the wrong number of arguments", () =>
      Effect.gen(function*() {
        const plan: Plan.Node = {
          _tag: "Filter",
          input: { _tag: "Values", frame: readings },
          predicate: { _tag: "Call", fn: "gt", args: [{ _tag: "Column", name: "temp" }] }
        }
        const error = yield* Effect.flip(Query.fromPlan(plan))
        assert.strictEqual(error.message, "gt takes 2 argument(s), got 1")
      }))

    // DF-Q026 (API contract): Expr.toPlan; pinned source in README.md.
    it("expressions convert to and from plans", () => {
      const e = Expr.add(Expr.lit(1n), 2n)
      assert.deepStrictEqual(Expr.toPlan(e), {
        _tag: "Call",
        fn: "add",
        args: [{ _tag: "Literal", value: 1n }, { _tag: "Literal", value: 2n }],
        options: undefined
      })
      assert.strictEqual(String(Expr.fromPlan(Expr.toPlan(e))), "add(1n, 2n)")
      assert.isTrue(Expr.isAggregate(Expr.fromPlan({ _tag: "AggregateCall", fn: "count" })))
    })
  })

  // Every case of the Polars gold corpus (test/fixtures/dataframe/gold), with
  // its inputs inline, as catalog frames and as streams of small batches.
  describe("Polars oracle", () => {
    const cases = Gold.cases()
    for (const source of ["values", "frames", "batches"] as const) {
      describe(source, () => {
        for (const c of cases) {
          // DF-I-POLARS/<source>/<case-id>: interoperability evidence; pinned oracle provenance in README.md.
          it.effect(`${c.id}: ${c.description}`, () =>
            Effect.gen(function*() {
              const df = yield* Oracle.run(c, source)
              assert.strictEqual(yield* Compare.diff(c.id, df, c.expected), undefined)
            }))
        }
      })
    }
  })

  describe("streamed tables", () => {
    const Row = Schema.Struct({ x: Schema.Number })
    const batches = Array.from({ length: 8 }, (_, b) => DataFrame.fromRows(Row, [{ x: 2 * b }, { x: 2 * b + 1 }]))
    const t = Query.table("t", Row)
    const streamed = <A>(query: Query.Query<A>, source: Catalog.Source) =>
      rows(query).pipe(Effect.provide(Catalog.layer({ t: source })))

    // DF-Q027 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("a slice that has its rows pulls no further batch", () =>
      Effect.gen(function*() {
        const one = Stream.concat(Stream.succeed(DataFrame.fromColumns({ x: [1] })), Stream.die("pulled again"))
        assert.deepStrictEqual(yield* streamed(Query.head(t, 1), one), [{ x: 1 }])
        for (const none of [Query.head(t, 0), Query.head(Query.sort(t, (c) => [c.x]), 0)]) {
          assert.deepStrictEqual(yield* streamed(none, Stream.die("pulled")), [])
        }
      }))

    // DF-Q028 (API contract): Expr.sum; pinned source in README.md.
    it.effect("decimal sums don't depend on batch boundaries", () =>
      Effect.gen(function*() {
        const query = Query.table("t", Schema.Struct({ s: Schema.String })).pipe(
          Query.aggregate((c) => ({ total: Expr.sum(Expr.castDecimal(c.s, 19, 0)) }))
        )
        const big = DataFrame.fromColumns({ s: ["6000000000000000000", "6000000000000000000"] })
        const negative = DataFrame.fromColumns({ s: ["-6000000000000000000", "-6000000000000000000"] })
        const result = yield* streamed(query, Stream.make(big, negative))
        assert.deepStrictEqual(result, [{ total: BigDecimal.fromBigInt(0n) }])
      }))

    // DF-Q029 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("batches convert to the declared column types; undeclared, they must share their columns", () =>
      Effect.gen(function*() {
        const source = Stream.make(price("1.2", 18, 1), price("1.23", 18, 2), price("1.2", 18, 2))
        const declared = Query.table("t", Price, { types: { d: ArrowSchema.decimal(18, 2) } })
        const d = (s: string) => BigDecimal.fromStringUnsafe(s)
        const totals = declared.pipe(
          Query.aggregate((c) => ({ s: Expr.sum(c.d), lo: Expr.min(c.d), hi: Expr.max(c.d) }))
        )
        assert.deepStrictEqual(yield* streamed(totals, source), [{ s: d("3.63"), lo: d("1.20"), hi: d("1.23") }])
        const groups = declared.pipe(
          Query.groupBy("d"),
          Query.agg(() => ({ n: Expr.count() })),
          Query.sort((c) => [c.d])
        )
        assert.deepStrictEqual(yield* streamed(groups, source), [{ d: d("1.20"), n: 2 }, { d: d("1.23"), n: 1 }])
        // Undeclared, a batch of other types would make the column types of
        // earlier results depend on later batches.
        const untyped = Query.fromPlan({ _tag: "Table", name: "t" })
        for (
          const query of [
            untyped,
            Query.concat([untyped, untyped]),
            Query.aggregate(untyped, () => ({ n: Expr.count() }))
          ]
        ) {
          assert.strictEqual(
            (yield* Effect.flip(streamed(query, source))).message,
            `a batch of table "t" has columns [d: Decimal[18, 2]], its first batch [d: Decimal[18, 1]]: ` +
              `the batches of a streamed table share their columns`
          )
        }
        const lossy = Query.table("t", Price, { types: { d: ArrowSchema.decimal(18, 1) } })
        const error = yield* Effect.flip(streamed(lossy, source))
        assert.strictEqual(error.message, `column "d" has values that Decimal[18, 1] can't hold exactly`)
      }))

    // DF-Q030 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("results over inputs of different types are those over their concatenation, streamed or not", () =>
      Effect.gen(function*() {
        type Frame = DataFrame.DataFrame<{ readonly x: number }>
        const x = (type: ArrowSchema.DataType, values: ReadonlyArray<number>) =>
          DataFrame.fromRows(Row, values.map((x) => ({ x })), { types: { x: type } })
        const wide = (values: BigUint64Array | BigInt64Array) =>
          DataFrame.fromColumns({ x: values }) as unknown as Frame
        const decimal = (d: string, precision: number, scale: number) =>
          DataFrame.fromRows(Schema.Struct({ x: Schema.BigDecimal }), [{ x: BigDecimal.fromStringUnsafe(d) }], {
            types: { x: ArrowSchema.decimal(precision, scale) }
          }) as unknown as Frame
        // A query over the frames concatenated: in memory, and streamed with
        // each frame a streamed table of its own.
        const results = <A>(frames: ReadonlyArray<Frame>, query: (table: typeof t) => Query.Query<A>) => {
          const names = frames.map((_, i) => `t${i}`)
          const concat = (tables: ReadonlyArray<typeof t>) => Query.concat(tables as [typeof t, ...Array<typeof t>])
          return [
            query(concat(frames.map(Query.from))),
            query(concat(names.map((name) => Query.fromPlan({ _tag: "Table", name }) as typeof t))).pipe(
              Effect.provide(Catalog.layer(Object.fromEntries(names.map((name, i) => [name, Stream.make(frames[i])]))))
            )
          ]
        }
        const aggregates = (table: typeof t) =>
          Query.aggregate(table, (c) => ({
            sum: Expr.sum(c.x),
            mean: Expr.mean(c.x),
            min: Expr.min(c.x),
            max: Expr.max(c.x),
            count: Expr.count(c.x),
            first: Expr.first(c.x),
            last: Expr.last(c.x),
            std: Expr.std(c.x),
            variance: Expr.variance(c.x)
          }))
        const groups = (table: typeof t) => table.pipe(Query.groupBy("x"), Query.agg(() => ({ n: Expr.count() })))
        // Expected values from Polars 2.1.0 over the frames concatenated
        // (`how="vertical_relaxed"`), in order and reversed: first and last,
        // and groups in order of appearance. Every result is Float64 but
        // count. std and variance are left out where floats round them
        // differently depending on how the rows are split.
        const { float32, float64, int32 } = ArrowSchema
        const cases: ReadonlyArray<
          readonly [
            ReadonlyArray<Frame>,
            Record<string, number>,
            readonly [readonly [number, number], readonly [number, number]],
            readonly [ReadonlyArray<readonly [number, number]>, ReadonlyArray<readonly [number, number]>]
          ]
        > = [
          [
            [x(int32, [2147483647]), x(int32, [1]), x(float64, [0.5])],
            { sum: 2147483648.5, mean: 715827882.8333334, min: 0.5, max: 2147483647, count: 3 },
            [[2147483647, 0.5], [0.5, 2147483647]],
            [[[2147483647, 1], [1, 1], [0.5, 1]], [[0.5, 1], [1, 1], [2147483647, 1]]]
          ],
          [
            [x(float32, [1]), x(float64, [1.0000001])],
            { sum: 2.0000001000000003, mean: 1.0000000500000001, min: 1, max: 1.0000001, count: 2 },
            [[1, 1.0000001], [1.0000001, 1]],
            [[[1, 1], [1.0000001, 1]], [[1.0000001, 1], [1, 1]]]
          ],
          [
            [x(float32, [1, 3]), x(float64, [2])],
            { sum: 6, mean: 2, min: 1, max: 3, count: 3, std: 1, variance: 1 },
            [[1, 2], [2, 3]],
            [[[1, 1], [3, 1], [2, 1]], [[2, 1], [1, 1], [3, 1]]]
          ],
          [
            [x(float64, []), x(int32, [1, 2])],
            { sum: 3, mean: 1.5, min: 1, max: 2, count: 2, std: Math.SQRT1_2, variance: 0.5 },
            [[1, 2], [1, 2]],
            [[[1, 1], [2, 1]], [[1, 1], [2, 1]]]
          ],
          [
            [wide(BigUint64Array.of(2n ** 63n)), wide(BigInt64Array.of(-1n)), x(float64, [0.5])],
            { sum: 2 ** 63, mean: 3074457345618258400, min: -1, max: 2 ** 63, count: 3 },
            [[2 ** 63, 0.5], [0.5, 2 ** 63]],
            [[[2 ** 63, 1], [-1, 1], [0.5, 1]], [[0.5, 1], [-1, 1], [2 ** 63, 1]]]
          ],
          [
            [decimal("6000000000000000000", 19, 0), decimal("1.20", 18, 2), x(float64, [0.5])],
            { sum: 6e18, mean: 2e18, min: 0.5, max: 6e18, count: 3 },
            [[6e18, 0.5], [0.5, 6e18]],
            [[[6e18, 1], [1.2, 1], [0.5, 1]], [[0.5, 1], [1.2, 1], [6e18, 1]]]
          ],
          [
            [x(int32, [1, 2]), x(float64, [2, 0.5])],
            { sum: 5.5, mean: 1.375, min: 0.5, max: 2, count: 4 },
            [[1, 0.5], [2, 2]],
            [[[1, 1], [2, 2], [0.5, 1]], [[2, 2], [0.5, 1], [1, 1]]]
          ]
        ]
        for (const [frames, expected, ends, grouped] of cases) {
          const orders = [[frames, ends[0], grouped[0]], [[...frames].reverse(), ends[1], grouped[1]]] as const
          for (const [order, [first, last], keys] of orders) {
            for (const query of results(order, aggregates)) {
              const df = yield* query
              const [row] = DataFrame.toRows(df)
              assert.deepStrictEqual(
                Object.fromEntries(
                  [...Object.keys(expected), "first", "last"].map((k) => [k, row[k as keyof typeof row]])
                ),
                { ...expected, first, last }
              )
              assert.deepStrictEqual(
                df.schema.fields.map((f) => f.type),
                df.schema.fields.map((f) => f.name === "count" ? ArrowSchema.uint32 : float64)
              )
            }
            for (const query of results(order, groups)) {
              assert.deepStrictEqual(DataFrame.toRows(yield* query), keys.map(([x, n]) => ({ x, n })))
            }
          }
        }
        // Row-wise operations see the common type too, as in Polars: Int8
        // 100 doubles to 200 in Int64, where doubling in Int8 wraps to -56.
        const small = [DataFrame.fromColumns({ x: Int8Array.of(100) }), wide(BigInt64Array.of(1n))]
        const rowWise: ReadonlyArray<readonly [(table: typeof t) => Query.Query<unknown>, ReadonlyArray<unknown>]> = [
          [(table) => Query.select(table, (c) => ({ y: Expr.multiply(c.x, 2) })), [{ y: 200n }, { y: 2n }]],
          [(table) => Query.filter(table, (c) => Expr.gt(Expr.add(c.x, c.x), 150)), [{ x: 100n }]]
        ]
        for (const [query, expected] of rowWise) {
          for (const result of results(small, query)) assert.deepStrictEqual(DataFrame.toRows(yield* result), expected)
        }
        // A value the common type can't hold fails, as concatenating fails, though no minimum holds it.
        const failures: ReadonlyArray<readonly [ReadonlyArray<Frame>, string]> = [
          [
            [wide(BigUint64Array.of(2n ** 63n, 0n)), wide(BigInt64Array.of(-1n))],
            "UInt64 values don't fit their common type Int64"
          ],
          [
            [wide(BigInt64Array.of(-1n)), wide(BigUint64Array.of(2n ** 63n))],
            "UInt64 values don't fit their common type Int64"
          ],
          [
            [decimal("6000000000000000000", 19, 0), decimal("1.20", 18, 2)],
            "Decimal[19, 0] values don't fit their common type Decimal[38, 2]"
          ]
        ]
        const min = (table: typeof t) => Query.aggregate(table, (c) => ({ min: Expr.min(c.x) }))
        for (const [frames, message] of failures) {
          const queries: ReadonlyArray<Effect.Effect<unknown, DataFrame.DataFrameError>> = [
            ...results(frames, min),
            ...results(frames, groups)
          ]
          for (const query of queries) {
            assert.strictEqual((yield* Effect.flip(query)).message, message)
          }
        }
      }))

    // DF-Q031 (API contract): Query.aggregate; pinned source in README.md.
    it.effect("zero-row batches aggregate like an empty table", () =>
      Effect.gen(function*() {
        const query = Query.aggregate(t, (c) => ({ n: Expr.count(), total: Expr.sum(c.x), mean: Expr.mean(c.x) }))
        const empty = Stream.make(DataFrame.fromColumns({ x: Float64Array.of() }))
        assert.deepStrictEqual(yield* streamed(query, empty), [{ n: 0, total: 0, mean: null }])
      }))

    // DF-Q032 (API contract): Query.stream; pinned source in README.md.
    it.effect("results without rows keep the types of their columns", () =>
      Effect.gen(function*() {
        const Nested = Schema.Struct({ xs: Schema.Array(Schema.Number), s: Schema.Struct({ a: Schema.Number }) })
        const nested = Query.table("t", Nested).pipe(
          Query.filter((c) => Expr.gt(Expr.listLength(c.xs), 5)),
          Query.select((c) => ({ sum: Expr.listSum(c.xs), a: Expr.field(c.s, "a") }))
        )
        const untyped = Query.fromPlan({ _tag: "Table", name: "t" }).pipe(
          Query.filter((c) => Expr.gt(c.x as Expr.Expr<number>, 5))
        )
        const prices = Query.table("t", Price, { types: { d: ArrowSchema.decimal(18, 2) } }).pipe(
          Query.aggregate((c) => ({ total: Expr.sum(c.d), r: Expr.max(Expr.round(c.d, 1)) }))
        )
        const cases: ReadonlyArray<readonly [Query.Query<unknown>, Catalog.Source, ReadonlyArray<string>]> = [
          [nested, Stream.empty, ["sum:Float", "a:Float"]],
          [prices, Stream.empty, ["total:Decimal", "r:Decimal"]],
          [nested, Stream.make(DataFrame.fromRows(Nested, [{ xs: [1], s: { a: 1 } }])), ["sum:Float", "a:Float"]],
          [untyped, Stream.make(DataFrame.fromColumns({ x: [1], y: ["a"] })), ["x:Float", "y:Utf8"]]
        ]
        for (const [query, source, expected] of cases) {
          const df = yield* query.pipe(Effect.provide(Catalog.layer({ t: source })))
          assert.deepStrictEqual(df.schema.fields.map((f) => `${f.name}:${f.type._tag}`), expected)
        }
      }))

    // DF-Q033 (API contract): Query.stream; pinned source in README.md.
    it.effect("results without rows are those in memory, or fail when their columns are undeclared and unread", () =>
      Effect.gen(function*() {
        const x = (...values: Array<number>) => DataFrame.fromColumns({ x: Int8Array.from(values) })
        const xy = (x: number, y: number) => DataFrame.fromColumns({ x: Int8Array.of(x), y: Int8Array.of(y) })
        const undeclared = (name: string) => Query.fromPlan({ _tag: "Table", name }) as typeof t
        const [u, r, e] = [undeclared("u"), undeclared("r"), undeclared("e")]
        const d = Query.table("d", Row, { types: { x: ArrowSchema.int8 } })
        const p = Query.table("p", Schema.Struct({ i: Schema.Number, k: Schema.String, v: Schema.Number }))
        // Streamed, no batch of u is read and the declared d has none.
        const memory = Catalog.layer({
          u: x(1),
          r: xy(1, 2),
          d: x(),
          p: DataFrame.fromColumns({ i: [1], k: ["a"], v: [1] })
        })
        const streamed = Catalog.layer({
          u: Stream.die("read"),
          r: Stream.make(xy(1, 2)),
          d: Stream.empty,
          p: Stream.die("read"),
          e: Stream.empty
        })
        const declare = (what: string) =>
          `the columns of a result without rows are unknown, as no batch they depend on was read: declare the columns of ${what}`
        const sums = (query: typeof t) => Query.aggregate(query, (c) => ({ n: Expr.count(), s: Expr.sum(c.x) }))
        const cases: ReadonlyArray<readonly [Query.Query<unknown>, Array<unknown>, string?]> = [
          [Query.concat([Query.head(u, 0), Query.from(x(9))]), [{ x: 9 }], declare(`table "u"`)],
          [Query.head(u, 0), [], declare(`table "u"`)],
          [Query.head(Query.concat([u, u]), 0), [], declare(`table "u"`)],
          [Query.unique(Query.head(u, 0)), [], declare(`table "u"`)],
          [sums(Query.head(u, 0)), [{ n: 0, s: 0 }], declare(`table "u"`)],
          [Query.join(d, Query.head(r, 0), { on: "x" }), [], declare(`table "r"`)],
          [
            Query.head(Query.pivot(p, { on: "k", index: ["i"], values: "v", aggregate: "sum" }), 0),
            [],
            declare(`the pivot on "k"`)
          ],
          [Query.concat([Query.join(d, r, { on: "x" }), Query.from(xy(9, 3))]), [{ x: 9, y: 3 }]],
          [Query.concat([Query.head(d, 0), Query.from(x(9))]), [{ x: 9 }]],
          [sums(d), [{ n: 0, s: 0 }]]
        ]
        for (const [query, expected, error] of cases) {
          const df = yield* Effect.provide(query, memory)
          assert.deepStrictEqual(DataFrame.toRows(df), expected)
          if (error === undefined) {
            const result = yield* Effect.provide(query, streamed)
            assert.deepStrictEqual([DataFrame.toRows(result), result.schema], [expected, df.schema])
          } else {
            assert.strictEqual((yield* Effect.flip(Effect.provide(query, streamed))).message, error)
          }
        }
        // A table without declared columns or batches has no in-memory counterpart.
        const unknown: ReadonlyArray<Query.Query<unknown>> = [
          e,
          Query.concat([e, Query.from(x(9))]),
          Query.concat([e, e]),
          Query.aggregate(e, () => ({ n: Expr.count() }))
        ]
        for (const query of unknown) {
          assert.strictEqual((yield* Effect.flip(Effect.provide(query, streamed))).message, declare(`table "e"`))
        }
      }))

    // DF-Q034 (API contract): Catalog.Catalog; pinned source in README.md.
    it.effect("reads a table named twice once per run, only if its batches are needed", () =>
      Effect.gen(function*() {
        let loads = 0
        const load = Effect.sync(() => DataFrame.fromColumns({ x: [++loads] }))
        const cases: ReadonlyArray<readonly [Query.Query<unknown>, Array<unknown>, number]> = [
          [Query.concat([t, t]), [{ x: 1 }, { x: 1 }], 1],
          [Query.join(t, t, { on: "x" }), [{ x: 1 }], 1],
          [Query.concat([t, Query.head(t, 0)]), [{ x: 1 }], 1],
          [Query.head(Query.concat([t, t]), 0), [], 0],
          [Query.concat([Query.head(t, 0), Query.head(t, 0)]), [], 0],
          [Query.head(Query.sort(Query.concat([t, t]), (c) => [c.x]), 0), [], 0]
        ]
        for (const [query, expected, reads] of cases) {
          loads = 0
          assert.deepStrictEqual(yield* streamed(query, Stream.fromEffect(load)), expected)
          assert.strictEqual(loads, reads)
        }
        loads = 0
        const frames = yield* Query.concat([t, t]).pipe(
          Query.stream,
          Stream.runCollect,
          Effect.provide(Catalog.layer({ t: load }))
        )
        assert.deepStrictEqual(frames.flatMap((frame) => DataFrame.toArray(frame, "x")), [1, 1])
        assert.strictEqual(loads, 1)
      }))

    // DF-Q035 (API contract): Query.explain; pinned source in README.md.
    it.effect("explain shows the plan without reading the stream", () =>
      Effect.gen(function*() {
        const plan = yield* Query.explain(Query.head(t, 1)).pipe(
          Effect.provide(Catalog.layer({ t: Stream.die("read") }))
        )
        assert.strictEqual(plan, [`Slice offset 0 length 1`, `  Table t [x]`].join("\n"))
      }))

    // DF-Q036 (API contract): Query.head; pinned source in README.md.
    it.effect("a head stops reading the stream", () =>
      Effect.gen(function*() {
        let pulled = 0
        const source = Stream.fromIterable(batches).pipe(Stream.tap(() => Effect.sync(() => pulled++)))
        const df = yield* t.pipe(
          Query.filter((c) => Expr.gt(c.x, 0)),
          Query.head(2),
          Effect.provide(Catalog.layer({ t: source }))
        )
        assert.deepStrictEqual(DataFrame.toArray(df, "x"), [1, 2])
        assert.isBelow(pulled, batches.length)
      }))

    // DF-Q037 (API contract): Query.stream; pinned source in README.md.
    it.effect("Query.stream emits a frame per non-empty batch", () =>
      Effect.gen(function*() {
        const sizes = yield* t.pipe(
          Query.filter((c) => Expr.lt(c.x, 5)),
          Query.stream,
          Stream.map((frame) => frame.length),
          Stream.runCollect,
          Effect.provide(Catalog.layer({ t: Stream.fromIterable(batches) }))
        )
        assert.deepStrictEqual(sizes, [2, 2, 1])
      }))
  })

  // Inputs large enough to reach radix sorting, hash table growth and joins
  // with many keys, checked against row-by-row reference implementations.
  describe("large inputs", () => {
    type Row = {
      readonly f: number | null
      readonly i: number | null
      readonly b: bigint | null
      readonly s: string | null
      readonly p: boolean | null
    }
    type Key = { readonly name: keyof Row; readonly descending: boolean }

    const strings = ["a", "b", "ab", "B", "é", "😀", "\uffff", "", "zz", "a\u0000"]

    const generate = (seed: number, n: number, cardinality: number): Array<Row> => {
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
        f: maybe(
          pick([NaN, -0, 0, Infinity, -Infinity, Math.floor(next() * cardinality) - cardinality / 2, 0.5, -2.5])
        ),
        i: maybe(Math.floor(next() * cardinality) - Math.floor(cardinality / 2)),
        b: maybe(BigInt(Math.floor(next() * cardinality)) * 4294967311n - 2n ** 40n),
        s: maybe(`${pick(strings)}${Math.floor(next() * cardinality)}`),
        p: maybe(next() < 0.5)
      }))
    }

    const compareCodePoints = (a: string, b: string): number => {
      const x = Array.from(a, (c) => c.codePointAt(0)!)
      const y = Array.from(b, (c) => c.codePointAt(0)!)
      for (let k = 0; k < Math.min(x.length, y.length); k++) if (x[k] !== y[k]) return x[k] - y[k]
      return x.length - y.length
    }

    const compareValues = (a: unknown, b: unknown): number => {
      if (typeof a === "number" && typeof b === "number") {
        if (Number.isNaN(a) || Number.isNaN(b)) return Number.isNaN(a) ? (Number.isNaN(b) ? 0 : 1) : -1
        return a < b ? -1 : a > b ? 1 : 0
      }
      if (typeof a === "string") return compareCodePoints(a, b as string)
      if (typeof a === "boolean") return Number(a) - Number(b)
      return (a as bigint) < (b as bigint) ? -1 : (a as bigint) > (b as bigint) ? 1 : 0
    }

    const referenceSort = (rows: ReadonlyArray<Row>, keys: ReadonlyArray<Key>, nullsLast: boolean): Array<Row> =>
      [...rows].sort((r1, r2) => {
        for (const { descending, name } of keys) {
          const a = r1[name]
          const b = r2[name]
          if (a === null || b === null) {
            if (a === b) continue
            return (a === null ? -1 : 1) * (nullsLast ? -1 : 1)
          }
          const c = compareValues(a, b) * (descending ? -1 : 1)
          if (c !== 0) return c
        }
        return 0
      })

    const referenceGroups = (rows: ReadonlyArray<Row>, keys: ReadonlyArray<keyof Row>) => {
      const keyOf = (values: ReadonlyArray<unknown>) =>
        JSON.stringify(
          values,
          (_, v) => typeof v === "bigint" ? `${v}n` : typeof v === "number" && !Number.isFinite(v) ? String(v) : v
        )
      const groups = new Map<string, Array<Row>>()
      for (const r of rows) {
        const k = keyOf(keys.map((name) => r[name]))
        const g = groups.get(k)
        if (g === undefined) groups.set(k, [r])
        else g.push(r)
      }
      return [...groups.values()]
    }

    const data = generate(0x2545f491, 6000, 3000)
    const df = Query.from(arrowFrame<Row>({
      f: [ArrowSchema.float64, data.map((r) => r.f)],
      i: [ArrowSchema.int32, data.map((r) => r.i)],
      b: [ArrowSchema.int64, data.map((r) => r.b)],
      s: [ArrowSchema.utf8, data.map((r) => r.s)],
      p: [ArrowSchema.bool, data.map((r) => r.p)]
    }))
    const sortKey = (c: { readonly [K in keyof Row]: Expr.Expr<Row[K]> }, key: Key) =>
      key.descending ? Expr.desc(c[key.name] as Expr.Expr<unknown>) : Expr.asc(c[key.name] as Expr.Expr<unknown>)

    // DF-Q038 (API contract): Query.sort; pinned source in README.md.
    it.effect("sorts by every column type, in both directions, nulls first or last", () =>
      Effect.gen(function*() {
        for (const name of ["f", "i", "b", "s", "p"] as const) {
          for (const descending of [false, true]) {
            for (const nullsLast of [false, true]) {
              const sorted = Query.sort(df, (c) => [sortKey(c, { name, descending })], { nullsLast })
              assert.deepStrictEqual(yield* rows(sorted), referenceSort(data, [{ name, descending }], nullsLast))
            }
          }
        }
      }))

    // DF-Q039 (API contract): Query.sort; pinned source in README.md.
    it.effect("sorts stably by several keys, also when sliced (top-k)", () =>
      Effect.gen(function*() {
        const keys: ReadonlyArray<Key> = [
          { name: "p", descending: true },
          { name: "s", descending: false },
          { name: "f", descending: true }
        ]
        const sorted = Query.sort(df, (c) => keys.map((key) => sortKey(c, key)))
        assert.deepStrictEqual(yield* rows(sorted), referenceSort(data, keys, false))
        for (
          const [name, descending, nullsLast, offset, length] of [
            ["f", true, false, 0, 10],
            ["i", false, true, 0, 1],
            ["s", false, false, 5, 20],
            ["b", true, true, 0, 700]
          ] as const
        ) {
          const top = df.pipe(
            Query.sort((c) => [sortKey(c, { name, descending }), Expr.asc(c.i)], { nullsLast }),
            Query.slice(offset, length)
          )
          const expected = referenceSort(data, [{ name, descending }, { name: "i", descending: false }], nullsLast)
          assert.deepStrictEqual(yield* rows(top), expected.slice(offset, offset + length))
        }
      }))

    // DF-Q040 (API contract): Query.groupBy; pinned source in README.md.
    it.effect("groups by keys of every type", () =>
      Effect.gen(function*() {
        for (const keys of [["f"], ["b"], ["p", "i"], ["s", "b", "p"]] as const) {
          const result = df.pipe(
            Query.groupBy(...keys),
            Query.agg((c) => ({ n: Expr.count(), ni: Expr.count(c.i), max: Expr.max(c.s), first: Expr.first(c.b) }))
          )
          const expected = referenceGroups(data, keys).map((g) => {
            const out: Record<string, unknown> = {}
            for (const k of keys) out[k] = g[0][k]
            const present = g.map((r) => r.s).filter((s): s is string => s !== null)
            out.n = g.length
            out.ni = g.filter((r) => r.i !== null).length
            out.max = present.length === 0 ? null : present.reduce((a, b) => (compareCodePoints(a, b) >= 0 ? a : b))
            out.first = g[0].b
            return out
          })
          assert.deepStrictEqual(yield* rows(result), expected)
        }
        assert.deepStrictEqual(
          yield* rows(Query.unique(df, ["i", "p"])),
          referenceGroups(data, ["i", "p"]).map((g) => g[0])
        )
      }))

    // DF-Q041 (API contract): Query.join; pinned source in README.md.
    it.effect("joins on a high-cardinality key", () =>
      Effect.gen(function*() {
        const right = generate(0x1b873593, 4000, 3000).map((r) => ({ i: r.i ?? 0, rs: r.s }))
        const rightFrame = DataFrame.fromColumns({ i: Int32Array.from(right, (r) => r.i), rs: right.map((r) => r.rs) })
        const byKey = new Map<number, Array<string | null>>()
        for (const r of right) byKey.set(r.i, [...(byKey.get(r.i) ?? []), r.rs])
        for (const how of ["inner", "left", "semi", "anti"] as const) {
          const result = Query.join(df.pipe(Query.pick("i", "s")), Query.from(rightFrame), { on: "i", how })
          const expected = data.flatMap((r) => {
            const matches = r.i === null ? [] : byKey.get(r.i) ?? []
            switch (how) {
              case "inner":
                return matches.map((rs) => ({ i: r.i, s: r.s, rs }))
              case "left":
                return matches.length === 0
                  ? [{ i: r.i, s: r.s, rs: null }]
                  : matches.map((rs) => ({ i: r.i, s: r.s, rs }))
              case "semi":
                return matches.length > 0 ? [{ i: r.i, s: r.s }] : []
              case "anti":
                return matches.length === 0 ? [{ i: r.i, s: r.s }] : []
            }
          })
          assert.deepStrictEqual(yield* rows(result), expected)
        }
      }))
  })
})
