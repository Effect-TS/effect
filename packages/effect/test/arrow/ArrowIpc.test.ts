import { assert, describe, it, vi } from "@effect/vitest"
import { assertEquals } from "@effect/vitest/utils"
import { BigDecimal, DateTime, Duration, Effect, Option, Result, Stream } from "effect"
import { ArrowColumn, ArrowData, ArrowIpc, ArrowSchema as S, ArrowTable } from "effect/arrow"
import { FlatBuffers } from "effect/encoding"
import * as InternalDateTime from "effect/internal/dateTime"
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

// Schema.fbs / Message.fbs metadata, built through the public FlatBuffers API.
// Empty schemas and zero-row batches isolate feature flags and message ordering.
const emptyMessage = (header: "schema" | "batch", options: { bigEndian?: boolean; codec?: number } = {}) => {
  const b = FlatBuffers.makeBuilder()
  let payload: FlatBuffers.Offset
  if (header === "schema") {
    const fields = b.createOffsetVector([])
    b.startTable(4)
    b.addFieldInt16(0, options.bigEndian ? 1 : 0)
    b.addFieldOffset(1, fields)
    payload = b.endTable()
  } else {
    b.startVector(16, 0, 8)
    const nodes = b.endVector()
    b.startVector(16, 0, 8)
    const buffers = b.endVector()
    let compression: FlatBuffers.Offset | undefined
    if (options.codec !== undefined) {
      b.startTable(2)
      b.addFieldInt8(0, options.codec) // LZ4_FRAME = 0, ZSTD = 1; method BUFFER = 0
      compression = b.endTable()
    }
    b.startTable(5)
    b.addFieldOffset(1, nodes)
    b.addFieldOffset(2, buffers)
    if (compression !== undefined) b.addFieldOffset(3, compression)
    payload = b.endTable()
  }
  b.startTable(5)
  b.addFieldInt16(0, 4) // V5
  b.addFieldUint8(1, header === "schema" ? 1 : 3)
  b.addFieldOffset(2, payload)
  const metadata = b.finish(b.endTable())
  const padded = Math.ceil(metadata.length / 8) * 8
  const message = new Uint8Array(8 + padded)
  const view = new DataView(message.buffer)
  view.setUint32(0, 0xffffffff, true)
  view.setInt32(4, padded, true)
  message.set(metadata, 8)
  return message
}

