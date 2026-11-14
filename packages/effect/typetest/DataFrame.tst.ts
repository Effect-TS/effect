import type { BigDecimal, Stream } from "effect"
import { DateTime, Duration, Effect, Schema } from "effect"
import { DataFrame, Expr, Query } from "effect/dataframe"
import { describe, expect, it } from "tstyche"

const Reading = Schema.Struct({
  station: Schema.String,
  city: Schema.String,
  temp: Schema.Number,
  rain: Schema.NullOr(Schema.Number),
  id: Schema.BigInt
})
declare const readings: Query.Query<typeof Reading.Type>

const Station = Schema.Struct({ station: Schema.String, elevation: Schema.Number })
declare const stations: Query.Query<typeof Station.Type>

describe("DataFrame", () => {
  it("fromRows takes the row type from the schema", () => {
    expect(DataFrame.fromRows(Station, [])).type.toBe<
      DataFrame.DataFrame<{ readonly station: string; readonly elevation: number }>
    >()
  })

  it("fromColumns infers column types", () => {
    expect(DataFrame.fromColumns({ a: new Float64Array(1), b: ["x", null], c: new BigInt64Array(1) })).type.toBe<
      DataFrame.DataFrame<{ readonly a: number; readonly b: string | null; readonly c: bigint }>
    >()
  })
})

describe("Query", () => {
  it("from and table take the row type from the frame or schema", () => {
    expect(Query.from(DataFrame.fromRows(Station, []))).type.toBe<
      Query.Query<{ readonly station: string; readonly elevation: number }>
    >()
    expect(Query.table("stations", Station)).type.toBe<
      Query.Query<{ readonly station: string; readonly elevation: number }>
    >()
  })

  it("is an Effect producing a frame of its rows", () => {
    expect(Effect.runSync(stations)).type.toBe<DataFrame.DataFrame<typeof Station.Type>>()
    expect(Effect.gen(function*() {
      return yield* stations
    })).type.toBe<Effect.Effect<DataFrame.DataFrame<typeof Station.Type>, DataFrame.DataFrameError>>()
  })

  it("filter keeps the row type", () => {
    expect(readings.pipe(Query.filter((c) => Expr.gt(c.temp, 20)))).type.toBe<typeof readings>()
  })

  it("select and withColumns compute the row type, nulls included", () => {
    expect(
      readings.pipe(
        Query.select((c) => ({
          city: c.city,
          wet: Expr.gt(c.rain, 1),
          f: c.temp.pipe(Expr.multiply(1.8), Expr.add(32))
        }))
      )
    ).type.toBe<Query.Query<{ readonly city: string; readonly wet: boolean | null; readonly f: number }>>()
    expect(readings.pipe(Query.withColumns((c) => ({ temp: Expr.cast(c.temp, "Int32") })), Query.pick("temp")))
      .type.toBe<Query.Query<{ readonly temp: number | null }>>()
  })

  it("pick, omit and rename", () => {
    expect(readings.pipe(Query.pick("city", "temp"))).type.toBe<
      Query.Query<{ readonly city: string; readonly temp: number }>
    >()
    expect(readings.pipe(Query.omit("station", "rain", "id"))).type.toBe<
      Query.Query<{ readonly city: string; readonly temp: number }>
    >()
    expect(readings.pipe(Query.pick("temp", "city"), Query.rename({ temp: "celsius" }))).type.toBe<
      Query.Query<{ readonly city: string; readonly celsius: number }>
    >()
  })

  it("groupBy and agg", () => {
    expect(
      readings.pipe(
        Query.groupBy("city"),
        Query.agg((c) => ({
          n: Expr.count(),
          mean: Expr.mean(c.temp),
          total: Expr.sum(c.id),
          last: Expr.last(c.station)
        }))
      )
    ).type.toBe<
      Query.Query<
        {
          readonly city: string
          readonly n: number
          readonly mean: number | null
          readonly total: bigint
          readonly last: string | null
        }
      >
    >()
  })

  it("joins add the other side's columns; left joins make them nullable", () => {
    expect(readings.pipe(Query.pick("station", "temp"), Query.join(stations, { on: "station" }))).type.toBe<
      Query.Query<{ readonly station: string; readonly temp: number; readonly elevation: number }>
    >()
    expect(readings.pipe(Query.pick("station", "temp"), Query.join(stations, { on: "station", how: "left" })))
      .type.toBe<
      Query.Query<{ readonly station: string; readonly temp: number; readonly elevation: number | null }>
    >()
    expect(readings.pipe(Query.pick("station", "temp"), Query.join(stations, { on: "station", how: "anti" })))
      .type.toBe<Query.Query<{ readonly station: string; readonly temp: number }>>()
  })

  it("rejects mistakes", () => {
    // no column "tmp"
    // @ts-expect-error: Property 'tmp' does not exist
    readings.pipe(Query.filter((c) => Expr.gt(c.tmp, 18)))
    // a string compared with a number
    // @ts-expect-error: Argument of type '18' is not assignable
    readings.pipe(Query.filter((c) => Expr.gt(c.city, 18)))
    // arithmetic on strings
    // @ts-expect-error: Argument of type 'Expr<string>' is not assignable
    readings.pipe(Query.select((c) => ({ x: Expr.add(c.city, 1) })))
    // bigint and number don't mix without a cast
    // @ts-expect-error: Argument of type 'Expr<number>' is not assignable
    readings.pipe(Query.select((c) => ({ x: Expr.add(c.id, c.temp) })))
    // agg needs aggregates
    // @ts-expect-error: is missing in type 'Expr<number>' but required in type 'Aggregate<any>'
    readings.pipe(Query.groupBy("city"), Query.agg((c) => ({ t: c.temp })))
    // a predicate can't be an aggregate
    // @ts-expect-error: is missing in type 'Aggregate<number | null>'
    readings.pipe(Query.filter((c) => Expr.mean(c.temp)))
    // unknown group key
    // @ts-expect-error: Argument of type '"country"' is not assignable
    readings.pipe(Query.groupBy("country"))
    // "temp" exists on both sides and is not the key
    // @ts-expect-error: rename the columns that exist on both sides: temp
    readings.pipe(Query.join(readings.pipe(Query.pick("station", "temp")), { on: "station" }))
  })
})

