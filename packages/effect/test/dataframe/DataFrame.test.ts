import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, Effect, Equal, Result, Schema, Stream } from "effect"
import { ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
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

    it("fromRows builds decimal columns from options.types", () => {
      const Price = Schema.Struct({ n: Schema.BigDecimal })
      const df = DataFrame.fromRows(Price, [{ n: BigDecimal.make(123n, 2) }], {
        types: { n: ArrowSchema.decimal(18, 2) }
      })
      assert.deepStrictEqual(df.schema.fields[0].type, ArrowSchema.decimal(18, 2))
      assert.isTrue(BigDecimal.equals(DataFrame.toRows(df)[0].n, BigDecimal.make(123n, 2)))
      assert.strictEqual(DataFrame.empty(Price, { types: { n: ArrowSchema.decimal(9, 0) } }).length, 0)
      assert.isTrue(Result.isSuccess(DataFrame.validate(df, Price)))
    })

    it("fromRows rejects overrides that can't hold the field's values", () => {
      assert.throws(
        () => DataFrame.fromRows(Schema.Struct({ n: Schema.Number }), [], { types: { n: ArrowSchema.int64 } }),
        `field "n": Int64 can't hold values of Float64`
      )
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

    it("fails on missing columns, wrong types, unexpected nulls and values the schema rejects", () => {
      const nested = DataFrame.fromRows(
        Schema.Struct({ p: Schema.Struct({ x: Schema.String }), xs: Schema.Array(Schema.NullOr(Schema.Number)) }),
        [{ p: { x: "a" }, xs: [1, null] }]
      )
      const cases: ReadonlyArray<readonly [DataFrame.DataFrame<unknown>, Schema.Struct<any>, string]> = [
        [untyped, Schema.Struct({ country: Schema.String }), `missing column "country"`],
        [untyped, Schema.Struct({ city: Schema.Number }), `column "city" is Utf8, expected Float64`],
        [untyped, Schema.Struct({ rain: Schema.Number }), `column "rain" has missing values`],
        [
          DataFrame.fromColumns({ n: Int32Array.of(1) }),
          Schema.Struct({ n: Schema.BigInt }),
          `column "n" is Int32, expected Int64`
        ],
        [nested, Schema.Struct({ p: Schema.Struct({ x: Schema.Number }) }), `column "p.x" is Utf8, expected Float64`],
        [nested, Schema.Struct({ xs: Schema.Array(Schema.Number) }), `column "xs[]" has missing values`],
        [
          DataFrame.fromColumns({ s: ["allowed", "nope"] }),
          Schema.Struct({ s: Schema.Literal("allowed") }),
          `column "s" has values its schema rejects`
        ],
        [
          DataFrame.fromColumns({ n: [1, 1.5] }),
          Schema.Struct({ n: Schema.Int }),
          `column "n" has values its schema rejects`
        ]
      ]
      for (const [df, schema, message] of cases) {
        const result = DataFrame.validate(df, schema)
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

    it.effect("decodes IPC stream bytes into a frame per batch", () =>
      Effect.gen(function*() {
        const table = DataFrame.toArrowTable(readings)
        const bytes = Result.getOrThrow(
          ArrowIpc.encodeStream(ArrowTable.make(table.schema, [table.batches[0], table.batches[0]]))
        )
        // Split the bytes at arbitrary points, as a socket would deliver them.
        const chunks = [bytes.subarray(0, 100), bytes.subarray(100, 300), bytes.subarray(300)]
        const frames = yield* DataFrame.decodeArrowStream(Stream.fromIterable(chunks)).pipe(Stream.runCollect)
        assert.strictEqual(frames.length, 2)
        for (const frame of frames) assert.isTrue(Equal.equals(frame, readings))
      }))

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

    it("imports sliced list columns with only their own elements", () => {
      const Lists = Schema.Struct({ xs: Schema.Array(Schema.Number) })
      const df = DataFrame.fromRows(Lists, [{ xs: [1] }, { xs: [2] }, { xs: [3] }])
      const table = DataFrame.toArrowTable(df)
      const sliced = DataFrame.fromArrowTable(ArrowTable.slice(table, 0, 1))
      const sums = Query.from(sliced).pipe(
        Query.select((c) => ({ s: Expr.listSum(c.xs as Expr.Expr<ReadonlyArray<number>>) })),
        Effect.runSync
      )
      assert.deepStrictEqual(DataFrame.toRows(sums), [{ s: 1 }])
      const two = ArrowTable.make(table.schema, [
        ...ArrowTable.slice(table, 0, 1).batches,
        ...ArrowTable.slice(table, 2, 3).batches
      ])
      assert.deepStrictEqual(DataFrame.toRows(DataFrame.fromArrowTable(two)), [{ xs: [1] }, { xs: [3] }])
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
