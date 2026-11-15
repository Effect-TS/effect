/**
 * Reads and writes the Apache Thrift compact protocol: structs, lists, sets,
 * maps and scalars, without an IDL.
 *
 * **Mental model**
 *
 * - A Thrift struct is a sequence of fields, each a numbered value of some
 *   {@link Type}, ended by a stop marker. Lists, sets and maps hold values of
 *   one element type. Nothing on the wire names a field: the IDL that says
 *   field 3 is `num_rows` lives with the caller.
 * - This module works at the protocol level, as generated Thrift code does.
 *   A {@link Reader} is a cursor over the bytes: read a field header, look at
 *   its id and type, read the value or {@link Reader.skip} it. A
 *   {@link Writer} writes the same calls back.
 * - The method names and their meaning follow Thrift's `TProtocol`, so code
 *   written against another Thrift implementation reads the same: a struct
 *   is `readStructBegin`, then `readFieldBegin` until it returns
 *   `Type.Stop`, then `readStructEnd`.
 * - {@link Reader.readValue} and {@link Writer.writeValue} read and write any
 *   value as a {@link Value} tree, for debugging and tests.
 *
 * **Example** (Writing and reading a struct)
 *
 * ```ts import.meta.vitest
 * import { Thrift } from "effect/encoding"
 * import { Result } from "effect"
 *
 * // struct Person { 1: string name; 2: i64 age; 3: list<string> tags }
 * const w = Thrift.makeWriter()
 * w.writeStructBegin()
 * w.writeFieldBegin(Thrift.Type.Binary, 1)
 * w.writeString("Ada")
 * w.writeFieldBegin(Thrift.Type.I64, 2)
 * w.writeI64Number(36)
 * w.writeFieldBegin(Thrift.Type.List, 3)
 * w.writeListBegin(Thrift.Type.Binary, 1)
 * w.writeString("math")
 * w.writeFieldStop()
 * w.writeStructEnd()
 * const bytes = w.finish()
 *
 * const person = Thrift.decode(bytes, (r) => {
 *   let name = ""
 *   let age = 0
 *   const tags: Array<string> = []
 *   r.readStructBegin()
 *   for (let type = r.readFieldBegin(); type !== Thrift.Type.Stop; type = r.readFieldBegin()) {
 *     const id = r.fieldId
 *     if (id === 1 && type === Thrift.Type.Binary) name = r.readString()
 *     else if (id === 2 && type === Thrift.Type.I64) age = r.readI64Number()
 *     else if (id === 3 && type === Thrift.Type.List) {
 *       for (let n = r.readListBegin(); n > 0; n--) tags.push(r.readString())
 *     } else r.skip(type) // unknown fields, or fields of an unexpected type
 *   }
 *   r.readStructEnd()
 *   return { name, age, tags }
 * })
 *
 * Result.getOrThrow(person) // => { name: "Ada", age: 36, tags: ["math"] }
 * ```
 *
 * **Details**
 *
 * Every read is bounds-checked: malformed or hostile input throws a
 * {@link ThriftError} (or makes {@link decode} fail) instead of reading past
 * the bytes. A length or container size larger than the bytes that remain
 * fails before anything is allocated, and nesting is limited by
 * {@link Options.maxDepth}. Binary values are views into the input, not
 * copies. Strings must be valid UTF-8.
 *
 * `i64` values read as `bigint` ({@link Reader.readI64}) or, when they are
 * known to be safe integers such as offsets and counts, as `number`
 * ({@link Reader.readI64Number}).
 *
 * The binary and JSON protocols and the RPC message envelope are not
 * supported.
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Data from "../Data.ts"
import * as Predicate from "../Predicate.ts"
import * as Result from "../Result.ts"

const ThriftErrorTypeId = "~effect/encoding/Thrift/ThriftError"

/**
 * Error raised for malformed input or a misused {@link Writer}.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `Truncated`: the input ends inside a value, or a length or container
 *   size is larger than the bytes that remain.
 * - `Malformed`: an unknown type code, a varint longer than its type
 *   allows (5 bytes and 32 bits for `i32` and sizes, 16 bits for `i16` and
 *   field ids, 10 bytes and 64 bits for `i64`), a field id over 32767, or a
 *   non-empty container of `Stop`.
 * - `InvalidUtf8`: a string is not valid UTF-8.
 * - `Range`: an `i64` read with {@link Reader.readI64Number} is not a safe
 *   integer.
 * - `Limit`: the input nests deeper than {@link Options.maxDepth}, or a
 *   length or size exceeds {@link Options.maxBinaryLength} or
 *   {@link Options.maxContainerSize}.
 * - `Usage`: the reader or writer was called out of order or with an
 *   invalid argument or option, or a written value is out of range for its
 *   type. {@link decode} rethrows these caller errors.
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class ThriftError extends Data.TaggedError("ThriftError")<{
  readonly kind: "Truncated" | "Malformed" | "InvalidUtf8" | "Range" | "Limit" | "Usage"
  readonly message: string
}> {
  /**
   * Marks this value as a Thrift error for runtime guards.
   *
   * @stability experimental
   * @since 4.1.5
   */
  readonly [ThriftErrorTypeId] = ThriftErrorTypeId
}

