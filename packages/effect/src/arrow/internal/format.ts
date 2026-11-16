/**
 * The Arrow IPC metadata tables (format/Schema.fbs, Message.fbs, File.fbs),
 * read and written by hand with `effect/encoding/FlatBuffers`. Field slots
 * follow the declaration order in the .fbs files.
 *
 * @internal
 */
import * as Fb from "../../encoding/FlatBuffers.ts"
import * as Result from "../../Result.ts"
import type * as S from "../ArrowSchema.ts"
import * as Layout from "./layout.ts"

/** Why IPC input or a table was declined. */
type Kind = "BigEndian" | "Compression" | "Invalid" | "Unsupported"

/** @internal */
export class IpcFailure extends Error {
  readonly kind: Kind
  constructor(kind: Kind, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.kind = kind
  }
}

/** @internal */
export const MetadataVersion = { V1: 0, V2: 1, V3: 2, V4: 3, V5: 4 } as const

const MessageHeader = {
  None: 0,
  Schema: 1,
  DictionaryBatch: 2,
  RecordBatch: 3,
  Tensor: 4,
  SparseTensor: 5
} as const

/** Schema.fbs `union Type` indices. */
const TypeId = {
  Null: 1,
  Int: 2,
  FloatingPoint: 3,
  Binary: 4,
  Utf8: 5,
  Bool: 6,
  Decimal: 7,
  Date: 8,
  Time: 9,
  Timestamp: 10,
  Interval: 11,
  List: 12,
  Struct: 13,
  Union: 14,
  FixedSizeBinary: 15,
  FixedSizeList: 16,
  Map: 17,
  Duration: 18,
  LargeBinary: 19,
  LargeUtf8: 20,
  LargeList: 21,
  RunEndEncoded: 22,
  BinaryView: 23,
  Utf8View: 24,
  ListView: 25,
  LargeListView: 26
} as const

const timeUnits: ReadonlyArray<S.TimeUnit> = ["second", "millisecond", "microsecond", "nanosecond"]
const dateUnits: ReadonlyArray<S.DateUnit> = ["day", "millisecond"]
const intervalUnits: ReadonlyArray<S.IntervalUnit> = ["yearMonth", "dayTime", "monthDayNano"]

/** Throws an `Invalid` failure. Annotated so that calls narrow like `throw`. @internal */
export const invalid: (message: string) => never = (message) => {
  throw new IpcFailure("Invalid", message)
}

const enumValue = <A>(values: ReadonlyArray<A>, n: number, what: string): A =>
  n >= 0 && n < values.length ? values[n] : invalid(`unknown ${what} ${n}`)

// -----------------------------------------------------------------------------
// Decoded structures
// -----------------------------------------------------------------------------

/** @internal */
export interface SchemaMessage {
  readonly _tag: "Schema"
  readonly schema: S.Schema
  readonly endianness: "little" | "big"
  readonly features: ReadonlyArray<number>
}

/** @internal */
export interface FieldNode {
  readonly length: number
  readonly nullCount: number
}

/** @internal */
export interface BufferRef {
  readonly offset: number
  readonly length: number
}

/** @internal */
export interface RecordBatchMessage {
  readonly _tag: "RecordBatch"
  readonly length: number
  readonly nodes: ReadonlyArray<FieldNode>
  readonly buffers: ReadonlyArray<BufferRef>
  /** `LZ4_FRAME` or `ZSTD` when the body is compressed. */
  readonly compression: "lz4Frame" | "zstd" | undefined
  readonly variadicBufferCounts: ReadonlyArray<number>
}

/** @internal */
export interface DictionaryBatchMessage {
  readonly _tag: "DictionaryBatch"
  readonly id: number
  readonly data: RecordBatchMessage
  readonly isDelta: boolean
}

/** @internal */
export interface OtherMessage {
  readonly _tag: "Other"
  readonly headerType: number
}

