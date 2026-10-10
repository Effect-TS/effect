/**
 * Reading and writing the bytes a MySQL packet is made of.
 *
 * This is buffer machinery rather than protocol: framing, message shapes and
 * command semantics all live in `MysqlProtocol`. Both the reader and the
 * writer are deliberately imperative and reused across packets, because they
 * run once per column of every row.
 *
 * @internal
 */
import * as Data from "effect/Data"

/**
 * Bytes that ran out, or a value that will not fit.
 *
 * The buffer does not know whether it is being read or written on behalf of a
 * decode or an encode, so `MysqlProtocol` decides which of its two public
 * errors this becomes at the boundary.
 *
 * @internal
 */
export class BufferError extends Data.TaggedError("MysqlBufferError")<{
  readonly message: string
}> {}

export const textEncoder = new TextEncoder()
export const textDecoder = new TextDecoder("utf-8", { fatal: true })

/**
 * Above this length `TextEncoder.encodeInto` beats a per-character loop, below
 * it the call overhead dominates.
 */
export const asciiEncodeLimit = 48

/** Below this length a per-character loop beats `TextDecoder.decode`. */
export const asciiDecodeLimit = 10

/** Up to this many bytes a copy loop beats `Uint8Array.prototype.set`. */
export const smallCopyLimit = 8

/**
 * A view over part of a cached backing store. Slicing runs once per column of
 * every row, and both obvious spellings are slower than this one: `subarray`
 * consults the constructor's `Symbol.species` before it can allocate, and
 * reading `.buffer` off a typed array is an accessor call rather than a field
 * load.
 */
export const view = (store: ArrayBufferLike, offset: number, length: number): Uint8Array =>
  new Uint8Array(store, offset, length)

/**
 * Node's own UTF-8 decoder, which is faster than `TextDecoder` for short runs.
 * A result containing a replacement character goes to the strict decoder, so
 * invalid bytes still fail exactly as they did.
 */
export interface MaybeNodeGlobals {
  readonly Buffer?: { readonly prototype?: { readonly utf8Slice?: (start: number, end: number) => string } }
}

export const utf8Slice: ((this: Uint8Array, start: number, end: number) => string) | undefined =
  (globalThis as MaybeNodeGlobals).Buffer?.prototype?.utf8Slice

export const decodeUtf8 = (bytes: Uint8Array, offset: number, size: number): string => {
  if (size <= asciiDecodeLimit) {
    let text = ""
    let index = 0
    for (; index < size; index++) {
      const code = bytes[offset + index]
      if (code > 0x7f) break
      text += String.fromCharCode(code)
    }
    if (index === size) return text
  }
  if (utf8Slice !== undefined) {
    const text = utf8Slice.call(bytes, offset, offset + size)
    if (text.indexOf("�") === -1) return text
  }
  try {
    return textDecoder.decode(view(bytes.buffer, bytes.byteOffset + offset, size))
  } catch {
    throw new BufferError({ message: "Invalid UTF-8 in packet" })
  }
}

export const emptyBytes = new Uint8Array(0)

/**
 * A cursor over a packet payload. Integers are little-endian, which is the
 * opposite of the PostgreSQL protocol.
 */
export class Reader {
  bytes: Uint8Array = emptyBytes
  store: ArrayBufferLike = emptyBytes.buffer
  base = 0
  offset = 0
  limit = 0

  reset(bytes: Uint8Array, offset: number, limit: number): void {
    this.bytes = bytes
    this.store = bytes.buffer
    this.base = bytes.byteOffset
    this.offset = offset
    this.limit = limit
  }

  require(size: number): void {
    if (size < 0) {
      throw new BufferError({ message: `Invalid read of ${size} byte(s)` })
    }
    if (this.offset + size > this.limit) {
      throw new BufferError({ message: `Truncated packet: expected ${size} more byte(s)` })
    }
  }

  uint8(): number {
    this.require(1)
    return this.bytes[this.offset++]
  }

  uint16(): number {
    this.require(2)
    const bytes = this.bytes
    const offset = this.offset
    this.offset = offset + 2
    return bytes[offset] | (bytes[offset + 1] << 8)
  }

