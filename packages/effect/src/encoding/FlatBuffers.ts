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
 * const builder = FlatBuffers.makeBuilder()
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
 * outside the buffer or the vector or struct being read. Tables nested deeper
 * than `maxDepth` fail too. Strings must be valid UTF-8. 64-bit integers are
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
 * - `Limit`: tables are nested deeper than `maxDepth`.
 * - `Usage`: a bug in the caller: the builder was called out of order (a
 *   table inside a table, a struct that isn't the last thing written, an
 *   identifier that isn't four bytes), a table or buffer would outgrow the
 *   format, or a read doesn't match the shape it asked for (a vector read at
 *   another width, a struct read past its size).
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class FlatBuffersError extends Data.TaggedError("FlatBuffersError")<{
  readonly kind: "OutOfBounds" | "InvalidVtable" | "InvalidUtf8" | "Identifier" | "Limit" | "Usage"
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

const positive = (name: string, n: number): void => {
  if (!Number.isInteger(n) || n < 1) fail("Usage", `${name} must be a positive integer, got ${n}`)
}

const utf8 = new TextDecoder("utf-8", { fatal: true })
const lenientUtf8 = new TextDecoder()
const encoder = new TextEncoder()

/** The buffer every reader of one {@link root} shares. */
interface Source {
  readonly bytes: Uint8Array
  readonly view: DataView
  readonly maxDepth: number
}

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

const readString = (source: Source, start: number): string => {
  check(source.view, start, 4)
  const length = source.view.getUint32(start, true)
  check(source.view, start + 4, length)
  try {
    return utf8.decode(source.bytes.subarray(start + 4, start + 4 + length))
  } catch {
    return fail("InvalidUtf8", `the string at ${start} is not valid UTF-8`)
  }
}

// -----------------------------------------------------------------------------
// Reading
// -----------------------------------------------------------------------------

/**
 * Reads fields at fixed byte offsets: the fields of a struct, stored inline
 * in a table or a vector. Reads outside the struct's size throw a `Usage`
 * {@link FlatBuffersError}.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export interface Struct {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the struct starts in {@link buffer}. */
  readonly position: number
  /** The `bool` at byte `offset` of the struct. */
  bool(offset: number): boolean
  /** The `byte` at byte `offset` of the struct. */
  int8(offset: number): number
  /** The `ubyte` at byte `offset` of the struct. */
  uint8(offset: number): number
  /** The `short` at byte `offset` of the struct. */
  int16(offset: number): number
  /** The `ushort` at byte `offset` of the struct. */
  uint16(offset: number): number
  /** The `int` at byte `offset` of the struct. */
  int32(offset: number): number
  /** The `uint` at byte `offset` of the struct. */
  uint32(offset: number): number
  /** The `long` at byte `offset` of the struct. */
  int64(offset: number): bigint
  /** The `ulong` at byte `offset` of the struct. */
  uint64(offset: number): bigint
  /** The `float` at byte `offset` of the struct. */
  float32(offset: number): number
  /** The `double` at byte `offset` of the struct. */
  float64(offset: number): number
  /** The struct of `size` bytes nested at byte `offset` of this struct. */
  struct(offset: number, size: number): Struct
}

class StructImpl implements Struct {
  readonly position: number
  private readonly source: Source
  private readonly size: number

  /** The caller has checked that the struct lies inside the buffer. */
  constructor(source: Source, position: number, size: number) {
    this.source = source
    this.position = position
    this.size = size
  }

  get buffer(): Uint8Array {
    return this.source.bytes
  }

  private at(offset: number, size: number): number {
    if (!Number.isInteger(offset) || offset < 0 || offset + size > this.size) {
      fail("Usage", `${size} bytes at ${offset} lie outside the ${this.size}-byte struct`)
    }
    return this.position + offset
  }

