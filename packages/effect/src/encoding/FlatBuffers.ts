/**
 * Reads and writes the FlatBuffers binary format: tables, structs, vectors,
 * strings and unions, read in place without parsing the whole buffer.
 *
 * **Mental model**
 *
 * - A FlatBuffer is a tree of tables. A table's fields are numbered slots;
 *   a small vtable records where each present field is, so absent fields cost
 *   nothing and read as their default.
 * - This module knows nothing about schemas. The caller decides what each
 *   slot holds, as code generated from a `.fbs` schema does: read slot 0 as
 *   a string, slot 1 as a table, and so on.
 * - {@link Builder} writes a buffer back to front, children first: create
 *   strings, vectors and child tables, then the table that refers to them,
 *   and {@link Builder.finish} with the root table. The bytes it produces
 *   are the bytes the official FlatBuffers builders produce for the same
 *   calls.
 * - {@link root} gives the root {@link Table} of a buffer; its accessors read
 *   from the bytes on demand. {@link decode} runs a reading function and
 *   returns a `Result`.
 *
 * **Example** (Writing and reading a table)
 *
 * ```ts import.meta.vitest
 * import { FlatBuffers } from "effect/encoding"
 * import { Result } from "effect"
 *
 * // table Monster { name: string; hp: short = 100; inventory: [ubyte]; }
 * const builder = FlatBuffers.make()
 * const name = builder.createString("Orc")
 * const inventory = builder.createBytes(Uint8Array.of(1, 2, 3))
 * builder.startTable(3)
 * builder.addFieldOffset(0, name)
 * builder.addFieldInt16(1, 300, 100)
 * builder.addFieldOffset(2, inventory)
 * const bytes = builder.finish(builder.endTable(), { identifier: "MONS" })
 *
 * const monster = FlatBuffers.decode(bytes, (root) => ({
 *   name: root.string(0),
 *   hp: root.int16(1, 100),
 *   inventory: root.bytes(2)?.length
 * }), { identifier: "MONS" })
 *
 * Result.getOrThrow(monster) // => { name: "Orc", hp: 300, inventory: 3 }
 * ```
 *
 * **Details**
 *
 * Every read is bounds-checked: malformed or hostile input throws a
 * {@link FlatBuffersError} (or makes {@link decode} fail) instead of reading
 * outside the buffer. Strings must be valid UTF-8. 64-bit integers are
 * `bigint`s.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"

const FlatBuffersErrorTypeId = "~effect/encoding/FlatBuffers/FlatBuffersError"

/**
 * Error raised for a malformed buffer or a misused {@link Builder}.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `OutOfBounds`: an offset, length or value lies outside the buffer.
 * - `InvalidVtable`: a table's vtable has an impossible size.
 * - `InvalidUtf8`: a string is not valid UTF-8.
 * - `Identifier`: the buffer's file identifier is not the expected one.
 * - `Usage`: the builder was called out of order (a table inside a table, a
 *   struct that isn't the last thing written, an identifier that isn't four
 *   bytes) or the buffer would exceed 2 GiB.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class FlatBuffersError extends Data.TaggedError("FlatBuffersError")<{
  readonly kind: "OutOfBounds" | "InvalidVtable" | "InvalidUtf8" | "Identifier" | "Usage"
  readonly message: string
}> {
  /**
   * Marks this value as a FlatBuffers error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.5
   */
  readonly [FlatBuffersErrorTypeId] = FlatBuffersErrorTypeId
}

/**
 * Checks whether a value is a {@link FlatBuffersError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isFlatBuffersError = (u: unknown): u is FlatBuffersError =>
  Predicate.hasProperty(u, FlatBuffersErrorTypeId)

const fail = (kind: FlatBuffersError["kind"], message: string): never => {
  throw new FlatBuffersError({ kind, message })
}

const utf8 = new TextDecoder("utf-8", { fatal: true })
const encoder = new TextEncoder()

const check = (view: DataView, at: number, size: number): void => {
  if (at < 0 || size < 0 || at + size > view.byteLength) {
    fail("OutOfBounds", `${size} bytes at ${at} lie outside the ${view.byteLength}-byte buffer`)
  }
}

/** The absolute position a uoffset at `at` points to. */
const indirect = (view: DataView, at: number): number => {
  check(view, at, 4)
  return at + view.getUint32(at, true)
}