/**
 * Checks whether a value is a {@link ThriftError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isThriftError = (u: unknown): u is ThriftError => Predicate.hasProperty(u, ThriftErrorTypeId)

const fail = (kind: ThriftError["kind"], message: string): never => {
  throw new ThriftError({ kind, message })
}

const integerOption = (name: string, value: number | undefined, min: number, fallback: number): number => {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < min) {
    fail("Usage", `${name} must be an integer of at least ${min}, got ${value}`)
  }
  return value
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * The type of a field or container element. The codes are Thrift's `TType`
 * codes, the same in every protocol; `Stop` ends a struct.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export const Type = {
  Stop: 0,
  Bool: 2,
  I8: 3,
  Double: 4,
  I16: 6,
  I32: 8,
  I64: 10,
  Binary: 11,
  Struct: 12,
  Map: 13,
  Set: 14,
  List: 15,
  Uuid: 16
} as const

/**
 * A {@link Type} code.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Type = typeof Type[keyof typeof Type]

/**
 * The name of a {@link Type}, as used by {@link Value}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type TypeName = keyof typeof Type

const INVALID = 255

/** Compact type nibble → TType. */
const fromCompact = [0, 2, 2, 3, 6, 8, 10, 4, 11, 15, 14, 13, 12, 16, INVALID, INVALID]

/** TType → compact type nibble (bool as an element; fields encode the value). */
const toCompact: Array<number> = new Array(17).fill(INVALID)
toCompact[0] = 0
for (let nibble = 1; nibble < 14; nibble++) {
  if (nibble !== 2) toCompact[fromCompact[nibble]] = nibble
}

const typeNames: Array<TypeName> = []
for (const name of Object.keys(Type) as Array<TypeName>) typeNames[Type[name]] = name

const describe = (type: number): string => typeNames[type] ?? String(type)

// -----------------------------------------------------------------------------
// Values
// -----------------------------------------------------------------------------

/**
 * Any Thrift value, tagged with the name of its {@link Type}: what
 * {@link Reader.readValue} returns and {@link Writer.writeValue} writes.
 *
 * **Details**
 *
 * The wire does not tell strings from binary, so both read as `Binary`. An
 * empty map carries no key and value types on the wire; they read as
 * `"Stop"`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type Value =
  | { readonly _tag: "Bool"; readonly value: boolean }
  | { readonly _tag: "I8" | "I16" | "I32" | "Double"; readonly value: number }
  | { readonly _tag: "I64"; readonly value: bigint }
  | { readonly _tag: "Binary" | "Uuid"; readonly value: Uint8Array }
  | { readonly _tag: "Struct"; readonly fields: ReadonlyArray<Field> }
  | { readonly _tag: "List" | "Set"; readonly elementType: TypeName; readonly elements: ReadonlyArray<Value> }
  | {
    readonly _tag: "Map"
    readonly keyType: TypeName
    readonly valueType: TypeName
    readonly entries: ReadonlyArray<readonly [Value, Value]>
  }

/**
 * A field of a `Struct` {@link Value}.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Field {
  readonly id: number
  readonly value: Value
}

// -----------------------------------------------------------------------------
// Reading
// -----------------------------------------------------------------------------

/**
 * Limits for reading untrusted input.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface Options {
  /**
   * How deep structs and containers may nest, counting each struct and each
   * container entered by {@link Reader.readStructBegin},
   * {@link Reader.skip} or {@link Reader.readValue}. A positive integer;
   * defaults to 64.
   */
  readonly maxDepth?: number | undefined
  /** The longest binary or string value, in bytes: a non-negative integer. No limit by default. */
  readonly maxBinaryLength?: number | undefined
  /** The largest list, set or map: a non-negative integer. No limit by default. */
  readonly maxContainerSize?: number | undefined
}

// Keeps a leading U+FEFF, which is part of the string.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
const MAX_SAFE = Number.MAX_SAFE_INTEGER
const BIGINT_1 = BigInt(1)
const BIGINT_7 = BigInt(7)
const BIGINT_63 = BigInt(63)
const BIGINT_0x7f = BigInt(0x7f)
const I64_MIN = -(BigInt(1) << BIGINT_63)
const I64_MAX = (BigInt(1) << BIGINT_63) - BIGINT_1