declare const n: Expr.Expr<number>
declare const nn: Expr.Expr<number | null>
declare const s: Expr.Expr<string | null>

describe("Expr", () => {
  it("propagates nullability", () => {
    expect(Expr.add(n, 1)).type.toBe<Expr.Expr<number>>()
    expect(Expr.add(n, nn)).type.toBe<Expr.Expr<number | null>>()
    expect(Expr.gt(nn, 1)).type.toBe<Expr.Expr<boolean | null>>()
    expect(Expr.fillNull(nn, 0)).type.toBe<Expr.Expr<number>>()
    expect(Expr.coalesce(nn, s.pipe(Expr.length), 0)).type.toBe<Expr.Expr<number>>()
    expect(Expr.coalesce(nn, nn)).type.toBe<Expr.Expr<number | null>>()
    expect(Expr.when(Expr.gt(n, 0), "pos", "neg")).type.toBe<Expr.Expr<string>>()
    expect(Expr.concat(s, "-")).type.toBe<Expr.Expr<string | null>>()
  })

  it("data-last forms", () => {
    expect(n.pipe(Expr.gt(1))).type.toBe<Expr.Expr<boolean>>()
    expect(s.pipe(Expr.startsWith("a"))).type.toBe<Expr.Expr<boolean | null>>()
    expect(n.pipe(Expr.round(2))).type.toBe<Expr.Expr<number>>()
  })
})

const Event = Schema.Struct({
  id: Schema.String,
  at: Schema.DateTimeUtc,
  took: Schema.Duration,
  tags: Schema.Array(Schema.String),
  place: Schema.NullOr(Schema.Struct({ city: Schema.String, zip: Schema.Number })),
  amount: Schema.Number
})
declare const events: Query.Query<typeof Event.Type>
declare const price: Expr.Expr<BigDecimal.BigDecimal>

