/**
 * Writes the protobuf wire format: tags, varints, fixed-width numbers, and
 * length-delimited data, into one growing buffer.
 *
 * **Mental model**
 *
 * - A message is a sequence of fields. Each field is a tag, made of a field
 *   number and a {@link WireType}, followed by its value.
 * - The writer knows nothing about messages or schemas. The caller writes
 *   each tag and value in the order it wants them on the wire.
 * - A nested message, string, or bytes field is length-delimited. Nested
 *   messages are written in place between {@link ProtobufWriter.beginDelimited}
 *   and {@link ProtobufWriter.endDelimited}, which fill in the length prefix
 *   afterwards.
 *
 * **Gotchas**
 *
 * - Values are not validated. Integers outside the range of their type wrap
 *   around, as with `DataView`.
 * - Unpaired UTF-16 surrogates in strings are written as U+FFFD, as with
 *   `TextEncoder`.
 *
 * **Example** (Writing a message with a nested message)
 *
 * ```ts import.meta.vitest
 * import { ProtobufWriter } from "effect/protobuf"
 *
 * // message Point { int32 x = 1; int32 y = 2; }
 * // message Shape { string name = 1; Point origin = 2; }
 * const w = new ProtobufWriter.ProtobufWriter()
 * w.tag(1, ProtobufWriter.WireType.Len)
 * w.string("box")
 * w.tag(2, ProtobufWriter.WireType.Len)
 * const origin = w.beginDelimited()
 * w.tag(1, ProtobufWriter.WireType.Varint)
 * w.int32(3)
 * w.tag(2, ProtobufWriter.WireType.Varint)
 * w.int32(-1)
 * w.endDelimited(origin)
 *
 * w.finish().length // => 20
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */

/**
 * The wire types of the protobuf format, which a tag carries with the field
 * number.
 *
 * **Details**
 *
 * - `Varint`: `int32`, `int64`, `uint32`, `uint64`, `sint32`, `sint64`,
 *   `bool`, and enums.
 * - `I64`: `fixed64`, `sfixed64`, and `double`.
 * - `Len`: strings, bytes, nested messages, and packed repeated fields.
 * - `StartGroup` and `EndGroup`: the deprecated proto2 groups.
 * - `I32`: `fixed32`, `sfixed32`, and `float`.
 *
 * @stability experimental
 * @category constants
 * @since 4.1.5
 */
export const WireType = {
  Varint: 0,
  I64: 1,
  Len: 2,
  StartGroup: 3,
  EndGroup: 4,
  I32: 5
} as const

