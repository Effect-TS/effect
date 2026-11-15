/**
 * A minimal FlatBuffers reader and builder for the Arrow IPC metadata
 * (format/Schema.fbs, Message.fbs, File.fbs). Hand-written per table in
 * `format.ts`; no generated code and no dependency.
 *
 * Wire format (https://flatbuffers.dev/internals/):
 * - The buffer starts with a `uoffset` (u32) to the root table.
 * - A table starts with an `soffset` (i32): the vtable is at `table - soffset`.
 * - A vtable is `u16 vtableSize, u16 tableSize, u16 fieldOffset[...]`; a field
 *   offset of 0, or a slot past the vtable, means the field is absent.
 * - Strings, vectors and sub-tables are referenced by a `uoffset` relative to
 *   the position of the field holding it, always pointing forward.
 * - A vector is `u32 length` followed by its elements; a string is a vector of
 *   bytes followed by a NUL.
 *
 * Every read is bounds-checked against the buffer, so malformed or hostile
 * metadata throws a {@link FlatBufferError} instead of reading out of range.
 *
 * @internal
 */

/** @internal */
export class FlatBufferError extends Error {
  override readonly name = "FlatBufferError"
}

const fail = (message: string): never => {
  throw new FlatBufferError(message)
}

const utf8 = new TextDecoder("utf-8", { fatal: true })

/**
 * A view of one table inside a FlatBuffer.
 *
 * @internal
 */
export class Table {
  readonly view: DataView
  readonly bytes: Uint8Array
  readonly position: number
  private readonly vtable: number
  private readonly vtableSize: number

  constructor(bytes: Uint8Array, view: DataView, position: number) {
    this.bytes = bytes
    this.view = view
    this.position = position
    checkRange(view, position, 4)
    const vtable = position - view.getInt32(position, true)
    checkRange(view, vtable, 4)
    const vtableSize = view.getUint16(vtable, true)
    if (vtableSize < 4 || (vtableSize & 1) !== 0) fail(`invalid vtable size ${vtableSize}`)
    checkRange(view, vtable, vtableSize)
    this.vtable = vtable
    this.vtableSize = vtableSize
  }

  /** Absolute position of field `slot`, or -1 when absent. */
  offset(slot: number): number {
    const entry = 4 + slot * 2
    if (entry >= this.vtableSize) return -1
    const relative = this.view.getUint16(this.vtable + entry, true)
    return relative === 0 ? -1 : this.position + relative
  }

  has(slot: number): boolean {
    return this.offset(slot) !== -1
  }

  bool(slot: number, fallback = false): boolean {
    const at = this.offset(slot)
    if (at === -1) return fallback
    checkRange(this.view, at, 1)
    return this.view.getUint8(at) !== 0
  }

  uint8(slot: number, fallback = 0): number {
    const at = this.offset(slot)
    if (at === -1) return fallback
    checkRange(this.view, at, 1)
    return this.view.getUint8(at)
  }

  int16(slot: number, fallback = 0): number {
    const at = this.offset(slot)
    if (at === -1) return fallback
    checkRange(this.view, at, 2)
    return this.view.getInt16(at, true)
  }

  int32(slot: number, fallback = 0): number {
    const at = this.offset(slot)
    if (at === -1) return fallback
    checkRange(this.view, at, 4)
    return this.view.getInt32(at, true)
  }

  /** A 64-bit integer that must fit a safe JavaScript number. */
  int64(slot: number, fallback = 0): number {
    const at = this.offset(slot)
    if (at === -1) return fallback
    checkRange(this.view, at, 8)
    return safe(this.view.getBigInt64(at, true))
  }

  table(slot: number): Table | undefined {
    const at = this.offset(slot)
    return at === -1 ? undefined : new Table(this.bytes, this.view, indirect(this.view, at))
  }

  string(slot: number): string | undefined {
    const at = this.offset(slot)
    if (at === -1) return undefined
    const start = indirect(this.view, at)
    checkRange(this.view, start, 4)
    const length = this.view.getUint32(start, true)
    checkRange(this.view, start + 4, length)
    try {
      return utf8.decode(this.bytes.subarray(start + 4, start + 4 + length))
    } catch {
      return fail(`string at ${start} is not valid UTF-8`)
    }
  }

  /** Position and length of a vector, after checking it fits `elementSize` bytes per element. */
  vector(slot: number, elementSize: number): { readonly start: number; readonly length: number } | undefined {
    const at = this.offset(slot)
    if (at === -1) return undefined
    const start = indirect(this.view, at)
    checkRange(this.view, start, 4)
    const length = this.view.getUint32(start, true)
    checkRange(this.view, start + 4, length * elementSize)
    return { start: start + 4, length }
  }

