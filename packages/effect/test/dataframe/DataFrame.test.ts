import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Effect, Equal, Result, Schema, Stream } from "effect"
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
    // DF-C001 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows maps schema fields to Arrow types", () => {
      assert.deepStrictEqual(types(readings), [
        "city:Utf8:false",
        "temp:Float:false",
        "rain:Float:true",
        "station:Utf8:true"
      ])
      assert.deepStrictEqual(DataFrame.toArray(readings, "station") as Array<unknown>, ["s1", null, null])
    })

    // DF-C002 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows takes per-column type overrides", () => {
      const df = DataFrame.fromRows(Schema.Struct({ n: Schema.Number }), [{ n: 1 }, { n: 2 }], {
        types: { n: ArrowSchema.int32 }
      })
      assert.deepStrictEqual(df.schema.fields[0].type, ArrowSchema.int32)
    })

    // DF-C003 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows builds decimal columns from options.types", () => {
      const Price = Schema.Struct({ n: Schema.BigDecimal })
      const df = DataFrame.fromRows(Price, [{ n: BigDecimal.make(123n, 2) }], {
        types: { n: ArrowSchema.decimal(18, 2) }
      })
      assert.deepStrictEqual(df.schema.fields[0].type, ArrowSchema.decimal(18, 2))
      assert.isTrue(BigDecimal.equals(DataFrame.toRows(df)[0].n, BigDecimal.make(123n, 2)))
      assert.strictEqual(DataFrame.empty(Price, { types: { n: ArrowSchema.decimal(9, 0) } }).length, 0)
      assert.isTrue(Result.isSuccess(DataFrame.validate(df, Price, { types: { n: ArrowSchema.decimal(18, 2) } })))
    })

    // DF-C004 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows rejects overrides that can't hold the field's values", () => {
      assert.throws(
        () => DataFrame.fromRows(Schema.Struct({ n: Schema.Number }), [], { types: { n: ArrowSchema.int64 } }),
        `column "n" is Int64, expected Float64`
      )
      assert.throws(
        () =>
          DataFrame.fromRows(Schema.Struct({ t: Schema.DateTimeUtc }), [], {
            types: { t: ArrowSchema.timestamp("second", "Europe/Berlin") }
          }),
        `column "t" has time zone Europe/Berlin, expected UTC timestamps`
      )
    })

    // DF-C005 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows rejects schemas without a column type", () => {
      interface Tree {
        readonly children: ReadonlyArray<Tree>
      }
      const Tree: Schema.Codec<Tree> = Schema.Struct({ children: Schema.Array(Schema.suspend(() => Tree)) })
      for (const xs of [Schema.Record(Schema.String, Schema.Number), Tree]) {
        assert.throws(() => DataFrame.fromRows(Schema.Struct({ xs }), []), DataFrame.DataFrameError, `"xs`)
      }
    })

    // DF-C006 (API contract): DataFrame.fromColumns; pinned source in README.md.
    it("fromColumns keeps typed array element types", () => {
      const df = DataFrame.fromColumns({ i: Int32Array.of(1, 2), b: BigInt64Array.of(1n, 2n), s: ["a", null] })
      assert.deepStrictEqual(types(df), ["i:Int:false", "b:Int:false", "s:Utf8:true"])
      assert.deepStrictEqual(DataFrame.toRows(df), [{ i: 1, b: 1n, s: "a" }, { i: 2, b: 2n, s: null }])
    })

    // DF-C007 (API contract): DataFrame.fromColumns; pinned source in README.md.
    it("fromColumns rejects columns of different lengths", () => {
      assert.throws(() => DataFrame.fromColumns({ a: [1, 2], b: [1] }), DataFrame.DataFrameError)
    })

    // DF-C008 (API contract): DataFrame.empty; pinned source in README.md.
    it("empty has the schema's columns and no rows", () => {
      const df = DataFrame.empty(Reading)
      assert.strictEqual(df.length, 0)
      assert.deepStrictEqual(DataFrame.columnNames(df), ["city", "temp", "rain", "station"])
    })
  })

  // DF-C021 (API contract): compatible Arrow layouts; pinned source in README.md.
  it("reuses compatible numeric buffers across Arrow conversion", () => {
    const schema = ArrowSchema.make([
      ArrowSchema.field("i", ArrowSchema.int32),
      ArrowSchema.field("n", ArrowSchema.float64)
    ])
    const input = Result.getOrThrow(ArrowTable.fromColumns(schema, [[1, -2, 3], [1.5, -2.5, 0]]))
    const frame = DataFrame.fromArrowTable(input)
    const output = DataFrame.toArrowTable(frame)
    assert.deepStrictEqual(DataFrame.toRows(frame), [{ i: 1, n: 1.5 }, { i: -2, n: -2.5 }, { i: 3, n: 0 }])
    assert.deepStrictEqual(ArrowTable.toRows(output), DataFrame.toRows(frame))
    for (let i = 0; i < 2; i++) {
      const before = input.batches[0].columns[i].buffers[0]
      const after = output.batches[0].columns[i].buffers[0]
      assert.strictEqual(after.buffer, before.buffer)
      assert.strictEqual(after.byteOffset, before.byteOffset)
      assert.strictEqual(after.byteLength, before.byteLength)
    }
  })

  describe("validate", () => {
    const untyped = DataFrame.fromArrowTable(DataFrame.toArrowTable(readings))
    const arrowFrame = (columns: Record<string, readonly [ArrowSchema.DataType, ReadonlyArray<unknown>]>) =>
      DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromColumns(
        ArrowSchema.make(Object.entries(columns).map(([name, [type]]) => ArrowSchema.field(name, type))),
        Object.values(columns).map(([, values]) => values)
      )))
    const column = (type: ArrowSchema.DataType, values: ReadonlyArray<unknown>) => arrowFrame({ t: [type, values] })
    const Utc = Schema.Struct({ t: Schema.DateTimeUtc })

    // DF-C009 (API contract): DataFrame.validate; pinned source in README.md.
    it("returns the frame typed by the schema, in schema order", () => {
      const result = DataFrame.validate(untyped, Schema.Struct({ temp: Schema.Number, city: Schema.String }))
      assert.deepStrictEqual(DataFrame.columnNames(Result.getOrThrow(result)), ["temp", "city"])
    })

    // DF-C010 (API contract): DataFrame.validate; pinned source in README.md.
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
        ],
        [
          DataFrame.fromColumns({ lo: [1, 2], hi: [2, 1] }),
          Schema.Struct({ lo: Schema.Number, hi: Schema.Number }).check(
            Schema.makeFilter((row) => row.lo < row.hi || "lo must be below hi")
          ),
          "rows have values their schema rejects"
        ],
        [
          DataFrame.fromRows(Schema.Struct({ s: Schema.Struct({ a: Schema.String }) }), [{ s: { a: "x" } }, {
            s: { a: "z" }
          }]),
          Schema.Struct({
            s: Schema.Union([Schema.Struct({ a: Schema.Literal("x") }), Schema.Struct({ a: Schema.Literal("y") })])
          }),
          `column "s" has values its schema rejects`
        ],
        [
          DataFrame.fromColumns({ s: ["x", "z"] }),
          Schema.Struct({
            s: Schema.Union([Schema.suspend(() => Schema.Literal("x")), Schema.suspend(() => Schema.Literal("y"))])
          }),
          `column "s" has values its schema rejects`
        ],
        [
          column(ArrowSchema.decimal(18, 3), [BigDecimal.fromStringUnsafe("1.234")]),
          Schema.Struct({ t: Schema.BigDecimal }),
          `column "t": decimal columns need a precision and scale: pass options.types (for example ArrowSchema.decimal(18, 2))`
        ],
        [
          column(ArrowSchema.timestamp("nanosecond"), [1n]),
          Utc,
          `column "t" has values that Timestamp[us] can't hold exactly`
        ],
        [
          column(ArrowSchema.timestamp("millisecond", "Europe/Berlin"), [0n]),
          Utc,
          `column "t" has time zone Europe/Berlin, expected UTC timestamps`
        ],
        [
          column(ArrowSchema.timestamp("millisecond"), [9223372036854775807n]),
          Utc,
          `column "t" has timestamps outside the range of DateTime`
        ],
        [
          column(ArrowSchema.list(ArrowSchema.field("item", ArrowSchema.timestamp("microsecond"))), [[
            8640000000000000999n,
            8640000000000001000n
          ]]),
          Schema.Struct({ t: Schema.Array(Schema.DateTimeUtc) }),
          `column "t[]" has timestamps outside the range of DateTime`
        ]
      ]
      for (const [df, schema, message] of cases) {
        const result = DataFrame.validate(df, schema)
        assert.strictEqual(Result.isFailure(result) && result.failure.message, message)
      }
    })

    // DF-C011 (API contract): DataFrame.validate; pinned source in README.md.
    it("reads timestamps with a UTC time zone as DateTime.Utc", () => {
      const ts = ArrowSchema.timestamp("millisecond", "UTC")
      const nested = column(ArrowSchema.list(ArrowSchema.field("item", ts)), [[1000n]])
      const df = Result.getOrThrow(DataFrame.validate(nested, Schema.Struct({ t: Schema.Array(Schema.DateTimeUtc) })))
      assert.deepStrictEqual(DataFrame.toRows(df), [{ t: [DateTime.makeUnsafe(1000)] }])
      const built = DataFrame.fromRows(Utc, [{ t: DateTime.makeUnsafe(0) }], {
        types: { t: ArrowSchema.timestamp("second", "UTC") }
      })
      assert.deepStrictEqual(built.schema.fields[0].type, ArrowSchema.timestamp("second"))
      assert.deepStrictEqual(DataFrame.toRows(built), [{ t: DateTime.makeUnsafe(0) }])
    })

    // DF-C012 (API contract): DataFrame.validate; pinned source in README.md.
    it("converts columns to the types fromRows gives the schema, exactly", () => {
      const Row = Schema.Struct({ n: Schema.Number, d: Schema.BigDecimal, t: Schema.DateTimeUtc })
      const df = arrowFrame({
        n: [ArrowSchema.int32, [1]],
        d: [ArrowSchema.decimal(18, 1), [BigDecimal.fromStringUnsafe("1.2")]],
        t: [ArrowSchema.timestamp("millisecond"), [1n]]
      })
      const types = { d: ArrowSchema.decimal(18, 2) }
      const validated = Result.getOrThrow(DataFrame.validate(df, Row, { types }))
      assert.deepStrictEqual(validated.schema, DataFrame.empty(Row, { types }).schema)
      assert.deepStrictEqual(df.pipe(DataFrame.validate(Row, { types }), Result.getOrThrow).schema, validated.schema)
      assert.deepStrictEqual(DataFrame.toRows(validated), [{
        n: 1,
        d: BigDecimal.make(120n, 2),
        t: DateTime.makeUnsafe(1)
      }])
      const lossy = DataFrame.validate(df, Row, { types: { d: ArrowSchema.decimal(18, 0) } })
      assert.strictEqual(
        Result.isFailure(lossy) && lossy.failure.message,
        `column "d" has values that Decimal[18, 0] can't hold exactly`
      )
    })
  })

  describe("Arrow interop", () => {
    // DF-C013 (API contract): DataFrame.toArrowTable; pinned source in README.md.
    it("round-trips through the IPC stream format", () => {
      const bytes = Result.getOrThrow(ArrowIpc.encodeStream(DataFrame.toArrowTable(readings)))
      const back = DataFrame.fromArrowTable(Result.getOrThrow(ArrowIpc.decodeStream(bytes)))
      assert.isTrue(Equal.equals(back, readings))
    })

    // DF-C014 (API contract): DataFrame.decodeArrowStream; pinned source in README.md.
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

    // DF-C015 (API contract): DataFrame.toArrowTable; pinned source in README.md.
    it.effect("exports late-selected columns", () =>
      Effect.gen(function*() {
        const df = yield* Query.from(readings).pipe(
          Query.filter((c) => Expr.isNotNull(c.rain)),
          Query.sort((c) => [c.temp])
        )
        const table = DataFrame.toArrowTable(df)
        assert.strictEqual(table.batches[0].length, 2)
        assert.deepStrictEqual(DataFrame.toRows(DataFrame.fromArrowTable(table)), DataFrame.toRows(df))
      }))

    // DF-C016 (API contract): DataFrame.fromArrowTable; pinned source in README.md.
    it("imports a table without batches with the nullability of its fields", () => {
      const schema = ArrowSchema.make([
        ArrowSchema.field("x", ArrowSchema.int8, { nullable: false }),
        ArrowSchema.field("s", ArrowSchema.utf8)
      ])
      assert.deepStrictEqual(types(DataFrame.fromArrowTable(ArrowTable.make(schema, []))), [
        "x:Int:false",
        "s:Utf8:true"
      ])
    })

    // DF-C017 (API contract): DataFrame.fromArrowTable; pinned source in README.md.
    it.effect("imports sliced list columns with only their own elements", () =>
      Effect.gen(function*() {
        const Lists = Schema.Struct({ xs: Schema.Array(Schema.Number) })
        const df = DataFrame.fromRows(Lists, [{ xs: [1] }, { xs: [2] }, { xs: [3] }])
        const table = DataFrame.toArrowTable(df)
        const sliced = DataFrame.fromArrowTable(ArrowTable.slice(table, 0, 1))
        const sums = yield* Query.from(sliced).pipe(
          Query.select((c) => ({ s: Expr.listSum(c.xs as Expr.Expr<ReadonlyArray<number>>) }))
        )
        assert.deepStrictEqual(DataFrame.toRows(sums), [{ s: 1 }])
        const two = ArrowTable.make(table.schema, [
          ...ArrowTable.slice(table, 0, 1).batches,
          ...ArrowTable.slice(table, 2, 3).batches
        ])
        assert.deepStrictEqual(DataFrame.toRows(DataFrame.fromArrowTable(two)), [{ xs: [1] }, { xs: [3] }])
      }))
  })

  describe("values", () => {
    // DF-C018 (API contract): DataFrame.equals; pinned source in README.md.
    it("compare structurally, NaN included", () => {
      const a = DataFrame.fromColumns({ x: [1, NaN, null] })
      const b = DataFrame.fromColumns({ x: [1, NaN, null] })
      const c = DataFrame.fromColumns({ x: [1, NaN, 2] })
      assert.isTrue(Equal.equals(a, b))
      assert.isFalse(Equal.equals(a, c))
    })

    // DF-C019 (API contract): DataFrame.DataFrame; pinned source in README.md.
    it("iterate as rows", () => {
      assert.deepStrictEqual(Array.from(DataFrame.fromColumns({ city: DataFrame.toArray(readings, "city") })), [
        { city: "Vienna" },
        { city: "Berlin" },
        { city: "Vienna" }
      ])
    })

    // DF-C020 (local policy): DataFrame.format; pinned source in README.md.
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
