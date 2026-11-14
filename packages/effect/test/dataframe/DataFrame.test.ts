import { assert, describe, it } from "@effect/vitest"
import { Effect, Equal, Result, Schema } from "effect"
import { ArrowIpc, ArrowSchema } from "effect/arrow"
import { DataFrame, Expr, Query } from "effect/dataframe"

const Reading = Schema.Struct({
  city: Schema.String,
  temp: Schema.Number,
  rain: Schema.NullOr(Schema.Number),
  station: Schema.optional(Schema.String)
})

const readings = DataFrame.fromRows(Reading, [
  { city: "Vienna", temp: 21.5, rain: 0, station: "s1" },
  { city: "Berlin", temp: 26.5, rain: null },
  { city: "Vienna", temp: 19, rain: 2 }
])

const types = (df: DataFrame.DataFrame<unknown>) =>
  df.schema.fields.map((f) => `${f.name}:${f.type._tag}:${f.nullable}`)

describe("DataFrame", () => {
  describe("constructors", () => {
    it("fromRows maps schema fields to Arrow types", () => {
      assert.deepStrictEqual(types(readings), [
        "city:Utf8:false",
        "temp:Float:false",
        "rain:Float:true",
        "station:Utf8:true"
      ])
      assert.deepStrictEqual(DataFrame.toArray(readings, "station") as Array<unknown>, ["s1", null, null])
    })

    it("fromRows takes per-column type overrides", () => {
      const df = DataFrame.fromRows(Schema.Struct({ n: Schema.Number }), [{ n: 1 }, { n: 2 }], {
        types: { n: ArrowSchema.int32 }
      })
      assert.deepStrictEqual(df.schema.fields[0].type, ArrowSchema.int32)
    })

    it("fromRows rejects schemas without a column type", () => {
      try {
        DataFrame.fromRows(Schema.Struct({ xs: Schema.Record(Schema.String, Schema.Number) }), [])
        assert.fail("expected an error")
      } catch (e) {
        assert.instanceOf(e, DataFrame.DataFrameError)
        assert.include((e as DataFrame.DataFrameError).message, `"xs"`)
      }
    })

    it("fromColumns keeps typed array element types", () => {
      const df = DataFrame.fromColumns({ i: Int32Array.of(1, 2), b: BigInt64Array.of(1n, 2n), s: ["a", null] })
      assert.deepStrictEqual(types(df), ["i:Int:false", "b:Int:false", "s:Utf8:true"])
      assert.deepStrictEqual(DataFrame.toRows(df), [{ i: 1, b: 1n, s: "a" }, { i: 2, b: 2n, s: null }])
    })

    it("fromColumns rejects columns of different lengths", () => {
      assert.throws(() => DataFrame.fromColumns({ a: [1, 2], b: [1] }), DataFrame.DataFrameError)
    })

    it("empty has the schema's columns and no rows", () => {
      const df = DataFrame.empty(Reading)
      assert.strictEqual(df.length, 0)
      assert.deepStrictEqual(DataFrame.columnNames(df), ["city", "temp", "rain", "station"])
    })
  })

  describe("validate", () => {
    const untyped = DataFrame.fromArrowTable(DataFrame.toArrowTable(readings))

    it("returns the frame typed by the schema, in schema order", () => {
      const result = DataFrame.validate(untyped, Schema.Struct({ temp: Schema.Number, city: Schema.String }))
      assert.deepStrictEqual(DataFrame.columnNames(Result.getOrThrow(result)), ["temp", "city"])
    })

    it("fails on missing columns, wrong types and unexpected nulls", () => {
      const cases: ReadonlyArray<readonly [Schema.Struct<any>, string]> = [
        [Schema.Struct({ country: Schema.String }), `missing column "country"`],
        [Schema.Struct({ city: Schema.Number }), `column "city" is Utf8, expected Float64`],
        [Schema.Struct({ rain: Schema.Number }), `column "rain" has missing values`]
      ]
      for (const [schema, message] of cases) {
        const result = DataFrame.validate(untyped, schema)
        assert.isTrue(Result.isFailure(result))
        assert.strictEqual(Result.isFailure(result) && result.failure.message, message)
      }
    })
  })

  describe("Arrow interop", () => {
    it("round-trips through the IPC stream format", () => {
      const bytes = Result.getOrThrow(ArrowIpc.encodeStream(DataFrame.toArrowTable(readings)))
      const back = DataFrame.fromArrowTable(Result.getOrThrow(ArrowIpc.decodeStream(bytes)))
      assert.isTrue(Equal.equals(back, readings))
    })

    it("exports late-selected columns", () => {
      const df = Query.from(readings).pipe(
        Query.filter((c) => Expr.isNotNull(c.rain)),
        Query.sort((c) => [c.temp]),
        Effect.runSync
      )
      const table = DataFrame.toArrowTable(df)
      assert.strictEqual(table.batches[0].length, 2)
      assert.deepStrictEqual(DataFrame.toRows(DataFrame.fromArrowTable(table)), DataFrame.toRows(df))
    })
  })

  describe("values", () => {
    it("compare structurally, NaN included", () => {
      const a = DataFrame.fromColumns({ x: [1, NaN, null] })
      const b = DataFrame.fromColumns({ x: [1, NaN, null] })
      const c = DataFrame.fromColumns({ x: [1, NaN, 2] })
      assert.isTrue(Equal.equals(a, b))
      assert.isFalse(Equal.equals(a, c))
    })

    it("iterate as rows", () => {
      assert.deepStrictEqual(Array.from(DataFrame.fromColumns({ city: DataFrame.toArray(readings, "city") })), [
        { city: "Vienna" },
        { city: "Berlin" },
        { city: "Vienna" }
      ])
    })

    it("format as a text table", () => {
      assert.strictEqual(
        DataFrame.format(
          DataFrame.fromColumns({
            city: DataFrame.toArray(readings, "city"),
            rain: DataFrame.toArray(readings, "rain")
          })
        ),
        [
          "DataFrame (3 rows × 2 columns)",
          "┌──────────┬─────────┐",
          "│ city     │ rain    │",
          "│ Utf8     │ Float64 │",
          "├──────────┼─────────┤",
          `│ "Vienna" │ 0       │`,
          `│ "Berlin" │ null    │`,
          `│ "Vienna" │ 2       │`,
          "└──────────┴─────────┘"
        ].join("\n")
      )
    })
  })
})
