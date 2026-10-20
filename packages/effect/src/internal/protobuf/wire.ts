// The protobuf wire format: tags, varints, fixed-width numbers, and
// length-delimited data. Nothing here knows about schemas or layouts.

/** @internal */
export const WIRE_VARINT = 0
/** @internal */
export const WIRE_I64 = 1
/** @internal */
export const WIRE_LEN = 2
/** @internal */
export const WIRE_SGROUP = 3
/** @internal */
export const WIRE_EGROUP = 4
/** @internal */
export const WIRE_I32 = 5

// Matches the nesting limit of `SchemaBinary`.
/** @internal */
export const MAX_DEPTH = 512

/** @internal */
export const BIGINT_ZERO = BigInt(0)
/** @internal */
export const INT64_MIN = -(BigInt(1) << BigInt(63))
/** @internal */
export const INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1)
/** @internal */
export const UINT64_MAX = (BigInt(1) << BigInt(64)) - BigInt(1)

/** @internal */
export const FLOAT32_MAX = 3.4028234663852886e38

// Empty bytes, shared so that absent fields allocate nothing. Frozen, so that
// no one can change them.
/** @internal */
export const EMPTY_BYTES: Uint8Array<ArrayBuffer> = Object.freeze(new Uint8Array(0)) as Uint8Array<ArrayBuffer>

/**
 * Malformed input or a value that has no wire representation. `path` is the
 * location of the failing value, filled in while the error propagates.
 * `missing` marks a required value that is absent.
 *
 * @internal
 */
export class WireError extends Error {
  readonly path: Array<PropertyKey> = []
  readonly input: unknown
  readonly missing: boolean
  constructor(message: string, input?: unknown, missing = false) {
    super(message)
    this.input = input
    this.missing = missing
  }
}

/** @internal */
export const isInt32 = (n: number): boolean => {
  return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647
}

/** @internal */
export const isUint32 = (n: number): boolean => {
  return Number.isInteger(n) && n >= 0 && n <= 4294967295
}

// 64-bit integers travel as their unsigned 32-bit halves. Joining and splitting
// them through a view is faster than bigint arithmetic.
const halvesView = new DataView(new ArrayBuffer(8))

/** @internal */
export const int64FromHalves = (lo: number, hi: number): bigint => {
  halvesView.setUint32(0, lo, true)
  halvesView.setUint32(4, hi, true)
  return halvesView.getBigInt64(0, true)
}

/** @internal */
export const uint64FromHalves = (lo: number, hi: number): bigint => {
  halvesView.setUint32(0, lo, true)
  halvesView.setUint32(4, hi, true)
  return halvesView.getBigUint64(0, true)
}

const split64 = (n: bigint | number): void => {
  if (typeof n === "number") {
    halvesView.setUint32(0, n >>> 0, true)
    halvesView.setUint32(4, Math.floor(n / 4294967296) >>> 0, true)
  } else if (n < BIGINT_ZERO) {
    halvesView.setBigInt64(0, n, true)
  } else {
    halvesView.setBigUint64(0, n, true)
  }
}

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })
const laxUtf8Decoder = new TextDecoder("utf-8", { ignoreBOM: true })

// The buffer of the last finished writer, which the next writer starts with.
// Only a writer created while another one is active allocates a buffer.
let spare: { readonly buf: Uint8Array<ArrayBuffer>; readonly view: DataView } | undefined
const SPARE_MAX = 1 << 20

/** @internal */
export class Writer {
  buf: Uint8Array<ArrayBuffer>
  view: DataView
  pos = 0

  constructor() {
    if (spare === undefined) {
      this.buf = new Uint8Array(1024)
      this.view = new DataView(this.buf.buffer)
    } else {
      this.buf = spare.buf
      this.view = spare.view
      spare = undefined
    }
  }

  // Copies out the written bytes, and gives the buffer to the next writer.
  finish(): Uint8Array<ArrayBuffer> {
    const out = this.buf.slice(0, this.pos)
    if (this.buf.length <= SPARE_MAX) spare = { buf: this.buf, view: this.view }
    return out
  }

