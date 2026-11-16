import { assert, describe, it } from "@effect/vitest"
import { assertEquals } from "@effect/vitest/utils"
import { BigDecimal, DateTime, Duration, Option, Result } from "effect"
import { ArrowColumn, ArrowData, ArrowExtension, ArrowSchema as S } from "effect/arrow"

const bytes = (...values: Array<number>) => new Uint8Array(values)
const text = (value: string) => new TextEncoder().encode(value)
const dec = BigDecimal.fromStringUnsafe
const utc = (input: string | number) => DateTime.makeUnsafe(input)
const paris = (millis: number) => DateTime.makeZonedUnsafe(millis, { timeZone: "Europe/Paris" })
const item = (type: S.DataType) => S.field("item", type)
const intMap = S.map(S.field("key", S.utf8), S.field("value", S.int32))
const utf8Runs = S.runEndEncoded(S.int16, S.field("values", S.utf8))
const int8Map = S.field("m", S.map(S.field("k", S.utf8), S.field("v", S.int8)))

// An extension over int32 lists that fails when building encodes a value twice
const encoded = new WeakSet<object>()
const once = ArrowExtension.make({
  name: "test.once",
  decode: (items: ReadonlyArray<number>) => items,
  encode: (items: Iterable<number>) => {
    assert.isFalse(encoded.has(items), "a value was encoded twice")
    encoded.add(items)
    return Array.from(items)
  }
})
const onceList = S.field("xs", S.list(item(S.int32)), { metadata: ArrowExtension.metadata("test.once") })

// Values given to fromValues, and the values read back when they differ
const cases: ReadonlyArray<
  readonly [label: string, type: S.DataType, values: ReadonlyArray<unknown>, read?: ReadonlyArray<unknown>]