const readString = (bytes: Uint8Array, view: DataView, start: number): string => {
  check(view, start, 4)
  const length = view.getUint32(start, true)
  check(view, start + 4, length)
  try {
    return utf8.decode(bytes.subarray(start + 4, start + 4 + length))
  } catch {
    return fail("InvalidUtf8", `the string at ${start} is not valid UTF-8`)
  }
}

// -----------------------------------------------------------------------------
// Reading
// -----------------------------------------------------------------------------

/**
 * Reads fields at fixed byte offsets: the fields of a struct, stored inline
 * in a table or a vector.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export class Struct {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the struct starts in {@link buffer}. */
  readonly position: number
  private readonly view: DataView

  constructor(buffer: Uint8Array, view: DataView, position: number) {
    this.buffer = buffer
    this.view = view
    this.position = position
  }

  private at(offset: number, size: number): number {
    const at = this.position + offset
    check(this.view, at, size)
    return at
  }

  /** The `bool` at byte `offset` of the struct. */
  bool(offset: number): boolean {
    return this.view.getUint8(this.at(offset, 1)) !== 0
  }
  /** The `byte` at byte `offset` of the struct. */
  int8(offset: number): number {
    return this.view.getInt8(this.at(offset, 1))
  }
  /** The `ubyte` at byte `offset` of the struct. */
  uint8(offset: number): number {
    return this.view.getUint8(this.at(offset, 1))
  }
  /** The `short` at byte `offset` of the struct. */
  int16(offset: number): number {
    return this.view.getInt16(this.at(offset, 2), true)
  }
  /** The `ushort` at byte `offset` of the struct. */
  uint16(offset: number): number {
    return this.view.getUint16(this.at(offset, 2), true)
  }
  /** The `int` at byte `offset` of the struct. */
  int32(offset: number): number {
    return this.view.getInt32(this.at(offset, 4), true)
  }
  /** The `uint` at byte `offset` of the struct. */
  uint32(offset: number): number {
    return this.view.getUint32(this.at(offset, 4), true)
  }
  /** The `long` at byte `offset` of the struct. */
  int64(offset: number): bigint {
    return this.view.getBigInt64(this.at(offset, 8), true)
  }
  /** The `ulong` at byte `offset` of the struct. */
  uint64(offset: number): bigint {
    return this.view.getBigUint64(this.at(offset, 8), true)
  }
  /** The `float` at byte `offset` of the struct. */
  float32(offset: number): number {
    return this.view.getFloat32(this.at(offset, 4), true)
  }
  /** The `double` at byte `offset` of the struct. */
  float64(offset: number): number {
    return this.view.getFloat64(this.at(offset, 8), true)
  }
  /** The struct nested at byte `offset` of this struct. */
  struct(offset: number): Struct {
    return new Struct(this.buffer, this.view, this.position + offset)
  }
}

/**
 * The elements of a vector. Accessors take the element index; the caller
 * picks the accessor of the vector's element type.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export class Vector {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the first element starts in {@link buffer}. */
  readonly position: number
  /** The number of elements. */
  readonly length: number
  private readonly view: DataView

  constructor(buffer: Uint8Array, view: DataView, position: number, length: number) {
    this.buffer = buffer
    this.view = view
    this.position = position
    this.length = length
  }

  private at(index: number, size: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      fail("OutOfBounds", `index ${index} is outside the vector of length ${this.length}`)
    }
    const at = this.position + index * size
    check(this.view, at, size)
    return at
  }

  /** Element `index` of a `[bool]` vector. */
  bool(index: number): boolean {
    return this.view.getUint8(this.at(index, 1)) !== 0
  }
  /** Element `index` of a `[byte]` vector. */
  int8(index: number): number {
    return this.view.getInt8(this.at(index, 1))
  }
  /** Element `index` of a `[ubyte]` vector. */
  uint8(index: number): number {
    return this.view.getUint8(this.at(index, 1))
  }
  /** Element `index` of a `[short]` vector. */
  int16(index: number): number {
    return this.view.getInt16(this.at(index, 2), true)
  }
  /** Element `index` of a `[ushort]` vector. */
  uint16(index: number): number {
    return this.view.getUint16(this.at(index, 2), true)
  }
  /** Element `index` of an `[int]` vector. */
  int32(index: number): number {
    return this.view.getInt32(this.at(index, 4), true)
  }
  /** Element `index` of a `[uint]` vector. */
  uint32(index: number): number {
    return this.view.getUint32(this.at(index, 4), true)
  }
  /** Element `index` of a `[long]` vector. */
  int64(index: number): bigint {
    return this.view.getBigInt64(this.at(index, 8), true)
  }
  /** Element `index` of a `[ulong]` vector. */
  uint64(index: number): bigint {
    return this.view.getBigUint64(this.at(index, 8), true)
  }
  /** Element `index` of a `[float]` vector. */
  float32(index: number): number {
    return this.view.getFloat32(this.at(index, 4), true)
  }
  /** Element `index` of a `[double]` vector. */
  float64(index: number): number {
    return this.view.getFloat64(this.at(index, 8), true)
  }
  /** Element `index` of a `[string]` vector. */
  string(index: number): string {
    return readString(this.buffer, this.view, indirect(this.view, this.at(index, 4)))
  }
  /** Element `index` of a vector of tables. */
  table(index: number): Table {
    return new Table(this.buffer, this.view, indirect(this.view, this.at(index, 4)))
  }
  /** Element `index` of a vector of structs of `size` bytes. */
  struct(index: number, size: number): Struct {
    return new Struct(this.buffer, this.view, this.at(index, size))
  }
}