  bool(offset: number): boolean {
    return this.source.view.getUint8(this.at(offset, 1)) !== 0
  }
  int8(offset: number): number {
    return this.source.view.getInt8(this.at(offset, 1))
  }
  uint8(offset: number): number {
    return this.source.view.getUint8(this.at(offset, 1))
  }
  int16(offset: number): number {
    return this.source.view.getInt16(this.at(offset, 2), true)
  }
  uint16(offset: number): number {
    return this.source.view.getUint16(this.at(offset, 2), true)
  }
  int32(offset: number): number {
    return this.source.view.getInt32(this.at(offset, 4), true)
  }
  uint32(offset: number): number {
    return this.source.view.getUint32(this.at(offset, 4), true)
  }
  int64(offset: number): bigint {
    return this.source.view.getBigInt64(this.at(offset, 8), true)
  }
  uint64(offset: number): bigint {
    return this.source.view.getBigUint64(this.at(offset, 8), true)
  }
  float32(offset: number): number {
    return this.source.view.getFloat32(this.at(offset, 4), true)
  }
  float64(offset: number): number {
    return this.source.view.getFloat64(this.at(offset, 8), true)
  }
  struct(offset: number, size: number): Struct {
    positive("size", size)
    return new StructImpl(this.source, this.at(offset, size), size)
  }
}

/**
 * The elements of a vector. Accessors take the element index; the caller
 * picks the accessor of the vector's element type, whose width must be the
 * `elementSize` given to {@link Table.vector} (4 for strings and tables).
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export interface Vector {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the first element starts in {@link buffer}. */
  readonly position: number
  /** The number of elements. */
  readonly length: number
  /** Element `index` of a `[bool]` vector. */
  bool(index: number): boolean
  /** Element `index` of a `[byte]` vector. */
  int8(index: number): number
  /** Element `index` of a `[ubyte]` vector. */
  uint8(index: number): number
  /** Element `index` of a `[short]` vector. */
  int16(index: number): number
  /** Element `index` of a `[ushort]` vector. */
  uint16(index: number): number
  /** Element `index` of an `[int]` vector. */
  int32(index: number): number
  /** Element `index` of an `[uint]` vector. */
  uint32(index: number): number
  /** Element `index` of a `[long]` vector. */
  int64(index: number): bigint
  /** Element `index` of a `[ulong]` vector. */
  uint64(index: number): bigint
  /** Element `index` of a `[float]` vector. */
  float32(index: number): number
  /** Element `index` of a `[double]` vector. */
  float64(index: number): number
  /** Element `index` of a `[string]` vector. */
  string(index: number): string
  /** Element `index` of a vector of tables. */
  table(index: number): Table
  /** Element `index` of a vector of structs. */
  struct(index: number): Struct
}

class VectorImpl implements Vector {
  readonly position: number
  readonly length: number
  private readonly source: Source
  private readonly elementSize: number
  private readonly depth: number

  /** The caller has checked that all `length` elements lie inside the buffer. */
  constructor(source: Source, position: number, length: number, elementSize: number, depth: number) {
    this.source = source
    this.position = position
    this.length = length
    this.elementSize = elementSize
    this.depth = depth
  }

  get buffer(): Uint8Array {
    return this.source.bytes
  }

  private at(index: number, size: number): number {
    if (size !== this.elementSize) {
      fail("Usage", `a ${size}-byte read from a vector of ${this.elementSize}-byte elements`)
    }
    if (!Number.isInteger(index) || index < 0 || index >= this.length) {
      fail("OutOfBounds", `index ${index} is outside the vector of length ${this.length}`)
    }
    return this.position + index * size
  }