> = [
  ["null", S.nullType, [null, undefined], [null, null]],
  ["bool", S.bool, [true, false, null]],
  ["int8", S.int8, [-128, 127, null]],
  ["uint32 from bigint", S.uint32, [0, 4294967295, 7n], [0, 4294967295, 7]],
  ["int64 from number", S.int64, [-9223372036854775808n, 1, null], [-9223372036854775808n, 1n, null]],
  ["uint64", S.uint64, [18446744073709551615n, 0n]],
  ["float32", S.float32, [1.5, -0.25, null]],
  ["float64", S.float64, [0.1, -Infinity, null]],
  ["decimal32", S.decimal(9, 3, 32), [dec("-1.234"), dec("5")]],
  ["decimal128", S.decimal(10, 2), [dec("123.45"), dec("-0.5"), null]],
  ["decimal256", S.decimal(40, 0, 256), [dec("-123456789012345678901234567890")]],
  ["date (days)", S.date("day"), [utc("2024-01-02T00:00:00Z"), 19724, null], [
    utc("2024-01-02T00:00:00Z"),
    utc("2024-01-02T00:00:00Z"),
    null
  ]],
  ["date (milliseconds)", S.date("millisecond"), [utc("1969-12-31T00:00:00Z"), 86400000], [
    utc("1969-12-31T00:00:00Z"),
    utc("1970-01-02T00:00:00Z")
  ]],
  ["time32", S.time("second"), [3661, null]],
  ["time64", S.time("nanosecond"), [1n, 2], [1n, 2n]],
  ["timestamp", S.timestamp("nanosecond"), [1704164645678901234n, utc("1970-01-01T00:00:00Z")], [
    utc("2024-01-02T03:04:05.678Z"),
    utc("1970-01-01T00:00:00Z")
  ]],
  ["timestamp with time zone", S.timestamp("second", "Europe/Paris"), [paris(0), 60], [paris(0), paris(60000)]],
  // Outside the DateTime range (8.64e15 ms either side of 1970), the stored integer
  ["date (days) beyond DateTime", S.date("day"), [2147483647]],
  ["timestamp beyond DateTime", S.timestamp("millisecond"), [9e15], [9000000000000000n]],
  ["duration", S.duration("millisecond"), [Duration.seconds(1), 5n, null], [
    Duration.seconds(1),
    Duration.millis(5),
    null
  ]],
  ["interval (yearMonth)", S.interval("yearMonth"), [{ months: 14 }, null]],
  ["interval (dayTime)", S.interval("dayTime"), [{ days: 1, milliseconds: -2 }]],
  ["interval (monthDayNano)", S.interval("monthDayNano"), [{ months: 1, days: 2, nanoseconds: 3n }]],
  ["binary", S.binary, [bytes(0, 1), bytes(), null]],
  ["largeBinary", S.largeBinary, [bytes(255), null]],
  ["binaryView", S.binaryView, [text("short"), text("more than twelve bytes"), null]],
  ["fixedSizeBinary", S.fixedSizeBinary(2), [bytes(1, 2), null]],
  ["utf8", S.utf8, ["a", "", "héllo", null]],
  ["utf8 from a sparse array", S.utf8, Object.assign(new Array(3), { 0: "a", 2: "b" }), ["a", null, "b"]],
  ["largeUtf8", S.largeUtf8, ["日本", null]],
  ["utf8View", S.utf8View, ["short", "a string longer than twelve bytes", null]],
  ["list", S.list(item(S.int32)), [[1, null], [], null]],
  ["largeList", S.largeList(item(S.utf8)), [["a"], null]],
  ["listView", S.listView(item(S.int32)), [[1, 2], [], null]],
  ["largeListView", S.largeListView(item(S.int8)), [[3], null]],
  ["fixedSizeList", S.fixedSizeList(item(S.int16), 2), [[1, null], null]],
  ["struct", S.struct([S.field("a", S.int32), S.field("b", S.utf8)]), [{ a: 1, b: "x" }, { a: null }, null], [
    { a: 1, b: "x" },
    { a: null, b: null },
    null
  ]],
  ["struct with repeated names, by position", S.struct([S.field("a", S.int32), S.field("a", S.utf8)]), [[1, "s"]], [{
    a: "s"
  }]],
  ["map", intMap, [new Map([["k", 1]]), [["l", null]], null], [
    new Map([["k", 1]]),
    new Map([["l", null]]),
    null
  ]],
  ["sparse union", S.union("sparse", [S.field("int", S.int32), S.field("str", S.utf8)]), [
    1,
    "s",
    ArrowColumn.unionValue(1, "t")
  ], [1, "s", "t"]],
  ["dense union", S.union("dense", [S.field("int", S.int32), S.field("float", S.float64)], [3, 7]), [
    1,
    1.5,
    ArrowColumn.unionValue(7, 2)
  ], [1, 1.5, 2]],
  ["runEndEncoded", utf8Runs, ["a", "a", null, "b"]],
  ["runEndEncoded from a sparse array", utf8Runs, new Array(2), [null, null]],
  ["runEndEncoded lists that print alike", S.runEndEncoded(S.int32, S.field("v", S.list(item(S.utf8)))), [["a,sb"], [
    "a",
    "b"
  ]]],
  ["dictionary", S.dictionary(S.utf8), ["x", "y", "x", null]],
  ["dictionary of lists that print alike", S.dictionary(S.list(item(S.utf8))), [["a,sb"], ["a", "b"]]],
  ["dictionary of structs that print alike", S.dictionary(S.struct([S.field("a", S.utf8), S.field("b", S.utf8)])), [
    { a: "x,\"b\":sy", b: "z" },
    { a: "x", b: "y,\"b\":sz" }
  ]],
  // Equal values are found in every form the builder reads
  ["dictionary of maps given as iterables", S.dictionary(intMap), [new Set([["k", 1]]), new Set([["k", 2]])], [
    new Map([["k", 1]]),
    new Map([["k", 2]])
  ]],
  ["runEndEncoded maps given as iterables", S.runEndEncoded(S.int16, S.field("v", intMap)), [
    new Set([["k", 1]]),
    new Set([["k", 2]])
  ], [new Map([["k", 1]]), new Map([["k", 2]])]],
  ["dictionary of lists with holes", S.dictionary(S.list(item(S.int32))), [[], new Array(1)], [[], [null]]],
  ["dictionary of lists given as one-shot iterables", S.dictionary(S.list(item(S.int32))), [
    [1].values(),
    [1].values(),
    [2].values()
  ], [[1], [1], [2]]],
  // Keying and building read the same encoded value
  ["runEndEncoded extension values", S.runEndEncoded(S.int16, onceList), [
    [1, 2].values(),
    [1, 2].values(),
    [3].values()
  ], [[1, 2], [1, 2], [3]]],
  ["dictionary of structs with an extension member", S.dictionary(S.struct([onceList])), [
    { xs: [1, 2].values() },
    { xs: [1, 2].values() }
  ], [{ xs: [1, 2] }, { xs: [1, 2] }]],
  ["runEndEncoded unions of extension values", S.runEndEncoded(S.int16, S.field("v", S.union("dense", [onceList]))), [
    ArrowColumn.unionValue(0, [1].values()),
    ArrowColumn.unionValue(0, [1].values())
  ], [[1], [1]]],
  ["dictionary of maps with extension values", S.dictionary(S.map(S.field("key", S.utf8), onceList)), [
    [["k", [1].values()]],
    [["k", [1].values()]]
  ], [new Map([["k", [1]]]), new Map([["k", [1]]])]]
]