  ensure(n: number): void {
    if (this.pos + n <= this.buf.length) return
    let size = this.buf.length * 2
    while (size < this.pos + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
    this.view = new DataView(next.buffer)
  }

  tag(number: number, wireType: number): void {
    this.uint32(number * 8 + wireType)
  }

  // An unsigned 32-bit varint.
  uint32(n: number): void {
    this.ensure(5)
    const buf = this.buf
    while (n > 0x7F) {
      buf[this.pos++] = (n & 0x7F) | 0x80
      n = n >>> 7
    }
    buf[this.pos++] = n
  }

  // A 64-bit varint from its unsigned 32-bit halves.
  varint64(lo: number, hi: number): void {
    this.ensure(10)
    const buf = this.buf
    while (hi > 0 || lo > 0x7F) {
      buf[this.pos++] = (lo & 0x7F) | 0x80
      lo = ((lo >>> 7) | (hi << 25)) >>> 0
      hi = hi >>> 7
    }
    buf[this.pos++] = lo
  }

  // Negative numbers are sign-extended to ten bytes, as for `int64`.
  int32(n: number): void {
    if (n >= 0) this.uint32(n)
    else this.varint64(n >>> 0, 0xFFFFFFFF)
  }

  sint32(n: number): void {
    this.uint32(((n << 1) ^ (n >> 31)) >>> 0)
  }

  // 64-bit integers are given as a bigint in the signed or unsigned 64-bit
  // range, or as a safe integer.
  int64(n: bigint | number): void {
    split64(n)
    this.varint64(halvesView.getUint32(0, true), halvesView.getUint32(4, true))
  }

  sint64(n: bigint | number): void {
    split64(n)
    const lo = halvesView.getUint32(0, true)
    const hi = halvesView.getUint32(4, true)
    const sign = (hi | 0) >> 31
    this.varint64(((lo << 1) ^ sign) >>> 0, (((hi << 1) | (lo >>> 31)) ^ sign) >>> 0)
  }

  fixed64(n: bigint | number): void {
    split64(n)
    this.ensure(8)
    this.view.setUint32(this.pos, halvesView.getUint32(0, true), true)
    this.view.setUint32(this.pos + 4, halvesView.getUint32(4, true), true)
    this.pos += 8
  }

  fixed32(n: number): void {
    this.ensure(4)
    this.view.setUint32(this.pos, n, true)
    this.pos += 4
  }

  sfixed32(n: number): void {
    this.ensure(4)
    this.view.setInt32(this.pos, n, true)
    this.pos += 4
  }

  float(n: number): void {
    this.ensure(4)
    this.view.setFloat32(this.pos, n, true)
    this.pos += 4
  }

  double(n: number): void {
    this.ensure(8)
    this.view.setFloat64(this.pos, n, true)
    this.pos += 8
  }

  // Starts a length-delimited section with a one-byte length placeholder, and
  // returns its offset for `end`.
  begin(): number {
    this.ensure(1)
    return this.pos++
  }

  // Ends a section started by `begin`, widening the length prefix if needed.
  end(start: number): void {
    const length = this.pos - start - 1
    if (length < 0x80) {
      this.buf[start] = length
      return
    }
    let size = 1
    for (let n = length; n > 0x7F; n >>>= 7) size++
    this.ensure(size - 1)
    const buf = this.buf
    buf.copyWithin(start + size, start + 1, this.pos)
    this.pos += size - 1
    let n = length
    let p = start
    while (n > 0x7F) {
      buf[p++] = (n & 0x7F) | 0x80
      n = n >>> 7
    }
    buf[p] = n
  }

  raw(bytes: Uint8Array): void {
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
  }

  bytes(bytes: Uint8Array): void {
    this.uint32(bytes.length)
    this.raw(bytes)
  }

  string(s: string): void {
    const start = this.begin()
    const n = s.length
    this.ensure(n * 3)
    const buf = this.buf
    let pos = this.pos
    let i = 0
    for (; i < n; i++) {
      const c = s.charCodeAt(i)
      if (c >= 0x80) break
      buf[pos++] = c
    }
    if (i < n) pos += utf8Encoder.encodeInto(s.slice(i), buf.subarray(pos)).written
    this.pos = pos
    this.end(start)
  }
}

/** @internal */
export class Reader {
  buf: Uint8Array
  pos = 0
  // The halves of the last `varint64` or `fixed64`.
  lo = 0
  hi = 0
  protected dataView: DataView | undefined = undefined

