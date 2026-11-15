import { assert, describe, it } from "@effect/vitest"
import { assertEquals } from "@effect/vitest/utils"
import { BigDecimal, DateTime, Duration, Result } from "effect"
import { ArrowColumn, ArrowExtension, ArrowSchema as S } from "effect/arrow"

const bytes = (...values: Array<number>) => new Uint8Array(values)
const text = (value: string) => new TextEncoder().encode(value)
const dec = BigDecimal.fromStringUnsafe
const utc = (input: string | number) => DateTime.makeUnsafe(input)
const paris = (millis: number) => DateTime.makeZonedUnsafe(millis, { timeZone: "Europe/Paris" })
const item = (type: S.DataType) => S.field("item", type)
const intMap = S.map(S.field("key", S.utf8), S.field("value", S.int32))

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
  ["map", S.map(S.field("key", S.utf8), S.field("value", S.int32)), [new Map([["k", 1]]), [["l", null]], null], [
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
  ["runEndEncoded", S.runEndEncoded(S.int16, S.field("values", S.utf8)), ["a", "a", null, "b"]],
  ["runEndEncoded from a sparse array", S.runEndEncoded(S.int16, S.field("values", S.utf8)), new Array(2), [
    null,
    null
  ]],
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
  ["map value", S.field("m", S.map(S.field("k", S.utf8), S.field("v", S.int8))), [
    new Map([["k", 1]]),
    new Map([["k", 2], ["l", 300]])
  ], [1, 1, 1]],
  ["null map key", S.field("m", S.map(S.field("k", S.utf8), S.field("v", S.int8))), [[["k", 1], [null, 2]]], [0, 1]],
  ["dense union member", S.field("u", S.union("dense", [S.field("s", int8Member)])), [{ a: 1 }, { a: 300 }], [1, "a"]],
  ["run-end encoded value", S.field("r", S.runEndEncoded(S.int16, S.field("v", S.int8))), [1, 1, 300], [2]],
  ["dictionary value", S.field("d", S.dictionary(int8Member)), [{ a: 1 }, { a: 1 }, { a: 300 }], [2, "a"]]
]

describe("ArrowColumn", () => {
  it("fromValues builds every type family and reads the values back", () => {
    for (const [label, type, values, read = values] of cases) {
      const column = Result.getOrThrow(ArrowColumn.fromValues(S.field("x", type), values, { extensions: [once] }))
      assert.strictEqual(column.length, values.length, label)
      assertEquals(ArrowColumn.toArray(column), read, label)
    }
  })

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
})