const int8Member = S.struct([S.field("a", S.int8)])
const nonNullInt = S.field("a", S.int32, { nullable: false })
const twoInts = [S.field("a", S.int32), S.field("b", S.int32)]

const rejections: ReadonlyArray<
  readonly [label: string, field: S.Field, values: ReadonlyArray<unknown>, path: ReadonlyArray<string | number>]
> = [
  ["out of range", S.field("n", S.int8), [1, 300], [1]],
  ["negative unsigned", S.field("n", S.uint64), [-1n], [0]],
  ["not an integer", S.field("n", S.int32), [1.5], [0]],
  ["null in a non-nullable field", S.field("n", S.int32, { nullable: false }), [1, null], [1]],
  // Only the slots of valid parents and selected union members must not be null
  ["null in a non-nullable struct member", S.field("s", S.struct([nonNullInt])), [null, { a: null }], [1, "a"]],
  ["null in a non-nullable list item", S.field("l", S.fixedSizeList(nonNullInt, 1)), [null, [null]], [1, 0]],
  ["null in a non-nullable sparse union member", S.field("u", S.union("sparse", [S.field("s", S.utf8), nonNullInt])), [
    "s",
    ArrowColumn.unionValue(1, null)
  ], [1]],
  ["wrong kind", S.field("s", S.utf8), ["a", 1], [1]],
  ["more decimal places than the scale", S.field("d", S.decimal(5, 2)), [dec("1.234")], [0]],
  ["wrong byte width", S.field("b", S.fixedSizeBinary(2)), [bytes(1)], [0]],
  ["wrong list size", S.field("l", S.fixedSizeList(item(S.int8), 2)), [[1]], [0]],
  ["no union member accepts it", S.field("u", S.union("sparse", [S.field("int", S.int32)])), ["s"], [0]],
  ["duplicate union type ids", S.field("u", S.union("sparse", twoInts, [0, 0])), [ArrowColumn.unionValue(0, 5)], []],
  ["union type id above 127", S.field("u", S.union("dense", [S.field("a", S.int32)], [200])), [], []],
  // Temporal storage is int32 or int64
  ["timestamp beyond int64", S.field("t", S.timestamp("millisecond")), [1, 1n << 64n], [1]],
  ["DateTime beyond int64 nanoseconds", S.field("t", S.timestamp("nanosecond")), [utc("2300-01-01T00:00:00Z")], [0]],
  ["date (days) beyond int32", S.field("d", S.date("day")), [2 ** 32], [0]],
  ["time32 beyond int32", S.field("t", S.time("second")), [2 ** 32], [0]],
  ["duration beyond int64", S.field("d", S.duration("nanosecond")), [Duration.nanos(1n << 64n)], [0]],
  ["interval nanoseconds beyond int64", S.field("i", S.interval("monthDayNano")), [{ nanoseconds: 1n << 64n }], [
    0,
    "nanoseconds"
  ]],
  // Nested values are located by row, then member name or item index
  ["list item", S.field("l", S.list(item(S.int8))), [[1], null, [], [2, 300]], [3, 1]],
  ["largeListView item", S.field("l", S.largeListView(item(S.int8))), [[1], [2, 300]], [1, 1]],
  ["fixed-size list item", S.field("l", S.fixedSizeList(item(S.int8), 2)), [[1, 2], [3, 300]], [1, 1]],
  ["struct member", S.field("s", int8Member), [{ a: 1 }, { a: 300 }], [1, "a"]],
  ["map value", int8Map, [
    new Map([["k", 1]]),
    new Map([["k", 2], ["l", 300]])
  ], [1, 1, 1]],
  ["null map key", int8Map, [[["k", 1], [null, 2]]], [0, 1]],
  ["dense union member", S.field("u", S.union("dense", [S.field("s", int8Member)])), [{ a: 1 }, { a: 300 }], [1, "a"]],
  ["run-end encoded value", S.field("r", S.runEndEncoded(S.int16, S.field("v", S.int8))), [1, 1, 300], [2]],
  ["dictionary value", S.field("d", S.dictionary(int8Member)), [{ a: 1 }, { a: 1 }, { a: 300 }], [2, "a"]]
]

