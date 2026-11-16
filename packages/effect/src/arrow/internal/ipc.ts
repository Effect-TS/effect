/**
 * Arrow IPC stream and file formats: reading (with full validation of
 * untrusted input) and writing. See "Serialization and Interprocess
 * Communication (IPC)" in Arrow's Columnar.rst.
 *
 * @internal
 */
import * as Bytes from "../../Bytes.ts"
import type * as ArrowData from "../ArrowData.ts"
import type * as S from "../ArrowSchema.ts"
import type * as ArrowTable from "../ArrowTable.ts"
import * as Buffers from "./buffers.ts"
import * as Format from "./format.ts"
import { invalid, IpcFailure } from "./format.ts"
import * as Layout from "./layout.ts"

const CONTINUATION = 0xFFFFFFFF
const MAGIC = new Uint8Array([0x41, 0x52, 0x52, 0x4F, 0x57, 0x31]) // "ARROW1"

// -----------------------------------------------------------------------------
// Reading messages
// -----------------------------------------------------------------------------

interface Encapsulated {
  readonly message: Format.Message
  readonly body: Uint8Array
}

/** Reads the encapsulated message at `position`, or `undefined` at end of stream. */
const readMessage = (bytes: Uint8Array, view: DataView, position: number): Encapsulated | undefined => {
  if (position === bytes.length) return undefined
  if (position + 4 > bytes.length) return invalid(`truncated message prefix at ${position}`)
  let metadataLength = view.getInt32(position, true)
  let start = position + 4
  if (metadataLength === -1) {
    if (position + 8 > bytes.length) return invalid(`truncated message length at ${position}`)
    metadataLength = view.getInt32(position + 4, true)
    start = position + 8
  }
  if (metadataLength === 0) return undefined
  if (metadataLength < 0 || start + metadataLength > bytes.length) {
    return invalid(`message metadata of ${metadataLength} bytes at ${start} is out of range`)
  }
  const message = Format.decodeMessage(bytes.subarray(start, start + metadataLength))
  const bodyStart = start + metadataLength
  if (message.bodyLength < 0 || bodyStart + message.bodyLength > bytes.length) {
    return invalid(`message body of ${message.bodyLength} bytes at ${bodyStart} is out of range`)
  }
  return { message, body: bytes.subarray(bodyStart, bodyStart + message.bodyLength) }
}

const checkVersion = (version: number) => {
  if (version < Format.MetadataVersion.V4) {
    throw new IpcFailure("Unsupported", `metadata version V${version + 1} is not supported (V4 and V5 are)`)
  }
  if (version > Format.MetadataVersion.V5) invalid(`unknown metadata version ${version}`)
}

const checkSchema = (schema: Format.SchemaMessage) => {
  if (schema.endianness === "big") {
    throw new IpcFailure("BigEndian", "big-endian data is not supported")
  }
}

const checkCompression = (batch: Format.RecordBatchMessage) => {
  if (batch.compression !== undefined) {
    throw new IpcFailure("Compression", `compressed bodies (${batch.compression}) are not supported`)
  }
}

// -----------------------------------------------------------------------------
// Loading record batch bodies
// -----------------------------------------------------------------------------

interface LoadContext {
  readonly batch: Format.RecordBatchMessage
  readonly body: Uint8Array
  readonly version: number
  readonly dictionaries: ReadonlyMap<number, ArrowData.ArrowData>
  node: number
  buffer: number
  variadic: number
}

const nextNode = (ctx: LoadContext): Format.FieldNode => {
  const node = ctx.batch.nodes[ctx.node++] ?? invalid("record batch has fewer field nodes than the schema needs")
  if (node.length < 0 || node.nullCount < 0 || node.nullCount > node.length) {
    invalid(`invalid field node: length ${node.length}, null count ${node.nullCount}`)
  }
  return node
}

const nextBuffer = (ctx: LoadContext): Uint8Array => {
  const ref = ctx.batch.buffers[ctx.buffer++] ?? invalid("record batch has fewer buffers than the schema needs")
  if (ref.offset < 0 || ref.length < 0 || ref.offset + ref.length > ctx.body.length) {
    invalid(`buffer at ${ref.offset} of ${ref.length} bytes is outside the ${ctx.body.length}-byte body`)
  }
  return ctx.body.subarray(ref.offset, ref.offset + ref.length)
}

