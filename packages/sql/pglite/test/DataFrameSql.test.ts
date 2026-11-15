/**
 * effect/dataframe queries run on PostgreSQL (PGlite) through `Sql.layer`
 * give the rows the in-memory engine gives for the same data.
 */
import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Effect, Layer, Result, Schema } from "effect"
import { ArrowSchema, ArrowTable } from "effect/arrow"
import { Catalog, DataFrame, Expr, Query, Sql } from "effect/dataframe"
import { SqlClient } from "effect/sql/SqlClient"

const Sale = Schema.Struct({
  id: Schema.Number,
  region: Schema.NullOr(Schema.String),
  units: Schema.NullOr(Schema.Number),
  price: Schema.Number,
  at: Schema.DateTimeUtc
})
const Region = Schema.Struct({ region: Schema.String, manager: Schema.String })

const sales = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  region: i % 7 === 0 ? null : ["north", "south", "east", "west"][i % 4],
  units: i % 5 === 0 ? null : (i * 37) % 23,
  price: Math.round(((i * 53) % 97) * 1.25 * 100) / 100,
  at: DateTime.makeUnsafe(Date.UTC(2024, i % 12, 1 + (i % 27), i % 24))
}))
const regions = [
  { region: "north", manager: "Ada" },
  { region: "south", manager: "Grace" },
  { region: "east", manager: "Edsger" }
]

const Setup = Layer.effectDiscard(
  Effect.gen(function*() {
    const sql = yield* SqlClient
    yield* sql`DROP TABLE IF EXISTS sales`
    yield* sql`DROP TABLE IF EXISTS regions`
    yield* sql`DROP TABLE IF EXISTS contract`
    yield* sql`CREATE TABLE sales (id DOUBLE PRECISION, region TEXT, units DOUBLE PRECISION, price DOUBLE PRECISION, at TIMESTAMP)`
    yield* sql`CREATE TABLE regions (region TEXT, manager TEXT)`
    for (const s of sales) {
      yield* sql`INSERT INTO sales VALUES (${s.id}, ${s.region}, ${s.units}, ${s.price}, ${
        DateTime.formatIso(s.at).replace("T", " ").replace("Z", "")
      })`
    }
    for (const r of regions) yield* sql`INSERT INTO regions VALUES (${r.region}, ${r.manager})`
    yield* sql`CREATE TABLE contract (s TEXT, n DOUBLE PRECISION)`
    yield* sql`INSERT INTO contract VALUES ('bad', NULL), ('good', 1)`
    yield* sql`DROP TABLE IF EXISTS odd`
    yield* sql`CREATE TABLE odd (nil INTEGER, nothing INTEGER, at TIMESTAMPTZ, far TIMESTAMP, months INTERVAL)`
    yield* sql`INSERT INTO odd VALUES (42, NULL, '2024-01-01 00:30:00+00', '290000-01-01', '1 month')`
    yield* sql`DROP TABLE IF EXISTS declared`
    yield* sql`CREATE TABLE declared (t TIMESTAMP, d INTERVAL, n NUMERIC)`
    yield* sql`INSERT INTO declared VALUES ('1970-01-01 00:00:01', '-2 seconds', 12.5), ('1969-12-31 23:59:58', '3 seconds', -0.05), (NULL, NULL, NULL)`
    yield* sql`DROP TABLE IF EXISTS inexact`
    yield* sql`CREATE TABLE inexact (s TIMESTAMP, ms TIMESTAMP, ns TIMESTAMP, ds INTERVAL, dms INTERVAL, dns INTERVAL, scale NUMERIC, digits NUMERIC)`
    yield* sql`INSERT INTO inexact VALUES ('1970-01-01 00:00:01.5', '1970-01-01 00:00:01.0005', '2263-01-01', '-1.5 seconds', '0.0005 seconds', '110000 days', 1.005, 1000)`
  })
)