  bool(index: number): boolean {
    return this.source.view.getUint8(this.at(index, 1)) !== 0
  }
  int8(index: number): number {
    return this.source.view.getInt8(this.at(index, 1))
  }
  uint8(index: number): number {
    return this.source.view.getUint8(this.at(index, 1))
  }
  int16(index: number): number {
    return this.source.view.getInt16(this.at(index, 2), true)
  }
  uint16(index: number): number {
    return this.source.view.getUint16(this.at(index, 2), true)
  }
  int32(index: number): number {
    return this.source.view.getInt32(this.at(index, 4), true)
  }
  uint32(index: number): number {
    return this.source.view.getUint32(this.at(index, 4), true)
  }
  int64(index: number): bigint {
    return this.source.view.getBigInt64(this.at(index, 8), true)
  }
  uint64(index: number): bigint {
    return this.source.view.getBigUint64(this.at(index, 8), true)
  }
  float32(index: number): number {
    return this.source.view.getFloat32(this.at(index, 4), true)
  }
  float64(index: number): number {
    return this.source.view.getFloat64(this.at(index, 8), true)
  }
  string(index: number): string {
    return readString(this.source, indirect(this.source.view, this.at(index, 4)))
  }
  table(index: number): Table {
    return new TableImpl(this.source, indirect(this.source.view, this.at(index, 4)), this.depth + 1)
  }
  struct(index: number): Struct {
    return new StructImpl(this.source, this.at(index, this.elementSize), this.elementSize)
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
export interface Table {
  /** The whole buffer. */
  readonly buffer: Uint8Array
  /** Where the table starts in {@link buffer}. */
  readonly position: number
  /** Whether field `slot` is present. */
  has(slot: number): boolean
  /** The `bool` in `slot`, or `fallback` when it is absent. */
  bool(slot: number, fallback?: boolean): boolean
  /** The `byte` in `slot`, or `fallback` when it is absent. */
  int8(slot: number, fallback?: number): number
  /** The `ubyte` in `slot`, or `fallback` when it is absent. */
  uint8(slot: number, fallback?: number): number
  /** The `short` in `slot`, or `fallback` when it is absent. */
  int16(slot: number, fallback?: number): number
  /** The `ushort` in `slot`, or `fallback` when it is absent. */
  uint16(slot: number, fallback?: number): number
  /** The `int` in `slot`, or `fallback` when it is absent. */
  int32(slot: number, fallback?: number): number
  /** The `uint` in `slot`, or `fallback` when it is absent. */
  uint32(slot: number, fallback?: number): number
  /** The `long` in `slot`, or `fallback` when it is absent. */
  int64(slot: number, fallback?: bigint): bigint
  /** The `ulong` in `slot`, or `fallback` when it is absent. */
  uint64(slot: number, fallback?: bigint): bigint
  /** The `float` in `slot`, or `fallback` when it is absent. */
  float32(slot: number, fallback?: number): number
  /** The `double` in `slot`, or `fallback` when it is absent. */
  float64(slot: number, fallback?: number): number
  /** The `string` in `slot`. */
  string(slot: number): string | undefined
  /** The table in `slot` (also the value of a union). */
  table(slot: number): Table | undefined
  /** The struct of `size` bytes stored inline in `slot`. */
  struct(slot: number, size: number): Struct | undefined
  /** The vector in `slot`, whose elements are `elementSize` bytes wide (4 for strings and tables). */
  vector(slot: number, elementSize: number): Vector | undefined
  /** The `[ubyte]` (or `[byte]`) vector in `slot`, as a view of the buffer (also a nested FlatBuffer). */
  bytes(slot: number): Uint8Array | undefined
}

class TableImpl implements Table {
  readonly position: number
  private readonly source: Source
  private readonly depth: number
  private readonly vtable: number
  private readonly vtableSize: number

  constructor(source: Source, position: number, depth: number) {
    if (depth > source.maxDepth) fail("Limit", `tables are nested deeper than maxDepth (${source.maxDepth})`)
    const view = source.view
    check(view, position, 4)
    const vtable = position - view.getInt32(position, true)
    check(view, vtable, 4)
    const vtableSize = view.getUint16(vtable, true)
    if (vtableSize < 4 || (vtableSize & 1) !== 0) fail("InvalidVtable", `vtable at ${vtable} has size ${vtableSize}`)
    check(view, vtable, vtableSize)
    this.source = source
    this.position = position
    this.depth = depth
    this.vtable = vtable
    this.vtableSize = vtableSize
  }

  get buffer(): Uint8Array {
    return this.source.bytes
  }

  /** The position of field `slot`, or -1 when it is absent. */
  private field(slot: number, size: number): number {
    const entry = 4 + slot * 2
    if (!Number.isInteger(slot) || slot < 0 || entry >= this.vtableSize) return -1
    const relative = this.source.view.getUint16(this.vtable + entry, true)
    if (relative === 0) return -1
    const at = this.position + relative
    check(this.source.view, at, size)
    return at
  }