const validityOf = (node: Format.FieldNode, buffer: Uint8Array): Uint8Array | undefined => {
  if (node.nullCount === 0) return undefined
  if (buffer.length * 8 < node.length) {
    invalid(`validity bitmap of ${buffer.length} bytes is too short for ${node.length} slots`)
  }
  return buffer
}

const data = (
  type: S.DataType,
  node: Format.FieldNode,
  validity: Uint8Array | undefined,
  buffers: ReadonlyArray<Uint8Array>,
  children: ReadonlyArray<ArrowData.ArrowData> = [],
  dictionary?: ArrowData.ArrowData
): ArrowData.ArrowData => ({
  type,
  length: node.length,
  offset: 0,
  nullCount: node.nullCount,
  validity,
  buffers,
  children,
  dictionary
})

/** Buffers after the validity bitmap, for the layouts `loadField` reads generically. */
const bufferCount = (type: S.DataType): number => {
  switch (type._tag) {
    case "Struct":
    case "FixedSizeList":
      return 0
    case "Binary":
    case "Utf8":
    case "LargeBinary":
    case "LargeUtf8":
    case "ListView":
    case "LargeListView":
      return 2
    default:
      return 1
  }
}

const loadField = (type: S.DataType, ctx: LoadContext): ArrowData.ArrowData => {
  const node = nextNode(ctx)
  switch (type._tag) {
    case "Dictionary": {
      const validity = validityOf(node, nextBuffer(ctx))
      const indices = nextBuffer(ctx)
      const dictionary = ctx.dictionaries.get(type.id)
      return data(type, node, validity, [indices], [], dictionary)
    }
    case "Null":
      return data(type, { length: node.length, nullCount: node.length }, undefined, [])
    case "Union": {
      // Before V5, unions had a validity bitmap of their own.
      const validity = ctx.version < Format.MetadataVersion.V5 ? validityOf(node, nextBuffer(ctx)) : undefined
      const buffers = type.mode === "sparse" ? [nextBuffer(ctx)] : [nextBuffer(ctx), nextBuffer(ctx)]
      const children = type.fields.map((f) => loadField(f.type, ctx))
      return data(
        type,
        validity === undefined ? { length: node.length, nullCount: 0 } : node,
        validity,
        buffers,
        children
      )
    }
    case "RunEndEncoded": {
      const children = [loadField(type.runEnds.type, ctx), loadField(type.values.type, ctx)]
      return data(type, { length: node.length, nullCount: 0 }, undefined, [], children)
    }
    case "BinaryView":
    case "Utf8View": {
      const validity = validityOf(node, nextBuffer(ctx))
      const views = nextBuffer(ctx)
      const count = ctx.batch.variadicBufferCounts[ctx.variadic++] ??
        invalid("record batch has fewer variadic buffer counts than view fields")
      if (count < 0 || count > ctx.batch.buffers.length) invalid(`invalid variadic buffer count ${count}`)
      const buffers = [views]
      for (let i = 0; i < count; i++) buffers.push(nextBuffer(ctx))
      return data(type, node, validity, buffers)
    }
    default: {
      const validity = validityOf(node, nextBuffer(ctx))
      const buffers = Array.from({ length: bufferCount(type) }, () => nextBuffer(ctx))
      return data(type, node, validity, buffers, Format.childFields(type).map((f) => loadField(f.type, ctx)))
    }
  }
}

const loadColumns = (
  types: ReadonlyArray<S.DataType>,
  batch: Format.RecordBatchMessage,
  body: Uint8Array,
  version: number,
  dictionaries: ReadonlyMap<number, ArrowData.ArrowData>
): Array<ArrowData.ArrowData> => {
  const ctx: LoadContext = { batch, body, version, dictionaries, node: 0, buffer: 0, variadic: 0 }
  const columns = types.map((t) => loadField(t, ctx))
  if (ctx.node !== batch.nodes.length) invalid("record batch has more field nodes than the schema needs")
  if (ctx.buffer !== batch.buffers.length) invalid("record batch has more buffers than the schema needs")
  if (ctx.variadic !== batch.variadicBufferCounts.length) {
    invalid("record batch has more variadic buffer counts than the schema needs")
  }
  for (const column of columns) {
    if (column.length !== batch.length) invalid(`column of length ${column.length} in a batch of ${batch.length} rows`)
    validate(column)
  }
  return columns
}

/** Every dictionary id in the schema, mapped to its value type. */
const dictionaryTypes = (fields: ReadonlyArray<S.Field>) => {
  const out = new Map<number, S.DataType>()
  const visit = (type: S.DataType) => {
    if (type._tag === "Dictionary") {
      if (!out.has(type.id)) out.set(type.id, type.valueType)
      visit(type.valueType)
      return
    }
    for (const child of Format.childFields(type)) visit(child.type)
  }
  for (const f of fields) visit(f.type)
  return out
}