  uint24(): number {
    this.require(3)
    const bytes = this.bytes
    const offset = this.offset
    this.offset = offset + 3
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16)
  }

  uint32(): number {
    this.require(4)
    const bytes = this.bytes
    const offset = this.offset
    this.offset = offset + 4
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
  }

  uint64(): bigint {
    this.require(8)
    const bytes = this.bytes
    const offset = this.offset
    this.offset = offset + 8
    const low = BigInt(
      (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
    )
    const high = BigInt(
      (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0
    )
    return (high << BigInt("32")) | low
  }

  /**
   * Reads a length-encoded integer. Returns `null` for the `0xfb` marker, which
   * means SQL NULL where a value was expected and is invalid elsewhere.
   *
   * Values above `Number.MAX_SAFE_INTEGER` come back as `bigint`; everything
   * else is a `number`, so callers that use the result as a length can narrow
   * with `lengthOf`.
   */
  lenencInt(): number | bigint | null {
    const first = this.uint8()
    if (first < 0xfb) return first
    if (first === 0xfb) return null
    if (first === 0xfc) return this.uint16()
    if (first === 0xfd) return this.uint24()
    if (first === 0xfe) {
      const value = this.uint64()
      return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value
    }
    throw new BufferError({ message: `Invalid length-encoded integer prefix 0x${first.toString(16)}` })
  }

  raw(size: number): Uint8Array {
    this.require(size)
    const value = view(this.store, this.base + this.offset, size)
    this.offset += size
    return value
  }

  rest(): Uint8Array {
    return this.raw(this.limit - this.offset)
  }

  skip(size: number): void {
    this.require(size)
    this.offset += size
  }

  string(size: number): string {
    this.require(size)
    const value = decodeUtf8(this.bytes, this.offset, size)
    this.offset += size
    return value
  }

  restString(): string {
    return this.string(this.limit - this.offset)
  }

  /** A length-encoded string, or `null` for the `0xfb` marker. */
  lenencString(): string | null {
    const size = this.lenencInt()
    if (size === null) return null
    return this.string(lengthOf(size))
  }

  cString(): string {
    const end = this.bytes.indexOf(0, this.offset)
    if (end === -1 || end >= this.limit) {
      throw new BufferError({ message: "Unterminated string" })
    }
    const value = decodeUtf8(this.bytes, this.offset, end - this.offset)
    this.offset = end + 1
    return value
  }
}

export const lengthOf = (value: number | bigint): number => {
  if (typeof value === "number") return value
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new BufferError({ message: `Length ${value} exceeds the safe integer range` })
  }
  return Number(value)
}

/**
 * Writes packets back to back into a pooled buffer and hands out a view of each
 * one, so encoding costs no allocation of its own. Bytes below `start` have
 * already been handed out and are never rewritten; when the pool runs out it is
 * replaced rather than reused.
 */
export class Writer {
  readonly poolSize: number
  bytes: Uint8Array
  view: DataView
  start = 0
  offset = 0

  constructor(poolSize: number) {
    this.poolSize = poolSize
    this.bytes = new Uint8Array(poolSize)
    this.view = new DataView(this.bytes.buffer)
  }

  reserve(size: number): void {
    if (this.offset + size <= this.bytes.length) return
    const pending = this.offset - this.start
    let capacity = this.poolSize
    while (capacity < pending + size) capacity *= 2
    const next = new Uint8Array(capacity)
    next.set(this.bytes.subarray(this.start, this.offset))
    this.bytes = next
    this.view = new DataView(next.buffer)
    this.start = 0
    this.offset = pending
  }

  /** Starts a packet, dropping anything a failed write left behind. */
  begin(): void {
    this.start = this.offset
  }

  uint8(value: number): void {
    this.reserve(1)
    this.bytes[this.offset++] = value
  }

  uint16(value: number): void {
    this.reserve(2)
    const bytes = this.bytes
    const offset = this.offset
    bytes[offset] = value
    bytes[offset + 1] = value >>> 8
    this.offset = offset + 2
  }

  uint24(value: number): void {
    this.reserve(3)
    this.setUint24(this.offset, value)
    this.offset += 3
  }