// Values given to fromValues, the typed array `ArrowData.values` returns and the number each slot holds when it differs
const native: ReadonlyArray<
  readonly [
    label: string,
    type: S.DataType,
    values: ReadonlyArray<unknown>,
    array: new() => ArrowData.Values,
    stored?: ReadonlyArray<unknown>
  ]
> = [
  ["int8", S.int8, [-128, null, 127], Int8Array],
  ["uint8", S.uint8, [0, null, 255], Uint8Array],
  ["int16", S.int16, [-32768, null, 32767], Int16Array],
  ["uint16", S.uint16, [0, null, 65535], Uint16Array],
  ["int32", S.int32, [-2147483648, null, 7], Int32Array],
  ["uint32", S.uint32, [4294967295, null, 1], Uint32Array],
  ["int64", S.int64, [-9223372036854775808n, null, 1n], BigInt64Array],
  ["uint64", S.uint64, [18446744073709551615n, null, 1n], BigUint64Array],
  ["float32", S.float32, [1.5, null, -0.25], Float32Array],
  ["float64", S.float64, [0.1, null, -Infinity], Float64Array],
  ["date (days)", S.date("day"), [utc("2024-01-02T00:00:00Z"), null, -1], Int32Array, [19724, null, -1]],
  ["date (milliseconds)", S.date("millisecond"), [utc("1970-01-02T00:00:00Z"), null, -1], BigInt64Array, [
    86400000n,
    null,
    -1n
  ]],
  ["time32", S.time("second"), [3661, null, 1], Int32Array],
  ["time64", S.time("nanosecond"), [3661000000001n, null, 1n], BigInt64Array],
  ["timestamp", S.timestamp("nanosecond", "Europe/Paris"), [1704164645678901234n, null, -1n], BigInt64Array],
  ["duration", S.duration("microsecond"), [Duration.millis(1500), null, -1n], BigInt64Array, [1500000n, null, -1n]],
  ["decimal32", S.decimal(9, 3, 32), [dec("-1.234"), null, dec("5")], Int32Array, [-1234, null, 5000]],
  ["decimal64", S.decimal(18, 2, 64), [dec("123.45"), null, dec("-0.01")], BigInt64Array, [12345n, null, -1n]],
  ["interval (yearMonth)", S.interval("yearMonth"), [{ months: 14 }, null, { months: -1 }], Int32Array, [14, null, -1]]
]

// Values given to fromValues, the typed array `ArrowData.offsets` returns and the size of each slot it bounds
const offsetCases: ReadonlyArray<
  readonly [
    label: string,
    type: S.DataType,
    values: ReadonlyArray<unknown>,
    array: new() => Int32Array | BigInt64Array,
    sizes: ReadonlyArray<unknown>
  ]