/**
 * A cursor over compact-protocol bytes. Each `read*` method reads one value
 * at {@link position} and moves past it; reads throw a {@link ThriftError}
 * on malformed input.
 *
 * **Details**
 *
 * After {@link readFieldBegin}, {@link fieldId} holds the field's id; after
 * {@link readListBegin} or {@link readSetBegin}, {@link elementType} holds
 * the element type; after {@link readMapBegin}, {@link keyType} and
 * {@link valueType}. Copy the property into a local before reading a nested
 * value, which overwrites it.
 *
 * A `bool` field keeps its value in the field header: {@link readBool} right
 * after a `Bool` field header returns it without reading a byte. Inside a
 * container, each `bool` is a byte.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export class Reader {
  /** The input. */
  readonly bytes: Uint8Array
  /** The id of the field whose header was read last. */
  fieldId = 0
  /** The element type of the list or set whose header was read last. */
  elementType: Type = Type.Stop
  /** The key type of the map whose header was read last. */
  keyType: Type = Type.Stop
  /** The value type of the map whose header was read last. */
  valueType: Type = Type.Stop

  private pos = 0
  private readonly view: DataView
  private readonly end: number
  private readonly maxDepth: number
  private readonly maxBinaryLength: number
  private readonly maxContainerSize: number
  private lastFieldId = 0
  private readonly fieldIds: Array<number> = []
  private structs = 0
  private depth = 0
  /** The compact type of a bool field header not yet read: 1 true, 2 false, 0 none. */
  private bool = 0
  /** Set by {@link varint64}: whether the zigzag value is negative. */
  private negative = false

  constructor(bytes: Uint8Array, options?: Options) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.end = bytes.length
    this.maxDepth = integerOption("maxDepth", options?.maxDepth, 1, 64)
    this.maxBinaryLength = integerOption("maxBinaryLength", options?.maxBinaryLength, 0, Infinity)
    this.maxContainerSize = integerOption("maxContainerSize", options?.maxContainerSize, 0, Infinity)
  }

  /** Where the next read starts in {@link bytes}. Set it to read from elsewhere. */
  get position(): number {
    return this.pos
  }
  set position(position: number) {
    if (!Number.isInteger(position) || position < 0 || position > this.end) {
      fail("Usage", `position ${position} is outside the ${this.end}-byte input`)
    }
    this.pos = position
    this.bool = 0
  }

  private truncated(what: string): never {
    return fail("Truncated", `the input ends inside ${what} at byte ${this.pos}`)
  }

  private byte(what: string): number {
    if (this.pos >= this.end) this.truncated(what)
    return this.bytes[this.pos++]
  }

  private advance(n: number, what: string): number {
    const at = this.pos
    if (n > this.end - at) this.truncated(what)
    this.pos = at + n
    return at
  }

  /** An unsigned varint of at most 32 bits. */
  private varint32(what: string): number {
    const bytes = this.bytes
    const end = this.end
    let pos = this.pos
    if (pos < end) {
      let b = bytes[pos++]
      if (b < 0x80) {
        this.pos = pos
        return b
      }
      let result = b & 0x7f
      for (let shift = 7; shift < 28; shift += 7) {
        if (pos >= end) return this.truncated(what)
        b = bytes[pos++]
        result |= (b & 0x7f) << shift
        if (b < 0x80) {
          this.pos = pos
          return result
        }
      }
      if (pos >= end) return this.truncated(what)
      b = bytes[pos++]
      if (b > 0x0f) return fail("Malformed", `${what} at byte ${this.pos} is longer than 32 bits`)
      this.pos = pos
      return (result | (b << 28)) >>> 0
    }
    return this.truncated(what)
  }

  /** A zigzag varint of at most 16 bits. */
  private varint16(what: string): number {
    const n = this.varint32(what)
    if (n > 0xffff) fail("Malformed", `${what} before byte ${this.pos} is longer than 16 bits`)
    return (n >>> 1) ^ -(n & 1)
  }

  /**
   * A zigzag varint of at most 64 bits as a number: returns the magnitude
   * `|v|` for v >= 0 or `|v| - 1` for v < 0 (exact up to 2^53) and sets
   * {@link negative}.
   */
  private varint64(what: string): number {
    const bytes = this.bytes
    const end = this.end
    const start = this.pos
    let pos = start
    if (pos >= end) return this.truncated(what)
    let b = bytes[pos++]
    this.negative = (b & 1) === 1
    let half = (b & 0x7f) >>> 1
    let scale = 64
    while (b >= 0x80) {
      if (pos >= end) return this.truncated(what)
      b = bytes[pos++]
      if (pos - start === 10) {
        if (b > 0x01) return fail("Malformed", `${what} at byte ${start} is longer than 64 bits`)
      }
      half += (b & 0x7f) * scale
      scale *= 128
    }
    this.pos = pos
    return half
  }

  private checkSize(size: number, bytesPerElement: number, what: string): void {
    if (size * bytesPerElement > this.end - this.pos) {
      fail("Truncated", `${what} of ${size} elements at byte ${this.pos} is larger than the remaining input`)
    }
    if (size > this.maxContainerSize) {
      fail("Limit", `${what} of ${size} elements exceeds the limit of ${this.maxContainerSize}`)
    }
  }

  private enter(): void {
    if (++this.depth > this.maxDepth) {
      fail("Limit", `the input nests deeper than ${this.maxDepth} at byte ${this.pos}`)
    }
  }

  private elementOf(nibble: number, size: number, what: string): Type {
    const type = fromCompact[nibble]
    if (type === INVALID || (type === Type.Stop && size > 0)) {
      return fail("Malformed", `${what} at byte ${this.pos} has element type code ${nibble}`)
    }
    return type as Type
  }

  /** Starts reading a struct. Read its fields with {@link readFieldBegin}. */
  readStructBegin(): void {
    this.enter()
    this.fieldIds[this.structs++] = this.lastFieldId
    this.lastFieldId = 0
  }

  /** Finishes the struct started with {@link readStructBegin}, after its `Stop`. */
  readStructEnd(): void {
    if (this.structs === 0) fail("Usage", "readStructEnd without readStructBegin")
    this.depth--
    this.lastFieldId = this.fieldIds[--this.structs]
  }

  /**
   * Reads a field header: returns the field's type and sets {@link fieldId}.
   * Returns `Type.Stop` at the end of the struct.
   */
  readFieldBegin(): Type {
    const header = this.byte("a field header")
    this.bool = 0
    const nibble = header & 0x0f
    if (nibble === 0) return Type.Stop
    const delta = header >> 4
    let id: number
    if (delta === 0) {
      id = this.varint16("a field id")
    } else {
      id = this.lastFieldId + delta
      if (id > 32767) fail("Malformed", `the field header at byte ${this.pos - 1} has id ${id}, over 32767`)
    }
    this.lastFieldId = id
    this.fieldId = id
    const type = fromCompact[nibble]
    if (type === INVALID) {
      return fail("Malformed", `the field header at byte ${this.pos - 1} has type code ${nibble}`)
    }
    if (nibble <= 2) this.bool = nibble
    return type as Type
  }

  /** Reads a list header: returns the list's size and sets {@link elementType}. */
  readListBegin(): number {
    const header = this.byte("a list header")
    let size = header >> 4
    if (size === 15) size = this.varint32("a list size")
    this.elementType = this.elementOf(header & 0x0f, size, "a list")
    this.checkSize(size, 1, "a list")
    return size
  }

  /** Reads a set header: returns the set's size and sets {@link elementType}. */
  readSetBegin(): number {
    const header = this.byte("a set header")
    let size = header >> 4
    if (size === 15) size = this.varint32("a set size")
    this.elementType = this.elementOf(header & 0x0f, size, "a set")
    this.checkSize(size, 1, "a set")
    return size
  }

  /** Reads a map header: returns the map's size and sets {@link keyType} and {@link valueType}. */
  readMapBegin(): number {
    const size = this.varint32("a map size")
    if (size === 0) {
      this.keyType = Type.Stop
      this.valueType = Type.Stop
      return 0
    }
    const types = this.byte("a map header")
    this.keyType = this.elementOf(types >> 4, size, "a map")
    this.valueType = this.elementOf(types & 0x0f, size, "a map")
    this.checkSize(size, 2, "a map")
    return size
  }

  /** Reads a `bool`: the value of a `Bool` field header just read, or a byte inside a container. */
  readBool(): boolean {
    const bool = this.bool
    if (bool !== 0) {
      this.bool = 0
      return bool === 1
    }
    return this.byte("a bool") === 1
  }

  /** Reads an `i8` (`byte`). */
  readI8(): number {
    return (this.byte("an i8") << 24) >> 24
  }

  /** Reads an `i16`. */
  readI16(): number {
    return this.varint16("an i16")
  }

  /** Reads an `i32`. */
  readI32(): number {
    const n = this.varint32("an i32")
    return (n >>> 1) ^ -(n & 1)
  }

  /** Reads an `i64` as a `bigint`. */
  readI64(): bigint {
    const start = this.pos
    const half = this.varint64("an i64")
    if (half < MAX_SAFE) return BigInt(this.negative ? -half - 1 : half)
    let u = BigInt(0)
    let shift = BigInt(0)
    for (let pos = start; pos < this.pos; pos++) {
      u |= (BigInt(this.bytes[pos]) & BIGINT_0x7f) << shift
      shift += BIGINT_7
    }
    u = BigInt.asUintN(64, u)
    return (u >> BIGINT_1) ^ -(u & BIGINT_1)
  }

  /**
   * Reads an `i64` as a `number`. Fails with kind `Range` when the value is
   * not a safe integer.
   */
  readI64Number(): number {
    const start = this.pos
    const half = this.varint64("an i64")
    if (half < MAX_SAFE || (half === MAX_SAFE && !this.negative)) return this.negative ? -half - 1 : half
    this.pos = start
    return fail("Range", `the i64 at byte ${start} is not a safe integer`)
  }

  /** Reads a `double` (little-endian, as the compact protocol stores it). */
  readDouble(): number {
    return this.view.getFloat64(this.advance(8, "a double"), true)
  }

  /** Reads a `binary` value as a view of {@link bytes}, not a copy. */
  readBinary(): Uint8Array {
    const length = this.varint32("a binary length")
    if (length > this.maxBinaryLength) {
      fail("Limit", `a binary value of ${length} bytes exceeds the limit of ${this.maxBinaryLength}`)
    }
    const at = this.advance(length, `a binary value of ${length} bytes`)
    return this.bytes.subarray(at, at + length)
  }

  /** Reads a `string`: a `binary` value decoded as UTF-8. */
  readString(): string {
    const length = this.varint32("a string length")
    if (length > this.maxBinaryLength) {
      fail("Limit", `a string of ${length} bytes exceeds the limit of ${this.maxBinaryLength}`)
    }
    const at = this.advance(length, `a string of ${length} bytes`)
    try {
      return utf8.decode(this.bytes.subarray(at, at + length))
    } catch {
      return fail("InvalidUtf8", `the string at byte ${at} is not valid UTF-8`)
    }
  }

  /** Reads a `uuid`: 16 bytes, as a view of {@link bytes}. */
  readUuid(): Uint8Array {
    const at = this.advance(16, "a uuid")
    return this.bytes.subarray(at, at + 16)
  }

  /**
   * Moves past a value of the given type: the value of a field whose header
   * was just read, or a container element.
   */
  skip(type: Type): void {
    switch (type) {
      case Type.Bool:
        if (this.bool !== 0) this.bool = 0
        else this.advance(1, "a bool")
        return
      case Type.I8:
        this.advance(1, "an i8")
        return
      case Type.I16:
        this.varint16("an i16")
        return
      case Type.I32:
        this.varint32("an i32")
        return
      case Type.I64:
        this.varint64("an i64")
        return
      case Type.Double:
        this.advance(8, "a double")
        return
      case Type.Binary: {
        const length = this.varint32("a binary length")
        if (length > this.maxBinaryLength) {
          fail("Limit", `a binary value of ${length} bytes exceeds the limit of ${this.maxBinaryLength}`)
        }
        this.advance(length, `a binary value of ${length} bytes`)
        return
      }
      case Type.Uuid:
        this.advance(16, "a uuid")
        return
      case Type.Struct:
        this.readStructBegin()
        for (let t = this.readFieldBegin(); t !== Type.Stop; t = this.readFieldBegin()) this.skip(t)
        this.readStructEnd()
        return
      case Type.List:
      case Type.Set: {
        this.enter()
        const size = type === Type.List ? this.readListBegin() : this.readSetBegin()
        const element = this.elementType
        for (let i = 0; i < size; i++) this.skip(element)
        this.depth--
        return
      }
      case Type.Map: {
        this.enter()
        const size = this.readMapBegin()
        const key = this.keyType
        const value = this.valueType
        for (let i = 0; i < size; i++) {
          this.skip(key)
          this.skip(value)
        }
        this.depth--
        return
      }
      default:
        fail("Usage", `can't skip a value of type ${describe(type)}`)
    }
  }

  /**
   * Reads a value of the given type as a {@link Value}: the value of a field
   * whose header was just read, a container element, or a whole input such
   * as a struct.
   */
  readValue(type: Type): Value {
    switch (type) {
      case Type.Bool:
        return { _tag: "Bool", value: this.readBool() }
      case Type.I8:
        return { _tag: "I8", value: this.readI8() }
      case Type.I16:
        return { _tag: "I16", value: this.readI16() }
      case Type.I32:
        return { _tag: "I32", value: this.readI32() }
      case Type.I64:
        return { _tag: "I64", value: this.readI64() }
      case Type.Double:
        return { _tag: "Double", value: this.readDouble() }
      case Type.Binary:
        return { _tag: "Binary", value: this.readBinary() }
      case Type.Uuid:
        return { _tag: "Uuid", value: this.readUuid() }
      case Type.Struct: {
        const fields: Array<Field> = []
        this.readStructBegin()
        for (let t = this.readFieldBegin(); t !== Type.Stop; t = this.readFieldBegin()) {
          const id = this.fieldId
          fields.push({ id, value: this.readValue(t) })
        }
        this.readStructEnd()
        return { _tag: "Struct", fields }
      }
      case Type.List:
      case Type.Set: {
        this.enter()
        const size = type === Type.List ? this.readListBegin() : this.readSetBegin()
        const element = this.elementType
        const elements: Array<Value> = []
        for (let i = 0; i < size; i++) elements.push(this.readValue(element))
        this.depth--
        return { _tag: type === Type.List ? "List" : "Set", elementType: typeNames[element], elements }
      }
      case Type.Map: {
        this.enter()
        const size = this.readMapBegin()
        const key = this.keyType
        const value = this.valueType
        const entries: Array<readonly [Value, Value]> = []
        for (let i = 0; i < size; i++) {
          const k = this.readValue(key)
          entries.push([k, this.readValue(value)])
        }
        this.depth--
        return { _tag: "Map", keyType: typeNames[key], valueType: typeNames[value], entries }
      }
      default:
        return fail("Usage", `can't read a value of type ${describe(type)}`)
    }
  }
}

