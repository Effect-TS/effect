import { assert, describe, it } from "@effect/vitest"
import { assertEquals } from "@effect/vitest/utils"
import { BigDecimal, DateTime, Duration, Effect, Option, Result, Stream } from "effect"
import { ArrowColumn, ArrowData, ArrowIpc, ArrowSchema as S, ArrowTable } from "effect/arrow"
import { FlatBuffers } from "effect/encoding"
import { readFileSync } from "node:fs"

// Written by pyarrow; see fixtures/arrow/generate.py
const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`../fixtures/arrow/${name}`, import.meta.url)))
const streamBytes = fixture("types.arrows")
const deltaBytes = fixture("deltas.arrows")
const fileBytes = fixture("types.arrow")

const bytes = (...values: Array<number>) => new Uint8Array(values)
const text = (value: string) => new TextEncoder().encode(value)
const dec = BigDecimal.fromStringUnsafe
const utc = (iso: string) => DateTime.makeUnsafe(iso)
const tokyo = (iso: string) => DateTime.makeZonedUnsafe(iso, { timeZone: "Asia/Tokyo" })
const item = (type: S.DataType) => S.field("item", type)

// The columns generate.py writes, as pyarrow describes them, with the values the readers document
const columns: ReadonlyArray<readonly [name: string, type: S.DataType, values: ReadonlyArray<unknown>]> = [
  ["null", S.nullType, [null, null, null, null, null]],
  ["bool", S.bool, [true, null, false, true, false]],
  ["int8", S.int8, [-128, null, 0, 1, 127]],
  ["uint8", S.uint8, [0, 255, null, 1, 2]],
  ["int16", S.int16, [-32768, 32767, null, 0, -1]],
  ["uint16", S.uint16, [65535, null, 0, 1, 2]],
  ["int32", S.int32, [-2147483648, null, 2147483647, 0, 7]],
  ["uint32", S.uint32, [4294967295, 0, null, 1, 2]],
  ["int64", S.int64, [-9223372036854775808n, null, 9223372036854775807n, 0n, 42n]],
  ["uint64", S.uint64, [18446744073709551615n, 0n, null, 1n, 2n]],
  ["float32", S.float32, [1.5, null, -0.25, 0, 1024]],
  ["float64", S.float64, [0.1, -2.5, null, 1e300, 3]],
  ["decimal128", S.decimal(10, 2), [dec("123.45"), dec("-0.01"), null, dec("99999999.99"), dec("0")]],
  ["date32", S.date("day"), [
    utc("2024-01-02T00:00:00Z"),
    null,
    utc("1969-12-31T00:00:00Z"),
    utc("1970-01-01T00:00:00Z"),
    utc("2000-02-29T00:00:00Z")
  ]],
  ["date64", S.date("millisecond"), [
    utc("1970-01-02T00:00:00Z"),
    null,
    utc("1969-12-31T00:00:00Z"),
    utc("1970-01-01T00:00:00Z"),
    utc("2000-02-29T00:00:00Z")
  ]],
  ["time32s", S.time("second"), [0, 3661, null, 86399, 1]],
  ["time32ms", S.time("millisecond"), [0, 3661001, null, 86399999, 1]],
  ["time64us", S.time("microsecond"), [0n, 3661000001n, null, 86399999999n, 1n]],
  ["time64ns", S.time("nanosecond"), [0n, 3661000000001n, null, 86399999999999n, 1n]],
  ["timestampTz", S.timestamp("millisecond", "Asia/Tokyo"), [
    tokyo("2024-01-02T03:04:05.678Z"),
    null,
    tokyo("1970-01-01T00:00:00.000Z"),
    tokyo("1969-12-31T23:59:59.999Z"),
    tokyo("1970-01-01T00:00:00.001Z")
  ]],
  ["timestampNs", S.timestamp("nanosecond"), [
    utc("2024-01-02T03:04:05.678Z"),
    utc("1969-12-31T23:59:59.999Z"),
    null,
    utc("1970-01-01T00:00:00.000Z"),
    utc("1970-01-01T00:00:00.000Z")
  ]],
  ["durationUs", S.duration("microsecond"), [
    Duration.millis(1500),
    Duration.micros(-1n),
    null,
    Duration.zero,
    Duration.micros(9223372036854775807n)
  ]],
  ["interval", S.interval("monthDayNano"), [
    { months: 1, days: 2, nanoseconds: 3n },
    null,
    { months: -1, days: -2, nanoseconds: -3n },
    { months: 0, days: 0, nanoseconds: 0n },
    { months: 12, days: 31, nanoseconds: 86400000000000n }
  ]],
  ["utf8", S.utf8, ["a", null, "", "héllo", "x"]],
  ["largeUtf8", S.largeUtf8, ["b", "", null, "日本", "y"]],
  ["utf8View", S.utf8View, ["short", null, "a string longer than twelve bytes", "", "z"]],
  ["binary", S.binary, [bytes(0, 1), null, bytes(), bytes(255), text("ab")]],
  ["largeBinary", S.largeBinary, [bytes(), bytes(2), null, text("cd"), text("e")]],
  ["fixedBinary", S.fixedSizeBinary(3), [text("abc"), null, bytes(0, 0, 0), text("xyz"), text("123")]],
  ["binaryView", S.binaryView, [text("tiny"), null, text("more than twelve bytes!"), bytes(), text("q")]],
  ["list", S.list(item(S.int32)), [[1, 2], null, [], [null, 3], [4]]],
  ["largeList", S.largeList(item(S.utf8)), [["a"], [], null, ["b", null], ["c", "d"]]],
  ["listView", S.listView(item(S.int32)), [[1], [2, 3], null, [], [4, 5, 6]]],
  ["fixedList", S.fixedSizeList(item(S.int16), 2), [[1, 2], null, [3, null], [5, 6], [7, 8]]],
  ["struct", S.struct([S.field("a", S.int32), S.field("b", S.utf8)]), [
    { a: 1, b: "x" },
    null,
    { a: null, b: "y" },
    { a: 4, b: null },
    { a: 5, b: "z" }
  ]],
  ["map", S.map(S.field("key", S.utf8), S.field("value", S.int32)), [
    new Map([["k", 1], ["l", null]]),
    null,
    new Map(),
    new Map([["m", 3]]),
    new Map([["n", 4], ["o", 5]])
  ]],
  ["sparseUnion", S.union("sparse", [S.field("int", S.int32), S.field("str", S.utf8)]), [10, "q", 12, "s", "t"]],
  ["denseUnion", S.union("dense", [S.field("float", S.float64), S.field("bool", S.bool)], [5, 10]), [
    1.5,
    true,
    false,
    2.5,
    true
  ]],
  ["runEnd", S.runEndEncoded(S.int32, S.field("values", S.utf8)), ["r", "r", null, "s", "s"]],
  ["dictionary", S.dictionary(S.utf8, { indexType: S.int8 }), ["a", "b", null, "c", "a"]]
]