  has(slot: number): boolean {
    return this.field(slot, 0) !== -1
  }
  bool(slot: number, fallback = false): boolean {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.source.view.getUint8(at) !== 0
  }
  int8(slot: number, fallback = 0): number {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.source.view.getInt8(at)
  }
  uint8(slot: number, fallback = 0): number {
    const at = this.field(slot, 1)
    return at === -1 ? fallback : this.source.view.getUint8(at)
  }
  int16(slot: number, fallback = 0): number {
    const at = this.field(slot, 2)
    return at === -1 ? fallback : this.source.view.getInt16(at, true)
  }
  uint16(slot: number, fallback = 0): number {
    const at = this.field(slot, 2)
    return at === -1 ? fallback : this.source.view.getUint16(at, true)
  }
  int32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.source.view.getInt32(at, true)
  }
  uint32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.source.view.getUint32(at, true)
  }
  int64(slot: number, fallback: bigint = BigInt(0)): bigint {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.source.view.getBigInt64(at, true)
  }
  uint64(slot: number, fallback: bigint = BigInt(0)): bigint {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.source.view.getBigUint64(at, true)
  }
  float32(slot: number, fallback = 0): number {
    const at = this.field(slot, 4)
    return at === -1 ? fallback : this.source.view.getFloat32(at, true)
  }
  float64(slot: number, fallback = 0): number {
    const at = this.field(slot, 8)
    return at === -1 ? fallback : this.source.view.getFloat64(at, true)
  }
  string(slot: number): string | undefined {
    const at = this.field(slot, 4)
    return at === -1 ? undefined : readString(this.source, indirect(this.source.view, at))
  }
  table(slot: number): Table | undefined {
    const at = this.field(slot, 4)
    return at === -1 ? undefined : new TableImpl(this.source, indirect(this.source.view, at), this.depth + 1)
  }
  struct(slot: number, size: number): Struct | undefined {
    positive("size", size)
    const at = this.field(slot, size)
    return at === -1 ? undefined : new StructImpl(this.source, at, size)
  }
  vector(slot: number, elementSize: number): Vector | undefined {
    positive("elementSize", elementSize)
    const at = this.field(slot, 4)
    if (at === -1) return undefined
    const start = indirect(this.source.view, at)
    check(this.source.view, start, 4)
    const length = this.source.view.getUint32(start, true)
    check(this.source.view, start + 4, length * elementSize)
    return new VectorImpl(this.source, start + 4, length, elementSize, this.depth)
  }
  bytes(slot: number): Uint8Array | undefined {
    const v = this.vector(slot, 1)
    return v === undefined ? undefined : this.source.bytes.subarray(v.position, v.position + v.length)
  }
}

const identifierBytes = (identifier: string): Uint8Array => {
  const bytes = encoder.encode(identifier)
  return bytes.length === 4
    ? bytes
    : fail("Usage", `a file identifier is four bytes, got ${JSON.stringify(identifier)}`)
}