/**
 * A {@link Reader} at the start of `bytes`.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const makeReader = (bytes: Uint8Array, options?: Options): Reader => new Reader(bytes, options)

/**
 * Reads `bytes` with `read`, which gets a {@link Reader} at the start of
 * them. Malformed input becomes a failed `Result` instead of an exception.
 *
 * **Gotchas**
 *
 * `Usage` errors and errors other than {@link ThriftError} are rethrown:
 * they are bugs in `read` or invalid options, not bad input.
 *
 * @stability experimental
 * @category reading
 * @since 4.1.5
 */
export const decode = <A>(
  bytes: Uint8Array,
  read: (reader: Reader) => A,
  options?: Options
): Result.Result<A, ThriftError> => {
  try {
    return Result.succeed(read(new Reader(bytes, options)))
  } catch (cause) {
    if (isThriftError(cause) && cause.kind !== "Usage") return Result.fail(cause)
    throw cause
  }
}

// -----------------------------------------------------------------------------
// Writing
// -----------------------------------------------------------------------------

const encoder = new TextEncoder()

/**
 * Writes compact-protocol bytes into a buffer that grows as needed. The
 * calls mirror {@link Reader}'s.
 *
 * **Details**
 *
 * Write a struct as {@link writeStructBegin}, then for each field
 * {@link writeFieldBegin} and its value, then {@link writeFieldStop} and
 * {@link writeStructEnd}. A `bool` field's value goes into its header:
 * `writeFieldBegin(Type.Bool, id)` writes nothing until {@link writeBool}.
 *
 * Containers are a header ({@link writeListBegin}, {@link writeSetBegin},
 * {@link writeMapBegin}) followed by exactly that many elements (for a map,
 * key then value).
 *
 * Integers outside their type's range, and calls out of order, throw a
 * {@link ThriftError} of kind `Usage`.
 *
 * @stability experimental
 * @category writing
 * @since 4.1.5
 */