  tables(slot: number): Array<Table> {
    const v = this.vector(slot, 4)
    if (v === undefined) return []
    const out = new Array<Table>(v.length)
    for (let i = 0; i < v.length; i++) {
      out[i] = new Table(this.bytes, this.view, indirect(this.view, v.start + i * 4))
    }
    return out
  }

  int32s(slot: number): Array<number> | undefined {
    const v = this.vector(slot, 4)
    if (v === undefined) return undefined
    const out = new Array<number>(v.length)
    for (let i = 0; i < v.length; i++) out[i] = this.view.getInt32(v.start + i * 4, true)
    return out
  }

  int64s(slot: number): Array<number> | undefined {
    const v = this.vector(slot, 8)
    if (v === undefined) return undefined
    const out = new Array<number>(v.length)
    for (let i = 0; i < v.length; i++) out[i] = safe(this.view.getBigInt64(v.start + i * 8, true))
    return out
  }
}

const checkRange = (view: DataView, at: number, size: number) => {
  if (at < 0 || size < 0 || at + size > view.byteLength) {
    fail(`offset ${at} + ${size} is outside the ${view.byteLength}-byte buffer`)
  }
}

const indirect = (view: DataView, at: number): number => {
  checkRange(view, at, 4)
  return at + view.getUint32(at, true)
}

const safe = (n: bigint): number => {
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER)) {
    fail(`64-bit value ${n} is out of the safe integer range`)
  }
  return Number(n)
}

/**
 * Reads 64-bit little-endian integers from a struct field without bigints.
 *
 * @internal
 */
export const structInt64 = (view: DataView, at: number): number => {
  checkRange(view, at, 8)
  return safe(view.getBigInt64(at, true))
}

/** @internal */
export const root = (bytes: Uint8Array): Table => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  checkRange(view, 0, 4)
  return new Table(bytes, view, view.getUint32(0, true))
}

// -----------------------------------------------------------------------------
// Builder
// -----------------------------------------------------------------------------

/**
 * Builds a FlatBuffer back to front, as the format requires forward
 * offsets: children are written before the tables that refer to them.
 * Offsets returned by the builder count bytes from the end of the buffer.
 *
 * @internal
 */
export class Builder {
  private bytes: Uint8Array
  private view: DataView
  /** Index of the first written byte; data occupies `bytes[head..]`. */
  private head: number
  private maxAlign = 1
  private vtable: Array<number> = []
  private tableStart = 0
  private inTable = false

  constructor(initialSize = 1024) {
    this.bytes = new Uint8Array(initialSize)
    this.view = new DataView(this.bytes.buffer)
    this.head = initialSize
  }

  /** Current offset from the end. */
  get offset(): number {
    return this.bytes.length - this.head
  }

  private grow(needed: number) {
    let size = this.bytes.length
    while (size - this.offset < needed) size *= 2
    const next = new Uint8Array(size)
    next.set(this.bytes.subarray(this.head), size - this.offset)
    this.head = size - this.offset
    this.bytes = next
    this.view = new DataView(next.buffer)
  }

  /** Pads so that after writing `additional` bytes, a value of `size` is aligned. */
  prep(size: number, additional: number) {
    if (size > this.maxAlign) this.maxAlign = size
    const pad = (-(this.offset + additional)) & (size - 1)
    if (this.head < pad + additional + size) this.grow(pad + additional + size)
    for (let i = 0; i < pad; i++) this.bytes[--this.head] = 0
  }

  private putUint8(v: number) {
    this.bytes[--this.head] = v
  }
  private putInt16(v: number) {
    this.head -= 2
    this.view.setInt16(this.head, v, true)
  }
  private putInt32(v: number) {
    this.head -= 4
    this.view.setInt32(this.head, v, true)
  }
  private putInt64(v: number | bigint) {
    this.head -= 8
    this.view.setBigInt64(this.head, BigInt(v), true)
  }

  int8(v: number) {
    this.prep(1, 0)
    this.putUint8(v)
  }
  int16(v: number) {
    this.prep(2, 0)
    this.putInt16(v)
  }
  int32(v: number) {
    this.prep(4, 0)
    this.putInt32(v)
  }
  int64(v: number | bigint) {
    this.prep(8, 0)
    this.putInt64(v)
  }