/**
 * The four bytes where a file identifier goes (after the root offset),
 * decoded as UTF-8, or `undefined` when the buffer is too short.
 *
 * **Details**
 *
 * A buffer doesn't record whether it has an identifier: without one, these
 * bytes belong to the root table. Compare the result with the identifier you
 * expect, or pass `identifier` to {@link root} or {@link decode}.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const identifier = (
  bytes: Uint8Array,
  options?: { readonly sizePrefixed?: boolean | undefined }
): string | undefined => {
  const at = options?.sizePrefixed ? 8 : 4
  return bytes.length < at + 4 ? undefined : lenientUtf8.decode(bytes.subarray(at, at + 4))
}

/**
 * The root table of a buffer. Throws a {@link FlatBuffersError} when the
 * buffer is malformed or carries another file identifier; its accessors
 * throw for malformed fields.
 *
 * **Details**
 *
 * `identifier` is the four-character file identifier the buffer must carry,
 * and `sizePrefixed` says the buffer starts with its size. Reaching a table
 * nested more than `maxDepth` tables deep (default 64, the official
 * verifier's default) throws a `Limit` error, so a recursive reader can't
 * overflow the stack on hostile input.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const root = (bytes: Uint8Array, options?: {
  readonly identifier?: string | undefined
  readonly sizePrefixed?: boolean | undefined
  readonly maxDepth?: number | undefined
}): Table => {
  const maxDepth = options?.maxDepth ?? 64
  positive("maxDepth", maxDepth)
  const expected = options?.identifier === undefined ? undefined : identifierBytes(options.identifier)
  let data = bytes
  if (options?.sizePrefixed) {
    if (bytes.length < 4) fail("OutOfBounds", "a size-prefixed buffer needs at least 4 bytes")
    const size = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true)
    if (size > bytes.length - 4) {
      fail("OutOfBounds", `the size prefix ${size} exceeds the ${bytes.length - 4} bytes after it`)
    }
    data = bytes.subarray(4, 4 + size)
  }
  if (expected !== undefined) {
    const actual = data.subarray(4, 8)
    if (actual.length !== 4 || actual.some((b, i) => b !== expected[i])) {
      fail("Identifier", `expected file identifier ${JSON.stringify(options!.identifier)}`)
    }
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  check(view, 0, 4)
  return new TableImpl({ bytes: data, view, maxDepth }, view.getUint32(0, true), 1)
}

/**
 * Reads a buffer with `read`, which gets the root table. Malformed input
 * becomes a failed `Result` instead of an exception; options are those of
 * {@link root}.
 *
 * **Details**
 *
 * Reads are lazy, so only the reads made inside `read` are covered: a
 * {@link Table} or {@link Vector} returned from it can still throw later.
 * `Usage` errors are bugs in the caller (a misshapen identifier, a read of
 * the wrong width) and are thrown, as are errors that aren't
 * {@link FlatBuffersError}s.
 *
 * Many offsets may point at one string or vector, so what a reader
 * materialises is not bounded by the size of the buffer: 1,000 offsets to
 * one 100 KB string decode to 100 MB. Cap what you read from untrusted input.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const decode = <A>(
  bytes: Uint8Array,
  read: (root: Table) => A,
  options?: {
    readonly identifier?: string | undefined
    readonly sizePrefixed?: boolean | undefined
    readonly maxDepth?: number | undefined
  }
): Result.Result<A, FlatBuffersError> => {
  try {
    return Result.succeed(read(root(bytes, options)))
  } catch (cause) {
    if (isFlatBuffersError(cause) && cause.kind !== "Usage") return Result.fail(cause)
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
/** The most slots whose vtable (two bytes each, plus four) fits its 16-bit size. */
const MAX_SLOTS = 32765

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
  private finished = false
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
    while (this.head < n) this.grow()
    for (let i = 0; i < n; i++) this.bytes[--this.head] = 0
  }

  /**
   * Pads so that a value of `size` bytes, written after `additional` more
   * bytes, is aligned to `size`; makes room for both.
   */
  prep(size: number, additional: number): void {
    if (size < 1 || (size & (size - 1)) !== 0) fail("Usage", `an alignment must be a power of two, got ${size}`)
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
    if (!Number.isInteger(fields) || fields < 0 || fields > MAX_SLOTS) {
      fail("Usage", `a table has 0 to ${MAX_SLOTS} slots, got ${fields}`)
    }
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
    if (objectSize > 0xffff) {
      fail("Usage", `a table's inline data is ${objectSize} bytes, over the 65535 a vtable can address`)
    }
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
   * prefix, when given) and returns the finished buffer. Call it once.
   */
  finish(rootTable: Offset, options?: {
    readonly identifier?: string | undefined
    readonly sizePrefixed?: boolean | undefined
  }): Uint8Array {
    this.notNested("finish")
    if (this.finished) fail("Usage", "finish called twice")
    const identifier = options?.identifier === undefined ? undefined : identifierBytes(options.identifier)
    this.prep(this.minAlign, 4 + (identifier === undefined ? 0 : 4) + (options?.sizePrefixed ? 4 : 0))
    if (identifier !== undefined) {
      this.prep(4, 4)
      for (let i = 3; i >= 0; i--) this.bytes[--this.head] = identifier[i]
    }
    this.addOffset(rootTable)
    if (options?.sizePrefixed) this.addInt32(this.bytes.length - this.head)
    this.finished = true
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
export const makeBuilder = (options?: {
  readonly initialSize?: number | undefined
  readonly forceDefaults?: boolean | undefined
}): Builder => new Builder(options)
