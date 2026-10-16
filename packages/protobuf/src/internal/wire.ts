/**
 * Protobuf wire primitives: a growable writer and a bounds-checked reader.
 *
 * Mirrors the shape of `@bufbuild/protobuf/wire` (`BinaryWriter` /
 * `BinaryReader`), but 64-bit integers are always `bigint`.
 *
 * PROTOTYPE.
 */

/** @internal */
export const WireType = {
  Varint: 0,
  Bit64: 1,
  LengthDelimited: 2,
  StartGroup: 3,
  EndGroup: 4,
  Bit32: 5
} as const

/** @internal */
export type WireType = typeof WireType[keyof typeof WireType]

/** @internal */
export class WireError extends Error {
  override readonly name = "WireError"
}

const U64_MASK = (BigInt(1) << BigInt(64)) - BigInt(1)
const BIG_0x7F = BigInt(0x7F)
const BIG_7 = BigInt(7)
const BIG_1 = BigInt(1)
const BIG_63 = BigInt(63)
const BIG_0 = BigInt(0)

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

/** @internal */
export const utf8Encode = (s: string): Uint8Array => utf8Encoder.encode(s)

/** @internal */
export const utf8Decode = (bytes: Uint8Array): string => {
  try {
    return utf8Decoder.decode(bytes)
  } catch {
    throw new WireError("invalid UTF-8 in string field")
  }
}

/** @internal */
export class BinaryWriter {
  private buf: Uint8Array<ArrayBuffer>
  private pos = 0
  private readonly view: { current: DataView }

  constructor(initial = 64) {
    this.buf = new Uint8Array(initial)
    this.view = { current: new DataView(this.buf.buffer) }
  }

  private ensure(n: number): void {
    if (this.pos + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.pos + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
    this.view.current = new DataView(next.buffer)
  }

  get length(): number {
    return this.pos
  }

  finish(): Uint8Array<ArrayBuffer> {
    return this.buf.slice(0, this.pos)
  }

  tag(fieldNo: number, wireType: WireType): this {
    return this.uint32(((fieldNo << 3) | wireType) >>> 0)
  }

  /** Unsigned 32-bit varint. */
  uint32(value: number): this {
    this.ensure(5)
    value = value >>> 0
    while (value > 0x7F) {
      this.buf[this.pos++] = (value & 0x7F) | 0x80
      value = value >>> 7
    }
    this.buf[this.pos++] = value
    return this
  }

  /** Signed 32-bit varint, sign extended to 64 bits for negative values. */
  int32(value: number): this {
    if (value >= 0) return this.uint32(value)
    return this.uint64(BigInt(value))
  }

  sint32(value: number): this {
    return this.uint32(((value << 1) ^ (value >> 31)) >>> 0)
  }

  /** 64-bit varint from any bigint, using two's complement for negatives. */
  uint64(value: bigint): this {
    this.ensure(10)
    let v = BigInt.asUintN(64, value)
    while (v > BIG_0x7F) {
      this.buf[this.pos++] = Number(v & BIG_0x7F) | 0x80
      v = v >> BIG_7
    }
    this.buf[this.pos++] = Number(v)
    return this
  }

  int64(value: bigint): this {
    return this.uint64(value)
  }

  sint64(value: bigint): this {
    const v = BigInt.asIntN(64, value)
    return this.uint64(((v << BIG_1) ^ (v >> BIG_63)) & U64_MASK)
  }

  bool(value: boolean): this {
    this.ensure(1)
    this.buf[this.pos++] = value ? 1 : 0
    return this
  }

  fixed32(value: number): this {
    this.ensure(4)
    this.view.current.setUint32(this.pos, value >>> 0, true)
    this.pos += 4
    return this
  }

  sfixed32(value: number): this {
    this.ensure(4)
    this.view.current.setInt32(this.pos, value | 0, true)
    this.pos += 4
    return this
  }

  fixed64(value: bigint): this {
    this.ensure(8)
    this.view.current.setBigUint64(this.pos, BigInt.asUintN(64, value), true)
    this.pos += 8
    return this
  }

  sfixed64(value: bigint): this {
    this.ensure(8)
    this.view.current.setBigInt64(this.pos, BigInt.asIntN(64, value), true)
    this.pos += 8
    return this
  }

  float(value: number): this {
    this.ensure(4)
    this.view.current.setFloat32(this.pos, value, true)
    this.pos += 4
    return this
  }

  double(value: number): this {
    this.ensure(8)
    this.view.current.setFloat64(this.pos, value, true)
    this.pos += 8
    return this
  }

  /** Length-prefixed bytes. */
  bytes(value: Uint8Array): this {
    this.uint32(value.length)
    this.raw(value)
    return this
  }

  string(value: string): this {
    return this.bytes(utf8Encode(value))
  }

  raw(value: Uint8Array): this {
    this.ensure(value.length)
    this.buf.set(value, this.pos)
    this.pos += value.length
    return this
  }

  /**
   * Writes a length-delimited section produced by `f`. The section is written
   * to a scratch writer first, so nesting costs one copy per level.
   */
  fork(f: (w: BinaryWriter) => void): this {
    const inner = new BinaryWriter()
    f(inner)
    this.uint32(inner.pos)
    this.ensure(inner.pos)
    this.buf.set(inner.buf.subarray(0, inner.pos), this.pos)
    this.pos += inner.pos
    return this
  }
}

/** @internal */
export class BinaryReader {
  pos = 0
  readonly buf: Uint8Array
  readonly len: number
  private readonly view: DataView