/** A frame with exactly the given Arrow columns. */
const frame = (fields: ReadonlyArray<ArrowSchema.Field>, columns: ReadonlyArray<ReadonlyArray<unknown>>) =>
  DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(ArrowSchema.make(fields), columns)))
const decimal = (s: string) => BigDecimal.fromStringUnsafe(s)

const memory = Catalog.layer({
  sales: DataFrame.fromRows(Sale, sales),
  regions: DataFrame.fromRows(Region, regions),
  // The rows of the PostgreSQL tables `declared` and `inexact`, as PostgreSQL keeps them.
  declared: frame([
    ArrowSchema.field("t", ArrowSchema.timestamp("microsecond"), { nullable: true }),
    ArrowSchema.field("d", ArrowSchema.duration("microsecond"), { nullable: true }),
    ArrowSchema.field("n", ArrowSchema.decimal(20, 4), { nullable: true })
  ], [[1_000_000n, -2_000_000n, null], [-2_000_000n, 3_000_000n, null], [decimal("12.5"), decimal("-0.05"), null]]),
  inexact: frame([
    ...["s", "ms", "ns"].map((name) => ArrowSchema.field(name, ArrowSchema.timestamp("microsecond"))),
    ...["ds", "dms", "dns"].map((name) => ArrowSchema.field(name, ArrowSchema.duration("microsecond"))),
    ...["scale", "digits"].map((name) => ArrowSchema.field(name, ArrowSchema.decimal(20, 4)))
  ], [
    [1_500_000n],
    [1_000_500n],
    [9_246_182_400_000_000n],
    [-1_500_000n],
    [500n],
    [9_504_000_000_000_000n],
    [decimal("1.005")],
    [decimal("1000")]
  ])
})

const table = Query.table("sales", Sale)

const close = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number"
    ? Object.is(a, b) || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a))
    : false

const types = (df: DataFrame.DataFrame<unknown>) =>
  DataFrame.toArrowTable(df).schema.fields.map((f) => ({ name: f.name, type: f.type }))

const onSql = <R>(query: Query.Query<R>) => query.pipe(Effect.provide(Sql.layer))
const rowsOnSql = <R>(query: Query.Query<R>) => Effect.map(onSql(query), DataFrame.toRows)

const xs = Query.from(DataFrame.fromColumns({ x: [1, 2, 3] }))
const ints = Query.from(DataFrame.fromColumns({ x: Int32Array.of(1, 2, 3) }))
const bools = Query.from(DataFrame.fromColumns({ b: [true, null, false, true] }))
const groups = Query.from(
  DataFrame.fromColumns({ g: ["a", "b", "a", "b", "a"], h: [1, 1, 2, 2, 1], x: [1, 3, 2, 6, 4] })
)
const none = ints.pipe(Query.filter((c) => Expr.gt(c.x, 9)))
/** A query over a frame with exactly the given Arrow columns. */
const arrow = <R>(fields: ReadonlyArray<ArrowSchema.Field>, columns: ReadonlyArray<ReadonlyArray<unknown>>) =>
  Query.from(frame(fields, columns)) as Query.Query<unknown> as Query.Query<R>
const ties = [0.5, 1.5, 2.5, -0.5, -1.5, -2.5, 2.675, 1.005, 0.125, 0.375, 1.25, 1.35]
const decimals = arrow<{ d: BigDecimal.BigDecimal | null }>(
  [ArrowSchema.field("d", ArrowSchema.decimal(18, 3))],
  [["0.5", "1.5", "2.5", "-0.5", "-1.5", "-2.5", "2.675", "1.005", "0.125", null].map((s) =>
    s === null ? null : BigDecimal.fromStringUnsafe(s)
  )]
)
const units = { s: "second", ms: "millisecond", us: "microsecond", ns: "nanosecond" } as const
const unitNames = ["s", "ms", "us", "ns"] as const
/** One column `v` of `type`, its integers microsecond multiples in every unit (PostgreSQL keeps microseconds). */
const temporal = (type: ArrowSchema.DataType, values: ReadonlyArray<unknown> = [1_001_000n, -1_500_000n, null]) =>
  arrow<{ v: unknown }>([ArrowSchema.field("v", type)], [values])