/**
 * A table: fields by slot number, read on demand. Absent fields read as
 * the given default.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export class Table {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the table starts in {@link buffer}. */
  readonly position: number
  private readonly view: DataView
  private readonly vtable: number
  private readonly vtableSize: number

  constructor(buffer: Uint8Array, view: DataView, position: number) {
    this.buffer = buffer
    this.view = view
    this.position = position
    check(view, position, 4)
    const vtable = position - view.getInt32(position, true)
    check(view, vtable, 4)
    const vtableSize = view.getUint16(vtable, true)
    if (vtableSize < 4 || (vtableSize & 1) !== 0) fail("InvalidVtable", `vtable at ${vtable} has size ${vtableSize}`)
    check(view, vtable, vtableSize)
    this.vtable = vtable
    this.vtableSize = vtableSize
  }

  /** The position of field `slot`, or -1 when it is absent. */
  private field(slot: number, size: number): number {
    const entry = 4 + slot * 2
    if (!Number.isInteger(slot) || slot < 0 || entry >= this.vtableSize) return -1
    const relative = this.view.getUint16(this.vtable + entry, true)
    if (relative === 0) return -1
    const at = this.position + relative
    check(this.view, at, size)
    return at
  }

  /** Whether field `slot` is present. */
  has(slot: number): boolean {
    return this.field(slot, 0) !== -1
  }
  /** The `bool` in `slot`. */
  bool(slot: number, fallback = false): boolean {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.view.getUint8(at) !== 0
  }
  /** The `byte` in `slot`. */
  int8(slot: number, fallback = 0): number {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.view.getInt8(at)
  }
  /** The `ubyte` in `slot`. */
  uint8(slot: number, fallback = 0): number {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.view.getUint8(at)
  }
  /** The `short` in `slot`. */
  int16(slot: number, fallback = 0): number {
    const at = this.field(slot, 2)
    return at === -1 ? fallback : this.view.getInt16(at, true)
  }
  /** The `ushort` in `slot`. */
  uint16(slot: number, fallback = 0): number {
    const at = this.field(slot, 2)
    return at === -1 ? fallback : this.view.getUint16(at, true)
  }
  /** The `int` in `slot`. */
  int32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.view.getInt32(at, true)
  }
  /** The `uint` in `slot`. */
  uint32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.view.getUint32(at, true)
  }
  /** The `long` in `slot`. */
  int64(slot: number, fallback: bigint = BigInt(0)): bigint {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.view.getBigInt64(at, true)
  }
  /** The `ulong` in `slot`. */
  uint64(slot: number, fallback: bigint = BigInt(0)): bigint {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.view.getBigUint64(at, true)
  }
  /** The `float` in `slot`. */
  float32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.view.getFloat32(at, true)
  }
  /** The `double` in `slot`. */
  float64(slot: number, fallback = 0): number {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.view.getFloat64(at, true)
  }
  /** The `string` in `slot`. */
  string(slot: number): string | undefined {
    const at = this.field(slot, 4)
    return at === -1 ? undefined : readString(this.buffer, this.view, indirect(this.view, at))
  }
  /** The table in `slot` (also the value of a union). */
  table(slot: number): Table | undefined {
    const at = this.field(slot, 4)
    return at === -1 ? undefined : new Table(this.buffer, this.view, indirect(this.view, at))
  }
  /** The struct of `size` bytes stored inline in `slot`. */
  struct(slot: number, size: number): Struct | undefined {
    const at = this.field(slot, size)
    return at === -1 ? undefined : new Struct(this.buffer, this.view, at)
  }
  /** The vector in `slot`, whose elements are `elementSize` bytes wide (4 for strings and tables). */
  vector(slot: number, elementSize: number): Vector | undefined {
    const at = this.field(slot, 4)
    if (at === -1) return undefined
    const start = indirect(this.view, at)
    check(this.view, start, 4)
    const length = this.view.getUint32(start, true)
    check(this.view, start + 4, length * elementSize)
    return new Vector(this.buffer, this.view, start + 4, length)
  }
  /** The `[ubyte]` (or `[byte]`) vector in `slot`, as a view of the buffer (also a nested FlatBuffer). */
  bytes(slot: number): Uint8Array | undefined {
    const v = this.vector(slot, 1)
    return v === undefined ? undefined : this.buffer.subarray(v.position, v.position + v.length)
  }
}

