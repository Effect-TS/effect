import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, type DateTime, type Duration, Effect, Exit, Result, Schema, Stream } from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { Catalog, DataFrame, Expr, Plan, Query } from "effect/dataframe"
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

describe("Query", () => {
  describe("running", () => {
    it.effect("is an Effect producing a frame", () =>
      Effect.gen(function*() {
        const df = yield* Query.from(readings).pipe(Query.filter((c) => Expr.gt(c.temp, 20)))
        assert.deepStrictEqual(DataFrame.toArray(df, "city"), ["Vienna", "Berlin"])
      }))

    it.effect("does no work until it runs", () =>
      Effect.gen(function*() {
        const query = Query.table("missing", City).pipe(Query.filter((c) => Expr.eq(c.city, "Vienna")))
        const error = yield* Effect.flip(query)
        assert.strictEqual(error.message, `unknown table "missing"`)
      }))

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

    it.effect("tables can be queries (views)", () =>
      Effect.gen(function*() {
        const warm = Query.table("readings", Reading).pipe(Query.filter((c) => Expr.gt(c.temp, 20)))
        const query = Query.table("warm", Reading).pipe(Query.pick("city"))
        const result = yield* rows(query).pipe(Effect.provide(Catalog.layer({ readings, warm })))
        assert.deepStrictEqual(result, [{ city: "Vienna" }, { city: "Berlin" }])
      }))

    it.effect("checks tables against their declared columns", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(Query.table("readings", City).pipe(Effect.provide(tables)))
        assert.strictEqual(error.message, `missing column "country"`)
        const bad = Stream.make(DataFrame.fromColumns({ city: [1] }))
        const streamed = yield* Effect.flip(Query.table("t", City).pipe(Effect.provide(Catalog.layer({ t: bad }))))
        assert.strictEqual(streamed.message, `column "city" is Float64, expected Utf8`)
        const Kind = Schema.Struct({ kind: Schema.Literals(["a", "b"]) })
        const kinds = DataFrame.fromColumns({ kind: ["a", "c"] })
        for (const t of [kinds, Stream.make(kinds)]) {
          const error = yield* Effect.flip(Query.table("t", Kind).pipe(Effect.provide(Catalog.layer({ t }))))
          assert.strictEqual(error.message, `column "kind" has values its schema rejects`)
        }
        const berlin = DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(
          ArrowSchema.make([ArrowSchema.field("t", ArrowSchema.timestamp("millisecond", "Europe/Berlin"))]),
          [{ t: 0n }]
        )))
        const Utc = Schema.Struct({ t: Schema.DateTimeUtc })
        for (const t of [berlin, Stream.make(berlin)]) {
          const error = yield* Effect.flip(Query.table("t", Utc).pipe(Effect.provide(Catalog.layer({ t }))))
          assert.strictEqual(error.message, `column "t" has time zone Europe/Berlin, expected UTC timestamps`)
        }
      }))

    it.effect("narrows tables to their declared columns", () =>
      Effect.gen(function*() {
        const Temps = Schema.Struct({ temp: Schema.Number, city: Schema.String })
        const df = yield* Query.table("readings", Temps).pipe(Effect.provide(tables))
        assert.deepStrictEqual(DataFrame.columnNames(df), ["temp", "city"])
      }))

    it.effect("fails with DataFrameError on invalid expressions", () =>
      Effect.gen(function*() {
        const query = Query.from(readings).pipe(Query.filter((c) => c.city as any))
        const exit = yield* Effect.exit(query)
        assert.isTrue(Exit.isFailure(exit))
        const error = yield* Effect.flip(query)
        assert.instanceOf(error, DataFrame.DataFrameError)
        assert.strictEqual(error.message, "filter predicate must be boolean, got Utf8")
      }))

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

    it.effect("append stacks rows; dropNulls removes incomplete rows", () =>
      Effect.gen(function*() {
        const df = yield* Query.from(readings).pipe(Query.append(Query.from(readings)), Query.dropNulls(["rain"]))
        assert.deepStrictEqual(DataFrame.toArray(df, "rain"), [0, 2, 0, 2])
      }))

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
        const temporal = DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(
          ArrowSchema.make([
            ArrowSchema.field("t", ArrowSchema.timestamp("millisecond")),
            ArrowSchema.field("d", ArrowSchema.duration("millisecond")),
            ArrowSchema.field("i", ArrowSchema.int64)
          ]),
          [[10n ** 17n], [10n ** 17n], [2n ** 40n]]
        ))) as DataFrame.DataFrame<unknown> as DataFrame.DataFrame<{ t: DateTime.Utc; d: Duration.Duration; i: bigint }>
        const overflows = yield* rows(
          Query.from(temporal).pipe(Query.select((c) => ({
            t: Expr.cast(c.t, "Timestamp[ns]"),
            d: Expr.cast(c.d, "Duration[ns]"),
            i: Expr.cast(c.i, "Date")
          })))
        )
        assert.deepStrictEqual(overflows, [{ t: null, d: null, i: null }])
      }))

    it.effect("implicit conversions to a common type fail on values it can't hold", () =>
      Effect.gen(function*() {
        const Price = Schema.Struct({ d: Schema.BigDecimal })
        const price = (d: string, precision: number, scale: number) =>
          DataFrame.fromRows(Price, [{ d: BigDecimal.fromStringUnsafe(d) }], {
            types: { d: ArrowSchema.decimal(precision, scale) }
          })
        const big = Query.from(price("6000000000000000000", 19, 0))
        const small = Query.from(price("1.20", 18, 2))
        const groups = Query.fromPlan({ _tag: "Table", name: "t" }).pipe(
          Query.groupBy("d"),
          Query.agg(() => ({ n: Expr.count() })),
          Effect.provide(Catalog.layer({ t: Stream.make(price("6000000000000000000", 19, 0), price("1.20", 18, 2)) }))
        )
        const failures: ReadonlyArray<Effect.Effect<unknown, DataFrame.DataFrameError>> = [
          Query.concat([big, small]),
          groups,
          Query.join(big, small, { on: "d", how: "left" }),
          Query.filter(big, (c) => Expr.eq(c.d, BigDecimal.fromStringUnsafe("1.20")))
        ]
        for (const query of failures) {
          const error = yield* Effect.flip(query)
          assert.strictEqual(error.message, "Decimal[19, 0] values don't fit their common type Decimal[38, 2]")
        }
        // An integer literal a column's type can't hold widens it, as in Polars 2.1.0.
        const df = yield* Query.from(DataFrame.fromColumns({ x: Int8Array.of(1) })).pipe(
          Query.select((c) => ({
            sum: Expr.add(c.x, 300),
            gt: Expr.gt(c.x, 1000),
            when: Expr.when(Expr.gt(c.x, 0), c.x, 1000),
            coalesce: Expr.coalesce(c.x, 1000)
          }))
        )
        assert.deepStrictEqual(DataFrame.toRows(df), [{ sum: 301, gt: false, when: 1, coalesce: 1 }])
        assert.deepStrictEqual(df.schema.fields.map((f) => f.type), [
          ArrowSchema.int16,
          ArrowSchema.bool,
          ArrowSchema.int16,
          ArrowSchema.int16
        ])
      }))

    it.effect("temporal operands of mixed units meet in the coarser unit, as in Polars", () =>
      Effect.gen(function*() {
        // Expected values from Polars 2.1.0: timestamps round down, durations toward zero.
        const df = DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(
          ArrowSchema.make([
            ArrowSchema.field("t", ArrowSchema.timestamp("millisecond")),
            ArrowSchema.field("s", ArrowSchema.timestamp("microsecond")),
            ArrowSchema.field("d", ArrowSchema.duration("millisecond")),
            ArrowSchema.field("e", ArrowSchema.duration("microsecond"))
          ]),
          [[1n, -1n, 2n], [1500n, 1500n, -1n], [1n, -1n, 2n], [1500n, 1500n, -1n]]
        ))) as DataFrame.DataFrame<unknown> as DataFrame.DataFrame<{
          t: DateTime.Utc
          s: DateTime.Utc
          d: Duration.Duration
          e: Duration.Duration
        }>
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

    it.effect("round-trip through JSON with their inputs", () =>
      Effect.gen(function*() {
        const query = Query.from(readings).pipe(Query.groupBy("city"), Query.agg((c) => ({ max: Expr.max(c.temp) })))
        const json = JSON.stringify(Schema.encodeSync(Plan.NodeFromJson)(query.plan))
        const decoded = Query.fromPlan(Schema.decodeUnknownSync(Plan.NodeFromJson)(JSON.parse(json)))
        assert.deepStrictEqual(yield* rows(decoded), yield* rows(query))
      }))

    it("reject malformed JSON when decoding", () => {
      const json = { _tag: "Filter", input: { _tag: "Table", name: "t" }, predicate: { _tag: "Call", fn: "explode" } }
      assert.throws(() => Schema.decodeUnknownSync(Plan.NodeFromJson)(json))
    })

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
    const cases = [...Gold.spec().cases, ...Gold.extended().cases]
    for (const source of ["values", "frames", "batches"] as const) {
      describe(source, () => {
        for (const c of cases) {
          it(`${c.id}: ${c.description}`, () => {
            assert.strictEqual(Compare.diff(c.id, Oracle.run(c, source), c.expected), undefined)
          })
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

    it.effect("a slice that has its rows pulls no further batch", () =>
      Effect.gen(function*() {
        const one = Stream.concat(Stream.succeed(DataFrame.fromColumns({ x: [1] })), Stream.die("pulled again"))
        assert.deepStrictEqual(yield* streamed(Query.head(t, 1), one), [{ x: 1 }])
        assert.deepStrictEqual(yield* streamed(Query.head(t, 0), Stream.die("pulled")), [])
      }))

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

    it.effect("batches of different types combine in their common type", () =>
      Effect.gen(function*() {
        const Price = Schema.Struct({ d: Schema.BigDecimal })
        const price = (d: string, scale: number) =>
          DataFrame.fromRows(Price, [{ d: BigDecimal.fromStringUnsafe(d) }], {
            types: { d: ArrowSchema.decimal(18, scale) }
          })
        const source = Stream.make(price("1.2", 1), price("1.23", 2), price("1.2", 2))
        const declared = Query.table("t", Price, { types: { d: ArrowSchema.decimal(18, 2) } })
        const untyped = Query.fromPlan({ _tag: "Table", name: "t" }) as typeof declared
        const d = (s: string) => BigDecimal.fromStringUnsafe(s)
        for (const table of [declared, untyped]) {
          const totals = table.pipe(
            Query.aggregate((c) => ({ s: Expr.sum(c.d), lo: Expr.min(c.d), hi: Expr.max(c.d) }))
          )
          assert.deepStrictEqual(yield* streamed(totals, source), [{ s: d("3.63"), lo: d("1.20"), hi: d("1.23") }])
          const groups = table.pipe(
            Query.groupBy("d"),
            Query.agg(() => ({ n: Expr.count() })),
            Query.sort((c) => [c.d])
          )
          assert.deepStrictEqual(yield* streamed(groups, source), [{ d: d("1.20"), n: 2 }, { d: d("1.23"), n: 1 }])
        }
        const lossy = Query.table("t", Price, { types: { d: ArrowSchema.decimal(18, 1) } })
        const error = yield* Effect.flip(streamed(lossy, source))
        assert.strictEqual(error.message, `column "d" has values that Decimal[18, 1] can't hold exactly`)
      }))

    it.effect("aggregates of batches of different types are those of the batches concatenated, in either order", () =>
      Effect.gen(function*() {
        const x = (type: ArrowSchema.DataType, values: ReadonlyArray<number>) =>
          DataFrame.fromRows(Row, values.map((x) => ({ x })), { types: { x: type } })
        const untyped = Query.fromPlan({ _tag: "Table", name: "t" }) as typeof t
        const query = (table: typeof t) =>
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
        // Expected values from Polars 2.1.0 over the concatenated batches, in
        // order and reversed (first, last). Every result is Float64 but count.
        // std and variance are left out where floats round them differently
        // depending on how the rows are split.
        const { float32, float64, int32 } = ArrowSchema
        const cases: ReadonlyArray<
          readonly [
            ReadonlyArray<DataFrame.DataFrame<{ readonly x: number }>>,
            Record<string, number>,
            readonly [readonly [number, number], readonly [number, number]]
          ]
        > = [
          [
            [x(int32, [2147483647]), x(int32, [1]), x(float64, [0.5])],
            { sum: 2147483648.5, mean: 715827882.8333334, min: 0.5, max: 2147483647, count: 3 },
            [[2147483647, 0.5], [0.5, 2147483647]]
          ],
          [
            [x(float32, [1]), x(float64, [1.0000001])],
            { sum: 2.0000001000000003, mean: 1.0000000500000001, min: 1, max: 1.0000001, count: 2 },
            [[1, 1.0000001], [1.0000001, 1]]
          ],
          [
            [x(float32, [1, 3]), x(float64, [2])],
            { sum: 6, mean: 2, min: 1, max: 3, count: 3, std: 1, variance: 1 },
            [[1, 2], [2, 3]]
          ],
          [
            [x(float64, []), x(int32, [1, 2])],
            { sum: 3, mean: 1.5, min: 1, max: 2, count: 2, std: Math.SQRT1_2, variance: 0.5 },
            [[1, 2], [1, 2]]
          ]
        ]
        for (const [batches, expected, ends] of cases) {
          for (const [order, [first, last]] of [[batches, ends[0]], [[...batches].reverse(), ends[1]]] as const) {
            const results = [
              yield* query(untyped).pipe(Effect.provide(Catalog.layer({ t: Stream.fromIterable(order) }))),
              yield* query(Query.concat(order.map(Query.from) as [typeof t, ...Array<typeof t>]))
            ]
            for (const df of results) {
              const [row] = DataFrame.toRows(df)
              const keys = Object.keys(expected)
              assert.deepStrictEqual(
                Object.fromEntries([...keys, "first", "last"].map((k) => [k, row[k as keyof typeof row]])),
                { ...expected, first, last }
              )
              assert.deepStrictEqual(
                df.schema.fields.map((f) => f.type),
                df.schema.fields.map((f) => f.name === "count" ? ArrowSchema.uint32 : float64)
              )
            }
          }
        }
        // A value the common type can't hold fails, as concatenating fails, though no minimum holds it.
        const wide = [
          DataFrame.fromColumns({ x: BigUint64Array.of(2n ** 63n, 0n) }),
          DataFrame.fromColumns({ x: BigInt64Array.of(-1n) })
        ] as const
        const min = (table: Query.Query<{ readonly x: bigint }>) =>
          Query.aggregate(table, (c) => ({ min: Expr.min(c.x) }))
        const failures = [
          min(Query.fromPlan({ _tag: "Table", name: "t" }) as Query.Query<{ readonly x: bigint }>).pipe(
            Effect.provide(Catalog.layer({ t: Stream.make(...wide) }))
          ),
          min(Query.concat([Query.from(wide[0]), Query.from(wide[1])]))
        ]
        for (const query of failures) {
          assert.strictEqual((yield* Effect.flip(query)).message, "UInt64 values don't fit their common type Int64")
        }
      }))

    it.effect("zero-row batches aggregate like an empty table", () =>
      Effect.gen(function*() {
        const query = Query.aggregate(t, (c) => ({ n: Expr.count(), total: Expr.sum(c.x), mean: Expr.mean(c.x) }))
        const empty = Stream.make(DataFrame.fromColumns({ x: Float64Array.of() }))
        assert.deepStrictEqual(yield* streamed(query, empty), [{ n: 0, total: 0, mean: null }])
      }))

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
        const Price = Schema.Struct({ d: Schema.BigDecimal })
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

    it.effect("reads a table named twice once per run", () =>
      Effect.gen(function*() {
        let loads = 0
        const load = Effect.sync(() => DataFrame.fromColumns({ x: [++loads] }))
        assert.deepStrictEqual(yield* streamed(Query.concat([t, t]), Stream.fromEffect(load)), [{ x: 1 }, { x: 1 }])
        assert.strictEqual(loads, 1)
        const frames = yield* Query.concat([t, t]).pipe(
          Query.stream,
          Stream.runCollect,
          Effect.provide(Catalog.layer({ t: load }))
        )
        assert.deepStrictEqual(frames.flatMap((frame) => DataFrame.toArray(frame, "x")), [2, 2])
        assert.strictEqual(loads, 2)
      }))

    it.effect("explain shows the plan without reading the stream", () =>
      Effect.gen(function*() {
        const plan = yield* Query.explain(Query.head(t, 1)).pipe(
          Effect.provide(Catalog.layer({ t: Stream.die("read") }))
        )
        assert.strictEqual(plan, [`Slice offset 0 length 1`, `  Table t [x]`].join("\n"))
      }))

    it.effect("a head stops reading the stream", () =>
      Effect.gen(function*() {
        let pulled = 0
        const source = Stream.fromIterable(batches).pipe(Stream.tap(() => Effect.sync(() => pulled++)))
        const df = yield* Query.table("t", Row).pipe(
          Query.filter((c) => Expr.gt(c.x, 0)),
          Query.head(2),
          Effect.provide(Catalog.layer({ t: source }))
        )
        assert.deepStrictEqual(DataFrame.toArray(df, "x"), [1, 2])
        assert.isBelow(pulled, batches.length)
      }))

    it.effect("Query.stream emits a frame per non-empty batch", () =>
      Effect.gen(function*() {
        const sizes = yield* Query.table("t", Row).pipe(
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

    const schema = ArrowSchema.make([
      ArrowSchema.field("f", ArrowSchema.float64),
      ArrowSchema.field("i", ArrowSchema.int32),
      ArrowSchema.field("b", ArrowSchema.int64),
      ArrowSchema.field("s", ArrowSchema.utf8),
      ArrowSchema.field("p", ArrowSchema.bool)
    ])
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
          (_, v) =>
            typeof v === "bigint" ? `${v}n` : typeof v === "number" && !Number.isFinite(v) ? String(v) : v === 0 ? 0 : v
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

    const rows = generate(0x2545f491, 6000, 3000)
    const df = Query.from(
      DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(schema, rows as any))) as DataFrame.DataFrame<Row>
    )
    const rowsOf = <R>(query: Query.Query<R>): Array<R> => DataFrame.toRows(Effect.runSync(query))
    const sortKey = (c: { readonly [K in keyof Row]: Expr.Expr<Row[K]> }, key: Key) =>
      key.descending ? Expr.desc(c[key.name] as Expr.Expr<unknown>) : Expr.asc(c[key.name] as Expr.Expr<unknown>)

    it("sorts by every column type, in both directions, nulls first or last", () => {
      for (const name of ["f", "i", "b", "s", "p"] as const) {
        for (const descending of [false, true]) {
          for (const nullsLast of [false, true]) {
            const sorted = Query.sort(df, (c) => [sortKey(c, { name, descending })], { nullsLast })
            assert.deepStrictEqual(rowsOf(sorted), referenceSort(rows, [{ name, descending }], nullsLast))
          }
        }
      }
    })

    it("sorts stably by several keys, also when sliced (top-k)", () => {
      const keys: ReadonlyArray<Key> = [
        { name: "p", descending: true },
        { name: "s", descending: false },
        { name: "f", descending: true }
      ]
      const sorted = Query.sort(df, (c) => keys.map((key) => sortKey(c, key)))
      assert.deepStrictEqual(rowsOf(sorted), referenceSort(rows, keys, false))
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
        const expected = referenceSort(rows, [{ name, descending }, { name: "i", descending: false }], nullsLast)
        assert.deepStrictEqual(rowsOf(top), expected.slice(offset, offset + length))
      }
    })

    it("groups by keys of every type", () => {
      for (const keys of [["f"], ["b"], ["p", "i"], ["s", "b", "p"]] as const) {
        const result = df.pipe(
          Query.groupBy(...keys),
          Query.agg((c) => ({ n: Expr.count(), ni: Expr.count(c.i), max: Expr.max(c.s), first: Expr.first(c.b) }))
        )
        const expected = referenceGroups(rows, keys).map((g) => {
          const out: Record<string, unknown> = {}
          for (const k of keys) out[k] = g[0][k]
          const present = g.map((r) => r.s).filter((s): s is string => s !== null)
          out.n = g.length
          out.ni = g.filter((r) => r.i !== null).length
          out.max = present.length === 0 ? null : present.reduce((a, b) => (compareCodePoints(a, b) >= 0 ? a : b))
          out.first = g[0].b
          return out
        })
        assert.deepStrictEqual(rowsOf(result), expected)
      }
      assert.deepStrictEqual(rowsOf(Query.unique(df, ["i", "p"])), referenceGroups(rows, ["i", "p"]).map((g) => g[0]))
    })

    it("joins on a high-cardinality key", () => {
      const right = generate(0x1b873593, 4000, 3000).map((r) => ({ i: r.i ?? 0, rs: r.s }))
      const rightFrame = DataFrame.fromColumns({ i: Int32Array.from(right, (r) => r.i), rs: right.map((r) => r.rs) })
      const byKey = new Map<number, Array<string | null>>()
      for (const r of right) byKey.set(r.i, [...(byKey.get(r.i) ?? []), r.rs])
      for (const how of ["inner", "left", "semi", "anti"] as const) {
        const result = Query.join(df.pipe(Query.pick("i", "s")), Query.from(rightFrame), { on: "i", how })
        const expected = rows.flatMap((r) => {
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
        assert.deepStrictEqual(rowsOf(result), expected)
      }
    })
  })
})