/** Casts in both directions between temporal types of every unit and integers. */
const temporalCasts = unitNames.flatMap((u) => [
  [
    `casts of Timestamp[${u}]`,
    temporal(ArrowSchema.timestamp(units[u])).pipe(Query.select((c) => ({
      int: Expr.cast(c.v, "Int64"),
      date: Expr.cast(c.v, "Date"),
      duration: Expr.cast(c.v, `Duration[${u}]`),
      s: Expr.cast(c.v, "Timestamp[s]"),
      ms: Expr.cast(c.v, "Timestamp[ms]"),
      us: Expr.cast(c.v, "Timestamp[us]"),
      ns: Expr.cast(c.v, "Timestamp[ns]")
    })))
  ] as const,
  [
    `casts of Duration[${u}]`,
    temporal(ArrowSchema.duration(units[u])).pipe(Query.select((c) => ({
      int: Expr.cast(c.v, "Int64"),
      timestamp: Expr.cast(c.v, `Timestamp[${u}]`),
      s: Expr.cast(c.v, "Duration[s]"),
      ms: Expr.cast(c.v, "Duration[ms]"),
      us: Expr.cast(c.v, "Duration[us]"),
      ns: Expr.cast(c.v, "Duration[ns]")
    })))
  ] as const,
  [
    `casts of integers to Timestamp[${u}] and Duration[${u}]`,
    temporal(ArrowSchema.int64).pipe(Query.select((c) => ({
      timestamp: Expr.cast(c.v, `Timestamp[${u}]`),
      duration: Expr.cast(c.v, `Duration[${u}]`)
    })))
  ] as const
])
/** Integers of a temporal column of `unit`, microsecond multiples (PostgreSQL keeps microseconds). */
const exact = (unit: typeof unitNames[number], values: ReadonlyArray<number | null>) =>
  values.map((v) => (v === null ? null : BigInt(v) * (unit === "ns" ? 1000n : 1n)))
/** Timestamps `t`, `s` and durations `d`, `e`: `t` and `d` of unit `u`, `s` and `e` of unit `v`. */
const mixed = (u: typeof unitNames[number], v: typeof unitNames[number]) =>
  arrow<{
    t: DateTime.Utc | null
    s: DateTime.Utc | null
    d: Duration.Duration | null
    e: Duration.Duration | null
  }>([
    ArrowSchema.field("t", ArrowSchema.timestamp(units[u])),
    ArrowSchema.field("s", ArrowSchema.timestamp(units[v])),
    ArrowSchema.field("d", ArrowSchema.duration(units[u])),
    ArrowSchema.field("e", ArrowSchema.duration(units[v]))
  ], [
    exact(u, [1500, -1, 2, 1000, null]),
    exact(v, [1, 1500, -1, 1000, 7]),
    exact(u, [1500, -1, 2, 1000, null]),
    exact(v, [1, 1500, -1, 1000, 7])
  ])
/** Temporal operations on operands of two different units, which meet in the coarser one. */
const mixedUnits = unitNames.flatMap((u) =>
  unitNames.filter((v) => v !== u).map((v) =>
    [
      `temporal operations mixing ${u} and ${v}`,
      mixed(u, v).pipe(Query.select((c) => {
        const int = (x: Expr.Expr<unknown>) => Expr.cast(x, "Int64")
        return {
          tMinusS: int(Expr.subtract(c.t, c.s)),
          tPlusE: int(Expr.add(c.t, c.e)),
          tMinusE: int(Expr.subtract(c.t, c.e)),
          sPlusD: int(Expr.add(c.s, c.d)),
          dPlusE: int(Expr.add(c.d, c.e)),
          dMinusE: int(Expr.subtract(c.d, c.e)),
          eq: Expr.eq(c.t, c.s),
          lt: Expr.lt(c.t, c.s),
          gte: Expr.gte(c.s, c.t),
          durationsEq: Expr.eq(c.d, c.e),
          durationsGt: Expr.gt(c.d, c.e),
          between: Expr.between(c.t, c.s, c.s),
          coalesce: int(Expr.coalesce(c.t, c.s)),
          when: int(Expr.when(Expr.isNull(c.d), c.e, c.d))
        }
      }))
    ] as const
  )
)