export class Writer {
  private bytes: Uint8Array
  private view: DataView
  private position = 0
  private lastFieldId = 0
  private readonly fieldIds: Array<number> = []
  private boolPending = false
  private boolFieldId = 0

  constructor(options?: { readonly initialSize?: number | undefined }) {
    this.bytes = new Uint8Array(Math.max(16, integerOption("initialSize", options?.initialSize, 0, 1024)))
    this.view = new DataView(this.bytes.buffer)
  }

  /** The number of bytes written. */
  get length(): number {
    return this.position
  }

  private reserve(n: number): void {
    if (this.position + n <= this.bytes.length) return
    let size = this.bytes.length * 2
    while (size < this.position + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.bytes.subarray(0, this.position))
    this.bytes = next
    this.view = new DataView(next.buffer)
  }

  private checkNoBool(what: string): void {
    if (this.boolPending) fail("Usage", `${what} after writeFieldBegin(Type.Bool) instead of writeBool`)
  }

  private writeByte(b: number): void {
    this.reserve(1)
    this.bytes[this.position++] = b
  }

  /** An unsigned varint of at most 32 bits. */
  private varint32(n: number): void {
    this.reserve(5)
    const bytes = this.bytes
    let pos = this.position
    while (n > 0x7f) {
      bytes[pos++] = (n & 0x7f) | 0x80
      n >>>= 7
    }
    bytes[pos++] = n
    this.position = pos
  }

