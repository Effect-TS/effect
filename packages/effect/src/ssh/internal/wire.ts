/**
 * SSH binary encoding primitives (RFC 4251 §5).
 *
 * @internal
 */

/** @internal */
export type Bytes = Uint8Array<ArrayBuffer>

/** @internal */
export class WireError extends Error {}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: false })

/** @internal */
export const utf8 = (value: string): Bytes => textEncoder.encode(value)

/** @internal */
export const fromUtf8 = (bytes: Uint8Array): string => textDecoder.decode(bytes)

/** @internal */
export const copy = (bytes: Uint8Array): Bytes => {
  const out = new Uint8Array(bytes.byteLength)
  out.set(bytes)
  return out
}

/** @internal */
export const concat = (chunks: ReadonlyArray<Uint8Array>): Bytes => {
  let length = 0
  for (let i = 0; i < chunks.length; i++) length += chunks[i].byteLength
  const out = new Uint8Array(length)
  let offset = 0
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i], offset)
    offset += chunks[i].byteLength
  }
  return out
}

/**
 * Compares two byte arrays without short-circuiting on the first difference.
 *
 * @internal
 */
export const equals = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.byteLength !== b.byteLength) return false
  let diff = 0
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/**
 * Strips leading zero bytes from an unsigned big-endian magnitude.
 *
 * @internal
 */
export const stripLeadingZeros = (bytes: Uint8Array): Uint8Array => {
  let i = 0
  while (i < bytes.length - 1 && bytes[i] === 0) i++
  return bytes.subarray(i)
}

/**
 * Left-pads an unsigned big-endian magnitude to `size` bytes.
 *
 * @internal
 */
export const padStart = (bytes: Uint8Array, size: number): Bytes => {
  const stripped = stripLeadingZeros(bytes)
  if (stripped.length > size) {
    throw new WireError(`integer does not fit in ${size} bytes`)
  }
  const out = new Uint8Array(size)
  out.set(stripped, size - stripped.length)
  return out
}

/** @internal */
export const bytesToBigInt = (bytes: Uint8Array): bigint => {
  let hex = ""
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0")
  return hex.length === 0 ? BigInt(0) : BigInt("0x" + hex)
}

/** @internal */
export const bigIntToBytes = (value: bigint): Bytes => {
  let hex = value.toString(16)
  if (hex.length % 2 === 1) hex = "0" + hex
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

/**
 * Growable writer for SSH wire data.
 *
 * @internal
 */
export class Writer {
  private buffer: Bytes
  private view: DataView
  length = 0

  constructor(initialSize = 256) {
    this.buffer = new Uint8Array(initialSize)
    this.view = new DataView(this.buffer.buffer)
  }

  private ensure(size: number): void {
    const required = this.length + size
    if (required <= this.buffer.length) return
    let next = this.buffer.length * 2
    while (next < required) next *= 2
    const buffer = new Uint8Array(next)
    buffer.set(this.buffer.subarray(0, this.length))
    this.buffer = buffer
    this.view = new DataView(buffer.buffer)
  }

  byte(value: number): this {
    this.ensure(1)
    this.buffer[this.length++] = value
    return this
  }

  bool(value: boolean): this {
    return this.byte(value ? 1 : 0)
  }

  uint32(value: number): this {
    this.ensure(4)
    this.view.setUint32(this.length, value >>> 0)
    this.length += 4
    return this
  }

  uint64(value: bigint): this {
    this.ensure(8)
    this.view.setBigUint64(this.length, value)
    this.length += 8
    return this
  }

  raw(bytes: Uint8Array): this {
    this.ensure(bytes.byteLength)
    this.buffer.set(bytes, this.length)
    this.length += bytes.byteLength
    return this
  }

  string(value: Uint8Array | string): this {
    const bytes = typeof value === "string" ? utf8(value) : value
    this.uint32(bytes.byteLength)
    return this.raw(bytes)
  }

  nameList(names: ReadonlyArray<string>): this {
    return this.string(names.join(","))
  }

  /**
   * Writes an unsigned big-endian magnitude as an `mpint`.
   */
  mpint(magnitude: Uint8Array): this {
    const stripped = stripLeadingZeros(magnitude)
    if (stripped.length === 1 && stripped[0] === 0) {
      return this.uint32(0)
    }
    if (stripped[0] & 0x80) {
      this.uint32(stripped.length + 1)
      this.byte(0)
      return this.raw(stripped)
    }
    this.uint32(stripped.length)
    return this.raw(stripped)
  }

  finish(): Bytes {
    return this.buffer.subarray(0, this.length)
  }
}

/**
 * Cursor-based reader for SSH wire data. Every accessor throws `WireError` on
 * truncated input.
 *
 * @internal
 */
export class Reader {
  readonly bytes: Uint8Array
  private readonly view: DataView
  offset: number

  constructor(bytes: Uint8Array, offset = 0) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.offset = offset
  }

  get remaining(): number {
    return this.bytes.byteLength - this.offset
  }

  private need(size: number): void {
    if (size < 0 || this.offset + size > this.bytes.byteLength) {
      throw new WireError("unexpected end of data")
    }
  }

  byte(): number {
    this.need(1)
    return this.bytes[this.offset++]
  }

  bool(): boolean {
    return this.byte() !== 0
  }

  uint32(): number {
    this.need(4)
    const value = this.view.getUint32(this.offset)
    this.offset += 4
    return value
  }

  uint64(): bigint {
    this.need(8)
    const value = this.view.getBigUint64(this.offset)
    this.offset += 8
    return value
  }

  raw(size: number): Uint8Array {
    this.need(size)
    const value = this.bytes.subarray(this.offset, this.offset + size)
    this.offset += size
    return value
  }

  string(): Uint8Array {
    return this.raw(this.uint32())
  }

  utf8(): string {
    return fromUtf8(this.string())
  }

  nameList(): Array<string> {
    const value = this.utf8()
    return value.length === 0 ? [] : value.split(",")
  }

  /**
   * Reads an `mpint` as an unsigned big-endian magnitude, rejecting negative
   * values.
   */
  mpint(): Uint8Array {
    const value = this.string()
    if (value.length > 0 && (value[0] & 0x80) !== 0) {
      throw new WireError("negative mpint")
    }
    return value.length > 0 && value[0] === 0 ? value.subarray(1) : value
  }

  rest(): Uint8Array {
    return this.raw(this.remaining)
  }
}
