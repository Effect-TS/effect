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
  ["runEndEncoded lists that print alike", S.runEndEncoded(S.int32, S.field("v", S.list(item(S.utf8)))), [["a,sb"], [
    "a",
    "b"
  ]]],
  ["dictionary", S.dictionary(S.utf8), ["x", "y", "x", null]],
  ["dictionary of lists that print alike", S.dictionary(S.list(item(S.utf8))), [["a,sb"], ["a", "b"]]],
  ["dictionary of structs that print alike", S.dictionary(S.struct([S.field("a", S.utf8), S.field("b", S.utf8)])), [
    { a: "x,\"b\":sy", b: "z" },
    { a: "x", b: "y,\"b\":sz" }
  ]]
]

const twoInts = [S.field("a", S.int32), S.field("b", S.int32)]

const rejections: ReadonlyArray<
  readonly [label: string, field: S.Field, values: ReadonlyArray<unknown>, path: ReadonlyArray<number>]
> = [
  ["out of range", S.field("n", S.int8), [1, 300], [1]],
  ["negative unsigned", S.field("n", S.uint64), [-1n], [0]],
  ["not an integer", S.field("n", S.int32), [1.5], [0]],
  ["null in a non-nullable field", S.field("n", S.int32, { nullable: false }), [1, null], [1]],
  ["wrong kind", S.field("s", S.utf8), ["a", 1], [1]],
  ["more decimal places than the scale", S.field("d", S.decimal(5, 2)), [dec("1.234")], [0]],
  ["wrong byte width", S.field("b", S.fixedSizeBinary(2)), [bytes(1)], [0]],
  ["wrong list size", S.field("l", S.fixedSizeList(item(S.int8), 2)), [[1]], [0]],
  ["no union member accepts it", S.field("u", S.union("sparse", [S.field("int", S.int32)])), ["s"], [0]],
  ["duplicate union type ids", S.field("u", S.union("sparse", twoInts, [0, 0])), [ArrowColumn.unionValue(0, 5)], []],
  ["union type id above 127", S.field("u", S.union("dense", [S.field("a", S.int32)], [200])), [], []]
]

describe("ArrowColumn", () => {
  it("fromValues builds every type family and reads the values back", () => {
    for (const [label, type, values, read = values] of cases) {
      const column = Result.getOrThrow(ArrowColumn.fromValues(S.field("x", type), values))
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