/**
 * Options of a buffer: an expected file identifier, and whether the buffer
 * starts with its size.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Options {
  /** The four-character file identifier the buffer must carry. */
  readonly identifier?: string | undefined
  /** Whether the buffer starts with its size (`FinishSizePrefixed`). */
  readonly sizePrefixed?: boolean | undefined
}

const identifierBytes = (identifier: string): Uint8Array => {
  const bytes = encoder.encode(identifier)
  return bytes.length === 4
    ? bytes
    : fail("Usage", `a file identifier is four bytes, got ${JSON.stringify(identifier)}`)
}

/**
 * The buffer's file identifier (the four bytes after the root offset), or
 * `undefined` when the buffer is too short to have one.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const identifier = (bytes: Uint8Array, options?: Pick<Options, "sizePrefixed">): string | undefined => {
  const at = options?.sizePrefixed ? 8 : 4
  if (bytes.length < at + 4) return undefined
  return String.fromCharCode(...bytes.subarray(at, at + 4))
}

/**
 * The root table of a buffer. Throws a {@link FlatBuffersError} when the
 * buffer is malformed or carries another file identifier; its accessors
 * throw for malformed fields.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const root = (bytes: Uint8Array, options?: Options): Table => {
  let data = bytes
  if (options?.sizePrefixed) {
    if (bytes.length < 4) fail("OutOfBounds", "a size-prefixed buffer needs at least 4 bytes")
    const size = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true)
    if (size > bytes.length - 4) {
      fail("OutOfBounds", `the size prefix ${size} exceeds the ${bytes.length - 4} bytes after it`)
    }
    data = bytes.subarray(4, 4 + size)
  }
  if (options?.identifier !== undefined) {
    const expected = identifierBytes(options.identifier)
    const actual = data.subarray(4, 8)
    if (actual.length !== 4 || actual.some((b, i) => b !== expected[i])) {
      fail("Identifier", `expected file identifier ${JSON.stringify(options.identifier)}`)
    }
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  check(view, 0, 4)
  return new Table(data, view, view.getUint32(0, true))
}

/**
 * Reads a buffer with `read`, which gets the root table. Malformed input
 * becomes a failed `Result` instead of an exception.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const decode = <A>(
  bytes: Uint8Array,
  read: (root: Table) => A,
  options?: Options
): Result.Result<A, FlatBuffersError> => {
  try {
    return Result.succeed(read(root(bytes, options)))
  } catch (cause) {
    if (isFlatBuffersError(cause)) return Result.fail(cause)
    throw cause
  }
}

// -----------------------------------------------------------------------------
// Writing
// -----------------------------------------------------------------------------

/**
 * The position of something written by a {@link Builder} (a string, vector
 * or table), counted from the end of the buffer.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Offset = number

const MAX_SIZE = 2 ** 31

/**
 * Writes a FlatBuffer back to front, as the official builders do: the same
 * calls give the same bytes.
 *
 * **Details**
 *
 * Children come first: create strings, vectors and child tables, keep their
 * {@link Offset}s, then start the table that refers to them. Between
 * {@link startTable} and {@link endTable}, add fields with the `addField*`
 * methods; a scalar equal to its default is not written (unless
 * `forceDefaults`). Identical vtables are written once and shared.
 *
 * Structs are written in place: write their fields last to first with the
 * `add*` methods (and {@link pad}) right before the call that refers to
 * them, {@link addFieldStruct} for a table field or inside a vector.
 *
 * Integers are written modulo their width; 64-bit values are `bigint`s.
 *
 * @stability experimental
 * @category writing
 * @since 4.1.5
 */