const concatenate = (...parts: ReadonlyArray<Uint8Array>) => {
  const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// Independent Schema.fbs / Message.fbs / File.fbs fixtures: one Int32 dictionary.
const dictionarySchema = (b: FlatBuffers.Builder) => {
  const name = b.createString("d")
  b.startTable(2)
  b.addFieldInt32(0, 32)
  b.addFieldBool(1, true)
  const int = b.endTable()
  b.startTable(4)
  b.addFieldInt64(0, 1n)
  b.addFieldOffset(1, int)
  const dictionary = b.endTable()
  b.startTable(7)
  b.addFieldOffset(0, name)
  b.addFieldBool(1, true)
  b.addFieldUint8(2, 2) // Int
  b.addFieldOffset(3, int)
  b.addFieldOffset(4, dictionary)
  const fields = b.createOffsetVector([b.endTable()])
  b.startTable(4)
  b.addFieldOffset(1, fields)
  return b.endTable()
}

const dictionaryFrame = (kind: "schema" | "dictionary" | "batch", options: {
  value?: number
  null?: boolean
  delta?: boolean
  version?: number
  legacy?: boolean
  nodes?: number
  buffers?: number
} = {}) => {
  const b = FlatBuffers.makeBuilder()
  const body = kind === "schema" ? bytes() : new Uint8Array(16)
  let header: FlatBuffers.Offset
  if (kind === "schema") header = dictionarySchema(b)
  else {
    body[0] = options.null ? 0 : 1
    new DataView(body.buffer).setInt32(8, options.value ?? 0, true)
    b.startVector(16, options.nodes ?? 1, 8)
    for (let i = 0; i < (options.nodes ?? 1); i++) {
      b.addInt64(options.null ? 1n : 0n)
      b.addInt64(1n)
    }
    const nodes = b.endVector()
    b.startVector(16, options.buffers ?? 2, 8)
    for (let i = (options.buffers ?? 2) - 1; i >= 0; i--) {
      b.addInt64(i === 0 ? 1n : 4n)
      b.addInt64(i === 0 ? 0n : 8n)
    }
    const buffers = b.endVector()
    b.startTable(5)
    b.addFieldInt64(0, 1n)
    b.addFieldOffset(1, nodes)
    b.addFieldOffset(2, buffers)
    header = b.endTable()
    if (kind === "dictionary") {
      b.startTable(3)
      b.addFieldInt64(0, 1n)
      b.addFieldOffset(1, header)
      b.addFieldBool(2, options.delta ?? false)
      header = b.endTable()
    }
  }
  b.startTable(5)
  b.addFieldInt16(0, options.version ?? 4)
  b.addFieldUint8(1, kind === "schema" ? 1 : kind === "dictionary" ? 2 : 3)
  b.addFieldOffset(2, header)
  b.addFieldInt64(3, BigInt(body.length))
  const metadata = b.finish(b.endTable())
  const prefixSize = options.legacy ? 4 : 8
  const prefix = new Uint8Array(Math.ceil((prefixSize + metadata.length) / 8) * 8)
  const view = new DataView(prefix.buffer)
  if (!options.legacy) view.setInt32(0, -1, true)
  view.setInt32(prefixSize - 4, prefix.length - prefixSize, true)
  prefix.set(metadata, prefixSize)
  return concatenate(prefix, body)
}

const dictionaryFile = (dictionaries: ReadonlyArray<Uint8Array>, batch: Uint8Array) => {
  const schema = dictionaryFrame("schema")
  const b = FlatBuffers.makeBuilder()
  const schemaOffset = dictionarySchema(b)
  let offset = 8 + schema.length
  const blocks = [...dictionaries, batch].map((frame) => {
    const block = { offset, metadata: new DataView(frame.buffer).getInt32(4, true) + 8 }
    offset += frame.length
    return block
  })
  const vector = (items: typeof blocks) => {
    b.startVector(24, items.length, 8)
    for (let i = items.length - 1; i >= 0; i--) {
      b.addInt64(16n)
      b.addInt32(0) // struct padding
      b.addInt32(items[i].metadata)
      b.addInt64(BigInt(items[i].offset))
    }
    return b.endVector()
  }
  const dictionaryBlocks = vector(blocks.slice(0, -1))
  const batchBlocks = vector(blocks.slice(-1))
  b.startTable(5)
  b.addFieldInt16(0, 4)
  b.addFieldOffset(1, schemaOffset)
  b.addFieldOffset(2, dictionaryBlocks)
  b.addFieldOffset(3, batchBlocks)
  const footer = b.finish(b.endTable())
  const length = new Uint8Array(4)
  new DataView(length.buffer).setInt32(0, footer.length, true)
  return concatenate(
    text("ARROW1"),
    bytes(0, 0),
    schema,
    ...dictionaries,
    batch,
    bytes(255, 255, 255, 255, 0, 0, 0, 0),
    footer,
    length,
    text("ARROW1")
  )
}

// The DateTime, Duration and BigDecimal values the Arrow readers construct while `f` runs
const constructions = (f: () => void) => {
  const spies = {
    utc: vi.spyOn(InternalDateTime, "makeUtc"),
    zoned: vi.spyOn(InternalDateTime, "makeZonedProto"),
    duration: vi.spyOn(Duration, "nanos"),
    decimal: vi.spyOn(BigDecimal, "make")
  }
  try {
    f()
    return {
      utc: spies.utc.mock.calls.length,
      zoned: spies.zoned.mock.calls.length,
      duration: spies.duration.mock.calls.length,
      decimal: spies.decimal.mock.calls.length
    }
  } finally {
    for (const spy of Object.values(spies)) spy.mockRestore()
  }
}

describe("ArrowIpc", () => {
  // ARROW-IPC-019: Columnar.rst 447-449, 514-524, 1035, 1124;
  // physical buffer sizes follow the validity and fixed-width layouts.
  // Mutate wire data, not unchecked ArrowData constructors, to exercise the decoder.
  const malformedLayouts: ReadonlyArray<{
    name: string
    type: S.DataType
    values: ReadonlyArray<unknown>
    buffer: number
    offset?: number
    value: number
    short?: boolean
    byte?: boolean
  }> = [
    {
      name: "descending offsets across a null slot",
      type: S.utf8,
      values: ["a", null, "bc"],
      buffer: 1,
      offset: 8,
      value: 0
    },
    { name: "out-of-range offsets", type: S.utf8, values: ["a"], buffer: 1, offset: 4, value: 2 },
    { name: "short validity buffer", type: S.int32, values: [null, 1], buffer: 0, value: 0, short: true },
    { name: "short value buffer", type: S.int32, values: [1], buffer: 1, value: 3, short: true },
    {
      name: "negative dictionary index",
      type: S.dictionary(S.utf8, { indexType: S.int8 }),
      values: ["a"],
      buffer: 1,
      value: -1,
      byte: true
    },
    {
      name: "out-of-range dictionary index",
      type: S.dictionary(S.utf8, { indexType: S.int8 }),
      values: ["a"],
      buffer: 1,
      value: 1,
      byte: true
    },
    ...[S.utf8View, S.binaryView].flatMap((type) => [
      {
        name: "missing view buffer",
        type,
        values: [type === S.utf8View ? "abcdefghijklmnop" : text("abcdefghijklmnop")],
        buffer: 1,
        offset: 8,
        value: 1
      },
      {
        name: "out-of-range view",
        type,
        values: [type === S.utf8View ? "abcdefghijklmnop" : text("abcdefghijklmnop")],
        buffer: 1,
        offset: 12,
        value: 1
      },
      {
        name: "mismatched view prefix",
        type,
        values: [type === S.utf8View ? "abcdefghijklmnop" : text("abcdefghijklmnop")],
        buffer: 1,
        offset: 4,
        value: 0
      }
    ]),
    {
      name: "nonpositive run end",
      type: S.runEndEncoded(S.int32, S.field("values", S.utf8)),
      values: ["a", "b"],
      buffer: 1,
      value: 0
    },
    {
      name: "nonincreasing run ends",
      type: S.runEndEncoded(S.int32, S.field("values", S.utf8)),
      values: ["a", "b"],
      buffer: 1,
      offset: 4,
      value: 1
    }
  ]
  for (const layout of malformedLayouts) {
    it(`rejects ${layout.type._tag} ${layout.name} in IPC record batches`, () => {
      const schema = S.make([S.field("value", layout.type)])
      const rows = layout.values.map((value) => ({ value }))
      const table = Result.getOrThrow(ArrowTable.fromRows(schema, rows))
      const input = Result.getOrThrow(ArrowIpc.encodeStream(table))
      assertEquals(ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeStream(input))), rows)
      const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
      for (let position = 0; position < input.length - 8;) {
        const length = view.getInt32(position + 4, true)
        const message = FlatBuffers.root(input.subarray(position + 8, position + 8 + length))
        if (message.uint8(1) === 3) {
          const buffer = message.table(2)!.vector(2, 16)!.struct(layout.buffer)
          if (layout.short) {
            view.setBigInt64(position + 8 + buffer.position + 8, BigInt(layout.value), true)
          } else {
            const at = position + 8 + length + Number(buffer.int64(0)) + (layout.offset ?? 0)
            if (layout.byte) view.setInt8(at, layout.value)
            else view.setInt32(at, layout.value, true)
          }
          break
        }
        position += 8 + length + Number(message.int64(3))
      }
      assertIpcError(ArrowIpc.decodeStream(input))
    })
  }

  // ARROW-IPC-013: Columnar.rst 1493-1496; null slots do not require dictionary keys.
  it.effect("allows all-null dictionary batches before definition but rejects undefined non-null indices", () =>
    Effect.gen(function*() {
      const schema = dictionaryFrame("schema")
      const nulls = dictionaryFrame("batch", { null: true, value: 999 })
      const definition = dictionaryFrame("dictionary", { value: 42 })
      const batch = dictionaryFrame("batch")
      const input = concatenate(schema, nulls, definition, batch)
      assert.deepStrictEqual(ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeStream(input))), [{ d: null }, {
        d: 42
      }])
      const decoded = yield* decodeChunks(split(input, 13))
      assert.deepStrictEqual(decoded.map((b) => b.length), [1, 1])
      assert.deepStrictEqual(decoded.flatMap((b) => ArrowTable.toRows(ArrowTable.make(b.schema, [b]))), [
        { d: null },
        { d: 42 }
      ])
      assertIpcError(ArrowIpc.decodeStream(concatenate(schema, batch, definition)))
      const error = yield* Effect.flip(decodeChunks(split(concatenate(schema, batch), 13)))
      assert.strictEqual(error.kind, "Invalid")
      // A claimed all-null node must not hide a set validity bit without a dictionary.
      const malformed = nulls.slice()
      malformed[8 + new DataView(malformed.buffer).getInt32(4, true)] = 1
      const malformedInput = concatenate(schema, malformed)
      assertIpcError(ArrowIpc.decodeStream(malformedInput))
      const malformedError = yield* Effect.flip(decodeChunks(split(malformedInput, 13)))
      assert.strictEqual(malformedError.kind, "Invalid")
    }))

  // ARROW-IPC-014: Columnar.rst 1530-1536; Message.fbs DictionaryBatch.isDelta.
  it("rejects file dictionary replacement while preserving file deltas and stream replacements", () => {
    const first = dictionaryFrame("dictionary", { value: 42 })
    const replacement = dictionaryFrame("dictionary", { value: 99 })
    const delta = dictionaryFrame("dictionary", { value: 99, delta: true })
    const batch = dictionaryFrame("batch")
    assert.deepStrictEqual(ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeFile(dictionaryFile([first], batch)))), [{
      d: 42
    }])
    assertIpcError(ArrowIpc.decodeFile(dictionaryFile([first, replacement], batch)))
    assert.deepStrictEqual(
      ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeFile(
        dictionaryFile(
          [first, delta, dictionaryFrame("dictionary", { value: 77, delta: true })],
          dictionaryFrame("batch", { value: 2 })
        )
      ))),
      [{ d: 77 }]
    )
    assert.deepStrictEqual(
      ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeStream(concatenate(
        dictionaryFrame("schema"),
        first,
        batch,
        replacement,
        batch
      )))),
      [{ d: 42 }, { d: 99 }]
    )
  })

  // ARROW-IPC-015: Message.fbs RecordBatch nodes/buffers follow the flattened schema.
  it("rejects record batches whose field-node, buffer or variadic counts disagree with the schema", () => {
    // Message.fbs 103–116: exactly one variadic count per view field, even for inline values.
    const table = Result.getOrThrow(ArrowTable.fromRows(S.make([S.field("value", S.utf8View)]), [{ value: "a" }]))
    const encoded = Result.getOrThrow(ArrowIpc.encodeStream(table))
    const schemaSize = 8 + new DataView(encoded.buffer).getInt32(4, true)
    const schema = encoded.subarray(0, schemaSize)
    for (const counts of [[0], [], [0, 1]]) {
      const b = FlatBuffers.makeBuilder()
      b.startVector(16, 1, 8)
      b.addInt64(0n)
      b.addInt64(1n)
      const nodes = b.endVector()
      b.startVector(16, 2, 8)
      b.addInt64(16n)
      b.addInt64(0n)
      b.addInt64(0n)
      b.addInt64(0n)
      const buffers = b.endVector()
      b.startVector(8, counts.length, 8)
      for (const count of [...counts].reverse()) b.addInt64(BigInt(count))
      const variadic = b.endVector()
      b.startTable(5)
      b.addFieldInt64(0, 1n)
      b.addFieldOffset(1, nodes)
      b.addFieldOffset(2, buffers)
      b.addFieldOffset(4, variadic)
      const batch = b.endTable()
      b.startTable(5)
      b.addFieldInt16(0, 4)
      b.addFieldUint8(1, 3)
      b.addFieldOffset(2, batch)
      b.addFieldInt64(3, 16n)
      const metadata = b.finish(b.endTable())
      const frame = new Uint8Array(8 + Math.ceil(metadata.length / 8) * 8 + 16)
      const view = new DataView(frame.buffer)
      view.setInt32(0, -1, true)
      view.setInt32(4, frame.length - 24, true)
      frame.set(metadata, 8)
      view.setInt32(frame.length - 16, 1, true)
      frame[frame.length - 12] = 97 // inline UTF-8 "a"
      const result = ArrowIpc.decodeStream(concatenate(schema, frame))
      if (counts.length === 1) assertEquals(ArrowTable.toRows(Result.getOrThrow(result)), [{ value: "a" }])
      else assertIpcError(result)
    }
    const prefix = concatenate(dictionaryFrame("schema"), dictionaryFrame("dictionary"))
    for (const options of [{ nodes: 0 }, { nodes: 2 }, { buffers: 1 }, { buffers: 3 }]) {
      assertIpcError(ArrowIpc.decodeStream(concatenate(prefix, dictionaryFrame("batch", options))))
    }
  })

  // ARROW-IPC-016: Schema.fbs MetadataVersion; Columnar.rst 1235-1248 legacy and continuation framing.
  it.effect("reads V4 and V5 messages with legacy or continuation framing and optional EOS", () =>
    Effect.gen(function*() {
      for (const version of [3, 4]) {
        for (const legacy of [false, true]) {
          const frames = [
            dictionaryFrame("schema", { version, legacy }),
            dictionaryFrame("dictionary", { version, legacy, value: 42 }),
            dictionaryFrame("batch", { version, legacy })
          ]
          for (const frame of frames) {
            const prefixSize = legacy ? 4 : 8
            const metadataSize = new DataView(frame.buffer).getInt32(prefixSize - 4, true)
            assert.strictEqual((prefixSize + metadataSize) % 8, 0)
            assert.strictEqual(frame.length % 8, 0)
          }
          for (const eos of [bytes(), legacy ? bytes(0, 0, 0, 0) : bytes(255, 255, 255, 255, 0, 0, 0, 0)]) {
            const input = concatenate(...frames, eos)
            assert.deepStrictEqual(ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeStream(input))), [{ d: 42 }])
            const decoded = yield* decodeChunks(split(input, 13))
            assert.deepStrictEqual(decoded.map((b) => b.length), [1])
            assert.deepStrictEqual(decoded.flatMap((b) => ArrowTable.toRows(ArrowTable.make(b.schema, [b]))), [{
              d: 42
            }])
          }
        }
      }
      for (const version of [0, 1, 2, 5]) {
        assertIpcError(
          ArrowIpc.decodeStream(dictionaryFrame("schema", { version })),
          version < 3 ? "Unsupported" : "Invalid"
        )
      }
    }))

  // ARROW-IPC-017: Columnar.rst Streaming Format: one schema, before dictionary / record batches.
  it("rejects repeated schemas and dictionaries before the schema", () => {
    const schema = dictionaryFrame("schema")
    assertIpcError(ArrowIpc.decodeStream(concatenate(schema, schema)))
    assertIpcError(ArrowIpc.decodeStream(concatenate(dictionaryFrame("dictionary"), schema)))
    assertIpcError(ArrowIpc.decodeStream(concatenate(emptyMessage("schema"), dictionaryFrame("dictionary"))))
  })

  // ARROW-IPC-018: Columnar.rst encapsulated messages, primitive layout and IPC File Format;
  // Message.fbs RecordBatch / FieldNode / Buffer and File.fbs Footer / Block.
  // Inspect public writer bytes independently, without calling an Arrow decoder.
  it("writes V5 framing, aligned Int32 buffers, EOS and file footer block locations", () => {
    const schema = S.make([S.field("i", S.int32)])
    const column = ArrowData.make({
      type: S.int32,
      length: 3,
      nullCount: 1,
      validity: bytes(5),
      buffers: [bytes(7, 0, 0, 0, 0, 0, 0, 0, 247, 255, 255, 255)]
    })
    const table = ArrowTable.make(schema, [ArrowTable.recordBatch(schema, 3, [column])])
    for (const format of ["stream", "file"] as const) {
      const output = Result.getOrThrow(format === "stream" ? ArrowIpc.encodeStream(table) : ArrowIpc.encodeFile(table))
      const view = new DataView(output.buffer, output.byteOffset, output.byteLength)
      let position = format === "file" ? 8 : 0
      const blocks: Array<{ offset: number; metadata: number; body: number }> = []
      for (const headerType of [1, 3]) {
        assert.strictEqual(position % 8, 0)
        assert.strictEqual(view.getUint32(position, true), 0xffffffff)
        const metadata = view.getInt32(position + 4, true)
        assert.strictEqual(metadata % 8, 0)
        const message = FlatBuffers.root(output.subarray(position + 8, position + 8 + metadata))
        assert.strictEqual(message.int16(0), 4)
        assert.strictEqual(message.uint8(1), headerType)
        const body = Number(message.int64(3))
        assert.strictEqual(body % 8, 0)
        if (headerType === 3) {
          blocks.push({ offset: position, metadata: metadata + 8, body })
          const batch = message.table(2)!
          assert.strictEqual(batch.int64(0), 3n)
          const nodes = batch.vector(1, 16)!
          assert.strictEqual(nodes.length, 1)
          assert.strictEqual(nodes.struct(0).int64(0), 3n)
          assert.strictEqual(nodes.struct(0).int64(8), 1n)
          const buffers = batch.vector(2, 16)!
          assert.strictEqual(buffers.length, 2)
          const bodyStart = position + 8 + metadata
          assert.strictEqual(buffers.struct(0).int64(0), 0n)
          assert.strictEqual(buffers.struct(0).int64(8), 1n)
          assert.strictEqual(output[bodyStart], 5)
          const valuesOffset = Number(buffers.struct(1).int64(0))
          assert.strictEqual(valuesOffset % 8, 0)
          assert.strictEqual(buffers.struct(1).int64(8), 12n)
          assert.strictEqual(view.getInt32(bodyStart + valuesOffset, true), 7)
          assert.strictEqual(view.getInt32(bodyStart + valuesOffset + 8, true), -9)
        }
        position += 8 + metadata + body
      }
      assert.deepStrictEqual(output.subarray(position, position + 8), bytes(255, 255, 255, 255, 0, 0, 0, 0))
      position += 8
      if (format === "stream") assert.strictEqual(position, output.length)
      else {
        assert.deepStrictEqual(output.subarray(0, 8), concatenate(text("ARROW1"), bytes(0, 0)))
        assert.deepStrictEqual(output.subarray(-6), text("ARROW1"))
        const footerLength = view.getInt32(output.length - 10, true)
        assert.strictEqual(position + footerLength + 10, output.length)
        const footer = FlatBuffers.root(output.subarray(position, position + footerLength))
        assert.strictEqual(footer.int16(0), 4)
        assert.strictEqual(footer.table(1)!.vector(1, 4)!.table(0).string(0), "i")
        assert.strictEqual(footer.vector(2, 24)?.length ?? 0, 0)
        const records = footer.vector(3, 24)!
        assert.strictEqual(records.length, 1)
        assert.strictEqual(records.struct(0).int64(0), BigInt(blocks[0].offset))
        assert.strictEqual(records.struct(0).int32(8), blocks[0].metadata)
        assert.strictEqual(records.struct(0).int64(16), BigInt(blocks[0].body))
      }
    }
  })

  // ARROW-IPC-010 (local): Schema.fbs Endianness; unsupported feature classification.
  // Source pin and scope: ./CONFORMANCE.md
  it.effect("rejects big-endian schema metadata with BigEndian", () =>
    Effect.gen(function*() {
      assert.isTrue(Result.isSuccess(ArrowIpc.decodeStream(emptyMessage("schema"))))
      const input = emptyMessage("schema", { bigEndian: true })
      assertIpcError(ArrowIpc.decodeStream(input), "BigEndian")
      const error = yield* Effect.flip(decodeChunks(split(input, 13)))
      assert.isTrue(ArrowIpc.isArrowIpcError(error))
      assert.strictEqual(error.kind, "BigEndian")
    }))

  // ARROW-IPC-011 (local): Message.fbs BodyCompression; no codec payload is decoded.
  // Source pin and scope: ./CONFORMANCE.md
  it.effect("rejects LZ4 and ZSTD batch compression metadata with Compression", () =>
    Effect.gen(function*() {
      const schema = emptyMessage("schema")
      const valid = Result.getOrThrow(ArrowIpc.decodeStream(concatenate(schema, emptyMessage("batch"))))
      assert.deepStrictEqual(valid.batches.map((batch) => batch.length), [0])
      for (const codec of [0, 1]) {
        const input = concatenate(schema, emptyMessage("batch", { codec }))
        assertIpcError(ArrowIpc.decodeStream(input), "Compression")
        const error = yield* Effect.flip(decodeChunks(split(input, 13)))
        assert.isTrue(ArrowIpc.isArrowIpcError(error))
        assert.strictEqual(error.kind, "Compression")
      }
    }))

  // ARROW-IPC-012 (mixed): Columnar.rst Streaming Format requires schema before record batches.
  // Source pin and scope: ./CONFORMANCE.md
  it.effect("rejects a record batch before its schema", () =>
    Effect.gen(function*() {
      const input = concatenate(emptyMessage("batch"), emptyMessage("schema"))
      assertIpcError(ArrowIpc.decodeStream(input))
      const error = yield* Effect.flip(decodeChunks(split(input, 13)))
      assert.isTrue(ArrowIpc.isArrowIpcError(error))
      assert.strictEqual(error.kind, "Invalid")
    }))

  for (const { bytes, decode, encode, format } of formats) {
    // ARROW-IPC-001 (interop): Columnar.rst layouts / IPC; independently generated fixture values.
    // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
    it(`decodes a pyarrow ${format}`, () => {
      assertFixtureTable(Result.getOrThrow(decode(bytes)))
    })

    // ARROW-IPC-002 (local regression): encode/decode composition and slicing, not external writer validation.
    // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
    it(`decodes a re-encoded ${format} to the same rows, also when sliced`, () => {
      const table = Result.getOrThrow(decode(bytes))
      assertFixtureTable(Result.getOrThrow(decode(Result.getOrThrow(encode(table)))))
      // Rows 1..4: the first batch from slot 1, the second whole
      assertFixtureTable(Result.getOrThrow(decode(Result.getOrThrow(encode(ArrowTable.slice(table, 1))))), 1, [2, 2])
    })
  }

  // ARROW-IPC-003 (local): transport chunk boundaries and empty batch input.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
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

  // ARROW-IPC-004 (mixed): Columnar.rst IPC framing; local error types and schema expansion budget.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
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

  // ARROW-IPC-006 (normative framing; local error kind): Columnar.rst, Encapsulated message format / IPC File Format.
  // Source pin and scope: ./CONFORMANCE.md#sources
  it.effect("rejects invalid metadata lengths, file magic and footer lengths", () =>
    Effect.gen(function*() {
      // A continuation marker must be followed by a nonnegative, available metadata length.
      for (const length of [-2, 0x7fffffff]) {
        const corrupt = streamBytes.slice()
        new DataView(corrupt.buffer).setInt32(4, length, true)
        assertIpcError(ArrowIpc.decodeStream(corrupt))
        const error = yield* Effect.flip(decodeChunks(split(corrupt, 13)))
        assert.isTrue(ArrowIpc.isArrowIpcError(error))
        assert.strictEqual(error.kind, "Invalid")
      }
      // Both magic strings are required, independently of a valid footer.
      for (const at of [0, fileBytes.length - 6]) {
        const corrupt = fileBytes.slice()
        corrupt[at] ^= 1
        assertIpcError(ArrowIpc.decodeFile(corrupt))
      }
      for (const length of [-1, 0, fileBytes.length]) {
        const corrupt = fileBytes.slice()
        new DataView(corrupt.buffer).setInt32(corrupt.length - 10, length, true)
        assertIpcError(ArrowIpc.decodeFile(corrupt))
      }
    }))

  // ARROW-IPC-005 (interop): Columnar.rst Dictionary Messages; Message.fbs DictionaryBatch.isDelta.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("appends delta dictionaries to the slots each side uses", () => {
    // Each delta's offsets start at 1, so its value starts one byte or item in;
    // the first list dictionaries' children hold an unused item after [7]
    const table = Result.getOrThrow(ArrowIpc.decodeStream(deltaBytes))
    assertEquals(ArrowTable.toRows(table), [
      { utf8: "a", largeBinary: bytes(1), list: [7], fixedSizeList: [7] },
      { utf8: "b", largeBinary: bytes(2), list: [2], fixedSizeList: [2] }
    ])
  })

  // ARROW-IPC-007 (mixed): Columnar.rst Union Layout / Schema.fbs Union; local Invalid error.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
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

  // ARROW-IPC-008 (mixed): Schema.fbs MetadataVersion.V5 removes union validity; local Unsupported error.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
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

  // ARROW-IPC-009 (mixed): Columnar.rst Streaming Format requires schema first; local channel error.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it.effect("decode fails with an ArrowIpcError when the input ends inside a message or holds no schema", () =>
    Effect.gen(function*() {
      for (const input of [streamBytes.subarray(0, streamBytes.length - 100), bytes()]) {
        const error = yield* Effect.flip(decodeChunks(split(input, 64)))
        assert.isTrue(ArrowIpc.isArrowIpcError(error))
        assert.strictEqual(error.kind, "Invalid")
      }
    }))

  // ARROW-IPC-020 (local): where DateTime, Duration and BigDecimal values are constructed.
  // Source pin, exact assertions and exclusions: ./CONFORMANCE.md
  it("constructs DateTime, Duration and BigDecimal values only for domain reads", () => {
    const tokyoMillis = S.timestamp("millisecond", "Asia/Tokyo")
    const schema = S.make([
      S.field("utc", S.timestamp("nanosecond")),
      S.field("zoned", tokyoMillis),
      S.field("date", S.date("day")),
      S.field("duration", S.duration("microsecond")),
      S.field("decimal", S.decimal(10, 2)),
      S.field("encoded", S.dictionary(S.timestamp("second"))),
      S.field("name", S.utf8)
    ])
    const nulls = { utc: null, zoned: null, date: null, duration: null, decimal: null, encoded: null, name: null }
    const stored = [
      { utc: 1n, zoned: 1n, date: 1, duration: 1n, decimal: 1n, encoded: 60n, name: "a" },
      {
        utc: 1704164645678901234n,
        zoned: 1704164645678n,
        date: 19724,
        duration: 1500000n,
        decimal: 12345n,
        encoded: 60n,
        name: "b"
      },
      nulls,
      { utc: -1n, zoned: -1n, date: -1, duration: -1n, decimal: -1n, encoded: 60n, name: "c" }
    ]
    const decimals = [dec("0.01"), dec("123.45"), null, dec("-0.01")]
    const built = ArrowTable.fromRows(schema, stored.map((row, i) => ({ ...row, decimal: decimals[i] })), {
      batchSize: 3
    })
    const input = Result.getOrThrow(ArrowIpc.encodeStream(Result.getOrThrow(built)))
    const storage = { representation: "storage" } as const

    let table!: ArrowTable.Table
    let output!: Uint8Array
    const columnar = constructions(() => {
      table = ArrowTable.slice(Result.getOrThrow(ArrowIpc.decodeStream(input)), 1)
      for (const [index, field] of schema.fields.entries()) {
        const column = Option.getOrThrow(ArrowTable.column(table, index, storage))
        const values = stored.slice(1).map((row) => row[field.name as keyof typeof nulls])
        assert.deepStrictEqual(ArrowColumn.toArray(column), values, field.name)
        assert.deepStrictEqual(ArrowColumn.get(column, 0), Option.some(values[0]), field.name)
        for (const chunk of column.chunks) {
          assert.strictEqual(Option.isSome(ArrowData.values(chunk)), field.name !== "decimal" && field.name !== "name")
          assert.strictEqual(Option.isSome(ArrowData.offsets(chunk)), field.name === "name")
        }
      }
      assert.deepStrictEqual(ArrowTable.toRows(table, storage), stored.slice(1))
      output = Result.getOrThrow(ArrowIpc.encodeStream(table))
    })
    assert.deepStrictEqual(columnar, { utc: 0, zoned: 0, duration: 0, decimal: 0 })
    // The unit and time zone travel on the type
    assert.deepStrictEqual(table.batches[0].columns[1].type, tokyoMillis)
    assert.deepStrictEqual(
      ArrowTable.toRows(Result.getOrThrow(ArrowIpc.decodeStream(output)), storage),
      stored.slice(1)
    )

    // Two rows hold values: one object per value read (a timestamp and a date
    // are both a DateTime.Utc), and one for the dictionary entry the rows share
    const rows = constructions(() => ArrowTable.toRows(table))
    assert.deepStrictEqual(rows, { utc: 5, zoned: 2, duration: 2, decimal: 2 })
  })
})