  /** Writes a uoffset to `target` (an offset returned earlier). */
  uoffset(target: number) {
    this.prep(4, 0)
    this.putInt32(this.offset - target + 4)
  }

  string(s: string): number {
    const encoded = new TextEncoder().encode(s)
    this.prep(4, encoded.length + 1)
    this.putUint8(0)
    this.head -= encoded.length
    this.bytes.set(encoded, this.head)
    this.putInt32(encoded.length)
    return this.offset
  }

  /** Starts a vector of `length` elements of `elementSize` bytes; write elements last to first. */
  startVector(elementSize: number, length: number, alignment: number) {
    this.prep(4, elementSize * length)
    this.prep(alignment, elementSize * length)
  }

  endVector(length: number): number {
    this.prep(4, 0)
    this.putInt32(length)
    return this.offset
  }

  offsetVector(targets: ReadonlyArray<number>): number {
    this.startVector(4, targets.length, 4)
    for (let i = targets.length - 1; i >= 0; i--) this.uoffset(targets[i])
    return this.endVector(targets.length)
  }

  int32Vector(values: ReadonlyArray<number>): number {
    this.startVector(4, values.length, 4)
    for (let i = values.length - 1; i >= 0; i--) this.putInt32(values[i])
    return this.endVector(values.length)
  }

  int64Vector(values: ReadonlyArray<number | bigint>): number {
    this.startVector(8, values.length, 8)
    for (let i = values.length - 1; i >= 0; i--) this.putInt64(values[i])
    return this.endVector(values.length)
  }

  /** A vector of structs; `write` writes one struct (last to first). */
  structVector<A>(items: ReadonlyArray<A>, size: number, alignment: number, write: (item: A) => void): number {
    this.startVector(size, items.length, alignment)
    for (let i = items.length - 1; i >= 0; i--) write(items[i])
    return this.endVector(items.length)
  }

  /** Raw struct fields, written last to first by `structVector` callers. */
  structInt64(v: number | bigint) {
    this.prep(8, 0)
    this.putInt64(v)
  }
  structInt32(v: number) {
    this.prep(4, 0)
    this.putInt32(v)
  }
  structPad(n: number) {
    for (let i = 0; i < n; i++) this.putUint8(0)
  }

  startTable(fields: number) {
    if (this.inTable) throw new Error("nested startTable")
    this.inTable = true
    this.vtable = new Array(fields).fill(0)
    this.tableStart = this.offset
  }

  private slot(slot: number) {
    this.vtable[slot] = this.offset
  }

  fieldBool(slot: number, v: boolean, fallback: boolean) {
    if (v === fallback) return
    this.int8(v ? 1 : 0)
    this.slot(slot)
  }
  fieldInt8(slot: number, v: number, fallback: number) {
    if (v === fallback) return
    this.int8(v)
    this.slot(slot)
  }
  fieldInt16(slot: number, v: number, fallback: number) {
    if (v === fallback) return
    this.int16(v)
    this.slot(slot)
  }
  fieldInt32(slot: number, v: number, fallback: number) {
    if (v === fallback) return
    this.int32(v)
    this.slot(slot)
  }
  fieldInt64(slot: number, v: number | bigint, fallback: number) {
    if (Number(v) === fallback) return
    this.int64(v)
    this.slot(slot)
  }
  fieldOffset(slot: number, target: number | undefined) {
    if (target === undefined) return
    this.uoffset(target)
    this.slot(slot)
  }

  endTable(): number {
    if (!this.inTable) throw new Error("endTable without startTable")
    this.int32(0) // placeholder soffset to the vtable
    const table = this.offset
    let fields = this.vtable.length
    while (fields > 0 && this.vtable[fields - 1] === 0) fields--
    const vtableSize = 4 + fields * 2
    this.prep(2, vtableSize)
    for (let i = fields - 1; i >= 0; i--) {
      this.putInt16(this.vtable[i] === 0 ? 0 : table - this.vtable[i])
    }
    this.putInt16(table - this.tableStart)
    this.putInt16(vtableSize)
    const vtable = this.offset
    // soffset: table position minus vtable position (vtable precedes the table)
    this.view.setInt32(this.bytes.length - table, vtable - table, true)
    this.inTable = false
    return table
  }

  /** Writes the root offset and returns the finished bytes (aligned to `maxAlign`). */
  finish(root: number): Uint8Array {
    this.prep(this.maxAlign, 4)
    this.uoffset(root)
    return this.bytes.slice(this.head)
  }
}