describe("Windows and reshaping", () => {
  it("over keeps the value type; window functions type their results", () => {
    expect(events.pipe(Query.select((c) => ({
      total: Expr.over(Expr.sum(c.amount), [c.id]),
      running: Expr.cumSum(c.amount),
      previous: Expr.shift(c.amount),
      rank: Expr.rank(c.amount, { method: "dense" }),
      avg3: Expr.rollingMean(c.amount, 3)
    })))).type.toBe<
      Query.Query<{
        readonly total: number
        readonly running: number
        readonly previous: number | null
        readonly rank: number
        readonly avg3: number | null
      }>
    >()
  })

  it("pivot with declared columns is typed; without them rows are untyped", () => {
    expect(events.pipe(Query.pivot({ on: "id", index: [], values: "amount", aggregate: "sum", columns: ["a", "b"] })))
      .type.toBe<Query.Query<{ readonly a: number; readonly b: number }>>()
    expect(events.pipe(Query.pivot({ on: "id", index: [], values: "amount", aggregate: "max" })))
      .type.toBe<Query.Query<{ readonly [name: string]: unknown }>>()
  })

  it("unpivot names the variable and value columns", () => {
    expect(readings.pipe(Query.unpivot({ index: ["city"], on: ["temp", "rain"], variable: "measure" }))).type.toBe<
      Query.Query<{ readonly city: string; readonly measure: "temp" | "rain"; readonly value: number | null }>
    >()
  })

  it("explode and unnest", () => {
    expect(events.pipe(Query.pick("id", "tags"), Query.explode("tags"))).type.toBe<
      Query.Query<{ readonly id: string; readonly tags: string | null }>
    >()
    expect(events.pipe(Query.pick("id", "place"), Query.unnest("place"))).type.toBe<
      Query.Query<{ readonly id: string; readonly city: string | null; readonly zip: number | null }>
    >()
    // @ts-expect-error: Argument of type '"amount"' is not assignable
    events.pipe(Query.explode("amount"))
  })
})

describe("Types", () => {
  it("dates, times and durations", () => {
    expect(events.pipe(Query.select((c) => ({
      year: Expr.year(c.at),
      day: Expr.truncate(c.at, "1d"),
      later: Expr.add(c.at, c.took),
      gap: Expr.subtract(c.at, c.at),
      hours: Expr.totalHours(c.took),
      recent: Expr.gt(c.at, DateTime.makeUnsafe(0)),
      long: Expr.gt(c.took, Duration.seconds(5))
    })))).type.toBe<
      Query.Query<{
        readonly year: number
        readonly day: DateTime.Utc
        readonly later: DateTime.Utc
        readonly gap: Duration.Duration
        readonly hours: bigint
        readonly recent: boolean
        readonly long: boolean
      }>
    >()
    // @ts-expect-error: is not assignable to parameter of type 'Expr<Utc | null>'
    Expr.year(Expr.lit(1))
  })

  it("lists and structs", () => {
    expect(events.pipe(Query.select((c) => ({
      n: Expr.listLength(c.tags),
      first: Expr.listGet(c.tags, 0),
      hasA: Expr.listContains(c.tags, "a"),
      city: Expr.field(c.place, "city"),
      pair: Expr.struct({ id: c.id, n: Expr.listLength(c.tags) })
    })))).type.toBe<
      Query.Query<{
        readonly n: number
        readonly first: string | null
        readonly hasA: boolean
        readonly city: string | null
        readonly pair: { readonly id: string; readonly n: number }
      }>
    >()
    expect(events.pipe(Query.groupBy("id"), Query.agg((c) => ({ amounts: Expr.list(c.amount) })))).type.toBe<
      Query.Query<{ readonly id: string; readonly amounts: ReadonlyArray<number> }>
    >()
  })

  it("decimals", () => {
    expect(Expr.add(price, price)).type.toBe<Expr.Expr<BigDecimal.BigDecimal>>()
    expect(Expr.sum(price)).type.toBe<Expr.Aggregate<BigDecimal.BigDecimal>>()
    expect(Expr.castDecimal(Expr.lit(1.5), 10, 2)).type.toBe<Expr.Expr<BigDecimal.BigDecimal | null>>()
  })
})

describe("Streaming", () => {
  it("Query.stream emits frames of the row type", () => {
    expect(Query.stream(stations)).type.toBe<
      Stream.Stream<DataFrame.DataFrame<typeof Station.Type>, DataFrame.DataFrameError>
    >()
  })
})