  constructor(buf: Uint8Array) {
    this.buf = buf
    this.len = buf.length
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  }

  private need(n: number): void {
    if (this.pos + n > this.len) throw new WireError("premature end of input")
  }

  tag(): [fieldNo: number, wireType: WireType] {
    const tag = this.uint32()
    const fieldNo = tag >>> 3
    const wireType = tag & 7
    if (fieldNo <= 0 || wireType > 5) {
      throw new WireError(`illegal tag: field no ${fieldNo} wire type ${wireType}`)
    }
    return [fieldNo, wireType as WireType]
  }

  /** Reads a varint and truncates it to an unsigned 32-bit number. */
  uint32(): number {
    let result = 0
    let shift = 0
    for (let i = 0; i < 10; i++) {
      this.need(1)
      const b = this.buf[this.pos++]
      if (shift < 32) result |= (b & 0x7F) << shift
      shift += 7
      if ((b & 0x80) === 0) return result >>> 0
    }
    throw new WireError("invalid varint")
  }

  int32(): number {
    return this.uint32() | 0
  }

  sint32(): number {
    const n = this.uint32()
    return (n >>> 1) ^ -(n & 1)
  }

  private varint64(): bigint {
    let result = BIG_0
    let shift = BIG_0
    for (let i = 0; i < 10; i++) {
      this.need(1)
      const b = this.buf[this.pos++]
      result |= BigInt(b & 0x7F) << shift
      shift += BIG_7
      if ((b & 0x80) === 0) return result & U64_MASK
    }
    throw new WireError("invalid varint")
  }

  uint64(): bigint {
    return this.varint64()
  }

  int64(): bigint {
    return BigInt.asIntN(64, this.varint64())
  }

  sint64(): bigint {
    const n = this.varint64()
    return (n >> BIG_1) ^ -(n & BIG_1)
  }

  bool(): boolean {
    return this.varint64() !== BIG_0
  }

  fixed32(): number {
    this.need(4)
    const v = this.view.getUint32(this.pos, true)
    this.pos += 4
    return v
  }

  sfixed32(): number {
    this.need(4)
    const v = this.view.getInt32(this.pos, true)
    this.pos += 4
    return v
  }

  fixed64(): bigint {
    this.need(8)
    const v = this.view.getBigUint64(this.pos, true)
    this.pos += 8
    return v
  }

  sfixed64(): bigint {
    this.need(8)
    const v = this.view.getBigInt64(this.pos, true)
    this.pos += 8
    return v
  }

  float(): number {
    this.need(4)
    const v = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return v
  }

  double(): number {
    this.need(8)
    const v = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return v
  }

  bytes(): Uint8Array<ArrayBuffer> {
    const len = this.uint32()
    this.need(len)
    const out = this.buf.slice(this.pos, this.pos + len) as Uint8Array<ArrayBuffer>
    this.pos += len
    return out
  }

  string(): string {
    const len = this.uint32()
    this.need(len)
    const out = utf8Decode(this.buf.subarray(this.pos, this.pos + len))
    this.pos += len
    return out
  }

  /** Returns the end offset of a length-delimited section. */
  delimitedEnd(): number {
    const len = this.uint32()
    this.need(len)
    return this.pos + len
  }

  skip(wireType: WireType, fieldNo: number): void {
    switch (wireType) {
      case WireType.Varint:
        this.varint64()
        return
      case WireType.Bit64:
        this.need(8)
        this.pos += 8
        return
      case WireType.LengthDelimited: {
        const len = this.uint32()
        this.need(len)
        this.pos += len
        return
      }
      case WireType.Bit32:
        this.need(4)
        this.pos += 4
        return
      case WireType.StartGroup: {
        for (;;) {
          const [no, wt] = this.tag()
          if (wt === WireType.EndGroup) {
            if (no !== fieldNo) throw new WireError("invalid end group tag")
            return
          }
          this.skip(wt, no)
        }
      }
      case WireType.EndGroup:
        throw new WireError("unexpected end group tag")
    }
  }
}

// -----------------------------------------------------------------------------
// base64 (std on write, std or url-safe on read, padding optional)
// -----------------------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const B64_DECODE: Record<string, number> = {}
for (let i = 0; i < B64.length; i++) B64_DECODE[B64[i]] = i
B64_DECODE["-"] = 62
B64_DECODE["_"] = 63

/** @internal */
export const base64Encode = (bytes: Uint8Array): string => {
  let out = ""
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63]
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((i + 1 < bytes.length ? bytes[i + 1] : 0) << 8)
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] + "=" : "=="
  }
  return out
}

/** @internal */
export const base64Decode = (input: string): Uint8Array<ArrayBuffer> => {
  const s = input.replace(/=+$/, "")
  const out = new Uint8Array(Math.floor((s.length * 3) / 4))
  let o = 0
  let acc = 0
  let bits = 0
  for (let i = 0; i < s.length; i++) {
    const v = B64_DECODE[s[i]]
    if (v === undefined) throw new WireError("invalid base64 string")
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[o++] = (acc >> bits) & 0xFF
    }
  }
  return out.subarray(0, o).slice() as Uint8Array<ArrayBuffer>
}