/** Applies a dictionary batch to the current dictionaries. */
const applyDictionary = (
  header: Format.DictionaryBatchMessage,
  body: Uint8Array,
  version: number,
  types: ReadonlyMap<number, S.DataType>,
  dictionaries: Map<number, ArrowData.ArrowData>
) => {
  checkCompression(header.data)
  const valueType = types.get(header.id) ?? invalid(`dictionary batch for unknown id ${header.id}`)
  const [values] = loadColumns([valueType], header.data, body, version, dictionaries)
  const existing = dictionaries.get(header.id)
  if (header.isDelta && existing !== undefined) {
    try {
      dictionaries.set(header.id, Layout.concat(existing, values))
    } catch (e) {
      if (e instanceof Layout.LayoutFailure) throw new IpcFailure("Unsupported", e.message)
      throw e
    }
  } else {
    dictionaries.set(header.id, values)
  }
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

const maxSafe = BigInt(Number.MAX_SAFE_INTEGER)
const zero = BigInt(0)

/** Offsets as a typed array. */
const offsetsOf = (buffer: Uint8Array, large: boolean): Int32Array | BigInt64Array =>
  large ? Buffers.typed(BigInt64Array, buffer) : Buffers.typed(Int32Array, buffer)

const needBytes = (buffer: Uint8Array | undefined, bytes: number, what: string) => {
  if ((buffer?.length ?? 0) < bytes) invalid(`${what} has ${buffer?.length ?? 0} bytes, needs ${bytes}`)
}

/** Checks monotonic offsets for slots [offset, offset + length] within `limit`. */
const checkOffsets = (d: ArrowData.ArrowData, large: boolean, limit: number, what: string) => {
  if (d.length === 0) return
  const width = large ? 8 : 4
  const first = d.offset
  const last = d.offset + d.length
  needBytes(d.buffers[0], (last + 1) * width, `${what} offsets`)
  if (large) {
    const a = Buffers.typed(BigInt64Array, d.buffers[0])
    let previous = a[first]
    if (previous < zero) invalid(`${what} offset ${previous} is negative`)
    for (let i = first + 1; i <= last; i++) {
      const next = a[i]
      if (next < previous) invalid(`${what} offsets decrease at slot ${i}`)
      previous = next
    }
    if (previous > maxSafe || Number(previous) > limit) invalid(`${what} offsets end at ${previous}, past ${limit}`)
    return
  }
  const a = Buffers.typed(Int32Array, d.buffers[0])
  let previous = a[first]
  if (previous < 0) invalid(`${what} offset ${previous} is negative`)
  for (let i = first + 1; i <= last; i++) {
    const next = a[i]
    if (next < previous) invalid(`${what} offsets decrease at slot ${i}`)
    previous = next
  }
  if (previous > limit) invalid(`${what} offsets end at ${previous}, past ${limit}`)
}

// Dictionary index checks live in small functions of one array type each,
// which V8 optimises far better than one loop over every typed array kind.

/** The first slot in [from, to) whose index is outside [0, size), or -1. */
const firstBadIndex32 = (a: Int32Array, from: number, to: number, size: number): number => {
  for (let i = from; i < to; i++) {
    const index = a[i]
    if (index < 0 || index >= size) return i
  }
  return -1
}

const firstBadIndex = (a: ArrayLike<number>, from: number, to: number, size: number): number => {
  for (let i = from; i < to; i++) {
    const index = a[i]
    if (index < 0 || index >= size) return i
  }
  return -1
}

const isSlotValid = (d: ArrowData.ArrowData, i: number) =>
  d.validity === undefined || (d.validity[(d.offset + i) >> 3] & (1 << ((d.offset + i) & 7))) !== 0

/** The typed array matching an integer type. */
const intArray = (type: S.Int, bytes: Uint8Array) => {
  switch (type.bitWidth) {
    case 8:
      return type.signed ? Buffers.typed(Int8Array, bytes) : bytes
    case 16:
      return type.signed ? Buffers.typed(Int16Array, bytes) : Buffers.typed(Uint16Array, bytes)
    case 32:
      return type.signed ? Buffers.typed(Int32Array, bytes) : Buffers.typed(Uint32Array, bytes)
    case 64:
      return type.signed ? Buffers.typed(BigInt64Array, bytes) : Buffers.typed(BigUint64Array, bytes)
  }
}

/**
 * Checks that every buffer is large enough and every offset, index and view
 * stays in range, so that reading any slot is safe.
 */
const validate = (d: ArrowData.ArrowData): void => {
  const type = d.type
  const end = d.offset + d.length
  switch (type._tag) {
    case "Null":
      return
    case "Bool":
      needBytes(d.buffers[0], Math.ceil(end / 8), "bool values")
      return
    case "Int":
    case "Float":
    case "Decimal":
    case "Date":
    case "Time":
    case "Timestamp":
    case "Duration":
    case "Interval":
    case "FixedSizeBinary":
      needBytes(d.buffers[0], end * Layout.fixedWidth(type), `${type._tag} values`)
      return
    case "Binary":
    case "Utf8":
    case "LargeBinary":
    case "LargeUtf8":
      checkOffsets(d, type._tag === "LargeBinary" || type._tag === "LargeUtf8", d.buffers[1]?.length ?? 0, type._tag)
      return
    case "BinaryView":
    case "Utf8View": {
      needBytes(d.buffers[0], end * 16, "views")
      // Views are 16-byte aligned within their buffer: [size, prefix|inline…, buffer index, offset].
      const views = Buffers.typed(Int32Array, d.buffers[0])
      for (let i = 0; i < d.length; i++) {
        if (!isSlotValid(d, i)) continue
        const at = (d.offset + i) * 4
        const size = views[at]
        if (size < 0) invalid(`view size ${size} is negative`)
        if (size > 12) {
          const index = views[at + 2]
          const offset = views[at + 3]
          const buffer = d.buffers[1 + index]
          if (index < 0 || buffer === undefined) invalid(`view refers to missing data buffer ${index}`)
          if (offset < 0 || offset + size > buffer.length) invalid(`view ${offset}+${size} is outside its data buffer`)
          for (let byte = 0; byte < 4; byte++) {
            if (d.buffers[0][at * 4 + 4 + byte] !== buffer[offset + byte]) {
              invalid("view prefix differs from its data buffer")
            }
          }
        }
      }
      return
    }
    case "List":
    case "LargeList":
    case "Map": {
      const child = d.children[0] ?? invalid(`${type._tag} without child data`)
      checkOffsets(d, type._tag === "LargeList", child.length, type._tag)
      validate(child)
      return
    }
    case "ListView":
    case "LargeListView": {
      const child = d.children[0] ?? invalid(`${type._tag} without child data`)
      const large = type._tag === "LargeListView"
      needBytes(d.buffers[0], end * (large ? 8 : 4), "list view offsets")
      needBytes(d.buffers[1], end * (large ? 8 : 4), "list view sizes")
      const offsets = offsetsOf(d.buffers[0], large)
      const sizes = offsetsOf(d.buffers[1], large)
      for (let i = 0; i < d.length; i++) {
        if (!isSlotValid(d, i)) continue
        const o = Number(offsets[d.offset + i])
        const s = Number(sizes[d.offset + i])
        if (o < 0 || s < 0 || o + s > child.length) invalid(`list view ${o}+${s} is outside its ${child.length} items`)
      }
      validate(child)
      return
    }
    case "FixedSizeList": {
      const child = d.children[0] ?? invalid("FixedSizeList without child data")
      if (child.length < end * type.listSize) {
        invalid(`fixed-size list needs ${end * type.listSize} items, has ${child.length}`)
      }
      validate(child)
      return
    }
    case "Struct": {
      if (d.children.length !== type.fields.length) invalid("struct child count differs from its type")
      for (const child of d.children) {
        if (child.length < end) invalid(`struct child of length ${child.length} is shorter than ${end}`)
        validate(child)
      }
      return
    }
    case "Union": {
      if (d.children.length !== type.fields.length) invalid("union child count differs from its type")
      needBytes(d.buffers[0], end, "union type ids")
      const ids = Buffers.typed(Int8Array, d.buffers[0])
      const memberOf = new Int8Array(128).fill(-1)
      type.typeIds.forEach((code, k) => (memberOf[code] = k))
      const dense = type.mode === "dense"
      if (dense) needBytes(d.buffers[1], end * 4, "union offsets")
      const offsets = dense ? Buffers.typed(Int32Array, d.buffers[1]) : undefined
      const lengths = d.children.map((c) => c.length)
      for (let i = d.offset; i < end; i++) {
        const code = ids[i]
        const member = code < 0 ? -1 : memberOf[code]
        if (member === -1) invalid(`union slot ${i} has unknown type id ${code}`)
        const at = offsets === undefined ? i : offsets[i]
        if (at < 0 || at >= lengths[member]) {
          invalid(`union slot ${i} points to ${at}, outside ${lengths[member]} values`)
        }
      }
      for (const child of d.children) validate(child)
      return
    }
    case "RunEndEncoded": {
      const [runs, values] = d.children
      if (runs === undefined || values === undefined) invalid("run-end encoded data needs two children")
      if (runs.nullCount !== 0) invalid("run ends must not be null")
      if (runs.length !== values.length) invalid("run ends and values differ in length")
      validate(runs)
      validate(values)
      if (d.length === 0) return
      const ends = intArray(runs.type as S.Int, runs.buffers[0])
      let previous = 0
      for (let i = 0; i < runs.length; i++) {
        const run = Number(ends[runs.offset + i])
        if (run <= previous) invalid("run ends must be positive and strictly increasing")
        previous = run
      }
      if (previous < end) invalid(`run ends stop at ${previous}, before ${end}`)
      return
    }
    case "Dictionary": {
      // All-null arrays may precede their dictionary in a stream. A missing
      // dictionary has no valid indices; the slot checks below still reject any
      // non-null index, independently of the declared null count.
      const dictionary = d.dictionary
      const width = type.indexType.bitWidth / 8
      needBytes(d.buffers[0], end * width, "dictionary indices")
      const size = dictionary?.length ?? 0
      const indices = intArray(type.indexType, d.buffers[0])
      // Null slots may hold any index, so an out-of-range index only fails in a valid slot.
      if (width === 8) {
        const limit = BigInt(size)
        for (let i = 0; i < d.length; i++) {
          const index = (indices as BigInt64Array)[d.offset + i]
          if ((index < zero || index >= limit) && isSlotValid(d, i)) {
            invalid(`dictionary index ${index} is outside ${size} values`)
          }
        }
        return
      }
      const check = indices instanceof Int32Array ? firstBadIndex32 : firstBadIndex
      let from = d.offset
      for (;;) {
        const bad = check(indices as Int32Array, from, end, size)
        if (bad === -1) return
        if (isSlotValid(d, bad - d.offset)) {
          invalid(`dictionary index ${(indices as Int32Array)[bad]} is outside ${size} values`)
        }
        from = bad + 1
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

interface ReadState {
  readonly schema: S.Schema
  readonly types: ReadonlyMap<number, S.DataType>
  readonly fieldTypes: ReadonlyArray<S.DataType>
  readonly dictionaries: Map<number, ArrowData.ArrowData>
}

const readState = (message: Format.SchemaMessage): ReadState => {
  checkSchema(message)
  const schema = message.schema
  return {
    schema,
    types: dictionaryTypes(schema.fields),
    fieldTypes: schema.fields.map((f) => f.type),
    dictionaries: new Map()
  }
}

const readBatch = (
  state: ReadState,
  header: Format.RecordBatchMessage,
  body: Uint8Array,
  version: number
): ArrowTable.RecordBatch => {
  checkCompression(header)
  const columns = loadColumns(state.fieldTypes, header, body, version, state.dictionaries)
  return { schema: state.schema, length: header.length, columns }
}

/**
 * Decodes the IPC stream format incrementally: bytes are pushed in chunks of
 * any size, and every complete message is decoded as soon as it is there. A
 * message within one chunk is read in place; only a message that spans
 * chunks is joined into one buffer. @internal
 */
export class StreamDecoder {
  private chunks: Array<Uint8Array> = []
  private available = 0
  private ended = false
  private state: ReadState | undefined
  /** The message whose metadata is decoded and whose body is not all there yet. */
  private pending: { readonly message: Format.Message; readonly bodyStart: number; readonly total: number } | undefined

  push(chunk: Uint8Array): void {
    if (this.ended || chunk.length === 0) return
    this.chunks.push(chunk)
    this.available += chunk.length
  }

  /** The first `n` bytes as one buffer: a view when they lie in one chunk, a copy otherwise. */
  private contiguous(n: number): Uint8Array {
    const first = this.chunks[0]
    if (first.length >= n) return first.subarray(0, n)
    const out = new Uint8Array(n)
    let at = 0
    for (const chunk of this.chunks) {
      const take = Math.min(chunk.length, n - at)
      out.set(chunk.subarray(0, take), at)
      at += take
      if (at === n) break
    }
    return out
  }

  private consume(n: number): void {
    this.available -= n
    while (n > 0) {
      const first = this.chunks[0]
      if (first.length <= n) {
        n -= first.length
        this.chunks.shift()
      } else {
        this.chunks[0] = first.subarray(n)
        n = 0
      }
    }
  }

  /** Decodes every complete message, adding record batches to `out`. */
  drain(out: Array<ArrowTable.RecordBatch>): void {
    while (!this.ended && this.available >= 4) {
      // The metadata is decoded once, however many chunks its body arrives in.
      let pending = this.pending
      if (pending === undefined) {
        const head = this.contiguous(Math.min(8, this.available))
        const view = new DataView(head.buffer, head.byteOffset, head.byteLength)
        let metadataLength = view.getInt32(0, true)
        let start = 4
        if (metadataLength === -1) {
          if (head.length < 8) return
          metadataLength = view.getInt32(4, true)
          start = 8
        }
        if (metadataLength === 0) {
          this.ended = true
          this.chunks = []
          this.available = 0
          return
        }
        if (metadataLength < 0) invalid(`invalid message metadata length ${metadataLength}`)
        const bodyStart = start + metadataLength
        if (this.available < bodyStart) return
        const message = Format.decodeMessage(this.contiguous(bodyStart).subarray(start))
        if (message.bodyLength < 0) invalid(`invalid body length ${message.bodyLength}`)
        pending = this.pending = { message, bodyStart, total: bodyStart + message.bodyLength }
      }
      if (this.available < pending.total) return
      const body = this.contiguous(pending.total).subarray(pending.bodyStart)
      this.consume(pending.total)
      this.pending = undefined
      this.apply(pending.message, body, out)
    }
  }

  private apply(message: Format.Message, body: Uint8Array, out: Array<ArrowTable.RecordBatch>): void {
    const { header, version } = message
    checkVersion(version)
    const state = this.state
    if (state === undefined) {
      if (header._tag !== "Schema") invalid(`stream starts with ${header._tag}, not Schema`)
      this.state = readState(header)
      return
    }
    switch (header._tag) {
      case "DictionaryBatch":
        applyDictionary(header, body, version, state.types, state.dictionaries)
        return
      case "RecordBatch":
        out.push(readBatch(state, header, body, version))
        return
      case "Schema":
        return invalid("a stream holds exactly one Schema message")
      default:
        throw new IpcFailure("Unsupported", `message header type ${header.headerType}`)
    }
  }

  /**
   * Call when the input has ended: returns the schema, or fails on an empty
   * stream or a partial message.
   */
  finish(): S.Schema {
    const state = this.state ?? invalid("empty stream")
    if (!this.ended && this.available > 0) invalid(`stream ends inside a message (${this.available} bytes left)`)
    return state.schema
  }
}

/** @internal */
export const decodeStream = (bytes: Uint8Array): ArrowTable.Table => {
  const decoder = new StreamDecoder()
  const batches: Array<ArrowTable.RecordBatch> = []
  decoder.push(bytes)
  decoder.drain(batches)
  return { schema: decoder.finish(), batches }
}

const hasMagic = (bytes: Uint8Array, at: number) => {
  for (let i = 0; i < MAGIC.length; i++) if (bytes[at + i] !== MAGIC[i]) return false
  return true
}

/** @internal */
export const decodeFile = (bytes: Uint8Array): ArrowTable.Table => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 6 + 2 + 4 + 6 || !hasMagic(bytes, 0) || !hasMagic(bytes, bytes.length - 6)) {
    invalid("missing ARROW1 magic")
  }
  const footerLength = view.getInt32(bytes.length - 10, true)
  const footerStart = bytes.length - 10 - footerLength
  if (footerLength <= 0 || footerStart < 8) invalid(`invalid footer length ${footerLength}`)
  const footer = Format.decodeFooter(bytes.subarray(footerStart, footerStart + footerLength))
  // The footer version is not checked: older writers left it unset (V1) and
  // versioned only the messages, which are checked one by one.
  const state = readState(footer.schema)
  const blockMessage = (block: Format.Block) => {
    if (block.offset < 8 || block.offset + block.metaDataLength + block.bodyLength > footerStart) {
      invalid(`block at ${block.offset} is outside the file`)
    }
    const message = readMessage(bytes.subarray(0, footerStart), view, block.offset) ??
      invalid(`no message at ${block.offset}`)
    checkVersion(message.message.version)
    return message
  }
  const defined = new Set<number>()
  for (const block of footer.dictionaries) {
    const { body, message } = blockMessage(block)
    const header = message.header
    if (header._tag !== "DictionaryBatch") invalid(`dictionary block holds ${header._tag}`)
    if (!header.isDelta) {
      if (defined.has(header.id)) invalid(`the file format cannot replace dictionary ${header.id}`)
      defined.add(header.id)
    }
    applyDictionary(header, body, message.version, state.types, state.dictionaries)
  }
  const batches = footer.recordBatches.map((block) => {
    const { body, message } = blockMessage(block)
    const header = message.header
    if (header._tag !== "RecordBatch") invalid(`record batch block holds ${header._tag}`)
    return readBatch(state, header, body, message.version)
  })
  return { schema: state.schema, batches }
}

// -----------------------------------------------------------------------------
// Writing
// -----------------------------------------------------------------------------

const pad8 = (n: number) => (n + 7) & ~7

interface BodyBuilder {
  readonly nodes: Array<Format.FieldNode>
  readonly buffers: Array<Uint8Array>
  readonly variadicBufferCounts: Array<number>
}

/** Adds the nodes and buffers of normalised (offset 0) data, in IPC order. */
const flatten = (d: ArrowData.ArrowData, out: BodyBuilder) => {
  const type = d.type
  const validity = () =>
    out.buffers.push(
      d.nullCount > 0 && d.validity !== undefined ? d.validity.subarray(0, Math.ceil(d.length / 8)) : new Uint8Array(0)
    )
  switch (type._tag) {
    case "Null":
      out.nodes.push({ length: d.length, nullCount: d.length })
      return
    case "Union":
      // V5, which this writer emits, has no union validity; only pre-V5 input has null union slots.
      if (d.nullCount > 0) throw new IpcFailure("Unsupported", "unions with null slots of their own cannot be written")
      out.nodes.push({ length: d.length, nullCount: 0 })
      for (const b of d.buffers) out.buffers.push(b)
      for (const c of d.children) flatten(c, out)
      return
    case "RunEndEncoded":
      out.nodes.push({ length: d.length, nullCount: 0 })
      for (const c of d.children) flatten(c, out)
      return
    case "BinaryView":
    case "Utf8View":
      out.nodes.push({ length: d.length, nullCount: d.nullCount })
      validity()
      for (const b of d.buffers) out.buffers.push(b)
      out.variadicBufferCounts.push(d.buffers.length - 1)
      return
    default:
      out.nodes.push({ length: d.length, nullCount: d.nullCount })
      validity()
      for (const b of d.buffers) out.buffers.push(b)
      for (const c of d.children) flatten(c, out)
  }
}

/**
 * An encoded message as parts: the framed metadata, then each body buffer
 * (a view of the table's own bytes, not a copy) followed by its padding to
 * eight bytes.
 */
interface Frame {
  readonly parts: ReadonlyArray<Uint8Array>
  readonly metaDataLength: number
  readonly bodyLength: number
}

const padding = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => new Uint8Array(n))

/** Frames one message: continuation, metadata length, padded metadata, padded body. */
const frame = (
  length: number,
  columns: ReadonlyArray<ArrowData.ArrowData>,
  header: (batch: Format.RecordBatchHeader) => Format.EncodeHeader
): Frame => {
  const body: BodyBuilder = { nodes: [], buffers: [], variadicBufferCounts: [] }
  for (const c of columns) flatten(c, body)
  const refs: Array<Format.BufferRef> = []
  let bodyLength = 0
  for (const b of body.buffers) {
    refs.push({ offset: bodyLength, length: b.length })
    bodyLength += pad8(b.length)
  }
  const metadata = Format.encodeMessage(
    header({ length, nodes: body.nodes, buffers: refs, variadicBufferCounts: body.variadicBufferCounts }),
    bodyLength
  )
  const metaDataLength = 8 + pad8(metadata.length)
  const prefix = new Uint8Array(metaDataLength)
  const view = new DataView(prefix.buffer)
  view.setUint32(0, CONTINUATION, true)
  view.setInt32(4, metaDataLength - 8, true)
  prefix.set(metadata, 8)
  const parts: Array<Uint8Array> = [prefix]
  for (const b of body.buffers) {
    parts.push(b)
    const pad = pad8(b.length) - b.length
    if (pad > 0) parts.push(padding[pad])
  }
  return { parts, metaDataLength, bodyLength }
}

/** Dictionaries used by `columns` (nested ones first), by id. */
const collectDictionaries = (columns: ReadonlyArray<ArrowData.ArrowData>) => {
  const out = new Map<number, ArrowData.ArrowData>()
  const visit = (d: ArrowData.ArrowData) => {
    if (d.type._tag === "Dictionary" && d.dictionary !== undefined) {
      visit(d.dictionary)
      const existing = out.get(d.type.id)
      if (existing !== undefined && existing !== d.dictionary) {
        throw new IpcFailure("Unsupported", `two different dictionaries with id ${d.type.id} in one batch`)
      }
      out.set(d.type.id, d.dictionary)
    }
    for (const c of d.children) visit(c)
  }
  for (const c of columns) visit(c)
  return out
}

const schemaMessage = (schema: S.Schema) => {
  for (const f of schema.fields) Layout.checkType(f.type, invalid)
  return frame(0, [], () => ({ _tag: "Schema", schema }))
}

const dictionaryMessage = (id: number, values: ArrowData.ArrowData) =>
  frame(values.length, [values], (batch) => ({ _tag: "DictionaryBatch", id, batch }))

const batchMessage = (length: number, columns: ReadonlyArray<ArrowData.ArrowData>) =>
  frame(length, columns, (batch) => ({ _tag: "RecordBatch", batch }))

/** A batch's columns with offset 0 throughout, as the IPC body needs. */
const normalizedColumns = (batch: ArrowTable.RecordBatch) => batch.columns.map(Layout.normalize)

const EOS = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0, 0, 0, 0])