  private integer(value: number, min: number, max: number, what: string): void {
    this.checkNoBool(what)
    if (!Number.isInteger(value) || value < min || value > max) {
      fail("Usage", `${what} ${value} is not an integer from ${min} to ${max}`)
    }
  }

  private checkSize(size: number, what: string): void {
    if (!Number.isInteger(size) || size < 0 || size > 0xffffffff) {
      fail("Usage", `${what} ${size} is not an integer from 0 to ${0xffffffff}`)
    }
  }

  private elementNibble(type: number, size: number, what: string): number {
    const nibble = toCompact[type]
    if (nibble === undefined || nibble === INVALID || (type === Type.Stop && size > 0)) {
      return fail("Usage", `${describe(type)} is not a valid ${what}`)
    }
    return nibble
  }

  private fieldHeader(nibble: number, id: number): void {
    const delta = id - this.lastFieldId
    if (delta > 0 && delta <= 15) {
      this.writeByte((delta << 4) | nibble)
    } else {
      this.writeByte(nibble)
      this.varint32(((id << 1) ^ (id >> 31)) >>> 0)
    }
    this.lastFieldId = id
  }

  /** Starts a struct. Write its fields, then {@link writeFieldStop} and {@link writeStructEnd}. */
  writeStructBegin(): void {
    this.checkNoBool("writeStructBegin")
    this.fieldIds.push(this.lastFieldId)
    this.lastFieldId = 0
  }