const schema = S.make(columns.map(([name, type]) => S.field(name, type)), new Map([["source", "pyarrow"]]))

/** Checks a table holding the fixture rows from `start`, in batches of `lengths` rows. */
const assertFixtureTable = (table: ArrowTable.Table, start = 0, lengths: ReadonlyArray<number> = [3, 2]) => {
  assertEquals(table.schema, schema)
  assert.deepStrictEqual(table.batches.map((batch) => batch.length), lengths)
  const end = start + lengths.reduce((n, length) => n + length, 0)
  for (const [name, , values] of columns) {
    assertEquals(ArrowColumn.toArray(Option.getOrThrow(ArrowTable.column(table, name))), values.slice(start, end), name)
  }
}

const formats = [
  { format: "stream", bytes: streamBytes, decode: ArrowIpc.decodeStream, encode: ArrowIpc.encodeStream },
  { format: "file", bytes: fileBytes, decode: ArrowIpc.decodeFile, encode: ArrowIpc.encodeFile }
] as const

const split = (bytes: Uint8Array, size: number) => {
  const chunks: Array<Uint8Array> = []
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size))
  return chunks
}

const decodeChunks = (chunks: ReadonlyArray<Uint8Array>) =>
  Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(
    Stream.pipeThroughChannel(ArrowIpc.decode()),
    Stream.runCollect
  )

