/**
 * The Arrow IPC metadata tables (format/Schema.fbs, Message.fbs, File.fbs),
 * decoded from and encoded to FlatBuffers by hand. Field slots follow the
 * declaration order in the .fbs files.
 *
 * @internal
 */
import type * as S from "../ArrowSchema.ts"
import * as Fb from "./flatbuffers.ts"

/** @internal */
export const MetadataVersion = { V1: 0, V2: 1, V3: 2, V4: 3, V5: 4 } as const

/** @internal */
export const MessageHeader = {
  None: 0,
  Schema: 1,
  DictionaryBatch: 2,
  RecordBatch: 3,
  Tensor: 4,
  SparseTensor: 5
} as const

/** Schema.fbs `union Type` indices. @internal */
export const TypeId = {
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

const fail = (message: string): never => {
  throw new Fb.FlatBufferError(message)
}

const enumValue = <A>(values: ReadonlyArray<A>, n: number, what: string): A =>
  n >= 0 && n < values.length ? values[n] : fail(`unknown ${what} ${n}`)

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

const metadataOf = (table: Fb.Table, slot: number): ReadonlyMap<string, string> => {
  const pairs = table.tables(slot)
  const out = new Map<string, string>()
  for (const kv of pairs) out.set(kv.string(0) ?? "", kv.string(1) ?? "")
  return out
}

const intType = (t: Fb.Table | undefined): S.Int => {
  if (t === undefined) return fail("missing Int table")
  const bitWidth = t.int32(0)
  if (bitWidth !== 8 && bitWidth !== 16 && bitWidth !== 32 && bitWidth !== 64) fail(`invalid int bit width ${bitWidth}`)
  return { _tag: "Int", bitWidth: bitWidth as S.Int["bitWidth"], signed: t.bool(1) }
}

const one = (children: ReadonlyArray<S.Field>, what: string): S.Field =>
  children.length === 1 ? children[0] : fail(`${what} needs exactly one child, got ${children.length}`)

const decodeType = (typeId: number, t: Fb.Table | undefined, children: ReadonlyArray<S.Field>): S.DataType => {
  const table = () => t ?? fail(`missing type table for type ${typeId}`)
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
        : fail(`invalid precision ${precision}`)
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
        fail(`invalid decimal bit width ${bitWidth}`)
      }
      return { _tag: "Decimal", precision: d.int32(0), scale: d.int32(1), bitWidth: bitWidth as S.Decimal["bitWidth"] }
    }
    case TypeId.Date:
      return { _tag: "Date", unit: enumValue(dateUnits, table().int16(0, 1), "date unit") }
    case TypeId.Time: {
      const tt = table()
      const unit = enumValue(timeUnits, tt.int16(0, 1), "time unit")
      const bitWidth = tt.int32(1, 32)
      const expected = unit === "second" || unit === "millisecond" ? 32 : 64
      if (bitWidth !== expected) fail(`time ${unit} needs bit width ${expected}, got ${bitWidth}`)
      return { _tag: "Time", unit, bitWidth: expected }
    }
    case TypeId.Timestamp: {
      const ts = table()
      return { _tag: "Timestamp", unit: enumValue(timeUnits, ts.int16(0), "time unit"), timezone: ts.string(1) }
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
      if (mode !== 0 && mode !== 1) fail(`invalid union mode ${mode}`)
      const typeIds = u.int32s(1) ?? children.map((_, i) => i)
      if (typeIds.length !== children.length) {
        fail(`union has ${children.length} members but ${typeIds.length} type ids`)
      }
      for (const id of typeIds) if (id < 0 || id > 127) fail(`invalid union type id ${id}`)
      return { _tag: "Union", mode: mode === 0 ? "sparse" : "dense", fields: children, typeIds }
    }
    case TypeId.FixedSizeBinary: {
      const byteWidth = table().int32(0)
      if (byteWidth < 0) fail(`invalid byte width ${byteWidth}`)
      return { _tag: "FixedSizeBinary", byteWidth }
    }
    case TypeId.FixedSizeList: {
      const listSize = table().int32(0)
      if (listSize < 0) fail(`invalid list size ${listSize}`)
      return { _tag: "FixedSizeList", child: one(children, "FixedSizeList"), listSize }
    }
    case TypeId.Map: {
      const entries = one(children, "Map")
      if (entries.type._tag !== "Struct" || entries.type.fields.length !== 2) {
        fail("Map entries must be a struct of two fields")
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
      if (children.length !== 2) fail(`RunEndEncoded needs two children, got ${children.length}`)
      const runEnds = children[0].type
      if (runEnds._tag !== "Int" || !runEnds.signed || runEnds.bitWidth === 8) {
        fail("run ends must be int16, int32 or int64")
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
      return fail(`unknown type id ${typeId}`)
  }
}

const decodeField = (t: Fb.Table, depth: number): S.Field => {
  if (depth > maxDepth) fail(`fields nested deeper than ${maxDepth}`)
  const children = t.tables(5).map((c) => decodeField(c, depth + 1))
  let type = decodeType(t.uint8(2), t.table(3), children)
  const dict = t.table(4)
  if (dict !== undefined) {
    const indexType = dict.has(1)
      ? intType(dict.table(1))
      : { _tag: "Int" as const, bitWidth: 32 as const, signed: true }
    type = { _tag: "Dictionary", id: dict.int64(0), indexType, valueType: type, ordered: dict.bool(2) }
  }
  return { name: t.string(0) ?? "", type, nullable: t.bool(1), metadata: metadataOf(t, 6) }
}

const decodeSchema = (t: Fb.Table): SchemaMessage => {
  const endianness = t.int16(0)
  const features = t.int64s(3) ?? []
  return {
    _tag: "Schema",
    schema: { fields: t.tables(1).map((f) => decodeField(f, 0)), metadata: metadataOf(t, 2) },
    endianness: endianness === 1 ? "big" : "little",
    features
  }
}

const decodeRecordBatch = (t: Fb.Table): RecordBatchMessage => {
  const nodesVector = t.vector(1, 16)
  const nodes: Array<FieldNode> = []
  if (nodesVector !== undefined) {
    for (let i = 0; i < nodesVector.length; i++) {
      const at = nodesVector.start + i * 16
      nodes.push({ length: Fb.structInt64(t.view, at), nullCount: Fb.structInt64(t.view, at + 8) })
    }
  }
  const buffersVector = t.vector(2, 16)
  const buffers: Array<BufferRef> = []
  if (buffersVector !== undefined) {
    for (let i = 0; i < buffersVector.length; i++) {
      const at = buffersVector.start + i * 16
      buffers.push({ offset: Fb.structInt64(t.view, at), length: Fb.structInt64(t.view, at + 8) })
    }
  }
  const compression = t.table(3)
  let codec: RecordBatchMessage["compression"]
  if (compression !== undefined) {
    const c = compression.uint8(0)
    codec = c === 0 ? "lz4Frame" : c === 1 ? "zstd" : fail(`unknown compression codec ${c}`)
  }
  return {
    _tag: "RecordBatch",
    length: t.int64(0),
    nodes,
    buffers,
    compression: codec,
    variadicBufferCounts: t.int64s(4) ?? []
  }
}

/** Decodes an IPC `Message` FlatBuffer. @internal */
export const decodeMessage = (bytes: Uint8Array): Message => {
  const t = Fb.root(bytes)
  const headerType = t.uint8(1)
  const headerTable = t.table(2)
  let header: Message["header"]
  switch (headerType) {
    case MessageHeader.Schema:
      header = decodeSchema(headerTable ?? fail("missing Schema header"))
      break
    case MessageHeader.RecordBatch:
      header = decodeRecordBatch(headerTable ?? fail("missing RecordBatch header"))
      break
    case MessageHeader.DictionaryBatch: {
      const d = headerTable ?? fail("missing DictionaryBatch header")
      header = {
        _tag: "DictionaryBatch",
        id: d.int64(0),
        data: decodeRecordBatch(d.table(1) ?? fail("missing dictionary data")),
        isDelta: d.bool(2)
      }
      break
    }
    default:
      header = { _tag: "Other", headerType }
  }
  return { version: t.int16(0), header, bodyLength: t.int64(3), metadata: metadataOf(t, 4) }
}

/** Decodes an IPC file `Footer` FlatBuffer. @internal */
export const decodeFooter = (bytes: Uint8Array): Footer => {
  const t = Fb.root(bytes)
  const blocks = (slot: number): Array<Block> => {
    const v = t.vector(slot, 24)
    const out: Array<Block> = []
    if (v === undefined) return out
    for (let i = 0; i < v.length; i++) {
      const at = v.start + i * 24
      out.push({
        offset: Fb.structInt64(t.view, at),
        metaDataLength: t.view.getInt32(at + 8, true),
        bodyLength: Fb.structInt64(t.view, at + 16)
      })
    }
    return out
  }
  return {
    version: t.int16(0),
    schema: decodeSchema(t.table(1) ?? fail("footer without schema")),
    dictionaries: blocks(2),
    recordBatches: blocks(3),
    metadata: metadataOf(t, 4)
  }
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

const encodeMetadata = (b: Fb.Builder, metadata: ReadonlyMap<string, string>): number | undefined => {
  if (metadata.size === 0) return undefined
  const pairs: Array<number> = []
  for (const [k, v] of metadata) {
    const key = b.string(k)
    const value = b.string(v)
    b.startTable(2)
    b.fieldOffset(0, key)
    b.fieldOffset(1, value)
    pairs.push(b.endTable())
  }
  return b.offsetVector(pairs)
}

const encodeInt = (b: Fb.Builder, t: S.Int): number => {
  b.startTable(2)
  b.fieldInt32(0, t.bitWidth, 0)
  b.fieldBool(1, t.signed, false)
  return b.endTable()
}

const emptyTable = (b: Fb.Builder): number => {
  b.startTable(0)
  return b.endTable()
}

/** Writes the type table and returns `[typeId, offset]`. */
const encodeType = (b: Fb.Builder, type: S.DataType): readonly [number, number] => {
  switch (type._tag) {
    case "Null":
      return [TypeId.Null, emptyTable(b)]
    case "Int":
      return [TypeId.Int, encodeInt(b, type)]
    case "Float":
      b.startTable(1)
      b.fieldInt16(0, type.bitWidth === 16 ? 0 : type.bitWidth === 32 ? 1 : 2, 0)
      return [TypeId.FloatingPoint, b.endTable()]
    case "Binary":
      return [TypeId.Binary, emptyTable(b)]
    case "Utf8":
      return [TypeId.Utf8, emptyTable(b)]
    case "Bool":
      return [TypeId.Bool, emptyTable(b)]
    case "Decimal":
      b.startTable(3)
      b.fieldInt32(0, type.precision, 0)
      b.fieldInt32(1, type.scale, 0)
      b.fieldInt32(2, type.bitWidth, 128)
      return [TypeId.Decimal, b.endTable()]
    case "Date":
      b.startTable(1)
      b.fieldInt16(0, dateUnits.indexOf(type.unit), 1)
      return [TypeId.Date, b.endTable()]
    case "Time":
      b.startTable(2)
      b.fieldInt16(0, timeUnits.indexOf(type.unit), 1)
      b.fieldInt32(1, type.bitWidth, 32)
      return [TypeId.Time, b.endTable()]
    case "Timestamp": {
      const tz = type.timezone === undefined ? undefined : b.string(type.timezone)
      b.startTable(2)
      b.fieldInt16(0, timeUnits.indexOf(type.unit), 0)
      b.fieldOffset(1, tz)
      return [TypeId.Timestamp, b.endTable()]
    }
    case "Duration":
      b.startTable(1)
      b.fieldInt16(0, timeUnits.indexOf(type.unit), 1)
      return [TypeId.Duration, b.endTable()]
    case "Interval":
      b.startTable(1)
      b.fieldInt16(0, intervalUnits.indexOf(type.unit), 0)
      return [TypeId.Interval, b.endTable()]
    case "LargeBinary":
      return [TypeId.LargeBinary, emptyTable(b)]
    case "BinaryView":
      return [TypeId.BinaryView, emptyTable(b)]
    case "FixedSizeBinary":
      b.startTable(1)
      b.fieldInt32(0, type.byteWidth, 0)
      return [TypeId.FixedSizeBinary, b.endTable()]
    case "LargeUtf8":
      return [TypeId.LargeUtf8, emptyTable(b)]
    case "Utf8View":
      return [TypeId.Utf8View, emptyTable(b)]
    case "List":
      return [TypeId.List, emptyTable(b)]
    case "LargeList":
      return [TypeId.LargeList, emptyTable(b)]
    case "ListView":
      return [TypeId.ListView, emptyTable(b)]
    case "LargeListView":
      return [TypeId.LargeListView, emptyTable(b)]
    case "FixedSizeList":
      b.startTable(1)
      b.fieldInt32(0, type.listSize, 0)
      return [TypeId.FixedSizeList, b.endTable()]
    case "Struct":
      return [TypeId.Struct, emptyTable(b)]
    case "Map":
      b.startTable(1)
      b.fieldBool(0, type.keysSorted, false)
      return [TypeId.Map, b.endTable()]
    case "Union": {
      const typeIds = b.int32Vector(type.typeIds)
      b.startTable(2)
      b.fieldInt16(0, type.mode === "sparse" ? 0 : 1, 0)
      b.fieldOffset(1, typeIds)
      return [TypeId.Union, b.endTable()]
    }
    case "RunEndEncoded":
      return [TypeId.RunEndEncoded, emptyTable(b)]
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

const encodeField = (b: Fb.Builder, field: S.Field): number => {
  const name = b.string(field.name)
  const [typeId, typeOffset] = encodeType(b, field.type)
  let dictionary: number | undefined
  if (field.type._tag === "Dictionary") {
    const indexType = encodeInt(b, field.type.indexType)
    b.startTable(4)
    b.fieldInt64(0, field.type.id, 0)
    b.fieldOffset(1, indexType)
    b.fieldBool(2, field.type.ordered, false)
    dictionary = b.endTable()
  }
  const children = b.offsetVector(childFields(field.type).map((c) => encodeField(b, c)))
  const metadata = encodeMetadata(b, field.metadata)
  b.startTable(7)
  b.fieldOffset(0, name)
  b.fieldBool(1, field.nullable, false)
  b.fieldInt8(2, typeId, 0)
  b.fieldOffset(3, typeOffset)
  b.fieldOffset(4, dictionary)
  b.fieldOffset(5, children)
  b.fieldOffset(6, metadata)
  return b.endTable()
}

const encodeSchema = (b: Fb.Builder, schema: S.Schema): number => {
  const fields = b.offsetVector(schema.fields.map((f) => encodeField(b, f)))
  const metadata = encodeMetadata(b, schema.metadata)
  b.startTable(4)
  b.fieldInt16(0, 0, 0) // little endian
  b.fieldOffset(1, fields)
  b.fieldOffset(2, metadata)
  return b.endTable()
}

/** @internal */
export interface RecordBatchHeader {
  readonly length: number
  readonly nodes: ReadonlyArray<FieldNode>
  readonly buffers: ReadonlyArray<BufferRef>
  readonly variadicBufferCounts: ReadonlyArray<number>
}

const encodeRecordBatch = (b: Fb.Builder, r: RecordBatchHeader): number => {
  const nodes = b.structVector(r.nodes, 16, 8, (n) => {
    b.structInt64(n.nullCount)
    b.structInt64(n.length)
  })
  const buffers = b.structVector(r.buffers, 16, 8, (buf) => {
    b.structInt64(buf.length)
    b.structInt64(buf.offset)
  })
  const variadic = r.variadicBufferCounts.length > 0 ? b.int64Vector(r.variadicBufferCounts) : undefined
  b.startTable(5)
  b.fieldInt64(0, r.length, 0)
  b.fieldOffset(1, nodes)
  b.fieldOffset(2, buffers)
  b.fieldOffset(4, variadic)
  return b.endTable()
}

/** The header of a message to encode. @internal */
export type EncodeHeader =
  | { readonly _tag: "Schema"; readonly schema: S.Schema }
  | { readonly _tag: "RecordBatch"; readonly batch: RecordBatchHeader }
  | {
    readonly _tag: "DictionaryBatch"
    readonly id: number
    readonly batch: RecordBatchHeader
    readonly isDelta: boolean
  }

/** Encodes an IPC `Message` FlatBuffer (version V5). @internal */
export const encodeMessage = (header: EncodeHeader, bodyLength: number): Uint8Array => {
  const b = new Fb.Builder()
  let headerType: number
  let headerOffset: number
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
      b.fieldInt64(0, header.id, 0)
      b.fieldOffset(1, data)
      b.fieldBool(2, header.isDelta, false)
      headerType = MessageHeader.DictionaryBatch
      headerOffset = b.endTable()
      break
    }
  }
  b.startTable(5)
  b.fieldInt16(0, MetadataVersion.V5, 0)
  b.fieldInt8(1, headerType, 0)
  b.fieldOffset(2, headerOffset)
  b.fieldInt64(3, bodyLength, 0)
  return b.finish(b.endTable())
}

/** Encodes an IPC file `Footer` FlatBuffer. @internal */
export const encodeFooter = (
  schema: S.Schema,
  dictionaries: ReadonlyArray<Block>,
  recordBatches: ReadonlyArray<Block>
): Uint8Array => {
  const b = new Fb.Builder()
  const schemaOffset = encodeSchema(b, schema)
  const block = (blk: Block) => {
    b.structInt64(blk.bodyLength)
    b.structPad(4)
    b.structInt32(blk.metaDataLength)
    b.structInt64(blk.offset)
  }
  const dicts = b.structVector(dictionaries, 24, 8, block)
  const batches = b.structVector(recordBatches, 24, 8, block)
  b.startTable(5)
  b.fieldInt16(0, MetadataVersion.V5, 0)
  b.fieldOffset(1, schemaOffset)
  b.fieldOffset(2, dicts)
  b.fieldOffset(3, batches)
  return b.finish(b.endTable())
}