  constructor(buf: Uint8Array) {
    this.buf = buf
  }

  // Created when first needed, since it costs more than reading a small
  // message without fixed-width fields.
  get view(): DataView {
    return this.dataView ??= new DataView(this.buf.buffer, this.buf.byteOffset, this.buf.byteLength)
  }

  // Reads a tag, and rejects field number 0 and the wire types 6 and 7.
  tag(): number {
    const tag = this.uint32()
    if (tag >>> 3 === 0 || (tag & 7) > WIRE_I32) {
      throw new WireError(`illegal tag: field ${tag >>> 3}, wire type ${tag & 7}`)
    }
    return tag
  }

  private byte(): number {
    if (this.pos >= this.buf.length) throw new WireError("premature end of input")
    return this.buf[this.pos++]
  }

  private need(n: number): void {
    if (this.pos + n > this.buf.length) throw new WireError("premature end of input")
  }

  // A varint of at most 32 bits, as lengths and tags are. Longer ones are
  // rejected rather than truncated, so that bytes cannot be framed two ways.
  uint32(): number {
    let result = 0
    for (let i = 0; i < 5; i++) {
      const b = this.byte()
      if (i === 4 && b > 0x0F) break
      result |= (b & 0x7F) << (7 * i)
      if (b < 0x80) return result >>> 0
    }
    throw new WireError("invalid varint")
  }

  // A varint of up to ten bytes, truncated to its low 32 bits, as `uint32` and
  // `sint32` values are.
  varint32(): number {
    const buf = this.buf
    let p = this.pos
    // With ten bytes left, no varint can run past the end.
    if (p + 10 > buf.length) return this.varint32Checked()
    let b = buf[p++]
    let result = b & 0x7F
    if (b >= 0x80) {
      b = buf[p++]
      result |= (b & 0x7F) << 7
      if (b >= 0x80) {
        b = buf[p++]
        result |= (b & 0x7F) << 14
        if (b >= 0x80) {
          b = buf[p++]
          result |= (b & 0x7F) << 21
          if (b >= 0x80) {
            b = buf[p++]
            result |= (b & 0x7F) << 28
            for (let i = 0; b >= 0x80; i++) {
              if (i === 5) throw new WireError("invalid varint")
              b = buf[p++]
            }
          }
        }
      }
    }
    this.pos = p
    return result >>> 0
  }

  private varint32Checked(): number {
    let result = 0
    for (let i = 0; i < 10; i++) {
      const b = this.byte()
      if (i < 5) result |= (b & 0x7F) << (7 * i)
      if (b < 0x80) return result >>> 0
    }
    throw new WireError("invalid varint")
  }

  // Reads a varint of up to ten bytes into `lo` and `hi`.
  varint64(): void {
    const buf = this.buf
    let p = this.pos
    if (p + 10 > buf.length) return this.varint64Checked()
    let b = buf[p++]
    let lo = b & 0x7F
    let hi = 0
    if (b >= 0x80) {
      for (let shift = 7; shift < 28; shift += 7) {
        b = buf[p++]
        lo |= (b & 0x7F) << shift
        if (b < 0x80) break
      }
      if (b >= 0x80) {
        b = buf[p++]
        lo |= (b & 0x0F) << 28
        hi = (b & 0x7F) >> 4
        for (let shift = 3; b >= 0x80; shift += 7) {
          if (shift > 31) throw new WireError("invalid varint")
          b = buf[p++]
          hi |= (b & 0x7F) << shift
        }
      }
    }
    this.pos = p
    this.lo = lo >>> 0
    this.hi = hi >>> 0
  }