/**
 * Encodes the IPC stream format batch by batch, as parts that reference the
 * batches' own buffers (no copy). @internal
 */
export class StreamEncoder {
  private readonly schema: S.Schema
  private started = false
  private readonly written = new Map<number, ArrowData.ArrowData>()

  constructor(schema: S.Schema) {
    this.schema = schema
  }

  /** The schema message, when nothing has been written yet. */
  private start(out: Array<Uint8Array>) {
    if (this.started) return
    this.started = true
    for (const p of schemaMessage(this.schema).parts) out.push(p)
  }

  write(batch: ArrowTable.RecordBatch, out: Array<Uint8Array>): void {
    this.start(out)
    const columns = normalizedColumns(batch)
    for (const [id, values] of collectDictionaries(columns)) {
      if (this.written.get(id) === values) continue
      for (const p of dictionaryMessage(id, values).parts) out.push(p)
      this.written.set(id, values)
    }
    for (const p of batchMessage(batch.length, columns).parts) out.push(p)
  }

  end(out: Array<Uint8Array>): void {
    this.start(out)
    out.push(EOS)
  }
}

/** @internal */
export const encodeStream = (table: ArrowTable.Table): Uint8Array => {
  const encoder = new StreamEncoder(table.schema)
  const parts: Array<Uint8Array> = []
  for (const batch of table.batches) encoder.write(batch, parts)
  encoder.end(parts)
  return Bytes.concat(parts)
}