/** Queries whose SQL result must equal the in-memory result, column types included. */
const cases: ReadonlyArray<readonly [string, Query.Query<any>]> = [
  ["int64 columns", Query.from(DataFrame.fromColumns({ d: BigInt64Array.of(1n, 9007199254740993n, -3n) }))],
  [
    "aggregate types",
    ints.pipe(
      Query.aggregate((c) => ({ n: Expr.count(), s: Expr.sum(c.x), m: Expr.mean(c.x), d: Expr.countDistinct(c.x) }))
    )
  ],
  ["empty results", none.pipe(Query.withColumns((c) => ({ y: Expr.divide(c.x, 2), s: Expr.concat("a", "b") })))],
  ["aggregates of empty input", none.pipe(Query.aggregate((c) => ({ n: Expr.countDistinct(c.x), s: Expr.sum(c.x) })))],
  [
    "boolean sums",
    Query.from(DataFrame.fromColumns({ b: [true, false, true] })).pipe(
      Query.select((c) => ({ s: Expr.over(Expr.sum(c.b), []), r: Expr.cumSum(c.b) }))
    )
  ],
  [
    "boolean sum aggregate",
    Query.from(DataFrame.fromColumns({ b: [true, false, true] })).pipe(Query.aggregate((c) => ({ s: Expr.sum(c.b) })))
  ],
  [
    "boolean minimum and maximum",
    bools.pipe(Query.aggregate((c) => ({ min: Expr.min(c.b), max: Expr.max(c.b) })))
  ],
  [
    "boolean minimum and maximum over windows",
    bools.pipe(Query.select((c) => ({
      min: Expr.over(Expr.min(c.b), []),
      max: Expr.over(Expr.max(c.b), []),
      cumMin: Expr.cumMin(c.b),
      cumMax: Expr.cumMax(c.b)
    })))
  ],
  ["unique on no columns keeps the first row", xs.pipe(Query.unique([]))],
  [
    "windows in aggregate arguments see only their group",
    groups.pipe(
      Query.groupBy("g"),
      Query.agg((c) => ({
        running: Expr.sum(Expr.cumSum(c.x)),
        previous: Expr.sum(Expr.shift(c.x)),
        rank: Expr.max(Expr.rank(c.x, { method: "min" })),
        centered: Expr.max(Expr.subtract(c.x, Expr.over(Expr.mean(c.x), []))),
        nested: Expr.sum(Expr.over(Expr.cumSum(c.x), [c.h]))
      }))
    )
  ],
  [
    "windows in aggregate arguments over all rows",
    groups.pipe(Query.aggregate((c) => ({ running: Expr.sum(Expr.cumSum(c.x)), first: Expr.first(Expr.shift(c.x)) })))
  ],
  ["filters on a window function", xs.pipe(Query.filter((c) => Expr.gt(Expr.cumSum(c.x), 3)))],
  ["filters on an aggregate over the input", xs.pipe(Query.filter((c) => Expr.gt(c.x, Expr.over(Expr.mean(c.x), []))))],
  [
    "over an empty partition list",
    xs.pipe(Query.select((c) => ({ n: Expr.over(Expr.sum(c.x), []), m: Expr.over(Expr.first(c.x), []) })))
  ],
  [
    "temporal and decimal inputs",
    arrow<{ d: Duration.Duration | null; t: DateTime.Utc | null }>([
      ArrowSchema.field("d", ArrowSchema.duration("microsecond")),
      ArrowSchema.field("t", ArrowSchema.timestamp("microsecond")),
      ArrowSchema.field("day", ArrowSchema.date("day")),
      ArrowSchema.field("n", ArrowSchema.decimal(18, 2))
    ], [
      [1500n, -90_000_001n, null],
      [1_700_000_000_123_456n, -1n, null],
      [19_000, -1, null],
      [BigDecimal.fromStringUnsafe("12.34"), BigDecimal.fromStringUnsafe("-0.05"), null]
    ]).pipe(Query.withColumns((c) => ({ s: Expr.totalSeconds(c.d), year: Expr.year(c.t) })))
  ],
  ...temporalCasts,
  ...mixedUnits,
  [
    "joins on timestamps of mixed units",
    mixed("s", "ms").pipe(
      Query.select((c) => ({ k: c.t, x: Expr.lit(1) })),
      Query.join(mixed("s", "ms").pipe(Query.select((c) => ({ k: c.s, y: Expr.lit(2) }))), { on: "k", how: "full" }),
      Query.select((c) => ({ k: Expr.cast(c.k, "Int64"), x: c.x, y: c.y }))
    )
  ],
  [
    "concatenations of durations of mixed units",
    Query.concat([
      mixed("s", "ms").pipe(Query.select((c) => ({ d: c.e }))),
      mixed("s", "ms").pipe(Query.select((c) => ({ d: c.d })))
    ]).pipe(
      Query.select((c) => ({ d: Expr.cast(c.d, "Int64"), ms: Expr.cast(Expr.cast(c.d, "Duration[ms]"), "Int64") }))
    )
  ],
  [
    "casts of integers beyond double precision to Timestamp[us] and Duration[us]",
    temporal(ArrowSchema.int64, [253_402_300_799_999_999n, -62_135_596_800_000_001n, 9_007_199_254_740_993n]).pipe(
      Query.select((c) => ({ timestamp: Expr.cast(c.v, "Timestamp[us]"), duration: Expr.cast(c.v, "Duration[us]") }))
    )
  ],
  [
    "casts of zoned timestamps",
    temporal(ArrowSchema.timestamp("microsecond", "UTC")).pipe(
      Query.select((c) => ({ int: Expr.cast(c.v, "Int64"), s: Expr.cast(c.v, "Timestamp[s]") }))
    )
  ],
  [
    "casts of dates",
    temporal(ArrowSchema.date("day"), [19_000, -1, null]).pipe(Query.select((c) => ({
      int: Expr.cast(c.v, "Int32"),
      long: Expr.cast(c.v, "Int64"),
      text: Expr.cast(c.v, "Utf8"),
      s: Expr.cast(c.v, "Timestamp[s]"),
      ns: Expr.cast(c.v, "Timestamp[ns]"),
      date: Expr.cast(Expr.cast(c.v, "Int32"), "Date")
    })))
  ],
  [
    "durations",
    Query.from(DataFrame.fromColumns({ d: [Duration.seconds(30), Duration.seconds(90)] })).pipe(
      Query.filter((c) => Expr.gt(Expr.totalSeconds(c.d), 60n))
    )
  ],
  [
    "columns named like helpers",
    Query.from(DataFrame.fromColumns({ __row: [1, 2], __n: [3, 4], __source: ["a", "b"] }))
  ],
  ["tail of a column named __n", Query.from(DataFrame.fromColumns({ __n: [1, 2] })).pipe(Query.tail(1))],
  [
    "concat of a column named __source",
    Query.concat([
      Query.from(DataFrame.fromColumns({ __source: [1] })),
      Query.from(DataFrame.fromColumns({ __source: [2] }))
    ])
  ],
  [
    "sqrt of negative numbers",
    Query.from(DataFrame.fromColumns({ x: [-1, 4, null, -0] })).pipe(Query.select((c) => ({ r: Expr.sqrt(c.x) })))
  ],
  [
    "rounding floats",
    Query.from(DataFrame.fromColumns({ x: ties })).pipe(
      Query.select((c) => ({ r0: Expr.round(c.x), r1: Expr.round(c.x, 1), r2: Expr.round(c.x, 2) }))
    )
  ],
  ...unitNames.map((u) =>
    [
      `tables declared in ${u} and with a decimal`,
      Query.table(
        "declared",
        Schema.Struct({
          t: Schema.NullOr(Schema.DateTimeUtc),
          d: Schema.NullOr(Schema.Duration),
          n: Schema.NullOr(Schema.BigDecimal)
        }),
        {
          types: { t: ArrowSchema.timestamp(units[u]), d: ArrowSchema.duration(units[u]), n: ArrowSchema.decimal(5, 2) }
        }
      ).pipe(Query.withColumns((c) => ({
        ti: Expr.cast(c.t, "Int64"),
        di: Expr.cast(c.d, "Int64"),
        text: Expr.cast(c.n, "Utf8"),
        sum: Expr.add(c.n, c.n)
      })))
    ] as const
  ),
  [
    "rounding integers",
    Query.from(DataFrame.fromColumns({ x: Int32Array.of(5, -15, 25) })).pipe(
      Query.select((c) => ({ r0: Expr.round(c.x), r1: Expr.round(c.x, 1) }))
    )
  ]
]