  setUint24(offset: number, value: number): void {
    const bytes = this.bytes
    bytes[offset] = value
    bytes[offset + 1] = value >>> 8
    bytes[offset + 2] = value >>> 16
  }

  uint32(value: number): void {
    this.reserve(4)
    const bytes = this.bytes
    const offset = this.offset
    bytes[offset] = value
    bytes[offset + 1] = value >>> 8
    bytes[offset + 2] = value >>> 16
    bytes[offset + 3] = value >>> 24
    this.offset = offset + 4
  }

  uint64(value: bigint): void {
    this.reserve(8)
    this.view.setBigUint64(this.offset, value, true)
    this.offset += 8
  }

  int64(value: bigint): void {
    this.reserve(8)
    this.view.setBigInt64(this.offset, value, true)
    this.offset += 8
  }

  float32(value: number): void {
    this.reserve(4)
    this.view.setFloat32(this.offset, value, true)
    this.offset += 4
  }

  float64(value: number): void {
    this.reserve(8)
    this.view.setFloat64(this.offset, value, true)
    this.offset += 8
  }

  lenencInt(value: number | bigint): void {
    if (typeof value === "bigint") {
      if (value < BigInt("0")) throw new BufferError({ message: `Negative length-encoded integer ${value}` })
      if (value < BigInt("251")) {
        this.uint8(Number(value))
        return
      }
      this.uint8(0xfe)
      this.uint64(value)
      return
    }
    if (value < 0 || !Number.isInteger(value)) {
      throw new BufferError({ message: `Invalid length-encoded integer ${value}` })
    }
    if (value < 251) this.uint8(value)
    else if (value < 0x10000) {
      this.uint8(0xfc)
      this.uint16(value)
    } else if (value < 0x1000000) {
      this.uint8(0xfd)
      this.uint24(value)
    } else {
      this.uint8(0xfe)
      this.uint64(BigInt(value))
    }
  }

  raw(value: Uint8Array): void {
    const length = value.length
    this.reserve(length)
    const bytes = this.bytes
    const offset = this.offset
    if (length <= smallCopyLimit) {
      for (let index = 0; index < length; index++) bytes[offset + index] = value[index]
    } else {
      bytes.set(value, offset)
    }
    this.offset = offset + length
  }

  fill(byte: number, count: number): void {
    this.reserve(count)
    this.bytes.fill(byte, this.offset, this.offset + count)
    this.offset += count
  }

  utf8(value: string, nul = false): void {
    const length = value.length
    if (length <= asciiEncodeLimit) {
      this.reserve(length + (nul ? 1 : 0))
      const bytes = this.bytes
      const start = this.offset
      let i = 0
      for (; i < length; i++) {
        const code = value.charCodeAt(i)
        if (code > 0x7f) break
        bytes[start + i] = code
      }
      if (i === length) {
        const offset = start + length
        if (nul) bytes[offset] = 0
        this.offset = offset + (nul ? 1 : 0)
        return
      }
    }
    // UTF-8 takes at most three bytes per UTF-16 code unit, and four for the
    // two units of a surrogate pair, so this covers any string.
    this.reserve(length * 3 + (nul ? 1 : 0))
    this.offset += textEncoder.encodeInto(value, this.bytes.subarray(this.offset)).written
    if (nul) this.bytes[this.offset++] = 0
  }

  cString(value: string): void {
    this.utf8(value, true)
  }

  lenencString(value: string): void {
    // Measure first: the length prefix is variable-width, so it cannot be
    // backfilled the way a fixed-width one could.
    const encoded = textEncoder.encode(value)
    this.lenencInt(encoded.length)
    this.raw(encoded)
  }

  lenencBytes(value: Uint8Array): void {
    this.lenencInt(value.length)
    this.raw(value)
  }

  finish(): Uint8Array {
    const value = view(this.bytes.buffer, this.bytes.byteOffset + this.start, this.offset - this.start)
    if (this.bytes.length > this.poolSize) {
      this.bytes = new Uint8Array(this.poolSize)
      this.view = new DataView(this.bytes.buffer)
      this.start = 0
      this.offset = 0
    } else {
      this.start = this.offset
    }
    return value
  }
}