export class Builder {
  private bytes: Uint8Array
  private view: DataView
  /** Index of the first written byte: data is `bytes[head..]`. */
  private head: number
  private minAlign = 1
  private vtable: Array<number> | undefined = undefined
  private objectEnd = 0
  private readonly vtables = new Map<string, number>()
  private nested = false
  private vectorLength = 0
  private sharedStrings: Map<string, Offset> | undefined = undefined
  private readonly forceDefaults: boolean

  constructor(options?: { readonly initialSize?: number | undefined; readonly forceDefaults?: boolean | undefined }) {
    const size = Math.max(1, options?.initialSize ?? 1024)
    this.bytes = new Uint8Array(size)
    this.view = new DataView(this.bytes.buffer)
    this.head = size
    this.forceDefaults = options?.forceDefaults ?? false
  }

  /** The current position, counted from the end of the buffer. */
  get offset(): Offset {
    return this.bytes.length - this.head
  }

  private grow(): void {
    if (this.bytes.length >= MAX_SIZE) fail("Usage", "a FlatBuffer can't grow beyond 2 GiB")
    const size = Math.min(this.bytes.length * 2, MAX_SIZE)
    const next = new Uint8Array(size)
    next.set(this.bytes, size - this.bytes.length)
    this.head += size - this.bytes.length
    this.bytes = next
    this.view = new DataView(next.buffer)
  }

  /** Writes `n` zero bytes. */
  pad(n: number): void {
    for (let i = 0; i < n; i++) this.bytes[--this.head] = 0
  }

  /**
   * Pads so that a value of `size` bytes, written after `additional` more
   * bytes, is aligned to `size`; makes room for both.
   */
  prep(size: number, additional: number): void {
    if (size > this.minAlign) this.minAlign = size
    const alignSize = (~(this.bytes.length - this.head + additional) + 1) & (size - 1)
    while (this.head < alignSize + size + additional) this.grow()
    this.pad(alignSize)
  }

  /** Writes a `bool`. */
  addBool(value: boolean): void {
    this.prep(1, 0)
    this.view.setUint8(--this.head, value ? 1 : 0)
  }
  /** Writes a `byte`. */
  addInt8(value: number): void {
    this.prep(1, 0)
    this.view.setInt8(--this.head, value)
  }
  /** Writes a `ubyte`. */
  addUint8(value: number): void {
    this.prep(1, 0)
    this.view.setUint8(--this.head, value)
  }
  /** Writes a `short`. */
  addInt16(value: number): void {
    this.prep(2, 0)
    this.view.setInt16(this.head -= 2, value, true)
  }
  /** Writes a `ushort`. */
  addUint16(value: number): void {
    this.prep(2, 0)
    this.view.setUint16(this.head -= 2, value, true)
  }
  /** Writes an `int`. */
  addInt32(value: number): void {
    this.prep(4, 0)
    this.view.setInt32(this.head -= 4, value, true)
  }
  /** Writes a `uint`. */
  addUint32(value: number): void {
    this.prep(4, 0)
    this.view.setUint32(this.head -= 4, value, true)
  }
  /** Writes a `long`. */
  addInt64(value: bigint): void {
    this.prep(8, 0)
    this.view.setBigInt64(this.head -= 8, value, true)
  }
  /** Writes a `ulong`. */
  addUint64(value: bigint): void {
    this.prep(8, 0)
    this.view.setBigUint64(this.head -= 8, value, true)
  }
  /** Writes a `float`. */
  addFloat32(value: number): void {
    this.prep(4, 0)
    this.view.setFloat32(this.head -= 4, value, true)
  }
  /** Writes a `double`. */
  addFloat64(value: number): void {
    this.prep(8, 0)
    this.view.setFloat64(this.head -= 8, value, true)
  }
  /** Writes an offset to `target`, something written earlier. */
  addOffset(target: Offset): void {
    this.prep(4, 0)
    const relative = this.offset - target + 4
    if (target > this.offset) fail("Usage", `offset ${target} points past the current position ${this.offset}`)
    this.view.setUint32(this.head -= 4, relative, true)
  }