> = [
  ["utf8", S.utf8, ["a", null, "héllo", ""], Int32Array, [1, null, 6, 0]],
  ["largeUtf8", S.largeUtf8, ["a", null, "héllo", ""], BigInt64Array, [1, null, 6, 0]],
  ["binary", S.binary, [bytes(0, 1), null, bytes()], Int32Array, [2, null, 0]],
  ["largeBinary", S.largeBinary, [bytes(0, 1), null, bytes()], BigInt64Array, [2, null, 0]],
  ["list", S.list(item(S.int32)), [[1, 2], null, [], [3]], Int32Array, [2, null, 0, 1]],
  ["largeList", S.largeList(item(S.int32)), [[1, 2], null, [], [3]], BigInt64Array, [2, null, 0, 1]],
  ["map", intMap, [new Map([["k", 1]]), null, new Map([["l", 2], ["m", 3]])], Int32Array, [1, null, 2]]
]

// The number each slot holds, through `ArrowData.values`. Null slots hold unspecified numbers.
const stored = (data: ArrowData.ArrowData) =>
  Array.from<number | bigint, unknown>(
    Option.getOrThrow(ArrowData.values(data)),
    (v, i) => ArrowData.isValid(data, i) ? v : null
  )

// The size of each slot, through `ArrowData.offsets`
const sizes = (data: ArrowData.ArrowData) => {
  const offsets = Option.getOrThrow(ArrowData.offsets(data))
  return Array.from(
    { length: data.length },
    (_, i) => ArrowData.isValid(data, i) ? Number(offsets[i + 1]) - Number(offsets[i]) : null
  )
}

const build = (type: S.DataType, values: ReadonlyArray<unknown>) =>
  Result.getOrThrow(ArrowColumn.fromValues(S.field("x", type), values))
// Values given to fromValues, and what they read as with `representation: "storage"` when it differs
const storageCases: ReadonlyArray<
  readonly [label: string, type: S.DataType, values: ReadonlyArray<unknown>, storage?: ReadonlyArray<unknown>]
