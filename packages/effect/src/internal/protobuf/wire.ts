// The protobuf wire format: varints, fixed-width numbers, and length-delimited
// sections.

// Matches the nesting limit of `SchemaBinary`.
/** @internal */
export const MAX_DEPTH = 512

/** @internal */
export const BIGINT_ZERO = BigInt(0)
const BIGINT_ONE = BigInt(1)
const BIGINT_63 = BigInt(63)
/** @internal */
export const BIGINT_NANOS_PER_SECOND = BigInt(1_000_000_000)
/** @internal */
export const BIGINT_NANOS_PER_MILLI = BigInt(1_000_000)
/** @internal */
export const BIGINT_MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
/** @internal */
export const INT64_MIN = -(BIGINT_ONE << BIGINT_63)
/** @internal */
export const INT64_MAX = (BIGINT_ONE << BIGINT_63) - BIGINT_ONE
/** @internal */
export const UINT64_MAX = (BIGINT_ONE << BigInt(64)) - BIGINT_ONE

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

/** @internal */
export class WireError extends Error {
  readonly path: Array<PropertyKey> = []
  readonly input: unknown
  constructor(message: string, input?: unknown) {
    super(message)
    this.input = input
  }
}

/** @internal */
export const FLOAT32_MAX = 3.4028234663852886e38

const utf8Encoder = new TextEncoder()
const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

/** @internal */
export function isInt32(n: number): boolean {
  return Number.isInteger(n) && n >= -2147483648 && n <= 2147483647
}

/** @internal */
export function isUint32(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 4294967295
}

function varintSize(n: number): number {
  let size = 1
  while (n > 0x7F) {
    n = n >>> 7
    size++
  }
  return size
}

// The buffer of the last finished writer, reused by the next one. Encoding is
// synchronous, so a writer created while another is active allocates its own.
let spareBuf: Uint8Array<ArrayBuffer> | undefined
let spareView: DataView | undefined
const SPARE_MAX = 1 << 20

/** @internal */
export class Writer {
  buf: Uint8Array<ArrayBuffer>
  view: DataView
  pos = 0