  private notNested(what: string): void {
    if (this.nested) fail("Usage", `${what} inside a table or vector that isn't finished`)
  }

  /** Writes a string (UTF-8, or the given bytes) and returns its offset. */
  createString(value: string | Uint8Array): Offset {
    this.notNested("createString")
    const bytes = typeof value === "string" ? encoder.encode(value) : value
    this.prep(4, bytes.length + 1)
    this.bytes[--this.head] = 0
    this.head -= bytes.length
    this.bytes.set(bytes, this.head)
    this.view.setUint32(this.head -= 4, bytes.length, true)
    return this.offset
  }

  /** Like {@link createString}, but writes each distinct string once. */
  createSharedString(value: string): Offset {
    this.sharedStrings ??= new Map()
    const existing = this.sharedStrings.get(value)
    if (existing !== undefined) return existing
    const offset = this.createString(value)
    this.sharedStrings.set(value, offset)
    return offset
  }

  /** Writes a `[ubyte]` vector of the given bytes and returns its offset. */
  createBytes(value: Uint8Array): Offset {
    this.notNested("createBytes")
    this.prep(4, value.length)
    this.head -= value.length
    this.bytes.set(value, this.head)
    this.view.setUint32(this.head -= 4, value.length, true)
    return this.offset
  }

  /**
   * Starts a vector of `length` elements of `elementSize` bytes, aligned to
   * `alignment`. Write the elements last to first, then {@link endVector}.
   */
  startVector(elementSize: number, length: number, alignment: number): void {
    this.notNested("startVector")
    this.nested = true
    this.vectorLength = length
    this.prep(4, elementSize * length)
    this.prep(alignment, elementSize * length)
  }

  /** Finishes the vector started with {@link startVector} and returns its offset. */
  endVector(): Offset {
    if (!this.nested || this.vtable !== undefined) fail("Usage", "endVector without startVector")
    this.nested = false
    this.view.setUint32(this.head -= 4, this.vectorLength, true)
    return this.offset
  }

  /** Writes a vector of offsets (strings, tables or vectors) and returns its offset. */
  createOffsetVector(targets: ReadonlyArray<Offset>): Offset {
    this.startVector(4, targets.length, 4)
    for (let i = targets.length - 1; i >= 0; i--) this.addOffset(targets[i])
    return this.endVector()
  }

  /** Starts a table with `fields` slots. Add fields, then {@link endTable}. */
  startTable(fields: number): void {
    this.notNested("startTable")
    this.nested = true
    this.vtable = new Array(fields).fill(0)
    this.objectEnd = this.offset
  }

  private slot(slot: number): void {
    if (this.vtable === undefined) fail("Usage", "a field outside startTable/endTable")
    if (slot < 0 || slot >= this.vtable!.length) {
      fail("Usage", `slot ${slot} is outside the table's ${this.vtable!.length} slots`)
    }
    this.vtable![slot] = this.offset
  }