// A stream whose schema is a struct listing one child field table 10 times, 5
// levels deep: 100,000 fields from a few hundred bytes of metadata
const sharedFieldsStream = () => {
  const b = FlatBuffers.makeBuilder()
  const field = (typeId: number, children: ReadonlyArray<FlatBuffers.Offset>) => {
    b.startTable(0)
    const type = b.endTable()
    const vector = b.createOffsetVector(children)
    b.startTable(7)
    b.addFieldUint8(2, typeId)
    b.addFieldOffset(3, type)
    b.addFieldOffset(5, vector)
    return b.endTable()
  }
  let child = field(1, []) // Null
  for (let level = 0; level < 5; level++) child = field(13, Array(10).fill(child)) // Struct
  const fields = b.createOffsetVector([child])
  b.startTable(4)
  b.addFieldOffset(1, fields)
  const schema = b.endTable()
  b.startTable(5)
  b.addFieldInt16(0, 4) // V5
  b.addFieldUint8(1, 1) // Schema
  b.addFieldOffset(2, schema)
  const metadata = b.finish(b.endTable())
  const padded = (metadata.length + 7) & ~7
  const stream = new Uint8Array(8 + padded + 8)
  const view = new DataView(stream.buffer)
  view.setUint32(0, 0xffffffff, true)
  view.setInt32(4, padded, true)
  stream.set(metadata, 8)
  view.setUint32(8 + padded, 0xffffffff, true)
  return stream
}

const assertIpcError = (result: Result.Result<unknown, ArrowIpc.ArrowIpcError>, kind = "Invalid") => {
  assert.isTrue(Result.isFailure(result))
  if (Result.isFailure(result)) {
    assert.isTrue(ArrowIpc.isArrowIpcError(result.failure))
    assert.strictEqual(result.failure.kind, kind)
  }
}

