import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Duration, Effect, Equal, Option, Result, Schema, Stream } from "effect"
import { ArrowColumn, ArrowData, ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
import { Catalog, DataFrame, Expr, Query } from "effect/dataframe"
import * as InternalDateTime from "effect/internal/dateTime"
import { vi } from "vitest"

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

/**
 * What `fromRows`, `validate` and `Query.table` (in memory) say to rows
 * held in the schema's columns: `"ok"`, or the message they fail with.
 */
const outcomes = (
  schema: Schema.Struct<any>,
  rows: ReadonlyArray<Record<string, unknown>>
): ReadonlyArray<string> => {
  const stored = DataFrame.fromArrowTable(Result.getOrThrow(ArrowTable.fromRows(DataFrame.empty(schema).schema, rows)))
  const table = Query.table("t", schema).pipe(Effect.provide(Catalog.layer({ t: stored })))
  return [
    Result.try({ try: () => DataFrame.fromRows(schema, rows), catch: (e) => e as DataFrame.DataFrameError }),
    DataFrame.validate(stored, schema),
    Effect.runSync(Effect.result(table))
  ].map((result) => Result.isFailure(result) ? result.failure.message : "ok")
}

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

    // DF-C022 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows checks rows against the schema's refinements, literals and row checks", () => {
      const Positive = Schema.Number.check(Schema.isGreaterThan(0))
      const Order = Schema.Struct({
        n: Positive,
        kind: Schema.Literals(["x", "y"]),
        note: Schema.optional(Schema.NonEmptyString),
        lines: Schema.Array(
          Schema.Struct({ qty: Schema.NullOr(Positive), unit: Schema.optional(Schema.Literal("kg")) })
        )
      }).check(Schema.makeFilter((row) => row.lines.length <= row.n || "more lines than n"))
      const valid = { n: 2, kind: "x", lines: [{ qty: 1 }, { qty: null, unit: undefined }] } as const
      const df = DataFrame.fromRows(Order, [valid, { ...valid, note: undefined }, { ...valid, note: "late" }])
      assert.deepStrictEqual(DataFrame.toArray(df, "note"), [null, null, "late"])
      assert.isTrue(Result.isSuccess(DataFrame.validate(df, Order)))
      const cases: ReadonlyArray<readonly [object, string]> = [
        [{ n: -1 }, `column "n" has values its schema rejects`],
        [{ kind: "z" }, `column "kind" has values its schema rejects`],
        [{ note: "" }, `column "note" has values its schema rejects`],
        [{ lines: [{ qty: 1 }, { qty: 0 }] }, `column "lines" has values its schema rejects`],
        [{ lines: [{ qty: 1, unit: "lb" }] }, `column "lines" has values its schema rejects`],
        [{ n: 1 }, "rows have values their schema rejects"]
      ]
      for (const [fields, message] of cases) {
        const rows = [valid, { ...valid, ...fields }] as unknown as ReadonlyArray<typeof Order.Type>
        assert.throws(() => DataFrame.fromRows(Order, rows), DataFrame.DataFrameError, message)
      }
    })

    // DF-C029 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows returns a frame that validates against the same declaration", () => {
      const Row = Schema.Struct({
        n: Schema.Number.check(Schema.isGreaterThan(0)),
        at: Schema.NullOr(Schema.DateTimeUtc),
        waits: Schema.Array(Schema.Struct({ d: Schema.optional(Schema.Duration) })),
        m: Schema.BigDecimal
      })
      const types = { n: ArrowSchema.float32, at: ArrowSchema.timestamp("second"), m: ArrowSchema.decimal(4, 2) }
      const row = {
        n: 0.1,
        at: DateTime.makeUnsafe(2000),
        waits: [{ d: Duration.nanos(1_000n) }, {}],
        m: BigDecimal.make(15n, 1)
      }
      const df = DataFrame.fromRows(Row, [row, { ...row, at: null }], { types })
      // A Float32 column rounds its numbers, and the frame holds the rounded ones.
      assert.strictEqual(DataFrame.toArray(df, "n")[0], Math.fround(0.1))
      for (const built of [df, DataFrame.empty(Row, { types })]) {
        const validated = Result.getOrThrow(DataFrame.validate(built, Row, { types }))
        assert.deepStrictEqual(validated.schema, built.schema)
        assert.deepStrictEqual(DataFrame.toRows(validated), DataFrame.toRows(built))
      }

      const beyond = DateTime.fromEpochSeconds(8_640_000_000_001)
      const cases: ReadonlyArray<readonly [object, string]> = [
        // The check sees what the column stores: Math.fround(1e-46) is 0.
        [{ n: 1e-46 }, `column "n" has values its schema rejects`],
        [{ at: DateTime.makeUnsafe(1500) }, `column "at" has values that Timestamp[s] can't hold exactly`],
        [{ at: beyond }, `column "at" has timestamps outside the range of DateTime`],
        [
          { waits: [{ d: Duration.nanos(1_001n) }] },
          `column "waits[].d" has values that Duration[us] can't hold exactly`
        ],
        [{ m: BigDecimal.make(1_234n, 3) }, "1.234 has more than 2 decimal places"],
        [{ m: BigDecimal.make(1_234n, 1) }, `column "m" has values that Decimal[4, 2] can't hold exactly`]
      ]
      for (const [fields, message] of cases) {
        assert.throws(
          () => DataFrame.fromRows(Row, [row, { ...row, ...fields }], { types }),
          DataFrame.DataFrameError,
          message
        )
      }
      // A frame that holds such a decimal under the declared type fails too.
      const Amount = Schema.Struct({ m: Schema.BigDecimal })
      const held = ArrowTable.fromRows(DataFrame.empty(Amount, { types }).schema, [{ m: BigDecimal.make(1_234n, 1) }])
      const validated = DataFrame.validate(DataFrame.fromArrowTable(Result.getOrThrow(held)), Amount, { types })
      assert.include(Result.isFailure(validated) && validated.failure.message, cases[5][1])
    })

    // DF-C030 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("a null member of a union keeps the checks of the other members", () => {
      const Row = Schema.Struct({ s: Schema.Union([Schema.suspend(() => Schema.Null), Schema.Literal("ok")]) })
      assert.deepStrictEqual(outcomes(Row, [{ s: "ok" }, { s: null }]), ["ok", "ok", "ok"])
      const message = `column "s" has values its schema rejects`
      assert.deepStrictEqual(outcomes(Row, [{ s: "ok" }, { s: "bad" }]), [message, message, message])
    })

    // DF-C031 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("checks see stored values as the schema writes them, missing ones included", () => {
      const seen: Array<unknown> = []
      const record = Schema.makeFilter((value: unknown) => {
        seen.push(value)
        return true
      })
      const Item = Schema.Struct({ unit: Schema.optional(Schema.String), qty: Schema.UndefinedOr(Schema.Number) })
      const Row = Schema.Struct({
        note: Schema.optional(Schema.String),
        rain: Schema.NullOr(Schema.Number),
        items: Schema.Array(Item).check(record)
      }).check(record)
      const rows = [{ rain: null, items: [{ qty: undefined }] }, {
        note: undefined,
        rain: 1,
        items: [{ unit: "kg", qty: 2 }]
      }]
      assert.deepStrictEqual(outcomes(Row, rows), ["ok", "ok", "ok"])
      // What each of the three hands to the checks: the items of both rows, then both rows.
      const items = [[{ qty: undefined }], [{ unit: "kg", qty: 2 }]]
      const checked = [...items, { rain: null, items: items[0] }, { rain: 1, items: items[1] }]
      assert.deepStrictEqual(seen, [...checked, ...checked, ...checked])

      // A frame can't tell null from undefined or an absent key, so a check that could is rejected.
      const Either = Schema.optional(Schema.NullOr(Schema.String))
      const rejected: ReadonlyArray<readonly [Schema.Struct<any>, string]> = [
        [Schema.Struct({ a: Either }).check(record), `field "a"`],
        [
          Schema.Struct({ p: Schema.Struct({ xs: Schema.Array(Schema.Struct({ a: Either })) }).check(record) }),
          `field "p.xs[].a"`
        ],
        [Schema.Struct({ a: Schema.Union([Schema.Null, Schema.Undefined, Schema.String]).check(record) }), `field "a"`]
      ]
      for (const [schema, field] of rejected) {
        const message = `${field}: a check sees a missing value that the schema writes in several ways`
        assert.throws(() => DataFrame.fromRows(schema, []), DataFrame.DataFrameError, message)
        assert.throws(() => Query.table("t", schema), DataFrame.DataFrameError, message)
        const validated = DataFrame.validate(readings, schema)
        assert.include(Result.isFailure(validated) && validated.failure.message, message)
      }
      // No check sees it here: the literal is tested on its own column.
      const Unseen = Schema.Struct({ kind: Schema.Literal("x"), a: Either })
      assert.deepStrictEqual(outcomes(Unseen, [{ kind: "x" }, { kind: "x", a: null }]), ["ok", "ok", "ok"])
    })

    // DF-C023 (API contract): DataFrame.fromRows; pinned source in README.md.
    it("fromRows, empty and validate reject schemas that transform their rows", () => {
      const cases: ReadonlyArray<readonly [{ readonly Type: object; readonly ast: any }, string]> = [
        [Schema.Struct({ a: Schema.NumberFromString }), `field "a"`],
        [Schema.Struct({ t: Schema.optional(Schema.DateTimeUtcFromString) }), `field "t"`],
        [
          Schema.Struct({ p: Schema.Struct({ xs: Schema.Array(Schema.NullOr(Schema.NumberFromString)) }) }),
          `field "p.xs[]"`
        ],
        [Schema.Struct({ a: Schema.Number.pipe(Schema.withDecodingDefault(Effect.succeed(1))) }), `field "a"`],
        [Schema.Struct({ a: Schema.suspend(() => Schema.NumberFromString) }), `field "a"`],
        [Schema.Struct({ a: Schema.Number }).pipe(Schema.encodeKeys({ a: "b" })), "the schema"]
      ]
      for (const [schema, subject] of cases) {
        const message =
          `${subject} has a transformation: frames hold decoded values and transformations are not run; ` +
          "Schema.toType(schema) describes the decoded rows"
        assert.throws(() => DataFrame.fromRows(schema, []), DataFrame.DataFrameError, message)
        assert.throws(() => DataFrame.empty(schema), DataFrame.DataFrameError, message)
        const result = DataFrame.validate(DataFrame.fromColumns({ a: ["1"] }), schema)
        assert.strictEqual(Result.isFailure(result) && result.failure.message, message)
      }
      const Decoded = Schema.toType(Schema.Struct({ a: Schema.NumberFromString, t: Schema.DateTimeUtcFromString }))
      const row = { a: 1, t: DateTime.makeUnsafe(0) }
      assert.deepStrictEqual(DataFrame.toRows(DataFrame.fromRows(Decoded, [row])), [row])
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

  // DF-C028 (API contract): DataFrame.column; pinned source in README.md.
  it("column gives a column's buffers and values without building rows", () => {
    const schema = ArrowSchema.make([
      ArrowSchema.field("at", ArrowSchema.timestamp("nanosecond", "Europe/Vienna")),
      ArrowSchema.field("n", ArrowSchema.int32, { nullable: false }),
      ArrowSchema.field("s", ArrowSchema.utf8)
    ])
    const input = Result.getOrThrow(
      ArrowTable.fromColumns(schema, [[1700000000123456789n, null, -1n], [1, -2, 3], ["a", null, "bc"]])
    )
    const frame = DataFrame.fromArrowTable(input)
    const built = [vi.spyOn(InternalDateTime, "makeUtc"), vi.spyOn(InternalDateTime, "makeZonedProto")]
    try {
      const at = DataFrame.column(frame, "at")
      assert.strictEqual(at.length, 3)
      assert.deepStrictEqual(at.field.type, ArrowSchema.timestamp("nanosecond", "Europe/Vienna"))
      assert.strictEqual(at.chunks.length, 1)
      const nanos = Option.getOrThrow(ArrowData.values(at.chunks[0]))
      assert.isTrue(nanos instanceof BigInt64Array)
      assert.deepStrictEqual([nanos[0], nanos[2]], [1700000000123456789n, -1n])
      assert.deepStrictEqual([0, 1, 2].map((i) => ArrowData.isValid(at.chunks[0], i)), [true, false, true])

      const n = frame.pipe(DataFrame.column("n"))
      assert.strictEqual(n.field.nullable, false)
      const ints = Option.getOrThrow(ArrowData.values(n.chunks[0]))
      assert.deepStrictEqual(ints, Int32Array.of(1, -2, 3))
      assert.strictEqual(ints.buffer, input.batches[0].columns[1].buffers[0].buffer)

      const s = DataFrame.column(frame, "s").chunks[0]
      assert.deepStrictEqual(Array.from(Option.getOrThrow(ArrowData.offsets(s)), Number), [0, 1, 1, 3])
      assert.deepStrictEqual(new TextDecoder().decode(s.buffers[1]), "abc")
      assert.strictEqual(built.reduce((sum, spy) => sum + spy.mock.calls.length, 0), 0)

      // A value is built when it is asked for, at the millisecond DateTime holds.
      const first = ArrowColumn.getUnsafe(at, 0) as DateTime.Zoned
      assert.strictEqual(DateTime.toEpochMillis(first), 1700000000123)
      assert.strictEqual(DateTime.zoneToString(first.zone), "Europe/Vienna")
      assert.strictEqual(ArrowColumn.getUnsafe(at, 1), null)
      assert.strictEqual(built.reduce((sum, spy) => sum + spy.mock.calls.length, 0), 1)
    } finally {
      built.forEach((spy) => spy.mockRestore())
    }
    assert.deepStrictEqual(ArrowColumn.toArray(DataFrame.column(readings, "rain")), [0, null, 2])
    assert.throws(
      () => DataFrame.column(frame as DataFrame.DataFrame<any>, "missing"),
      DataFrame.DataFrameError,
      `unknown column "missing"`
    )
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

    // DF-C024 (local policy): DataFrame.validate; pinned source in README.md.
    it("builds values only for the fields the schema constrains", () => {
      const Row = Schema.Struct({ t: Schema.DateTimeUtc, d: Schema.Duration, m: Schema.BigDecimal })
      const types = { m: ArrowSchema.decimal(18, 2) }
      const df = arrowFrame({
        t: [ArrowSchema.timestamp("millisecond"), [1n, 2n, 3n]],
        d: [ArrowSchema.duration("second"), [1n, 2n, 3n]],
        m: [ArrowSchema.decimal(9, 2), ["1.5", "2.5", "3.5"].map(BigDecimal.fromStringUnsafe)]
      })
      const row = { t: DateTime.makeUnsafe(1), d: Duration.seconds(1), m: BigDecimal.fromStringUnsafe("1.5") }
      const built = [vi.spyOn(InternalDateTime, "makeUtc"), vi.spyOn(Duration, "nanos"), vi.spyOn(BigDecimal, "make")]
      const counts = () => built.map((spy) => spy.mock.calls.length)
      try {
        assert.strictEqual(DataFrame.fromRows(Row, [row, row], { types }).length, 2)
        const validated = Result.getOrThrow(DataFrame.validate(df, Row, { types }))
        const table = Query.table("t", Row, { types }).pipe(Effect.provide(Catalog.layer({ t: Stream.make(df, df) })))
        assert.strictEqual(Effect.runSync(table).length, 6)
        assert.deepStrictEqual(counts(), [0, 0, 0])
        const After = Schema.Struct({
          ...Row.fields,
          t: Schema.DateTimeUtc.check(Schema.makeFilter((t) => DateTime.toEpochMillis(t) > 0))
        })
        assert.isTrue(Result.isSuccess(DataFrame.validate(df, After, { types })))
        assert.deepStrictEqual(counts(), [3, 0, 0])
        // Reading rows builds the values, which shows that the spies see them.
        const rows = DataFrame.toRows(validated)
        assert.deepStrictEqual(counts().map((n, i) => n > [3, 0, 0][i]), [true, true, true])
        assert.deepStrictEqual(rows[0], {
          t: DateTime.makeUnsafe(1),
          d: Duration.nanos(1_000_000_000n),
          m: BigDecimal.make(150n, 2)
        })
      } finally {
        for (const spy of built) spy.mockRestore()
      }
    })

    // DF-C025 (API contract): DataFrame.validate; pinned source in README.md.
    it("takes an Arrow schema, converting the frame to its columns", () => {
      const item = ArrowSchema.field("element", ArrowSchema.decimal(18, 2), { nullable: false })
      const schema = ArrowSchema.make([
        ArrowSchema.field("t", ArrowSchema.timestamp("second", "UTC")),
        ArrowSchema.field("n", ArrowSchema.int32, { nullable: false }),
        ArrowSchema.field("xs", ArrowSchema.list(item)),
        ArrowSchema.field("p", ArrowSchema.struct([ArrowSchema.field("s", ArrowSchema.utf8, { nullable: false })]))
      ])
      const frame = (n: number | null, unit: ArrowSchema.TimeUnit = "nanosecond", t = 1_000_000_000n) =>
        arrowFrame({
          extra: [ArrowSchema.bool, [true]],
          p: [ArrowSchema.struct([ArrowSchema.field("s", ArrowSchema.largeUtf8)]), [{ s: "a" }]],
          xs: [ArrowSchema.list(ArrowSchema.field("item", ArrowSchema.decimal(9, 1))), [[BigDecimal.make(15n, 1)]]],
          n: [ArrowSchema.int8, [n]],
          t: [ArrowSchema.timestamp(unit), [t]]
        })
      const validated = Result.getOrThrow(DataFrame.validate(frame(1), schema))
      assert.deepStrictEqual(
        validated.schema,
        ArrowSchema.make([
          ArrowSchema.field("t", ArrowSchema.timestamp("second")),
          schema.fields[1],
          ArrowSchema.field("xs", ArrowSchema.list({ ...item, name: "item" })),
          schema.fields[3]
        ])
      )
      assert.deepStrictEqual(frame(1).pipe(DataFrame.validate(schema), Result.getOrThrow), validated)
      assert.deepStrictEqual(DataFrame.toRows(validated), [{
        t: DateTime.makeUnsafe(1000),
        n: 1,
        xs: [BigDecimal.make(150n, 2)],
        p: { s: "a" }
      }])
      for (
        const [df, message] of [
          [frame(null), `column "n" has missing values`],
          // A finer unit converts only when no digit is lost (DF-C010 has the same for struct schemas).
          [frame(1, "millisecond", 1_500n), `column "t" has values that Timestamp[s] can't hold exactly`]
        ] as const
      ) {
        const result = DataFrame.validate(df, schema)
        assert.strictEqual(Result.isFailure(result) && result.failure.message, message)
      }
    })

    // DF-C027 (API contract): DataFrame.validate; pinned source in README.md.
    it("converts dates and times to the declared unit", () => {
      const schema = ArrowSchema.make([
        ArrowSchema.field("d", ArrowSchema.date("day")),
        ArrowSchema.field("at", ArrowSchema.time("microsecond"))
      ])
      const frame = (d: bigint | null, at: number | null) =>
        arrowFrame({
          d: [ArrowSchema.date("millisecond"), [d, null]],
          at: [ArrowSchema.time("millisecond"), [at, null]]
        })
      const source = frame(172_800_000n, 1_500)
      const validated = Result.getOrThrow(DataFrame.validate(source, schema))
      assert.deepStrictEqual(validated.schema, schema)
      assert.deepStrictEqual(DataFrame.toArray(validated, "d"), DataFrame.toArray(source, "d"))
      // A time reads as its count of the column's unit.
      assert.deepStrictEqual(DataFrame.toArray(validated, "at"), [1_500_000n, null])
      const result = DataFrame.validate(frame(172_800_001n, 1), schema)
      assert.strictEqual(
        Result.isFailure(result) && result.failure.message,
        `column "d" has values that Date can't hold exactly`
      )
    })

    // DF-C026 (API contract): DataFrame.validate; pinned source in README.md.
    it("rejects Arrow schemas with types a table can't declare", () => {
      const { field } = ArrowSchema
      const cases: ReadonlyArray<readonly [ArrowSchema.DataType, string]> = [
        [
          ArrowSchema.timestamp("second", "Europe/Berlin"),
          `column "c" has time zone Europe/Berlin, expected UTC timestamps`
        ],
        [ArrowSchema.interval("yearMonth"), `column "c": Interval columns can't be declared`],
        [ArrowSchema.float16, `column "c": Float16 columns can't be declared`],
        [
          ArrowSchema.map(field("k", ArrowSchema.utf8), field("v", ArrowSchema.int32)),
          `column "c": Map columns can't be declared`
        ],
        [
          ArrowSchema.dictionary(ArrowSchema.utf8),
          `column "c": Dictionary columns can't be declared: frames hold them as their value type`
        ],
        [ArrowSchema.largeUtf8, `column "c": LargeUtf8 columns can't be declared: frames hold them as Utf8`],
        [
          ArrowSchema.largeList(field("item", ArrowSchema.int32)),
          `column "c": LargeList columns can't be declared: frames hold them as List`
        ],
        [
          ArrowSchema.decimal(18, 2, 64),
          `column "c": 64-bit decimals can't be declared: declared decimals are 128-bit`
        ],
        [
          ArrowSchema.date("millisecond"),
          `column "c": dates in milliseconds can't be declared: declared dates are in days`
        ],
        [
          ArrowSchema.time("second"),
          `column "c": times in seconds can't be declared: declared times are in microseconds`
        ],
        [ArrowSchema.list(field("item", ArrowSchema.float16)), `column "c[]": Float16 columns can't be declared`],
        [
          ArrowSchema.struct([field("x", ArrowSchema.utf8View)]),
          `column "c.x": Utf8View columns can't be declared: frames hold them as Utf8`
        ]
      ]
      for (const [type, message] of cases) {
        const result = DataFrame.validate(readings, ArrowSchema.make([field("c", type)]))
        assert.strictEqual(Result.isFailure(result) && result.failure.message, message)
      }
      const notNull = DataFrame.validate(
        readings,
        ArrowSchema.make([field("c", ArrowSchema.nullType, { nullable: false })])
      )
      assert.strictEqual(Result.isFailure(notNull) && notNull.failure.message, `column "c": Null columns are nullable`)
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