  /** Adds a `bool` field; skipped when equal to `fallback`. */
  addFieldBool(slot: number, value: boolean, fallback = false): void {
    if (value !== fallback || this.forceDefaults) {
      this.addBool(value)
      this.slot(slot)
    }
  }
  /** Adds a `byte` field; skipped when equal to `fallback`. */
  addFieldInt8(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addInt8(value)
      this.slot(slot)
    }
  }
  /** Adds a `ubyte` field; skipped when equal to `fallback`. */
  addFieldUint8(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addUint8(value)
      this.slot(slot)
    }
  }
  /** Adds a `short` field; skipped when equal to `fallback`. */
  addFieldInt16(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addInt16(value)
      this.slot(slot)
    }
  }
  /** Adds a `ushort` field; skipped when equal to `fallback`. */
  addFieldUint16(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addUint16(value)
      this.slot(slot)
    }
  }
  /** Adds an `int` field; skipped when equal to `fallback`. */
  addFieldInt32(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addInt32(value)
      this.slot(slot)
    }
  }
  /** Adds a `uint` field; skipped when equal to `fallback`. */
  addFieldUint32(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addUint32(value)
      this.slot(slot)
    }
  }
  /** Adds a `long` field; skipped when equal to `fallback`. */
  addFieldInt64(slot: number, value: bigint, fallback: bigint = BigInt(0)): void {
    if (value !== fallback || this.forceDefaults) {
      this.addInt64(value)
      this.slot(slot)
    }
  }
  /** Adds a `ulong` field; skipped when equal to `fallback`. */
  addFieldUint64(slot: number, value: bigint, fallback: bigint = BigInt(0)): void {
    if (value !== fallback || this.forceDefaults) {
      this.addUint64(value)
      this.slot(slot)
    }
  }
  /** Adds a `float` field; skipped when equal to `fallback`. */
  addFieldFloat32(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addFloat32(value)
      this.slot(slot)
    }
  }
  /** Adds a `double` field; skipped when equal to `fallback`. */
  addFieldFloat64(slot: number, value: number, fallback = 0): void {
    if (value !== fallback || this.forceDefaults) {
      this.addFloat64(value)
      this.slot(slot)
    }
  }
  /** Adds a field pointing to a string, vector or table (a union's value too). */
  addFieldOffset(slot: number, target: Offset): void {
    if (target !== 0 || this.forceDefaults) {
      this.addOffset(target)
      this.slot(slot)
    }
  }
  /**
   * Adds a struct field. The struct's fields must have just been written:
   * `target` is the current {@link offset}.
   */
  addFieldStruct(slot: number, target: Offset): void {
    if (target !== 0) {
      if (target !== this.offset) fail("Usage", "a struct field must be written right before addFieldStruct")
      this.slot(slot)
    }
  }

  /** Finishes the table started with {@link startTable} and returns its offset. */
  endTable(): Offset {
    const vtable = this.vtable
    if (vtable === undefined) return fail("Usage", "endTable without startTable")
    // Placeholder for the offset to the vtable.
    this.addInt32(0)
    const object = this.offset
    let fields = vtable.length
    while (fields > 0 && vtable[fields - 1] === 0) fields--
    const objectSize = object - this.objectEnd
    const entries = Array.from({ length: fields }, (_, i) => (vtable[i] === 0 ? 0 : object - vtable[i]))
    const key = `${objectSize}:${entries.join(",")}`
    const existing = this.vtables.get(key)
    if (existing === undefined) {
      for (let i = fields - 1; i >= 0; i--) this.addInt16(entries[i])
      this.addInt16(objectSize)
      this.addInt16((fields + 2) * 2)
      this.view.setInt32(this.bytes.length - object, this.offset - object, true)
      this.vtables.set(key, this.offset)
    } else {
      this.head = this.bytes.length - object
      this.view.setInt32(this.head, existing - object, true)
    }
    this.vtable = undefined
    this.nested = false
    return object
  }

  /**
   * Writes the root offset (after the file identifier and before the size
   * prefix, when given) and returns the finished buffer.
   */
  finish(rootTable: Offset, options?: Options): Uint8Array {
    this.notNested("finish")
    const identifier = options?.identifier === undefined ? undefined : identifierBytes(options.identifier)
    this.prep(this.minAlign, 4 + (identifier === undefined ? 0 : 4) + (options?.sizePrefixed ? 4 : 0))
    if (identifier !== undefined) {
      this.prep(4, 4)
      for (let i = 3; i >= 0; i--) this.bytes[--this.head] = identifier[i]
    }
    this.addOffset(rootTable)
    if (options?.sizePrefixed) this.addInt32(this.bytes.length - this.head)
    return this.bytes.slice(this.head)
  }
}

/**
 * A new {@link Builder}. `forceDefaults` writes scalar fields even when they
 * equal their default; `initialSize` is the first buffer size (it grows as
 * needed).
 *
 * @stability experimental
 * @category writing
 * @since 4.1.5
 */
export const make = (options?: {
  readonly initialSize?: number | undefined
  readonly forceDefaults?: boolean | undefined
}): Builder => new Builder(options)