/**
 * A protobuf wire type, from 0 through 5.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export type WireType = typeof WireType[keyof typeof WireType]

/**
 * A writer of the protobuf wire format.
 *
 * **Details**
 *
 * 64-bit integers are given as a `bigint`, or as a `number` that is a safe
 * integer. {@link ProtobufWriter.finish} returns the bytes and resets the
 * writer, which can then write a new message.
 *
 * **Example** (Writing a field)
 *
 * ```ts import.meta.vitest
 * import { ProtobufWriter } from "effect/protobuf"
 *
 * // message Test { int32 a = 1; } with a = 150
 * const w = new ProtobufWriter.ProtobufWriter()
 * w.tag(1, ProtobufWriter.WireType.Varint)
 * w.int32(150)
 * w.finish() // => new Uint8Array([0x08, 0x96, 0x01])
 * ```
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export class ProtobufWriter {
  private buf: Uint8Array<ArrayBuffer>
  private view: DataView
  private pos = 0

  /**
   * Creates a writer.
   *
   * @since 4.1.5
   */
  constructor() {
    if (spareBuf === undefined) {
      this.buf = new Uint8Array(INITIAL_SIZE)
      this.view = new DataView(this.buf.buffer)
    } else {
      this.buf = spareBuf
      this.view = spareView!
      spareBuf = spareView = undefined
    }
  }

  /**
   * Returns the written bytes, and resets the writer.
   *
   * @since 4.1.5
   */
  finish(): Uint8Array<ArrayBuffer> {
    // The buffer goes to the next writer. This writer allocates a buffer when
    // it writes again.
    const out = this.buf.slice(0, this.pos)
    if (this.buf.length > 0 && this.buf.length <= SPARE_MAX) {
      spareBuf = this.buf
      spareView = this.view
    }
    this.buf = EMPTY
    this.view = EMPTY_VIEW
    this.pos = 0
    return out
  }

  private ensure(n: number): void {
    if (this.pos + n <= this.buf.length) return
    let size = this.buf.length === 0 ? INITIAL_SIZE : this.buf.length * 2
    while (size < this.pos + n) size *= 2
    const next = new Uint8Array(size)
    next.set(this.buf.subarray(0, this.pos))
    this.buf = next
    this.view = new DataView(next.buffer)
  }

  /**
   * Writes a tag: a field number and the wire type of its value.
   *
   * @since 4.1.5
   */
  tag(fieldNumber: number, wireType: WireType): void {
    this.uint32(fieldNumber * 8 + wireType)
  }

  /**
   * Writes a `uint32` varint.
   *
   * @since 4.1.5
   */
  uint32(n: number): void {
    this.ensure(5)
    const buf = this.buf
    n = n >>> 0
    while (n > 0x7F) {
      buf[this.pos++] = (n & 0x7F) | 0x80
      n = n >>> 7
    }
    buf[this.pos++] = n
  }

  // A 64-bit varint from its unsigned 32-bit halves.
  private varint64(lo: number, hi: number): void {
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
  /**
   * Writes an `int32` varint. Negative values take ten bytes, as for `int64`.
   *
   * @since 4.1.5
   */
  int32(n: number): void {
    if (n >= 0) this.uint32(n)
    else this.varint64(n >>> 0, 0xFFFFFFFF)
  }

  /**
   * Writes a `sint32` varint, with the zigzag encoding.
   *
   * @since 4.1.5
   */
  sint32(n: number): void {
    this.uint32(((n << 1) ^ (n >> 31)) >>> 0)
  }

  /**
   * Writes a `uint64` varint.
   *
   * @since 4.1.5
   */
  uint64(n: bigint | number): void {
    this.int64(n)
  }

  /**
   * Writes an `int64` varint. Negative values take ten bytes.
   *
   * @since 4.1.5
   */
  int64(n: bigint | number): void {
    split64(n)
    this.varint64(halvesView.getUint32(0, true), halvesView.getUint32(4, true))
  }

  /**
   * Writes a `sint64` varint, with the zigzag encoding.
   *
   * @since 4.1.5
   */
  sint64(n: bigint | number): void {
    split64(n)
    const lo = halvesView.getUint32(0, true)
    const hi = halvesView.getUint32(4, true)
    const sign = (hi | 0) >> 31
    this.varint64(((lo << 1) ^ sign) >>> 0, (((hi << 1) | (lo >>> 31)) ^ sign) >>> 0)
  }

  /**
   * Writes a `bool` varint.
   *
   * @since 4.1.5
   */
  bool(value: boolean): void {
    this.ensure(1)
    this.buf[this.pos++] = value ? 1 : 0
  }

  /**
   * Writes a little-endian `fixed32`.
   *
   * @since 4.1.5
   */
  fixed32(n: number): void {
    this.ensure(4)
    this.view.setUint32(this.pos, n >>> 0, true)
    this.pos += 4
  }

  /**
   * Writes a little-endian `sfixed32`.
   *
   * @since 4.1.5
   */
  sfixed32(n: number): void {
    this.ensure(4)
    this.view.setInt32(this.pos, n | 0, true)
    this.pos += 4
  }

  /**
   * Writes a little-endian `fixed64`.
   *
   * @since 4.1.5
   */
  fixed64(n: bigint | number): void {
    split64(n)
    this.ensure(8)
    this.view.setUint32(this.pos, halvesView.getUint32(0, true), true)
    this.view.setUint32(this.pos + 4, halvesView.getUint32(4, true), true)
    this.pos += 8
  }

  /**
   * Writes a little-endian `sfixed64`.
   *
   * @since 4.1.5
   */
  sfixed64(n: bigint | number): void {
    this.fixed64(n)
  }

  /**
   * Writes a little-endian 32-bit `float`.
   *
   * @since 4.1.5
   */
  float(n: number): void {
    this.ensure(4)
    this.view.setFloat32(this.pos, n, true)
    this.pos += 4
  }

  /**
   * Writes a little-endian 64-bit `double`.
   *
   * @since 4.1.5
   */
  double(n: number): void {
    this.ensure(8)
    this.view.setFloat64(this.pos, n, true)
    this.pos += 8
  }

  /**
   * * Starts a length-delimited value, such as a nested message, and returns its
   * start for {@link endDelimited}. Write the tag before.
   *
   * @since 4.1.5
   */
  beginDelimited(): number {
    // A one-byte length placeholder, which `endDelimited` widens if needed.
    this.ensure(1)
    return this.pos++
  }

  /**
   * Ends the length-delimited value started at `start`, filling in its length.
   *
   * @since 4.1.5
   */
  endDelimited(start: number): void {
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

  /**
   * Writes length-prefixed bytes.
   *
   * @since 4.1.5
   */
  bytes(bytes: Uint8Array): void {
    this.uint32(bytes.length)
    this.ensure(bytes.length)
    this.buf.set(bytes, this.pos)
    this.pos += bytes.length
  }

  /**
   * Writes a length-prefixed UTF-8 string.
   *
   * @since 4.1.5
   */
  string(s: string): void {
    const n = s.length
    const start = this.beginDelimited()
    // A UTF-16 code unit takes at most three bytes.
    this.ensure(n * 3)
    if (n > SHORT_STRING) {
      this.pos += utf8Encoder.encodeInto(s, this.buf.subarray(this.pos)).written
      this.endDelimited(start)
      return
    }
    const buf = this.buf
    let pos = this.pos
    for (let i = 0; i < n; i++) {
      let c = s.charCodeAt(i)
      if (c < 0x80) {
        buf[pos++] = c
        continue
      }
      if (c < 0x800) {
        buf[pos++] = 0xC0 | (c >> 6)
        buf[pos++] = 0x80 | (c & 0x3F)
        continue
      }
      if (c >= 0xD800 && c <= 0xDFFF) {
        const next = i + 1 < n ? s.charCodeAt(i + 1) : 0
        if (c <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) {
          const cp = 0x10000 + ((c - 0xD800) << 10) + (next - 0xDC00)
          i++
          buf[pos++] = 0xF0 | (cp >> 18)
          buf[pos++] = 0x80 | ((cp >> 12) & 0x3F)
          buf[pos++] = 0x80 | ((cp >> 6) & 0x3F)
          buf[pos++] = 0x80 | (cp & 0x3F)
          continue
        }
        // A lone surrogate is written as U+FFFD, as `TextEncoder` writes it.
        c = 0xFFFD
      }
      buf[pos++] = 0xE0 | (c >> 12)
      buf[pos++] = 0x80 | ((c >> 6) & 0x3F)
      buf[pos++] = 0x80 | (c & 0x3F)
    }
    this.pos = pos
    this.endDelimited(start)
  }
}

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

const BIGINT_ZERO = BigInt(0)

// 64-bit integers are split into their unsigned 32-bit halves through a view,
// which is faster than bigint arithmetic.
const halvesView = new DataView(new ArrayBuffer(8))

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

// The buffer of the last finished writer, which the next writer starts with.
// Only a writer created while another one is active allocates a buffer.
let spareBuf: Uint8Array<ArrayBuffer> | undefined
let spareView: DataView | undefined
const SPARE_MAX = 1 << 20
const INITIAL_SIZE = 1024

// A finished writer holds no buffer until it writes again.
const EMPTY = new Uint8Array(0)
const EMPTY_VIEW = new DataView(EMPTY.buffer)

// Strings up to this length are encoded by hand, which is faster than calling
// the native encoder.
const SHORT_STRING = 32