  /** Finishes the struct started with {@link writeStructBegin}. */
  writeStructEnd(): void {
    this.checkNoBool("writeStructEnd")
    if (this.fieldIds.length === 0) fail("Usage", "writeStructEnd without writeStructBegin")
    this.lastFieldId = this.fieldIds.pop()!
  }

  /** Writes a field header. For a `Bool` field, the header is written by the {@link writeBool} that follows. */
  writeFieldBegin(type: Type, id: number): void {
    this.checkNoBool("writeFieldBegin")
    if (this.fieldIds.length === 0) fail("Usage", "writeFieldBegin outside writeStructBegin/writeStructEnd")
    if (!Number.isInteger(id) || id < -32768 || id > 32767) {
      fail("Usage", `field id ${id} is not an integer from -32768 to 32767`)
    }
    if (type === Type.Bool) {
      this.boolPending = true
      this.boolFieldId = id
      return
    }
    const nibble = toCompact[type]
    if (nibble === undefined || nibble === INVALID || type === Type.Stop) {
      fail("Usage", `${describe(type)} is not a field type`)
    }
    this.fieldHeader(nibble, id)
  }

  /** Writes the `Stop` that ends a struct's fields. */
  writeFieldStop(): void {
    this.checkNoBool("writeFieldStop")
    this.writeByte(0)
  }

  /** Writes a list header; write `size` elements of `elementType` next. */
  writeListBegin(elementType: Type, size: number): void {
    this.checkNoBool("writeListBegin")
    this.checkSize(size, "list size")
    const nibble = this.elementNibble(elementType, size, "list element type")
    if (size < 15) {
      this.writeByte((size << 4) | nibble)
    } else {
      this.writeByte(0xf0 | nibble)
      this.varint32(size)
    }
  }

  /** Writes a set header; write `size` elements of `elementType` next. */
  writeSetBegin(elementType: Type, size: number): void {
    this.writeListBegin(elementType, size)
  }

  /** Writes a map header; write `size` key-value pairs next. */
  writeMapBegin(keyType: Type, valueType: Type, size: number): void {
    this.checkNoBool("writeMapBegin")
    this.checkSize(size, "map size")
    const key = this.elementNibble(keyType, size, "map key type")
    const value = this.elementNibble(valueType, size, "map value type")
    if (size === 0) {
      this.writeByte(0)
    } else {
      this.varint32(size)
      this.writeByte((key << 4) | value)
    }
  }

  /** Writes a `bool`: the header of the `Bool` field just begun, or a byte inside a container. */
  writeBool(value: boolean): void {
    if (this.boolPending) {
      this.boolPending = false
      this.fieldHeader(value ? 1 : 2, this.boolFieldId)
    } else {
      this.writeByte(value ? 1 : 2)
    }
  }

  /** Writes an `i8` (`byte`). */
  writeI8(value: number): void {
    this.integer(value, -128, 127, "i8")
    this.writeByte(value & 0xff)
  }

  /** Writes an `i16`. */
  writeI16(value: number): void {
    this.integer(value, -32768, 32767, "i16")
    this.varint32(((value << 1) ^ (value >> 31)) >>> 0)
  }

  /** Writes an `i32`. */
  writeI32(value: number): void {
    this.integer(value, -2147483648, 2147483647, "i32")
    this.varint32(((value << 1) ^ (value >> 31)) >>> 0)
  }

  /** Writes an `i64` given as a safe-integer `number`. */
  writeI64Number(value: number): void {
    this.integer(value, -MAX_SAFE, MAX_SAFE, "i64")
    const negative = value < 0
    let half = negative ? -value - 1 : value
    this.reserve(10)
    const bytes = this.bytes
    let pos = this.position
    // The first byte holds the sign bit and the low six bits of the magnitude.
    let b = ((half % 64) * 2) | (negative ? 1 : 0)
    half = Math.floor(half / 64)
    while (half > 0) {
      bytes[pos++] = b | 0x80
      b = half % 128
      half = Math.floor(half / 128)
    }
    bytes[pos++] = b
    this.position = pos
  }