> = [
  ["date (days)", S.date("day"), [utc("2024-01-02T00:00:00Z"), null], [19724, null]],
  ["date (milliseconds)", S.date("millisecond"), [utc("1970-01-02T00:00:00Z"), null], [86400000n, null]],
  ["timestamp", S.timestamp("second"), [utc("1970-01-01T00:01:00Z"), null], [60n, null]],
  ["timestamp with time zone", S.timestamp("millisecond", "Europe/Paris"), [paris(60000), null], [60000n, null]],
  // Beyond the DateTime range and beyond what a millisecond count keeps
  ["timestamp (nanoseconds)", S.timestamp("nanosecond"), [9223372036854775807n, -1n]],
  ["duration", S.duration("microsecond"), [Duration.millis(1500), null], [1500000n, null]],
  // A calendar interval is not an elapsed duration: it keeps its members
  ["interval (yearMonth)", S.interval("yearMonth"), [{ months: 14 }]],
  ["interval (monthDayNano)", S.interval("monthDayNano"), [{ months: 1, days: 2, nanoseconds: 3n }]],
  ["time32", S.time("second"), [3661, null]],
  // The unscaled value; the scale stays on the type
  ["decimal32", S.decimal(9, 3, 32), [dec("-1.234"), dec("5"), null], [-1234n, 5000n, null]],
  ["decimal64", S.decimal(18, 2, 64), [dec("123.45")], [12345n]],
  ["decimal128", S.decimal(10, 2), [dec("123.45"), dec("-0.5")], [12345n, -50n]],
  ["decimal256", S.decimal(40, 0, 256), [dec("-123456789012345678901234567890")], [-123456789012345678901234567890n]],
  ["utf8", S.utf8, ["a", null]],
  // Nested values are storage values too
  ["list", S.list(item(S.duration("second"))), [[Duration.seconds(1), null]], [[1n, null]]],
  ["struct", S.struct([S.field("at", S.date("day"))]), [{ at: utc("1970-01-02T00:00:00Z") }], [{ at: 1 }]],
  ["map", S.map(S.field("key", S.utf8), S.field("value", S.decimal(5, 1))), [new Map([["k", dec("1.5")]])], [
    new Map([["k", 15n]])
  ]],
  ["union", S.union("dense", [S.field("t", S.timestamp("second"))]), [utc("1970-01-01T00:00:01Z")], [1n]],
  ["runEndEncoded", S.runEndEncoded(S.int16, S.field("v", S.duration("second"))), [Duration.seconds(2), 2n], [2n, 2n]],
  ["dictionary", S.dictionary(S.timestamp("nanosecond")), [5n, 5n, null, 1000001n]]
]
describe("ArrowColumn", () => {
  // ARROW-LAYOUT-001 (normative): Columnar.rst, Validity bitmaps / Fixed-size Primitive Layout.
  // Source pin and scope: ./CONFORMANCE.md#sources
  it("reads the specification int32 bitmap example with nonzero masked bytes", () => {
    const data = ArrowData.make({
      type: S.int32,
      length: 5,
      nullCount: 1,
      validity: bytes(0x1d),
      buffers: [bytes(1, 0, 0, 0, 255, 255, 255, 255, 2, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0)]
    })
    const field = S.field("x", S.int32)
    assert.deepStrictEqual(ArrowColumn.toArray(ArrowColumn.make(field, [data])), [1, null, 2, 4, 8])
    assert.deepStrictEqual(ArrowColumn.toArray(ArrowColumn.make(field, [ArrowData.slice(data, 1, 4)])), [null, 2, 4])
    // Zero-null arrays can either omit or retain the bitmap.
    for (const validity of [undefined, bytes(0x1f)]) {
      const valid = ArrowData.make({ type: S.int32, length: 5, validity, buffers: data.buffers })
      assert.deepStrictEqual(ArrowColumn.toArray(ArrowColumn.make(field, [valid])), [1, -1, 2, 4, 8])
    }
  })

  // ARROW-COLUMN-001 (local regression): value conversions and nested builders; not an independent wire oracle.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("fromValues builds every type family and reads the values back", () => {
    for (const [label, type, values, read = values] of cases) {
      const column = Result.getOrThrow(ArrowColumn.fromValues(S.field("x", type), values, { extensions: [once] }))
      assert.strictEqual(column.length, values.length, label)
      assertEquals(ArrowColumn.toArray(column), read, label)
    }
  })

  // ARROW-COLUMN-002 (mixed): Schema.fbs type constraints; local rejection paths and input policy.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("fromValues fails with an ArrowBuildError locating a value that does not fit", () => {
    for (const [label, field, values, path] of rejections) {
      const result = ArrowColumn.fromValues(field, values)
      assert.isTrue(Result.isFailure(result), label)
      if (Result.isFailure(result)) {
        assert.isTrue(ArrowColumn.isArrowBuildError(result.failure), label)
        assert.deepStrictEqual(result.failure.path, path, label)
      }
    }
  })

  // ARROW-COLUMN-003 (local): extension callbacks and storage fallback.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("extensions encode values when building and decode them when reading", () => {
    const hex = ArrowExtension.make({
      name: "test.hex",
      decode: (n: number, prefix) => prefix + n.toString(16),
      encode: (s: string, prefix) => parseInt(s.slice(prefix.length), 16)
    })
    const field = S.field("n", S.int32, { metadata: ArrowExtension.metadata("test.hex", "0x") })
    const column = Result.getOrThrow(ArrowColumn.fromValues(field, ["0xff", null], { extensions: [hex] }))

    assert.deepStrictEqual(ArrowColumn.toArray(column), ["0xff", null])
    // Without the extension, the storage values
    assert.deepStrictEqual(ArrowColumn.toArray(ArrowColumn.make(field, column.chunks)), [255, null])
  })

  // ARROW-DATA-001 (local): typed views of the values buffer; slot, offset and alignment handling.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("values reads one number per slot of fixed-width arrays, also when sliced or unaligned", () => {
    for (const [label, type, values, array, expected = values] of native) {
      const [data] = build(type, values).chunks
      assert.instanceOf(Option.getOrThrow(ArrowData.values(data)), array, label)
      assert.deepStrictEqual(stored(data), expected, label)
      assert.deepStrictEqual(stored(ArrowData.slice(data, 1)), expected.slice(1), label)
    }
    // Dictionary arrays give their indices, in the index type
    const [encoded] = build(S.dictionary(S.utf8, { indexType: S.int8 }), ["x", null, "y", "x"]).chunks
    const entries = ArrowColumn.toArray(ArrowColumn.make(S.field("x", S.utf8), [encoded.dictionary!]))
    assert.instanceOf(Option.getOrThrow(ArrowData.values(encoded)), Int8Array)
    assert.deepStrictEqual(stored(encoded).map((i) => i === null ? null : entries[i as number]), ["x", null, "y", "x"])

    // Literal int32 values [1, 2, 3]: an aligned buffer is viewed in place, an unaligned one is copied
    const raw = bytes(9, 9, 9, 9, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0)
    const aligned = ArrowData.make({ type: S.int32, length: 2, offset: 1, buffers: [raw.subarray(4)] })
    const view = Option.getOrThrow(ArrowData.values(aligned))
    assert.deepStrictEqual(view, Int32Array.of(2, 3))
    assert.strictEqual(view.buffer, raw.buffer)
    assert.strictEqual(view.byteOffset, 8)
    const odd = bytes(9, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0).subarray(1)
    const unaligned = ArrowData.make({ type: S.int32, length: 2, offset: 1, buffers: [odd] })
    assert.deepStrictEqual(ArrowData.values(unaligned), Option.some(Int32Array.of(2, 3)))

    assert.deepStrictEqual(ArrowData.values(build(S.float64, []).chunks[0]), Option.some(new Float64Array(0)))
    for (
      const [type, values] of [
        [S.nullType, [null]],
        [S.bool, [true]],
        [S.float16, [1.5]],
        [S.decimal(10, 2), [dec("1")]],
        [S.interval("dayTime"), [{ days: 1 }]],
        [S.interval("monthDayNano"), [{ months: 1 }]],
        [S.fixedSizeBinary(4), [bytes(1, 2, 3, 4)]],
        [S.utf8, ["a"]],
        [S.utf8View, ["a"]],
        [S.list(item(S.int32)), [[1]]],
        [S.struct([S.field("a", S.int32)]), [{ a: 1 }]],
        [S.union("dense", [S.field("a", S.int32)]), [1]],
        [S.runEndEncoded(S.int16, S.field("v", S.int32)), [1]]
      ] as const
    ) {
      assert.deepStrictEqual(ArrowData.values(build(type, values).chunks[0]), Option.none(), type._tag)
    }
  })

  // ARROW-DATA-002 (local): typed views of the offsets buffer; slot, offset and alignment handling.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("offsets bounds each slot of variable-size arrays, also when sliced or unaligned", () => {
    for (const [label, type, values, array, expected] of offsetCases) {
      const [data] = build(type, values).chunks
      const offsets = Option.getOrThrow(ArrowData.offsets(data))
      assert.instanceOf(offsets, array, label)
      assert.strictEqual(offsets.length, values.length + 1, label)
      assert.deepStrictEqual(sizes(data), expected, label)
      assert.deepStrictEqual(sizes(ArrowData.slice(data, 1)), expected.slice(1), label)
    }
    // Literal offsets [0, 1, 3, 3] at an odd address: slot 1 of ["a", "bc", ""] is bytes 1..3
    const raw = bytes(9, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0)
    const strings = ArrowData.make({ type: S.utf8, length: 3, buffers: [raw.subarray(1), text("abc")] })
    assert.deepStrictEqual(ArrowData.offsets(strings), Option.some(Int32Array.of(0, 1, 3, 3)))
    assert.deepStrictEqual(ArrowData.offsets(ArrowData.slice(strings, 1, 2)), Option.some(Int32Array.of(1, 3)))

    // An empty array may have an empty offsets buffer
    const empty = ArrowData.make({ type: S.largeUtf8, length: 0, buffers: [bytes(), bytes()] })
    assert.deepStrictEqual(ArrowData.offsets(empty), Option.some(BigInt64Array.of(0n)))
    for (
      const [type, values] of [
        [S.int32, [1]],
        [S.utf8View, ["a"]],
        [S.listView(item(S.int32)), [[1]]],
        [S.fixedSizeList(item(S.int32), 1), [[1]]],
        [S.union("dense", [S.field("a", S.int32)]), [1]],
        [S.dictionary(S.utf8), ["a"]]
      ] as const
    ) {
      assert.deepStrictEqual(ArrowData.offsets(build(type, values).chunks[0]), Option.none(), type._tag)
    }
  })

  // ARROW-COLUMN-004 (local): the storage representation of every reader, and what it leaves alone.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("reads storage values when asked, through every reader", () => {
    for (const [label, type, values, expected = values] of storageCases) {
      const column = ArrowColumn.make(S.field("x", type), build(type, values).chunks, { representation: "storage" })
      assert.deepStrictEqual(ArrowColumn.toArray(column), expected, label)
      assert.deepStrictEqual(expected.map((_, i) => ArrowColumn.getUnsafe(column, i)), expected, label)
      assert.deepStrictEqual(ArrowColumn.get(column, 0), Option.some(expected[0]), label)
    }
  })

  // ARROW-COLUMN-005 (local): exact nanoseconds in storage and in the buffers; default reads are unchanged.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("keeps every digit of a nanosecond timestamp in storage reads and in the values buffer", () => {
    const field = S.field("at", S.dictionary(S.timestamp("nanosecond", "Europe/Paris")))
    const nanos = [1704164645678901234n, -1n, null, 1704164645678901234n]
    const { chunks } = Result.getOrThrow(ArrowColumn.fromValues(field, nanos))
    const domain = [paris(1704164645678), paris(-1), null, paris(1704164645678)]

    // Reads of one dictionary in both representations do not share decoded values
    assertEquals(ArrowColumn.toArray(ArrowColumn.make(field, chunks)), domain)
    // The value type is known here, so the column can say so
    const exact = ArrowColumn.make(field, chunks, { representation: "storage" }) as ArrowColumn.ArrowColumn<bigint>
    const first: bigint | null = ArrowColumn.getUnsafe(exact, 0)
    assert.strictEqual(first, 1704164645678901234n)
    assert.deepStrictEqual(ArrowColumn.toArray(exact), nanos)
    assertEquals(ArrowColumn.toArray(ArrowColumn.make(field, chunks)), domain)

    const entries = ArrowData.values(chunks[0].dictionary!)
    assert.deepStrictEqual(entries, Option.some(BigInt64Array.of(1704164645678901234n, -1n)))
  })

  // ARROW-COLUMN-006 (local): extension decode is skipped in the storage representation.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("does not decode extension values in the storage representation", () => {
    let decoded = 0
    const hex = ArrowExtension.make({
      name: "test.hex",
      decode: (n: number) => {
        decoded++
        return n.toString(16)
      },
      encode: (s: string) => parseInt(s, 16)
    })
    const member = S.field("n", S.int32, { metadata: ArrowExtension.metadata("test.hex") })
    const field = S.field("s", S.struct([member]))
    const { chunks } = Result.getOrThrow(ArrowColumn.fromValues(field, [{ n: "ff" }], { extensions: [hex] }))

    const storage = ArrowColumn.make(field, chunks, { extensions: [hex], representation: "storage" })
    assert.deepStrictEqual(ArrowColumn.toArray(storage), [{ n: 255 }])
    assert.strictEqual(decoded, 0)
    assert.deepStrictEqual(ArrowColumn.toArray(ArrowColumn.make(field, chunks, { extensions: [hex] })), [{ n: "ff" }])
    assert.strictEqual(decoded, 1)
  })
})