  private varint64Checked(): void {
    let lo = 0
    let hi = 0
    let b = 0x80
    for (let shift = 0; shift < 28 && b >= 0x80; shift += 7) {
      b = this.byte()
      lo |= (b & 0x7F) << shift
    }
    if (b >= 0x80) {
      b = this.byte()
      lo |= (b & 0x0F) << 28
      hi = (b & 0x7F) >> 4
      for (let shift = 3; b >= 0x80; shift += 7) {
        if (shift > 31) throw new WireError("invalid varint")
        b = this.byte()
        hi |= (b & 0x7F) << shift
      }
    }
    this.lo = lo >>> 0
    this.hi = hi >>> 0
  }

  // A varint truncated to a signed 32-bit integer, as `int32` and enum values
  // are.
  int32(): number {
    this.varint64()
    return this.lo | 0
  }

  bool(): boolean {
    this.varint64()
    return this.lo !== 0 || this.hi !== 0
  }

  fixed32(): number {
    this.need(4)
    const n = this.view.getUint32(this.pos, true)
    this.pos += 4
    return n
  }

  sfixed32(): number {
    this.need(4)
    const n = this.view.getInt32(this.pos, true)
    this.pos += 4
    return n
  }

  // Reads eight bytes into `lo` and `hi`.
  fixed64(): void {
    this.need(8)
    this.lo = this.view.getUint32(this.pos, true)
    this.hi = this.view.getUint32(this.pos + 4, true)
    this.pos += 8
  }

  float(): number {
    this.need(4)
    const n = this.view.getFloat32(this.pos, true)
    this.pos += 4
    return n
  }

  double(): number {
    this.need(8)
    const n = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return n
  }

  // Reads a length prefix and returns the offset where the data ends.
  delimited(): number {
    const length = this.uint32()
    this.need(length)
    return this.pos + length
  }

  bytes(): Uint8Array<ArrayBuffer> {
    const end = this.delimited()
    if (end === this.pos) return EMPTY_BYTES
    // A copy, also of a Node.js `Buffer`, whose `slice` is a view.
    const out = new Uint8Array(this.buf.subarray(this.pos, end))
    this.pos = end
    return out
  }

  string(): string {
    const end = this.delimited()
    const buf = this.buf
    let out = ""
    let i = this.pos
    // Short ASCII strings skip the decoder.
    if (end - i <= 32) {
      for (; i < end; i++) {
        const c = buf[i]
        if (c >= 0x80) break
        out += String.fromCharCode(c)
      }
    }
    if (i < end) {
      try {
        out = utf8Decoder.decode(buf.subarray(this.pos, end))
      } catch {
        throw new WireError("invalid UTF-8 in string field")
      }
    }
    this.pos = end
    return out
  }

  // A string that is not validated: invalid UTF-8 becomes replacement
  // characters.
  laxString(): string {
    const end = this.delimited()
    const out = laxUtf8Decoder.decode(this.buf.subarray(this.pos, end))
    this.pos = end
    return out
  }

  // Skips the value of a field. `depth` is the nesting depth of the field's
  // message, which a group adds to.
  skip(wireType: number, number: number, depth: number): void {
    switch (wireType) {
      case WIRE_VARINT:
        this.varint64()
        return
      case WIRE_I64:
        this.need(8)
        this.pos += 8
        return
      case WIRE_LEN:
        this.pos = this.delimited()
        return
      case WIRE_SGROUP:
        this.skipGroup(number, depth + 1)
        return
      case WIRE_I32:
        this.need(4)
        this.pos += 4
        return
      default:
        throw new WireError(`unexpected end group tag for field ${number}`)
    }
  }

  // Skips the fields of a group of field `number`, and its end group tag.
  skipGroup(number: number, depth: number): void {
    if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
    while (true) {
      const tag = this.tag()
      if ((tag & 7) === WIRE_EGROUP) {
        if (tag >>> 3 !== number) throw new WireError(`mismatched end group tag for field ${number}`)
        return
      }
      this.skip(tag & 7, tag >>> 3, depth)
    }
  }
}