/** @internal */
export const encodeFile = (table: ArrowTable.Table): Uint8Array => {
  const parts: Array<Uint8Array> = [new Uint8Array([...MAGIC, 0, 0])]
  let offset = 8
  const add = (f: Frame) => {
    for (const p of f.parts) parts.push(p)
    offset += f.metaDataLength + f.bodyLength
  }
  add(schemaMessage(table.schema))
  const dictionaries = new Map<number, ArrowData.ArrowData>()
  const batches = table.batches.map((batch) => ({ length: batch.length, columns: normalizedColumns(batch) }))
  for (const batch of batches) {
    for (const [id, values] of collectDictionaries(batch.columns)) {
      const existing = dictionaries.get(id)
      if (existing !== undefined && existing !== values) {
        throw new IpcFailure("Unsupported", `the file format cannot replace dictionary ${id}`)
      }
      dictionaries.set(id, values)
    }
  }
  const block = (f: Frame): Format.Block => {
    const b = { offset, metaDataLength: f.metaDataLength, bodyLength: f.bodyLength }
    add(f)
    return b
  }
  const dictionaryBlocks = Array.from(dictionaries, ([id, values]) => block(dictionaryMessage(id, values)))
  const batchBlocks = batches.map((batch) => block(batchMessage(batch.length, batch.columns)))
  const footer = Format.encodeFooter(table.schema, dictionaryBlocks, batchBlocks)
  const tail = new Uint8Array(10)
  new DataView(tail.buffer).setInt32(0, footer.length, true)
  tail.set(MAGIC, 4)
  parts.push(EOS, footer, tail)
  return Bytes.concat(parts)
}
