/**
 * effect/dataframe queries run on PostgreSQL (PGlite) through `Sql.layer`
 * give the rows the in-memory engine gives for the same data.
 */
import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { DateTime, Effect, Layer, Schema } from "effect"
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
    yield* sql`CREATE TABLE sales (id DOUBLE PRECISION, region TEXT, units DOUBLE PRECISION, price DOUBLE PRECISION, at TIMESTAMP)`
    yield* sql`CREATE TABLE regions (region TEXT, manager TEXT)`
    for (const s of sales) {
      yield* sql`INSERT INTO sales VALUES (${s.id}, ${s.region}, ${s.units}, ${s.price}, ${
        DateTime.formatIso(s.at).replace("T", " ").replace("Z", "")
      })`
    }
    for (const r of regions) yield* sql`INSERT INTO regions VALUES (${r.region}, ${r.manager})`
  })
)

const memory = Catalog.layer({
  sales: DataFrame.fromRows(Sale, sales),
  regions: DataFrame.fromRows(Region, regions)
})

const table = Query.table("sales", Sale)

/** Values as plain JS for comparison: numbers from numeric strings, dates as ISO strings. */
const plain = (u: unknown): unknown =>
  DateTime.isDateTime(u)
    ? DateTime.formatIso(u)
    : u instanceof Date
    ? u.toISOString()
    : typeof u === "bigint"
    ? Number(u)
    : typeof u === "string" && /^-?\d+(\.\d+)?$/.test(u)
    ? Number(u)
    : u

const close = (a: unknown, b: unknown) =>
  typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)) : a === b

describe("effect/dataframe on PostgreSQL (PGlite)", { concurrent: false }, () => {
  layer(Layer.provideMerge(Setup, PgliteClient.layer()), { timeout: "60 seconds" })((it) => {
    const both = Effect.fnUntraced(function*<R>(query: Query.Query<R>) {
      const expected = DataFrame.toRows(yield* query.pipe(Effect.provide(memory))) as Array<Record<string, unknown>>
      const actual = DataFrame.toRows(yield* query.pipe(Effect.provide(Sql.layer({ dialect: "postgres" })))) as Array<
        Record<string, unknown>
      >
      assert.strictEqual(actual.length, expected.length)
      for (let r = 0; r < expected.length; r++) {
        for (const k of Object.keys(expected[r])) {
          const a = plain(actual[r][k])
          const b = plain(expected[r][k])
          if (!close(a, b)) assert.deepStrictEqual({ row: r, column: k, value: a }, { row: r, column: k, value: b })
        }
      }
    })

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
          Effect.provide(Sql.layer({ dialect: "postgres" }))
        )
        assert.include(text, `FROM "sales"`)
      }))
  })
})