describe("effect/dataframe on PostgreSQL (PGlite)", { concurrent: false }, () => {
  layer(Layer.provideMerge(Setup, PgliteClient.layer()), { timeout: "60 seconds" })((it) => {
    const both = Effect.fnUntraced(function*<R>(query: Query.Query<R>) {
      const expected = yield* query.pipe(Effect.provide(memory))
      const actual = yield* onSql(query)
      assert.deepStrictEqual(types(actual), types(expected))
      const a = DataFrame.toRows(actual) as Array<Record<string, unknown>>
      const b = DataFrame.toRows(expected) as Array<Record<string, unknown>>
      assert.strictEqual(a.length, b.length)
      for (let r = 0; r < b.length; r++) {
        for (const k of Object.keys(b[r])) {
          if (!close(a[r][k], b[r][k])) {
            assert.deepStrictEqual({ row: r, column: k, value: a[r][k] }, { row: r, column: k, value: b[r][k] })
          }
        }
      }
    })

    for (const [name, query] of cases) it.effect(name, () => both(query))

    it.effect("negative slices clamp both ends", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* rowsOnSql(xs.pipe(Query.slice(-5, 1))), [])
        assert.deepStrictEqual(yield* rowsOnSql(xs.pipe(Query.slice(-5, 3))), [{ x: 1 }])
      }))

    it.effect("rounds decimals half to even, keeping the scale", () =>
      Effect.gen(function*() {
        const df = yield* onSql(
          decimals.pipe(Query.select((c) => ({ r0: Expr.round(c.d, 0), r1: Expr.round(c.d, 1) })))
        )
        assert.deepStrictEqual(types(df).map((f) => f.type), [ArrowSchema.decimal(19, 3), ArrowSchema.decimal(19, 3)])
        assert.deepStrictEqual(
          DataFrame.toRows(df).map((r: any) => [r.r0 && BigDecimal.format(r.r0), r.r1 && BigDecimal.format(r.r1)]),
          [
            ["0", "0.5"],
            ["2", "1.5"],
            ["2", "2.5"],
            ["0", "-0.5"],
            ["-2", "-1.5"],
            ["-2", "-2.5"],
            ["3", "2.7"],
            ["1", "1"],
            ["0", "0.1"],
            [null, null]
          ]
        )
      }))

    it.effect("errors carry the database's message", () =>
      Effect.gen(function*() {
        const error = yield* Effect.flip(onSql(ints.pipe(Query.select((c) => ({ y: Expr.add(c.x, 2147483647) })))))
        assert.include(error.message, "integer out of range")
      }))

    it.effect("tables must satisfy their schema, as in memory", () =>
      Effect.gen(function*() {
        const contract = <S extends Schema.Top & { readonly Type: object }>(schema: S) =>
          Query.table("contract", schema)
        const rejects = (query: Query.Query<any>) => Effect.map(Effect.flip(onSql(query)), (e) => e.message)
        assert.strictEqual(
          yield* rejects(contract(Schema.Struct({ s: Schema.Literal("good") }))),
          `column "s" has values its schema rejects`
        )
        assert.strictEqual(
          yield* rejects(contract(Schema.Struct({ n: Schema.Number }))),
          `column "n" has missing values`
        )
        // Columns the query doesn't read are checked too.
        assert.strictEqual(
          yield* rejects(
            contract(Schema.Struct({ s: Schema.Literal("good"), n: Schema.NullOr(Schema.Number) })).pipe(
              Query.pick("n")
            )
          ),
          `column "s" has values its schema rejects`
        )
        assert.deepStrictEqual(
          yield* rowsOnSql(contract(Schema.Struct({ s: Schema.Literals(["bad", "good"]) }))),
          [{ s: "bad" }, { s: "good" }]
        )
        const odd = <S extends Schema.Top & { readonly Type: object }>(schema: S) => Query.table("odd", schema)
        for (
          const [query, message] of [
            [odd(Schema.Struct({ nil: Schema.Null })), `column "nil" has values, expected Null`],
            [contract(Schema.Struct({ s: Schema.NullOr(Schema.Number) })), `column "s" is text, expected Float64`],
            [
              contract(Schema.Struct({ n: Schema.NullOr(Schema.BigInt) })),
              `column "n" is double precision, expected Int64`
            ],
            [
              odd(Schema.Struct({ far: Schema.NullOr(Schema.DateTimeUtc) })),
              `column "far" has timestamps outside the range of DateTime`
            ],
            [
              odd(Schema.Struct({ months: Schema.Duration })),
              `column "months" has durations in months, which have no fixed length`
            ],
            [
              contract(Schema.Struct({ s: Schema.String }).check(Schema.makeFilter((row) => row.s !== ""))),
              "schemas with checks on whole rows aren't supported on SQL tables; check their fields instead"
            ]
          ] as const
        ) {
          assert.strictEqual(yield* rejects(query), message)
        }
        assert.deepStrictEqual(yield* rowsOnSql(odd(Schema.Struct({ nothing: Schema.Null }))), [{ nothing: null }])
      }))

    it.effect("tables reject values their declared types can't hold exactly, as in memory", () =>
      Effect.gen(function*() {
        for (
          const [column, schema, type] of [
            ["s", Schema.DateTimeUtc, ArrowSchema.timestamp("second")],
            ["ms", Schema.DateTimeUtc, ArrowSchema.timestamp("millisecond")],
            ["ns", Schema.DateTimeUtc, ArrowSchema.timestamp("nanosecond")],
            ["ds", Schema.Duration, ArrowSchema.duration("second")],
            ["dms", Schema.Duration, ArrowSchema.duration("millisecond")],
            ["dns", Schema.Duration, ArrowSchema.duration("nanosecond")],
            ["scale", Schema.BigDecimal, ArrowSchema.decimal(5, 2)],
            ["digits", Schema.BigDecimal, ArrowSchema.decimal(5, 2)]
          ] as const
        ) {
          const query = Query.table("inexact", Schema.Struct({ [column]: schema }), { types: { [column]: type } })
          const expected = yield* Effect.flip(query.pipe(Effect.provide(memory)))
          const actual = yield* Effect.flip(onSql(query))
          assert.strictEqual(actual.message, expected.message)
        }
      }))

    it.effect("tables are checked on the rows the query reads, even of volatile views", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient
        yield* sql`CREATE SEQUENCE seq START 1`
        yield* sql`CREATE VIEW fluctuating AS SELECT CASE WHEN nextval('seq') <= 2 THEN 'good' ELSE 'bad' END AS s`
        const query = Query.table("fluctuating", Schema.Struct({ s: Schema.Literal("good") }))
        const read = sql.withTransaction(
          Effect.andThen(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`, Effect.result(rowsOnSql(query)))
        )
        const results = [yield* read, yield* read, yield* read]
        assert.deepStrictEqual(results.map((r) => Result.isSuccess(r) ? r.success : r.failure.message), [
          [{ s: "good" }],
          [{ s: "good" }],
          `column "s" has values its schema rejects`
        ])
      }))

    it.effect("timestamps with time zones are UTC, whatever the session's time zone", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient
        const query = Query.table("odd", Schema.Struct({ at: Schema.DateTimeUtc })).pipe(
          Query.select((c) => ({
            at: c.at,
            hour: Expr.hour(c.at),
            early: Expr.lt(c.at, Expr.lit(DateTime.makeUnsafe("2024-01-01T00:45:00Z")))
          }))
        )
        const rows = yield* sql`SET TIME ZONE 'Europe/Berlin'`.pipe(
          Effect.andThen(rowsOnSql(query)),
          Effect.ensuring(Effect.orDie(sql`RESET TIME ZONE`))
        )
        assert.deepStrictEqual(rows, [{ at: DateTime.makeUnsafe("2024-01-01T00:30:00Z"), hour: 0, early: true }])
      }))

    it.effect("filters, derives and sorts", () =>
      both(table.pipe(
        Query.filter((c) => Expr.and(Expr.isNotNull(c.units), Expr.gt(c.price, 20))),
        Query.withColumns((c) => ({ revenue: Expr.multiply(c.units, c.price), tag: Expr.concat(c.region, "/", "x") })),
        Query.sort((c) => [Expr.desc(c.revenue), c.id]),
        Query.head(10)
      )))

    it.effect("groups in order of first appearance", () =>
      both(table.pipe(
        Query.groupBy("region"),
        Query.agg((c) => ({
          n: Expr.count(),
          units: Expr.sum(c.units),
          mean: Expr.mean(c.price),
          min: Expr.min(c.price),
          max: Expr.max(c.price),
          first: Expr.first(c.id),
          last: Expr.last(c.id),
          median: Expr.median(c.price),
          sd: Expr.std(c.price)
        }))
      )))

    it.effect("joins keep the left row order", () =>
      both(table.pipe(
        Query.pick("id", "region"),
        Query.join(Query.table("regions", Region), { on: "region", how: "left" }),
        Query.filter((c) => Expr.lt(c.id, 15))
      )))

    it.effect("semi and anti joins, unique and slices", () =>
      Effect.gen(function*() {
        yield* both(table.pipe(Query.join(Query.table("regions", Region), { on: "region", how: "anti" })))
        yield* both(table.pipe(Query.unique(["region"]), Query.pick("id", "region")))
        yield* both(table.pipe(Query.tail(5)))
        yield* both(table.pipe(Query.slice(7, 4)))
      }))

    it.effect("window functions over partitions", () =>
      both(table.pipe(
        Query.select((c) => ({
          id: c.id,
          region: c.region,
          running: Expr.over(Expr.cumSum(c.units), [c.region]),
          previous: Expr.over(Expr.shift(c.price), [c.region]),
          rank: Expr.over(Expr.rank(c.price, { method: "min" }), [c.region]),
          share: Expr.divide(c.price, Expr.over(Expr.sum(c.price), [c.region]))
        }))
      )))

    it.effect("dates and times", () =>
      both(table.pipe(
        Query.select((c) => ({
          id: c.id,
          year: Expr.year(c.at),
          month: Expr.month(c.at),
          weekday: Expr.weekday(c.at),
          hour: Expr.hour(c.at)
        }))
      )))

    it.effect("explain shows the SQL", () =>
      Effect.gen(function*() {
        const text = yield* Query.explain(table.pipe(Query.head(1))).pipe(
          Effect.provide(Sql.layer)
        )
        assert.include(text, `FROM "sales"`)
      }))
  })
})
