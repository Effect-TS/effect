import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Schema } from "effect"
import { Catalog, DataFrame, Expr, Plan, Query } from "effect/dataframe"

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
        const cases: ReadonlyArray<readonly [Schema.Struct<any>, string]> = [
          [Schema.Struct({ country: Schema.String }), `missing column "country"`],
          [Schema.Struct({ city: Schema.Number }), `column "city" is Utf8, expected Float64`],
          [Schema.Struct({ rain: Schema.Number }), `column "rain" has missing values`]
        ]
        for (const [schema, message] of cases) {
          const error = yield* Effect.flip(Query.table("readings", schema).pipe(Effect.provide(tables)))
          assert.strictEqual(error.message, message)
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
})