/** @internal */
export interface Message {
  readonly version: number
  readonly header: SchemaMessage | RecordBatchMessage | DictionaryBatchMessage | OtherMessage
  readonly bodyLength: number
  readonly metadata: ReadonlyMap<string, string>
}

/** @internal */
export interface Block {
  readonly offset: number
  readonly metaDataLength: number
  readonly bodyLength: number
}

/** @internal */
export interface Footer {
  readonly version: number
  readonly schema: SchemaMessage
  readonly dictionaries: ReadonlyArray<Block>
  readonly recordBatches: ReadonlyArray<Block>
  readonly metadata: ReadonlyMap<string, string>
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

/** Nested fields deeper than this are rejected, so hostile metadata can't exhaust the stack. */
const maxDepth = 64

/**
 * What decoding a metadata buffer may still read. Many offsets may point at
 * one table or string, so a small buffer could decode to a huge schema. As in
 * Arrow C++ (ARROW-11559), the budget is 8 per byte of metadata; every field
 * and key-value table costs 1, and every string its length.
 */
interface Budget {
  remaining: number
}

const spend = (budget: Budget, cost: number): void => {
  budget.remaining -= cost
  if (budget.remaining < 0) invalid("metadata refers to the same tables or strings too many times")
}

const stringOf = (budget: Budget, table: Fb.Table, slot: number): string | undefined => {
  const s = table.string(slot)
  if (s !== undefined) spend(budget, s.length)
  return s
}

/**
 * Reads a metadata FlatBuffer with `read`, failing with `Invalid` for
 * malformed bytes. The table depth limit is the one Arrow C++ verifies
 * metadata with, above the nesting that `maxDepth` allows for fields.
 */
const decodeFlatBuffer = <A>(bytes: Uint8Array, what: string, read: (table: Fb.Table, budget: Budget) => A): A => {
  const budget: Budget = { remaining: 8 * bytes.length }
  const result = Fb.decode(bytes, (table) => read(table, budget), { maxDepth: 128 })
  if (Result.isFailure(result)) {
    throw new IpcFailure("Invalid", `invalid ${what}: ${result.failure.message}`, result.failure)
  }
  return result.success
}

/** A 64-bit value that must be a safe JavaScript integer. */
const int53 = (n: bigint, what: string): number =>
  n >= BigInt(Number.MIN_SAFE_INTEGER) && n <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(n)
    : invalid(`${what} ${n} is out of the safe integer range`)

/** A vector of `size`-byte items read with `read`, or `undefined` when absent. */
const vectorOf = <A>(
  table: Fb.Table,
  slot: number,
  size: number,
  read: (v: Fb.Vector, i: number) => A
): Array<A> | undefined => {
  const v = table.vector(slot, size)
  return v === undefined ? undefined : Array.from({ length: v.length }, (_, i) => read(v, i))
}

const tables = (table: Fb.Table, slot: number): Array<Fb.Table> => vectorOf(table, slot, 4, (v, i) => v.table(i)) ?? []

const int32s = (table: Fb.Table, slot: number) => vectorOf(table, slot, 4, (v, i) => v.int32(i))

const int64s = (table: Fb.Table, slot: number, what: string) =>
  vectorOf(table, slot, 8, (v, i) => int53(v.int64(i), what))

const metadataOf = (table: Fb.Table, slot: number, budget: Budget): ReadonlyMap<string, string> => {
  const out = new Map<string, string>()
  for (const kv of tables(table, slot)) {
    spend(budget, 1)
    out.set(stringOf(budget, kv, 0) ?? "", stringOf(budget, kv, 1) ?? "")
  }
  return out
}

const intType = (t: Fb.Table | undefined): S.Int => {
  if (t === undefined) return invalid("missing Int table")
  const bitWidth = t.int32(0)
  if (bitWidth !== 8 && bitWidth !== 16 && bitWidth !== 32 && bitWidth !== 64) {
    invalid(`invalid int bit width ${bitWidth}`)
  }
  return { _tag: "Int", bitWidth, signed: t.bool(1) }
}

const one = (children: ReadonlyArray<S.Field>, what: string): S.Field =>
  children.length === 1 ? children[0] : invalid(`${what} needs exactly one child, got ${children.length}`)

const decodeType = (
  typeId: number,
  t: Fb.Table | undefined,
  children: ReadonlyArray<S.Field>,
  budget: Budget
): S.DataType => {
  const table = () => t ?? invalid(`missing type table for type ${typeId}`)
  switch (typeId) {
    case TypeId.Null:
      return { _tag: "Null" }
    case TypeId.Int:
      return intType(table())
    case TypeId.FloatingPoint: {
      const precision = table().int16(0)
      const bitWidth = precision === 0
        ? 16
        : precision === 1
        ? 32
        : precision === 2
        ? 64
        : invalid(`invalid precision ${precision}`)
      return { _tag: "Float", bitWidth }
    }
    case TypeId.Binary:
      return { _tag: "Binary" }
    case TypeId.Utf8:
      return { _tag: "Utf8" }
    case TypeId.Bool:
      return { _tag: "Bool" }
    case TypeId.Decimal: {
      const d = table()
      const bitWidth = d.int32(2, 128)
      if (bitWidth !== 32 && bitWidth !== 64 && bitWidth !== 128 && bitWidth !== 256) {
        invalid(`invalid decimal bit width ${bitWidth}`)
      }
      const type: S.Decimal = { _tag: "Decimal", precision: d.int32(0), scale: d.int32(1), bitWidth }
      Layout.checkDecimal(type, invalid)
      return type
    }
    case TypeId.Date:
      return { _tag: "Date", unit: enumValue(dateUnits, table().int16(0, 1), "date unit") }
    case TypeId.Time: {
      const tt = table()
      const unit = enumValue(timeUnits, tt.int16(0, 1), "time unit")
      const bitWidth = tt.int32(1, 32)
      const expected = unit === "second" || unit === "millisecond" ? 32 : 64
      if (bitWidth !== expected) invalid(`time ${unit} needs bit width ${expected}, got ${bitWidth}`)
      return { _tag: "Time", unit, bitWidth: expected }
    }
    case TypeId.Timestamp: {
      const ts = table()
      const timezone = stringOf(budget, ts, 1)
      return { _tag: "Timestamp", unit: enumValue(timeUnits, ts.int16(0), "time unit"), timezone }
    }
    case TypeId.Interval:
      return { _tag: "Interval", unit: enumValue(intervalUnits, table().int16(0), "interval unit") }
    case TypeId.List:
      return { _tag: "List", child: one(children, "List") }
    case TypeId.Struct:
      return { _tag: "Struct", fields: children }
    case TypeId.Union: {
      const u = table()
      const mode = u.int16(0)
      if (mode !== 0 && mode !== 1) invalid(`invalid union mode ${mode}`)
      const typeIds = int32s(u, 1) ?? children.map((_, i) => i)
      Layout.checkUnionTypeIds(typeIds, children.length, invalid)
      return { _tag: "Union", mode: mode === 0 ? "sparse" : "dense", fields: children, typeIds }
    }
    case TypeId.FixedSizeBinary: {
      const byteWidth = table().int32(0)
      if (byteWidth < 0) invalid(`invalid byte width ${byteWidth}`)
      return { _tag: "FixedSizeBinary", byteWidth }
    }
    case TypeId.FixedSizeList: {
      const listSize = table().int32(0)
      if (listSize < 0) invalid(`invalid list size ${listSize}`)
      return { _tag: "FixedSizeList", child: one(children, "FixedSizeList"), listSize }
    }
    case TypeId.Map: {
      const entries = one(children, "Map")
      if (entries.type._tag !== "Struct" || entries.type.fields.length !== 2) {
        invalid("Map entries must be a struct of two fields")
      }
      return { _tag: "Map", entries, keysSorted: table().bool(0) }
    }
    case TypeId.Duration:
      return { _tag: "Duration", unit: enumValue(timeUnits, table().int16(0, 1), "time unit") }
    case TypeId.LargeBinary:
      return { _tag: "LargeBinary" }
    case TypeId.LargeUtf8:
      return { _tag: "LargeUtf8" }
    case TypeId.LargeList:
      return { _tag: "LargeList", child: one(children, "LargeList") }
    case TypeId.RunEndEncoded: {
      if (children.length !== 2) invalid(`RunEndEncoded needs two children, got ${children.length}`)
      const runEnds = children[0].type
      if (runEnds._tag !== "Int" || !runEnds.signed || runEnds.bitWidth === 8) {
        invalid("run ends must be int16, int32 or int64")
      }
      return { _tag: "RunEndEncoded", runEnds: children[0], values: children[1] }
    }
    case TypeId.BinaryView:
      return { _tag: "BinaryView" }
    case TypeId.Utf8View:
      return { _tag: "Utf8View" }
    case TypeId.ListView:
      return { _tag: "ListView", child: one(children, "ListView") }
    case TypeId.LargeListView:
      return { _tag: "LargeListView", child: one(children, "LargeListView") }
    default:
      return invalid(`unknown type id ${typeId}`)
  }
}

const decodeField = (t: Fb.Table, depth: number, budget: Budget): S.Field => {
  if (depth > maxDepth) invalid(`fields nested deeper than ${maxDepth}`)
  spend(budget, 1)
  const children = tables(t, 5).map((c) => decodeField(c, depth + 1, budget))
  let type = decodeType(t.uint8(2), t.table(3), children, budget)
  const dict = t.table(4)
  if (dict !== undefined) {
    const indexType = dict.has(1)
      ? intType(dict.table(1))
      : { _tag: "Int" as const, bitWidth: 32 as const, signed: true }
    const id = int53(dict.int64(0), "dictionary id")
    type = { _tag: "Dictionary", id, indexType, valueType: type, ordered: dict.bool(2) }
  }
  return { name: stringOf(budget, t, 0) ?? "", type, nullable: t.bool(1), metadata: metadataOf(t, 6, budget) }
}

const decodeSchema = (t: Fb.Table, budget: Budget): SchemaMessage => {
  const endianness = t.int16(0)
  const features = int64s(t, 3, "feature") ?? []
  return {
    _tag: "Schema",
    schema: { fields: tables(t, 1).map((f) => decodeField(f, 0, budget)), metadata: metadataOf(t, 2, budget) },
    endianness: endianness === 1 ? "big" : "little",
    features
  }
}

const structs = <A>(table: Fb.Table, slot: number, size: number, read: (s: Fb.Struct) => A): Array<A> =>
  vectorOf(table, slot, size, (v, i) => read(v.struct(i))) ?? []

const decodeRecordBatch = (t: Fb.Table): RecordBatchMessage => {
  const nodes = structs(t, 1, 16, (s): FieldNode => ({
    length: int53(s.int64(0), "field node length"),
    nullCount: int53(s.int64(8), "field node null count")
  }))
  const buffers = structs(t, 2, 16, (s): BufferRef => ({
    offset: int53(s.int64(0), "buffer offset"),
    length: int53(s.int64(8), "buffer length")
  }))
  const compression = t.table(3)
  let codec: RecordBatchMessage["compression"]
  if (compression !== undefined) {
    const c = compression.uint8(0)
    codec = c === 0 ? "lz4Frame" : c === 1 ? "zstd" : invalid(`unknown compression codec ${c}`)
  }
  return {
    _tag: "RecordBatch",
    length: int53(t.int64(0), "record batch length"),
    nodes,
    buffers,
    compression: codec,
    variadicBufferCounts: int64s(t, 4, "variadic buffer count") ?? []
  }
}

const messageOf = (t: Fb.Table, budget: Budget): Message => {
  const headerType = t.uint8(1)
  const headerTable = t.table(2)
  let header: Message["header"]
  switch (headerType) {
    case MessageHeader.Schema:
      header = decodeSchema(headerTable ?? invalid("missing Schema header"), budget)
      break
    case MessageHeader.RecordBatch:
      header = decodeRecordBatch(headerTable ?? invalid("missing RecordBatch header"))
      break
    case MessageHeader.DictionaryBatch: {
      const d = headerTable ?? invalid("missing DictionaryBatch header")
      header = {
        _tag: "DictionaryBatch",
        id: int53(d.int64(0), "dictionary id"),
        data: decodeRecordBatch(d.table(1) ?? invalid("missing dictionary data")),
        isDelta: d.bool(2)
      }
      break
    }
    default:
      header = { _tag: "Other", headerType }
  }
  return {
    version: t.int16(0),
    header,
    bodyLength: int53(t.int64(3), "body length"),
    metadata: metadataOf(t, 4, budget)
  }
}

/** Decodes an IPC `Message` FlatBuffer. @internal */
export const decodeMessage = (bytes: Uint8Array): Message => decodeFlatBuffer(bytes, "message metadata", messageOf)

const footerOf = (t: Fb.Table, budget: Budget): Footer => {
  const blocks = (slot: number) =>
    structs(t, slot, 24, (s): Block => ({
      offset: int53(s.int64(0), "block offset"),
      metaDataLength: s.int32(8),
      bodyLength: int53(s.int64(16), "block body length")
    }))
  return {
    version: t.int16(0),
    schema: decodeSchema(t.table(1) ?? invalid("footer without schema"), budget),
    dictionaries: blocks(2),
    recordBatches: blocks(3),
    metadata: metadataOf(t, 4, budget)
  }
}

/** Decodes an IPC file `Footer` FlatBuffer. @internal */
export const decodeFooter = (bytes: Uint8Array): Footer => decodeFlatBuffer(bytes, "footer", footerOf)

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

const encodeMetadata = (b: Fb.Builder, metadata: ReadonlyMap<string, string>): Fb.Offset => {
  if (metadata.size === 0) return 0
  const pairs: Array<Fb.Offset> = []
  for (const [k, v] of metadata) {
    const key = b.createString(k)
    const value = b.createString(v)
    b.startTable(2)
    b.addFieldOffset(0, key)
    b.addFieldOffset(1, value)
    pairs.push(b.endTable())
  }
  return b.createOffsetVector(pairs)
}

const encodeInt = (b: Fb.Builder, t: S.Int): Fb.Offset => {
  b.startTable(2)
  b.addFieldInt32(0, t.bitWidth)
  b.addFieldBool(1, t.signed)
  return b.endTable()
}

/** The Schema.fbs `union Type` index of `type` (a dictionary's is its value type's). */
const typeIdOf = (type: S.DataType): number =>
  type._tag === "Dictionary"
    ? typeIdOf(type.valueType)
    : type._tag === "Float"
    ? TypeId.FloatingPoint
    : TypeId[type._tag]

/** Writes the type table of `type` (a dictionary's is its value type's). */
const encodeType = (b: Fb.Builder, type: S.DataType): Fb.Offset => {
  switch (type._tag) {
    case "Null":
    case "Binary":
    case "Utf8":
    case "Bool":
    case "LargeBinary":
    case "BinaryView":
    case "LargeUtf8":
    case "Utf8View":
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "Struct":
    case "RunEndEncoded":
      b.startTable(0)
      return b.endTable()
    case "Int":
      return encodeInt(b, type)
    case "Float":
      b.startTable(1)
      b.addFieldInt16(0, type.bitWidth === 16 ? 0 : type.bitWidth === 32 ? 1 : 2)
      return b.endTable()
    case "Decimal":
      b.startTable(3)
      b.addFieldInt32(0, type.precision)
      b.addFieldInt32(1, type.scale)
      b.addFieldInt32(2, type.bitWidth, 128)
      return b.endTable()
    case "Date":
      b.startTable(1)
      b.addFieldInt16(0, dateUnits.indexOf(type.unit), 1)
      return b.endTable()
    case "Time":
      b.startTable(2)
      b.addFieldInt16(0, timeUnits.indexOf(type.unit), 1)
      b.addFieldInt32(1, type.bitWidth, 32)
      return b.endTable()
    case "Timestamp": {
      const tz = type.timezone === undefined ? 0 : b.createString(type.timezone)
      b.startTable(2)
      b.addFieldInt16(0, timeUnits.indexOf(type.unit))
      b.addFieldOffset(1, tz)
      return b.endTable()
    }
    case "Duration":
      b.startTable(1)
      b.addFieldInt16(0, timeUnits.indexOf(type.unit), 1)
      return b.endTable()
    case "Interval":
      b.startTable(1)
      b.addFieldInt16(0, intervalUnits.indexOf(type.unit))
      return b.endTable()
    case "FixedSizeBinary":
      b.startTable(1)
      b.addFieldInt32(0, type.byteWidth)
      return b.endTable()
    case "FixedSizeList":
      b.startTable(1)
      b.addFieldInt32(0, type.listSize)
      return b.endTable()
    case "Map":
      b.startTable(1)
      b.addFieldBool(0, type.keysSorted)
      return b.endTable()
    case "Union": {
      const typeIds = createVector(b, type.typeIds, 4, (id) => b.addInt32(id))
      b.startTable(2)
      b.addFieldInt16(0, type.mode === "sparse" ? 0 : 1)
      b.addFieldOffset(1, typeIds)
      return b.endTable()
    }
    case "Dictionary":
      return encodeType(b, type.valueType)
  }
}

/** The child fields a type is written with. @internal */
export const childFields = (type: S.DataType): ReadonlyArray<S.Field> => {
  switch (type._tag) {
    case "List":
    case "LargeList":
    case "ListView":
    case "LargeListView":
    case "FixedSizeList":
      return [type.child]
    case "Struct":
    case "Union":
      return type.fields
    case "Map":
      return [type.entries]
    case "RunEndEncoded":
      return [type.runEnds, type.values]
    case "Dictionary":
      return childFields(type.valueType)
    default:
      return []
  }
}

const encodeField = (b: Fb.Builder, field: S.Field): Fb.Offset => {
  const name = b.createString(field.name)
  const typeOffset = encodeType(b, field.type)
  let dictionary = 0
  if (field.type._tag === "Dictionary") {
    const indexType = encodeInt(b, field.type.indexType)
    b.startTable(4)
    b.addFieldInt64(0, BigInt(field.type.id))
    b.addFieldOffset(1, indexType)
    b.addFieldBool(2, field.type.ordered)
    dictionary = b.endTable()
  }
  const children = b.createOffsetVector(childFields(field.type).map((c) => encodeField(b, c)))
  const metadata = encodeMetadata(b, field.metadata)
  b.startTable(7)
  b.addFieldOffset(0, name)
  b.addFieldBool(1, field.nullable)
  b.addFieldUint8(2, typeIdOf(field.type))
  b.addFieldOffset(3, typeOffset)
  b.addFieldOffset(4, dictionary)
  b.addFieldOffset(5, children)
  b.addFieldOffset(6, metadata)
  return b.endTable()
}

const encodeSchema = (b: Fb.Builder, schema: S.Schema): Fb.Offset => {
  const fields = b.createOffsetVector(schema.fields.map((f) => encodeField(b, f)))
  const metadata = encodeMetadata(b, schema.metadata)
  // Endianness (slot 0) is left at its default, little-endian.
  b.startTable(4)
  b.addFieldOffset(1, fields)
  b.addFieldOffset(2, metadata)
  return b.endTable()
}

/** @internal */
export type RecordBatchHeader = Omit<RecordBatchMessage, "_tag" | "compression">

/** Writes a vector of `size`-byte scalars or structs; `write` writes one item, last field first. */
const createVector = <A>(
  b: Fb.Builder,
  items: ReadonlyArray<A>,
  size: number,
  write: (item: A) => void
): Fb.Offset => {
  b.startVector(size, items.length, Math.min(size, 8))
  for (let i = items.length - 1; i >= 0; i--) write(items[i])
  return b.endVector()
}

const encodeRecordBatch = (b: Fb.Builder, r: RecordBatchHeader): Fb.Offset => {
  const nodes = createVector(b, r.nodes, 16, (n) => {
    b.addInt64(BigInt(n.nullCount))
    b.addInt64(BigInt(n.length))
  })
  const buffers = createVector(b, r.buffers, 16, (buf) => {
    b.addInt64(BigInt(buf.length))
    b.addInt64(BigInt(buf.offset))
  })
  let variadic = 0
  if (r.variadicBufferCounts.length > 0) {
    variadic = createVector(b, r.variadicBufferCounts, 8, (n) => b.addInt64(BigInt(n)))
  }
  b.startTable(5)
  b.addFieldInt64(0, BigInt(r.length))
  b.addFieldOffset(1, nodes)
  b.addFieldOffset(2, buffers)
  b.addFieldOffset(4, variadic)
  return b.endTable()
}

/** The header of a message to encode. @internal */
export type EncodeHeader =
  | { readonly _tag: "Schema"; readonly schema: S.Schema }
  | { readonly _tag: "RecordBatch"; readonly batch: RecordBatchHeader }
  | { readonly _tag: "DictionaryBatch"; readonly id: number; readonly batch: RecordBatchHeader }

/** Encodes an IPC `Message` FlatBuffer (version V5). @internal */
export const encodeMessage = (header: EncodeHeader, bodyLength: number): Uint8Array => {
  const b = Fb.makeBuilder()
  let headerType: number
  let headerOffset: Fb.Offset
  switch (header._tag) {
    case "Schema":
      headerType = MessageHeader.Schema
      headerOffset = encodeSchema(b, header.schema)
      break
    case "RecordBatch":
      headerType = MessageHeader.RecordBatch
      headerOffset = encodeRecordBatch(b, header.batch)
      break
    case "DictionaryBatch": {
      const data = encodeRecordBatch(b, header.batch)
      b.startTable(3)
      b.addFieldInt64(0, BigInt(header.id))
      b.addFieldOffset(1, data)
      headerType = MessageHeader.DictionaryBatch
      headerOffset = b.endTable()
      break
    }
  }
  b.startTable(5)
  b.addFieldInt16(0, MetadataVersion.V5)
  b.addFieldUint8(1, headerType)
  b.addFieldOffset(2, headerOffset)
  b.addFieldInt64(3, BigInt(bodyLength))
  return b.finish(b.endTable())
}

/** Encodes an IPC file `Footer` FlatBuffer. @internal */
export const encodeFooter = (
  schema: S.Schema,
  dictionaries: ReadonlyArray<Block>,
  recordBatches: ReadonlyArray<Block>
): Uint8Array => {
  const b = Fb.makeBuilder()
  const schemaOffset = encodeSchema(b, schema)
  const block = (blk: Block) => {
    b.addInt64(BigInt(blk.bodyLength))
    b.pad(4)
    b.addInt32(blk.metaDataLength)
    b.addInt64(BigInt(blk.offset))
  }
  const dicts = createVector(b, dictionaries, 24, block)
  const batches = createVector(b, recordBatches, 24, block)
  b.startTable(5)
  b.addFieldInt16(0, MetadataVersion.V5)
  b.addFieldOffset(1, schemaOffset)
  b.addFieldOffset(2, dicts)
  b.addFieldOffset(3, batches)
  return b.finish(b.endTable())
}