describe("ArrowIpc", () => {
  for (const { bytes, decode, encode, format } of formats) {
    it(`decodes a pyarrow ${format}`, () => {
      assertFixtureTable(Result.getOrThrow(decode(bytes)))
    })

    it(`decodes a re-encoded ${format} to the same rows, also when sliced`, () => {
      const table = Result.getOrThrow(decode(bytes))
      assertFixtureTable(Result.getOrThrow(decode(Result.getOrThrow(encode(table)))))
      // Rows 1..4: the first batch from slot 1, the second whole
      assertFixtureTable(Result.getOrThrow(decode(Result.getOrThrow(encode(ArrowTable.slice(table, 1))))), 1, [2, 2])
    })
  }

  it.effect("decode and encode stream batches across arbitrary chunks", () =>
    Effect.gen(function*() {
      for (const size of [1, 13, 1000]) {
        const batches = yield* decodeChunks(split(streamBytes, size))
        assertFixtureTable(ArrowTable.make(schema, batches))

        const encoded = yield* Stream.fromIterable(batches, { chunkSize: 1 }).pipe(
          Stream.pipeThroughChannel(ArrowIpc.encode(schema)),
          Stream.mkUint8Array
        )
        assertFixtureTable(ArrowTable.make(schema, yield* decodeChunks(split(encoded, size))))
      }

      // An empty input still encodes a valid stream
      const empty = yield* Stream.empty.pipe(Stream.pipeThroughChannel(ArrowIpc.encode(schema)), Stream.mkUint8Array)
      assertEquals(ArrowIpc.decodeStream(empty), Result.succeed(ArrowTable.make(schema, [])))
    }))

  it("rejects malformed and truncated input with an ArrowIpcError", () => {
    for (const garbage of [bytes(), bytes(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)]) {
      assertIpcError(ArrowIpc.decodeStream(garbage))
      assertIpcError(ArrowIpc.decodeFile(garbage))
    }
    assertIpcError(ArrowIpc.decodeFile(streamBytes))

    // A schema message whose root offset points past its metadata
    const corrupt = streamBytes.slice()
    new DataView(corrupt.buffer).setUint32(8, 0xfffffff0, true)
    const result = ArrowIpc.decodeStream(corrupt)
    assertIpcError(result)
    if (Result.isFailure(result)) {
      const cause = result.failure.cause
      assert.isTrue(FlatBuffers.isFlatBuffersError(cause) && cause.kind === "OutOfBounds")
    }
    assertIpcError(ArrowIpc.decodeStream(sharedFieldsStream()))

    // Every proper prefix of a file lacks its footer
    for (let cut = 0; cut < fileBytes.length; cut++) {
      assertIpcError(ArrowIpc.decodeFile(fileBytes.subarray(0, cut)))
    }
    // A stream cut between messages holds the batches before the cut; any other cut fails
    for (let cut = 0; cut < streamBytes.length; cut++) {
      const result = ArrowIpc.decodeStream(streamBytes.subarray(0, cut))
      if (Result.isSuccess(result)) {
        const lengths = result.success.batches.map((batch) => batch.length)
        assert.deepStrictEqual(lengths, [3, 2].slice(0, lengths.length))
      } else {
        assertIpcError(result)
      }
    }
  })

  it("appends delta dictionaries to the slots each side uses", () => {
    // Each delta's offsets start at 1, so its value starts one byte or item in;
    // the first list dictionaries' children hold an unused item after [7]
    const table = Result.getOrThrow(ArrowIpc.decodeStream(deltaBytes))
    assertEquals(ArrowTable.toRows(table), [
      { utf8: "a", largeBinary: bytes(1), list: [7], fixedSizeList: [7] },
      { utf8: "b", largeBinary: bytes(2), list: [2], fixedSizeList: [2] }
    ])
  })

  it("rejects union type ids that are not unique or not in 0..127", () => {
    const union = (typeIds: ReadonlyArray<number>) =>
      S.make([S.field("u", S.union("sparse", [S.field("a", S.int32), S.field("b", S.int32)], typeIds))])
    // The schema's type id vector, [5, 6], rewritten
    const valid = Result.getOrThrow(ArrowIpc.encodeStream(ArrowTable.make(union([5, 6]), [])))
    const typeIdVector = [2, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0]
    const at = valid.findIndex((_, i) => typeIdVector.every((b, k) => valid[i + k] === b))
    assert.isAtLeast(at, 0)
    for (const typeIds of [[5, 5], [5, 128]]) {
      const patched = valid.slice()
      patched[at + 8] = typeIds[1]
      assertIpcError(ArrowIpc.decodeStream(patched))
      assertIpcError(ArrowIpc.encodeStream(ArrowTable.make(union(typeIds), [])))
      assertIpcError(ArrowIpc.encodeFile(ArrowTable.make(union(typeIds), [])))
    }
  })

  it("does not write unions with null slots of their own", () => {
    // Pre-V5 unions had a validity bitmap; V5, which the writer emits, has none
    const type = S.union("sparse", [S.field("i", S.int32)])
    const schema = S.make([S.field("u", type)])
    const child = ArrowData.make({ type: S.int32, length: 1, buffers: [bytes(99, 0, 0, 0)] })
    const union = ArrowData.make({
      type,
      length: 1,
      nullCount: 1,
      validity: bytes(0),
      buffers: [bytes(0)],
      children: [child]
    })
    const table = ArrowTable.make(schema, [ArrowTable.recordBatch(schema, 1, [union])])
    assert.deepStrictEqual(ArrowTable.toRows(table), [{ u: null }])
    assertIpcError(ArrowIpc.encodeStream(table), "Unsupported")
    assertIpcError(ArrowIpc.encodeFile(table), "Unsupported")
  })

  it.effect("decode fails with an ArrowIpcError when the input ends inside a message or holds no schema", () =>
    Effect.gen(function*() {
      for (const input of [streamBytes.subarray(0, streamBytes.length - 100), bytes()]) {
        const error = yield* Effect.flip(decodeChunks(split(input, 64)))
        assert.isTrue(ArrowIpc.isArrowIpcError(error))
        assert.strictEqual(error.kind, "Invalid")
      }
    }))
})