  constructor() {
    if (spareBuf !== undefined) {
      this.buf = spareBuf
      this.view = spareView!
      spareBuf = spareView = undefined
    } else {
      this.buf = new Uint8Array(1024)
      this.view = new DataView(this.buf.buffer)
    }
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

  // Copies out the written bytes. The writer must not be used afterwards.
  finish(): Uint8Array<ArrayBuffer> {
    const out = this.buf.slice(0, this.pos)
    if (this.buf.length <= SPARE_MAX) {
      spareBuf = this.buf
      spareView = this.view
    }
    return out
  }

  tag(number: number, wireType: number): void {
    this.varint32(number * 8 + wireType)
  }

  // An unsigned 32-bit varint.
  varint32(n: number): void {
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

  int32(n: number): void {
    if (n >= 0) this.varint32(n)
    else this.varint64(n >>> 0, 0xFFFFFFFF)
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

  fixed64(lo: number, hi: number): void {
    this.ensure(8)
    this.view.setUint32(this.pos, lo, true)
    this.view.setUint32(this.pos + 4, hi, true)
    this.pos += 8
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

  // Starts a length-delimited section with a one-byte length placeholder.
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
    const size = varintSize(length)
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
    this.varint32(bytes.length)
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
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
  readonly buf: Uint8Array
  readonly view: DataView
  pos = 0
  // The halves of the last `varint64`.
  lo = 0
  hi = 0

  constructor(buf: Uint8Array) {
    this.buf = buf
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  }

  byte(): number {
    if (this.pos >= this.buf.length) throw new WireError("premature end of input")
    return this.buf[this.pos++]
  }

  need(n: number): void {
    if (this.pos + n > this.buf.length) throw new WireError("premature end of input")
  }

  // A varint truncated to its low 32 bits, unsigned.
  varint32(): number {
    const buf = this.buf
    let p = this.pos
    // With ten bytes left a varint cannot run past the end, so the bytes are
    // read without bounds checks.
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
            // The bits past 32 are dropped.
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

  varint32Checked(): number {
    let result = 0
    for (let i = 0; i < 10; i++) {
      const b = this.byte()
      if (i < 5) result |= (b & 0x7F) << (7 * i)
      if (b < 0x80) return result >>> 0
    }
    throw new WireError("invalid varint")
  }

  // Reads a varint into `lo` and `hi`.
  varint64(): void {
    const buf = this.buf
    let p = this.pos
    if (p + 10 > buf.length) return this.varint64Checked()
    let b = buf[p++]
    if (b < 0x80) {
      this.pos = p
      this.lo = b
      this.hi = 0
      return
    }
    let lo = b & 0x7F
    let hi = 0
    for (let shift = 7; shift < 28; shift += 7) {
      b = buf[p++]
      lo |= (b & 0x7F) << shift
      if (b < 0x80) {
        this.pos = p
        this.lo = lo >>> 0
        this.hi = 0
        return
      }
    }
    b = buf[p++]
    lo |= (b & 0x0F) << 28
    hi = (b & 0x7F) >> 4
    if (b >= 0x80) {
      for (let shift = 3;; shift += 7) {
        if (shift > 31) throw new WireError("invalid varint")
        b = buf[p++]
        hi |= (b & 0x7F) << shift
        if (b < 0x80) break
      }
    }
    this.pos = p
    this.lo = lo >>> 0
    this.hi = hi >>> 0
  }

  varint64Checked(): void {
    let lo = 0
    let hi = 0
    let b: number
    for (let shift = 0; shift < 28; shift += 7) {
      b = this.byte()
      lo |= (b & 0x7F) << shift
      if (b < 0x80) {
        this.lo = lo >>> 0
        this.hi = 0
        return
      }
    }
    b = this.byte()
    lo |= (b & 0x0F) << 28
    hi = (b & 0x7F) >> 4
    if (b < 0x80) {
      this.lo = lo >>> 0
      this.hi = hi
      return
    }
    for (let shift = 3; shift <= 31; shift += 7) {
      b = this.byte()
      hi |= (b & 0x7F) << shift
      if (b < 0x80) {
        this.lo = lo >>> 0
        this.hi = hi >>> 0
        return
      }
    }
    throw new WireError("invalid varint")
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

  // Reads a length prefix and returns the end offset of the section.
  delimited(): number {
    const length = this.varint32()
    this.need(length)
    return this.pos + length
  }

  bytes(): Uint8Array<ArrayBuffer> {
    const end = this.delimited()
    const out = this.buf.slice(this.pos, end) as Uint8Array<ArrayBuffer>
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
      case WIRE_I32:
        this.need(4)
        this.pos += 4
        return
      case WIRE_SGROUP: {
        if (depth > MAX_DEPTH) throw new WireError(`nesting deeper than ${MAX_DEPTH}`)
        while (true) {
          const tag = readTag(this)
          if ((tag & 7) === WIRE_EGROUP) {
            if (tag >>> 3 !== number) throw new WireError(`mismatched end group tag for field ${number}`)
            return
          }
          this.skip(tag & 7, tag >>> 3, depth + 1)
        }
      }
      default:
        throw new WireError(`unexpected end group tag for field ${number}`)
    }
  }
}

// 64-bit integers travel as their unsigned 32-bit halves, joined and split
// through a scratch view, which is faster than bigint arithmetic.
const int64View = new DataView(new ArrayBuffer(8))

/** @internal */
export function int64FromHalves(lo: number, hi: number): bigint {
  int64View.setUint32(0, lo, true)
  int64View.setUint32(4, hi, true)
  return int64View.getBigInt64(0, true)
}

/** @internal */
export function uint64FromHalves(lo: number, hi: number): bigint {
  int64View.setUint32(0, lo, true)
  int64View.setUint32(4, hi, true)
  return int64View.getBigUint64(0, true)
}

// Splits a bigint in the 64-bit range into `lo` and `hi` of `out`.
/** @internal */
export function splitBigInt64(n: bigint, out: { lo: number; hi: number }): void {
  if (n < BIGINT_ZERO) int64View.setBigInt64(0, n, true)
  else int64View.setBigUint64(0, n, true)
  out.lo = int64View.getUint32(0, true)
  out.hi = int64View.getUint32(4, true)
}

/** @internal */
export function readTag(r: Reader): number {
  const tag = r.varint32()
  if (tag >>> 3 === 0 || (tag & 7) > WIRE_I32) {
    throw new WireError(`illegal tag: field ${tag >>> 3}, wire type ${tag & 7}`)
  }
  return tag
}