  /** Writes an `i64`. */
  writeI64(value: bigint): void {
    this.checkNoBool("writeI64")
    if (value < I64_MIN || value > I64_MAX) fail("Usage", `i64 ${value} is out of range`)
    if (value >= -MAX_SAFE && value <= MAX_SAFE) return this.writeI64Number(Number(value))
    let u = BigInt.asUintN(64, (value << BIGINT_1) ^ (value >> BIGINT_63))
    this.reserve(10)
    while (u > BIGINT_0x7f) {
      this.bytes[this.position++] = Number(u & BIGINT_0x7f) | 0x80
      u >>= BIGINT_7
    }
    this.bytes[this.position++] = Number(u)
  }

  /** Writes a `double` (little-endian). */
  writeDouble(value: number): void {
    this.checkNoBool("writeDouble")
    this.reserve(8)
    this.view.setFloat64(this.position, value, true)
    this.position += 8
  }

  /** Writes a `binary` value. */
  writeBinary(value: Uint8Array): void {
    this.checkNoBool("writeBinary")
    this.varint32(value.length)
    this.reserve(value.length)
    this.bytes.set(value, this.position)
    this.position += value.length
  }

  /** Writes a `string` as UTF-8 `binary`. Lone surrogates, which UTF-8 can't encode, become U+FFFD. */
  writeString(value: string): void {
    this.checkNoBool("writeString")
    const length = value.length
    if (length < 128) {
      // One length byte; ASCII strings are written directly.
      this.reserve(1 + length)
      const bytes = this.bytes
      const start = this.position + 1
      let i = 0
      for (; i < length; i++) {
        const c = value.charCodeAt(i)
        if (c >= 0x80) break
        bytes[start + i] = c
      }
      if (i === length) {
        bytes[this.position] = length
        this.position = start + length
        return
      }
    }
    this.writeBinary(encoder.encode(value))
  }

  /** Writes a `uuid`: exactly 16 bytes. */
  writeUuid(value: Uint8Array): void {
    this.checkNoBool("writeUuid")
    if (value.length !== 16) fail("Usage", `a uuid is 16 bytes, got ${value.length}`)
    this.reserve(16)
    this.bytes.set(value, this.position)
    this.position += 16
  }

  /** Writes a {@link Value}: a field's value after its header, a container element, or a whole value. */
  writeValue(value: Value): void {
    switch (value._tag) {
      case "Bool":
        return this.writeBool(value.value)
      case "I8":
        return this.writeI8(value.value)
      case "I16":
        return this.writeI16(value.value)
      case "I32":
        return this.writeI32(value.value)
      case "I64":
        return this.writeI64(value.value)
      case "Double":
        return this.writeDouble(value.value)
      case "Binary":
        return this.writeBinary(value.value)
      case "Uuid":
        return this.writeUuid(value.value)
      case "Struct":
        this.writeStructBegin()
        for (const field of value.fields) {
          this.writeFieldBegin(Type[field.value._tag], field.id)
          this.writeValue(field.value)
        }
        this.writeFieldStop()
        return this.writeStructEnd()
      case "List":
      case "Set": {
        const type = Type[value.elementType]
        if (value._tag === "List") this.writeListBegin(type, value.elements.length)
        else this.writeSetBegin(type, value.elements.length)
        for (const element of value.elements) {
          if (element._tag !== value.elementType) {
            fail("Usage", `a ${value._tag} of ${value.elementType} contains a ${element._tag}`)
          }
          this.writeValue(element)
        }
        return
      }
      case "Map": {
        this.writeMapBegin(Type[value.keyType], Type[value.valueType], value.entries.length)
        for (const [k, v] of value.entries) {
          if (k._tag !== value.keyType || v._tag !== value.valueType) {
            fail("Usage", `a Map of ${value.keyType} to ${value.valueType} contains ${k._tag} to ${v._tag}`)
          }
          this.writeValue(k)
          this.writeValue(v)
        }
        return
      }
    }
  }

  /** A copy of the bytes written so far. Fails when a struct or `Bool` field is unfinished. */
  finish(): Uint8Array {
    this.checkNoBool("finish")
    if (this.fieldIds.length > 0) fail("Usage", `finish with ${this.fieldIds.length} unfinished structs`)
    return this.bytes.slice(0, this.position)
  }
}

/**
 * A new {@link Writer}. `initialSize` is the first buffer size; it grows as
 * needed.
 *
 * @stability experimental
 * @category writing
 * @since 4.1.5
 */
export const makeWriter = (options?: { readonly initialSize?: number | undefined }): Writer => new Writer(options)
