/**
 * Wire codec for the SQL Server Tabular Data Stream (TDS) protocol, version 7.4.
 *
 * The module frames packets, encodes client requests, and decodes server
 * tokens. Every function is pure: bytes in, bytes or plain data out. Nothing
 * here opens a socket, negotiates TLS, or tracks session state.
 *
 * Unlike PostgreSQL's `DataRow`, a TDS row is not length-prefixed: the only way
 * to find where a row ends is to decode each column with the type from the
 * preceding `COLMETADATA`. Column value codecs therefore live here, next to the
 * token grammar, and `MssqlTypes` only names the declared types.
 *
 * Packet headers are big-endian; everything inside a message is little-endian,
 * and strings are UTF-16LE unless a collation says otherwise.
 *
 * Encoded payloads and packets are views into pooled buffers that are written
 * once and never rewritten. They stay valid for as long as they are held, but
 * holding one keeps its whole pool buffer alive. Decoded tokens never refer to
 * parser memory: binary values and other byte fields are copies.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Result from "effect/Result"
import * as Iconv from "iconv-lite"
import { Buffer } from "node:buffer"
import { collationEncoding } from "./internal/collation.ts"
import { decodeUtf16, encodeUtf16, utf8Length, writeUtf16 } from "./internal/utf16.ts"
import type { DataType, ParameterOptions, Table } from "./MssqlTypes.ts"
import * as MssqlTypes from "./MssqlTypes.ts"

// -----------------------------------------------------------------------------
// constants
// -----------------------------------------------------------------------------

/**
 * TDS packet types (MS-TDS 2.2.3.1.1).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const PacketType = {
  SqlBatch: 0x01,
  Rpc: 0x03,
  Response: 0x04,
  Attention: 0x06,
  Login7: 0x10,
  Sspi: 0x11,
  Prelogin: 0x12
} as const

/**
 * `DONE`, `DONEPROC`, and `DONEINPROC` status flags (MS-TDS 2.2.7.6).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const DoneStatus = {
  More: 0x01,
  Error: 0x02,
  InTransaction: 0x04,
  Count: 0x10,
  Attention: 0x20,
  ServerError: 0x100
} as const

/**
 * `PRELOGIN` encryption values (MS-TDS 2.2.6.5).
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const Encryption = {
  Off: 0,
  On: 1,
  NotSupported: 2,
  Required: 3
} as const

/**
 * The TDS version this codec speaks, as sent in `LOGIN7` and expected back in
 * `LOGINACK`.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const tdsVersion = 0x74000004

/**
 * The packet size used until the server negotiates another one.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const defaultPacketSize = 4096

/**
 * Default `maxTokenSize` for `makeTokenParser` and `maxMessageSize` for
 * `makeMessageParser`: 16 MiB.
 *
 * @stability unstable
 * @category constants
 * @since 4.0.0
 */
export const defaultMaxMessageSize = 16 * 1024 * 1024

/** MS-TDS 2.2.3: every packet starts with an eight-byte header. */
const headerSize = 8

/** Token identifiers (MS-TDS 2.2.7). */
const TokenType = {
  ColMetadata: 0x81,
  Row: 0xd1,
  NbcRow: 0xd2,
  Done: 0xfd,
  DoneProc: 0xfe,
  DoneInProc: 0xff,
  Error: 0xaa,
  Info: 0xab,
  EnvChange: 0xe3,
  LoginAck: 0xad,
  ReturnStatus: 0x79,
  ReturnValue: 0xac,
  Sspi: 0xed,
  FeatureExtAck: 0xae,
  TabName: 0xa4,
  ColInfo: 0xa5,
  Order: 0xa9,
  SessionState: 0xe4,
  FedAuthInfo: 0xee
} as const

/** Data type identifiers (MS-TDS 2.2.5.4). */
const Type = {
  Null: 0x1f,
  Int1: 0x30,
  Bit: 0x32,
  Int2: 0x34,
  Int4: 0x38,
  DateTim4: 0x3a,
  Flt4: 0x3b,
  Money: 0x3c,
  DateTime: 0x3d,
  Flt8: 0x3e,
  Money4: 0x7a,
  Int8: 0x7f,
  Guid: 0x24,
  IntN: 0x26,
  BitN: 0x68,
  DecimalN: 0x6a,
  NumericN: 0x6c,
  FltN: 0x6d,
  MoneyN: 0x6e,
  DateTimeN: 0x6f,
  Date: 0x28,
  Time: 0x29,
  DateTime2: 0x2a,
  DateTimeOffset: 0x2b,
  BigVarBinary: 0xa5,
  BigVarChar: 0xa7,
  BigBinary: 0xad,
  BigChar: 0xaf,
  NVarChar: 0xe7,
  NChar: 0xef,
  Xml: 0xf1,
  Udt: 0xf0,
  Text: 0x23,
  Image: 0x22,
  NText: 0x63,
  Variant: 0x62,
  Tvp: 0xf3
} as const

/** ENVCHANGE types (MS-TDS 2.2.7.9). */
const EnvChangeType = {
  PacketSize: 4,
  Collation: 7,
  BeginTransaction: 8,
  CommitTransaction: 9,
  RollbackTransaction: 10,
  DefectTransaction: 17,
  Routing: 20
} as const

/** `sp_executesql`'s well-known RPC procedure identifier (MS-TDS 2.2.6.6). */
const spExecuteSql = 10

/** FeatureExt identifiers (MS-TDS 2.2.6.4). */
const Feature = {
  FedAuth: 0x02,
  Utf8Support: 0x0a,
  Terminator: 0xff
} as const

/** SQL Server stores dates from 0001-01-01 and DATETIME from 1900-01-01. */
const dateEpochMillis = -62135596800000
const datetimeEpochMillis = -2208988800000
const millisPerDay = 86400000
/** DATE and DATETIME2 values stop at 9999-12-31: 3,652,058 days after 0001-01-01. */
const maxDays = 3652058
/** TIME values count 100 ns ticks and stop at midnight. */
const ticksPerDay = 864000000000

/** A PLP length of all ones is NULL, and all ones but the lowest bit is unknown. */
const plpNull = BigInt("18446744073709551615")
const plpUnknown = BigInt("18446744073709551614")

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

/**
 * Error produced when bytes cannot be interpreted as a TDS packet or token.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class ParseError extends Data.TaggedError("MssqlProtocolParseError")<{
  readonly message: string
}> {}

/**
 * Error returned when a request or parameter value cannot be encoded.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class EncodeError extends Data.TaggedError("MssqlProtocolEncodeError")<{
  readonly message: string
}> {}

const parseError = (message: string): never => {
  throw new ParseError({ message })
}

const encodeError = (message: string): never => {
  throw new EncodeError({ message })
}

const encodeResult = <A>(evaluate: () => A): Result.Result<A, EncodeError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof EncodeError) return Result.fail(error)
    throw error
  }
}

const parseResult = <A>(evaluate: () => A): Result.Result<A, ParseError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof ParseError) return Result.fail(error)
    throw error
  }
}

// -----------------------------------------------------------------------------
// writer
// -----------------------------------------------------------------------------

/**
 * Writes messages back to back into a pooled buffer and hands out a view of
 * each one, so encoding a message costs no allocation of its own. Bytes below
 * `start` have already been handed out and are never rewritten; when the pool
 * runs out it is replaced rather than reused.
 */
class Writer {
  readonly poolSize: number
  bytes: Uint8Array
  view: DataView
  /** Where the message currently being written begins. */
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

  /** Starts a message, dropping anything a failed write left behind. */
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

  /** Writes the low `size` bytes of a non-negative integer below 2^53. */
  uintN(value: number, size: number): void {
    this.reserve(size)
    const bytes = this.bytes
    const offset = this.offset
    for (let i = 0; i < size; i++) {
      bytes[offset + i] = value % 256
      value = Math.floor(value / 256)
    }
    this.offset = offset + size
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

  bigInt64(value: bigint): void {
    this.reserve(8)
    this.view.setBigInt64(this.offset, value, true)
    this.offset += 8
  }

  bigUint64(value: bigint): void {
    this.reserve(8)
    this.view.setBigUint64(this.offset, value, true)
    this.offset += 8
  }

  fill(value: number, size: number): void {
    this.reserve(size)
    this.bytes.fill(value, this.offset, this.offset + size)
    this.offset += size
  }

  raw(value: Uint8Array): void {
    this.reserve(value.length)
    this.bytes.set(value, this.offset)
    this.offset += value.length
  }

  utf16(value: string): void {
    this.reserve(value.length * 2)
    this.offset += writeUtf16(this.bytes, this.offset, value)
  }

  /** A `B_VARCHAR`: a one-byte character count and UTF-16LE text. */
  bVarChar(value: string): void {
    this.uint8(value.length)
    this.utf16(value)
  }

  /** A position relative to `start`, which survives the pool moving. */
  mark(): number {
    return this.offset - this.start
  }

  setUint16(mark: number, value: number): void {
    const offset = this.start + mark
    this.bytes[offset] = value
    this.bytes[offset + 1] = value >>> 8
  }

  setUint32(mark: number, value: number): void {
    const bytes = this.bytes
    const offset = this.start + mark
    bytes[offset] = value
    bytes[offset + 1] = value >>> 8
    bytes[offset + 2] = value >>> 16
    bytes[offset + 3] = value >>> 24
  }

  finish(): Uint8Array {
    const value = new Uint8Array(this.bytes.buffer, this.bytes.byteOffset + this.start, this.offset - this.start)
    if (this.bytes.length > this.poolSize) {
      // An oversized message grew the pool; do not keep the rest of it around.
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

const sharedWriter = new Writer(8192)

/**
 * Opens a message in the shared writer. Every encoder calls it first, so a
 * previous encoder that threw part way leaves nothing behind.
 */
const begin = (): Writer => {
  sharedWriter.begin()
  return sharedWriter
}

// -----------------------------------------------------------------------------
// reader
// -----------------------------------------------------------------------------

/**
 * Thrown by an unbounded `Reader` that runs out of bytes. A TDS token has no
 * length prefix to check up front, so the token parser tries to decode each
 * token and treats this as "wait for more bytes". It is a plain constant rather
 * than an `Error` so that throwing it captures no stack.
 */
const incomplete = { incomplete: true } as const

const emptyBytes = new Uint8Array(0)

/**
 * A little-endian cursor. A bounded reader covers one length-delimited field,
 * so running out of bytes is malformed input; an unbounded reader covers the
 * bytes received so far, so running out means the token is incomplete.
 */
class Reader {
  bytes: Uint8Array = emptyBytes
  private dataView: DataView | undefined
  offset = 0
  limit = 0
  bounded = false

  constructor(bytes?: Uint8Array, bounded = false) {
    if (bytes !== undefined) this.reset(bytes, 0, bytes.length, bounded)
  }

  reset(bytes: Uint8Array, offset: number, limit: number, bounded: boolean): void {
    if (bytes !== this.bytes) this.dataView = undefined
    this.bytes = bytes
    this.offset = offset
    this.limit = limit
    this.bounded = bounded
  }

  /** Created on first use: only floats and 64-bit integers need it. */
  get view(): DataView {
    return this.dataView ??= new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength)
  }

  get remaining(): number {
    return this.limit - this.offset
  }

  require(size: number): void {
    if (size < 0 || !Number.isSafeInteger(size)) parseError("Invalid TDS value length")
    if (this.offset + size > this.limit) {
      if (this.bounded) parseError("Malformed length-delimited TDS token")
      throw incomplete
    }
  }

  skip(size: number): void {
    this.require(size)
    this.offset += size
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

  uint32(): number {
    return this.int32() >>> 0
  }

  int32(): number {
    this.require(4)
    const bytes = this.bytes
    const offset = this.offset
    this.offset = offset + 4
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)
  }

  /** An unsigned 64-bit integer, exact up to 2^53. */
  uint64(): number {
    const low = this.uint32()
    return this.uint32() * 0x100000000 + low
  }

  bigUint64(): bigint {
    this.require(8)
    const value = this.view.getBigUint64(this.offset, true)
    this.offset += 8
    return value
  }

  /** A copy, so the result does not hold on to parser memory. */
  copy(size: number): Uint8Array {
    this.require(size)
    // Not `slice`: on a Node `Buffer` that returns a view.
    const value = new Uint8Array(this.bytes.subarray(this.offset, this.offset + size))
    this.offset += size
    return value
  }

  /** A view into the current bytes; valid until the next `push`. */
  raw(size: number): Uint8Array {
    this.require(size)
    const value = this.bytes.subarray(this.offset, this.offset + size)
    this.offset += size
    return value
  }

  utf16(units: number): string {
    this.require(units * 2)
    const value = decodeUtf16(this.bytes, this.offset, units * 2)
    this.offset += units * 2
    return value
  }

  /** A `B_VARCHAR`: a one-byte character count and UTF-16LE text. */
  bVarChar(): string {
    return this.utf16(this.uint8())
  }

  /** A `US_VARCHAR`: a two-byte character count and UTF-16LE text. */
  usVarChar(): string {
    return this.utf16(this.uint16())
  }

  /** A bounded reader over the next `size` bytes. */
  sub(size: number): Reader {
    return new Reader(this.raw(size), true)
  }
}

const readUInt16 = (bytes: Uint8Array, offset: number): number => bytes[offset] | (bytes[offset + 1] << 8)

const readUInt32 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0

const readUIntN = (bytes: Uint8Array, offset: number, size: number): number => {
  let value = 0
  for (let i = size - 1; i >= 0; i--) value = value * 256 + bytes[offset + i]
  return value
}

// -----------------------------------------------------------------------------
// packets
// -----------------------------------------------------------------------------

/**
 * One TDS packet. `data` is the payload without the header.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Packet {
  readonly type: number
  readonly status: number
  readonly data: Uint8Array
}

/**
 * An incremental packet decoder.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface PacketParser {
  /**
   * Decodes a chunk and passes each complete packet to `onPacket`
   * immediately, so the callback may change what later packets mean. A packet
   * that arrives whole in one chunk is a view into that chunk; a fragmented
   * packet is copied. Throws `ParseError` on an invalid header.
   */
  readonly push: (chunk: Uint8Array, onPacket: (packet: Packet) => void) => void
  /** Throws `ParseError` when the stream ended inside a packet. */
  readonly end: () => void
}

/**
 * Creates a `PacketParser`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makePacketParser = (): PacketParser => {
  const header = new Uint8Array(headerSize)
  let headerBytes = 0
  let body: Uint8Array | undefined
  let bodyBytes = 0
  let bodySize = 0
  let type = 0
  let status = 0

  const push = (chunk: Uint8Array, onPacket: (packet: Packet) => void): void => {
    let offset = 0
    while (offset < chunk.length) {
      if (headerBytes < headerSize) {
        const size = Math.min(headerSize - headerBytes, chunk.length - offset)
        header.set(chunk.subarray(offset, offset + size), headerBytes)
        offset += size
        headerBytes += size
        if (headerBytes < headerSize) return
        const length = (header[2] << 8) | header[3]
        if (length < headerSize) parseError(`Invalid TDS packet length ${length}`)
        type = header[0]
        status = header[1]
        bodySize = length - headerSize
        bodyBytes = 0
      }
      const remaining = bodySize - bodyBytes
      if (body === undefined && chunk.length - offset >= remaining) {
        const data = chunk.subarray(offset, offset + remaining)
        offset += remaining
        headerBytes = 0
        onPacket({ type, status, data })
      } else {
        body ??= new Uint8Array(bodySize)
        const size = Math.min(remaining, chunk.length - offset)
        body.set(chunk.subarray(offset, offset + size), bodyBytes)
        bodyBytes += size
        offset += size
        if (bodyBytes < bodySize) return
        const data = body
        body = undefined
        headerBytes = 0
        onPacket({ type, status, data })
      }
    }
  }

  const end = (): void => {
    if (headerBytes !== 0 || body !== undefined) parseError("Connection ended inside a TDS packet")
  }

  return { push, end }
}

/**
 * Splits a message payload into packets of at most `packetSize` bytes, in one
 * allocation. An empty payload still produces one packet, which is how
 * `ATTENTION` is sent.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodePacket = (
  type: number,
  payload: Uint8Array,
  packetSize: number = defaultPacketSize
): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    if (!isPacketSize(packetSize)) encodeError("TDS packet size must be an integer between 512 and 32767")
    const capacity = packetSize - headerSize
    const count = Math.max(1, Math.ceil(payload.length / capacity))
    const output = new Uint8Array(payload.length + count * headerSize)
    let source = 0
    let offset = 0
    for (let i = 0; i < count; i++) {
      const size = Math.min(capacity, payload.length - source)
      const length = size + headerSize
      output[offset] = type
      output[offset + 1] = i === count - 1 ? 1 : 0
      output[offset + 2] = length >>> 8
      output[offset + 3] = length
      // SPID (bytes 4-5) and window (byte 7) stay zero.
      output[offset + 6] = (i + 1) & 0xff
      output.set(payload.subarray(source, source + size), offset + headerSize)
      source += size
      offset += length
    }
    return output
  })

/**
 * Whether `size` is a packet size SQL Server accepts.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isPacketSize = (size: number): boolean => Number.isInteger(size) && size >= 512 && size <= 32767

/**
 * Assembles whole messages from packets during startup, where replies are
 * small and handled as a unit. Query responses stream through
 * `makeTokenParser` instead.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface MessageParser {
  /**
   * Adds a packet and returns the message it completes, if any. Throws
   * `ParseError` when the message outgrows `maxMessageSize` or the packet type
   * changes mid-message.
   */
  readonly push: (packet: Packet) => Uint8Array | undefined
  /** Throws `ParseError` when the stream ended inside a message. */
  readonly end: () => void
}

/**
 * Creates a `MessageParser`.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeMessageParser = (maxMessageSize: number = defaultMaxMessageSize): MessageParser => {
  let parts: Array<Uint8Array> = []
  let size = 0
  let type: number | undefined

  const push = (packet: Packet): Uint8Array | undefined => {
    if (type !== undefined && type !== packet.type) parseError("TDS packet type changed inside a message")
    type = packet.type
    size += packet.data.length
    if (size > maxMessageSize) parseError("TDS message exceeds configured size limit")
    parts.push(packet.data)
    if ((packet.status & 1) === 0) return undefined
    const data = parts.length === 1 ? parts[0] : concat(parts, size)
    parts = []
    size = 0
    type = undefined
    return data
  }

  const end = (): void => {
    if (type !== undefined) parseError("Connection ended inside a TDS message")
  }

  return { push, end }
}

const concat = (parts: ReadonlyArray<Uint8Array>, size: number): Uint8Array => {
  const output = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

// -----------------------------------------------------------------------------
// startup messages
// -----------------------------------------------------------------------------

/**
 * The server's `PRELOGIN` reply.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Prelogin {
  /** One of the `Encryption` values. */
  readonly encryption: number
  readonly fedAuthRequired: boolean
}

/**
 * Encodes a `PRELOGIN` payload with the VERSION, ENCRYPTION, INSTOPT,
 * THREADID, and MARS options, plus FEDAUTHREQUIRED when `fedAuth` is set.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodePrelogin = (options: {
  readonly encrypt: boolean
  readonly fedAuth?: boolean | undefined
}): Uint8Array => {
  const values: ReadonlyArray<readonly [option: number, bytes: ReadonlyArray<number>]> = [
    [0, [0, 0, 0, 0, 0, 0]],
    [1, [options.encrypt ? Encryption.On : Encryption.NotSupported]],
    [2, [0]],
    [3, [0, 0, 0, 0]],
    [4, [0]],
    ...(options.fedAuth ? [[6, [1]] as const] : [])
  ]
  const w = begin()
  const headerLength = values.length * 5 + 1
  w.reserve(headerLength)
  let position = headerLength
  for (const [option, bytes] of values) {
    w.uint8(option)
    w.uint8(position >>> 8)
    w.uint8(position)
    w.uint8(bytes.length >>> 8)
    w.uint8(bytes.length)
    position += bytes.length
  }
  w.uint8(0xff)
  for (const [, bytes] of values) for (const byte of bytes) w.uint8(byte)
  return w.finish()
}

/**
 * Decodes the server's `PRELOGIN` reply.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const decodePrelogin = (data: Uint8Array): Result.Result<Prelogin, ParseError> =>
  parseResult(() => {
    let encryption: number | undefined
    let fedAuth: number | undefined
    let offset = 0
    const starts: Array<number> = []
    while (offset < data.length && data[offset] !== 0xff) {
      if (offset + 5 > data.length) parseError("Truncated PRELOGIN option")
      const start = (data[offset + 1] << 8) | data[offset + 2]
      const size = (data[offset + 3] << 8) | data[offset + 4]
      if (start + size > data.length) parseError("PRELOGIN option outside message")
      starts.push(start)
      if (data[offset] === 1) {
        if (size !== 1 || encryption !== undefined) parseError("Invalid PRELOGIN encryption option")
        encryption = data[start]
      }
      if (data[offset] === 6) {
        if (size !== 1 || fedAuth !== undefined || data[start] > 1) {
          parseError("Invalid PRELOGIN FEDAUTHREQUIRED option")
        }
        fedAuth = data[start]
      }
      offset += 5
    }
    if (offset >= data.length) parseError("Missing PRELOGIN terminator")
    for (const start of starts) {
      if (start <= offset) parseError("PRELOGIN option overlaps header")
    }
    if (encryption === undefined || encryption > Encryption.Required) {
      parseError("Missing or invalid PRELOGIN encryption")
    }
    return { encryption: encryption!, fedAuthRequired: fedAuth === 1 }
  })

/**
 * Settings carried by `LOGIN7`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Login7 {
  readonly server: string
  readonly username?: string | undefined
  readonly password?: string | undefined
  readonly database?: string | undefined
  readonly applicationName?: string | undefined
  readonly packetSize?: number | undefined
  /** Reported to the server as the client process; defaults to 0. */
  readonly processId?: number | undefined
  /** An SSPI token such as an NTLM `NEGOTIATE` message. */
  readonly sspi?: Uint8Array | undefined
  /** A Security Token for federated authentication. */
  readonly accessToken?: string | undefined
  /** Echoes the server's FEDAUTHREQUIRED `PRELOGIN` option. */
  readonly fedAuthEcho?: boolean | undefined
}

/** LOGIN7 offset/length pairs for the variable fields, in wire order. */
const login7Fields = [36, 40, 44, 48, 52, 56, 60, 64, 68, 78, 82, 86] as const

/**
 * Encodes a TDS 7.4 `LOGIN7` payload with UTF-8 support and, when an access
 * token is given, Security Token federated authentication.
 *
 * **Details**
 *
 * The payload contains the obfuscated password or the access token. Zero it
 * with `fill(0)` once it has been written to the socket.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeLogin7 = (options: Login7): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    const accessToken = options.accessToken
    if (accessToken !== undefined && (options.sspi || accessToken.length === 0 || accessToken.length > 60000)) {
      encodeError("Invalid federated authentication token or conflicting SSPI authentication")
    }
    const credentials = options.sspi === undefined && accessToken === undefined
    const values = [
      "effect",
      credentials ? options.username ?? "" : "",
      credentials ? options.password ?? "" : "",
      options.applicationName ?? "@effect/sql-mssql",
      options.server,
      "",
      "Effect",
      "",
      options.database ?? "master",
      "",
      "",
      ""
    ]
    for (const value of values) {
      if (value.length > 128) encodeError("LOGIN7 field exceeds 128 UTF-16 code units")
    }
    const w = begin()
    w.fill(0, 94)
    w.setUint32(4, tdsVersion)
    w.setUint32(8, options.packetSize ?? defaultPacketSize)
    w.setUint32(16, options.processId ?? 0)
    const bytes = w.bytes
    // Little endian, ASCII, IEEE, database notification, fatal database error.
    bytes[w.start + 24] = 0xe0
    // Fatal language error and ODBC session semantics, plus integrated security.
    bytes[w.start + 25] = options.sspi ? 0x83 : 0x03
    // Unknown collation handling and feature extensions.
    bytes[w.start + 27] = 0x18
    for (let i = 0; i < login7Fields.length; i++) {
      const position = login7Fields[i]
      const value = values[i]
      const mark = w.mark()
      w.setUint16(position, mark)
      w.setUint16(position + 2, value.length)
      w.utf16(value)
      if (position === 44) {
        // MS-TDS 2.2.6.4: swap each byte's nibbles, then XOR with 0xA5.
        const bytes = w.bytes
        for (let j = w.start + mark; j < w.offset; j++) bytes[j] = ((bytes[j] << 4) | (bytes[j] >>> 4)) ^ 0xa5
      }
    }
    if (options.sspi) {
      if (options.sspi.length > 65535) encodeError("SSPI payload too long")
      w.setUint16(78, w.mark())
      w.setUint16(80, options.sspi.length)
      w.raw(options.sspi)
    }
    // ibExtension points to a DWORD holding the absolute FeatureExt offset.
    const extension = w.mark()
    if (extension > 65535) encodeError("LOGIN7 variable fields exceed offset limit")
    w.setUint16(56, extension)
    w.setUint16(58, 4)
    w.uint32(extension + 4)
    if (accessToken !== undefined) {
      w.uint8(Feature.FedAuth)
      w.uint32(accessToken.length * 2 + 5)
      // Security Token library, plus the FEDAUTHREQUIRED echo bit.
      w.uint8(0x02 | (options.fedAuthEcho ? 1 : 0))
      w.uint32(accessToken.length * 2)
      w.utf16(accessToken)
    }
    w.uint8(Feature.Utf8Support)
    w.uint32(1)
    w.uint8(1)
    w.uint8(Feature.Terminator)
    const length = w.mark()
    if (length > 131071) encodeError("LOGIN7 exceeds protocol length limit")
    w.setUint32(0, length)
    return w.finish()
  })

// -----------------------------------------------------------------------------
// requests
// -----------------------------------------------------------------------------

/**
 * An RPC parameter.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Parameter {
  /** The name without its leading `@`. */
  readonly name: string
  readonly type: DataType
  readonly value: unknown
  readonly options?: ParameterOptions | undefined
  readonly output?: boolean | undefined
}

/**
 * The session state a request carries: the active transaction descriptor
 * (eight zero bytes outside a transaction) and the collation used to encode
 * non-Unicode text.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RequestContext {
  readonly transaction: Uint8Array
  readonly collation: Uint8Array
}

/** MS-TDS 2.2.5.3: an ALL_HEADERS block holding one transaction descriptor. */
const writeAllHeaders = (w: Writer, transaction: Uint8Array): void => {
  if (transaction.length !== 8) encodeError("Invalid transaction descriptor")
  w.uint32(22)
  w.uint32(18)
  w.uint16(2)
  w.raw(transaction)
  // Outstanding request count.
  w.uint32(1)
}

/**
 * Encodes a `SQL_BATCH` payload.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeSqlBatch = (sql: string, transaction: Uint8Array): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    const w = begin()
    writeAllHeaders(w, transaction)
    w.utf16(sql)
    return w.finish()
  })

/**
 * Encodes an RPC payload calling a stored procedure by name, or by well-known
 * identifier when `procedure` is a number.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeRpc = (
  procedure: string | number,
  parameters: ReadonlyArray<Parameter>,
  context: RequestContext
): Result.Result<Uint8Array, EncodeError> => encodeResult(() => encodeRpcUnsafe(procedure, parameters, context))

/**
 * Encodes an RPC payload running `sql` through `sp_executesql`, declaring and
 * binding each parameter.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeExecuteSql = (
  sql: string,
  parameters: ReadonlyArray<Parameter>,
  context: RequestContext
): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    const statement: Array<Parameter> = [{ name: "stmt", type: MssqlTypes.NVarChar, value: sql }]
    if (parameters.length > 0) {
      let declarations = ""
      for (let i = 0; i < parameters.length; i++) {
        const parameter = parameters[i]
        if (i > 0) declarations += ","
        declarations += `@${parameter.name} ${declare(parameter)}${parameter.output ? " OUTPUT" : ""}`
      }
      statement.push({ name: "params", type: MssqlTypes.NVarChar, value: declarations })
      for (const parameter of parameters) statement.push(parameter)
    }
    return encodeRpcUnsafe(spExecuteSql, statement, context)
  })

const encodeRpcUnsafe = (
  procedure: string | number,
  parameters: ReadonlyArray<Parameter>,
  context: RequestContext
): Uint8Array => {
  const w = begin()
  writeAllHeaders(w, context.transaction)
  if (typeof procedure === "number") {
    w.uint16(0xffff)
    w.uint16(procedure)
  } else {
    w.uint16(procedure.length)
    w.utf16(procedure)
  }
  // Option flags.
  w.uint16(0)
  for (const parameter of parameters) writeParameter(w, parameter, context.collation)
  return w.finish()
}

/**
 * Encodes one RPC parameter: its name, status, TYPE_INFO, and value.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeParameter = (
  parameter: Parameter,
  collation: Uint8Array
): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    const w = begin()
    writeParameter(w, parameter, collation)
    return w.finish()
  })

const parameterNamePattern = /^@[\p{L}\p{N}_@$#]+$/u

const writeParameter = (w: Writer, parameter: Parameter, collation: Uint8Array): void => {
  const name = parameter.name.startsWith("@") ? parameter.name : `@${parameter.name}`
  if (name.length > 255 || !parameterNamePattern.test(name)) encodeError("Invalid RPC parameter name")
  // Validates the type and its length, precision, and scale.
  declare(parameter)
  w.bVarChar(name)
  // Status flags: by-reference (output) value.
  w.uint8(parameter.output ? 1 : 0)
  writeTyped(w, parameter, collation, bothParts)
}

// -----------------------------------------------------------------------------
// parameter values
// -----------------------------------------------------------------------------

const unicodeLimit = 4000
const byteLimit = 8000

const table = (value: unknown): Table => {
  if (
    typeof value !== "object" || value === null || !("columns" in value) || !("rows" in value) ||
    !Array.isArray(value.columns) || !Array.isArray(value.rows) || !("name" in value) || typeof value.name !== "string"
  ) {
    encodeError("Expected a named table-valued parameter with columns and rows")
  }
  const t = value as Table
  if (t.columns.length > 1024) encodeError("TVP exceeds column limit")
  return t
}

const identifier = (name: string): string => {
  if (name.length === 0 || name.length > 128 || name.includes("\0")) encodeError("Invalid SQL type identifier")
  return `[${name.replaceAll("]", "]]")}]`
}

const integer = (value: unknown, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    encodeError(`Expected integer between ${min} and ${max}`)
  }
  return value as number
}

const finite = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) encodeError("Expected a finite number")
  return value as number
}

const validDate = (value: unknown): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) encodeError("Expected a valid Date")
  return value as Date
}

const isUnicode = (id: number): boolean => id === Type.NVarChar || id === Type.NChar

const isBinary = (id: number): boolean => id === Type.BigVarBinary || id === Type.BigBinary

const knownTypes = new Set<number>(
  [
    MssqlTypes.TinyInt,
    MssqlTypes.SmallInt,
    MssqlTypes.Int,
    MssqlTypes.BigInt,
    MssqlTypes.Bit,
    MssqlTypes.Real,
    MssqlTypes.Float,
    MssqlTypes.NVarChar,
    MssqlTypes.NChar,
    MssqlTypes.VarChar,
    MssqlTypes.Char,
    MssqlTypes.VarBinary,
    MssqlTypes.Binary,
    MssqlTypes.Date,
    MssqlTypes.Time,
    MssqlTypes.DateTime,
    MssqlTypes.DateTime2,
    MssqlTypes.DateTimeOffset,
    MssqlTypes.SmallDateTime,
    MssqlTypes.UniqueIdentifier,
    MssqlTypes.Decimal,
    MssqlTypes.Numeric,
    MssqlTypes.Money,
    MssqlTypes.SmallMoney,
    MssqlTypes.Text,
    MssqlTypes.NText,
    MssqlTypes.Image,
    MssqlTypes.Xml,
    MssqlTypes.TVP,
    MssqlTypes.UDT,
    MssqlTypes.Variant
  ].map((type) => type.id)
)

/** The declared length of a variable-length parameter, or `Infinity` for MAX. */
const declaredLength = (parameter: Parameter): number => {
  const id = parameter.type.id
  const unicode = isUnicode(id)
  const limit = unicode ? unicodeLimit : byteLimit
  const value = parameter.value
  const valueLength = typeof value === "string"
    ? (unicode ? value.length : utf8Length(value))
    : value instanceof Uint8Array
    ? value.byteLength
    : 1
  const length = parameter.options?.length ?? (value == null ? limit : Math.max(1, valueLength))
  if (!(length === Infinity || Number.isInteger(length) && length > 0)) encodeError("Invalid parameter length")
  if ((id === Type.NChar || id === Type.BigChar || id === Type.BigBinary) && length > limit) {
    encodeError("Fixed parameter length exceeds type limit")
  }
  return length > limit ? Infinity : length
}

/** The type as written in an `sp_executesql` parameter declaration. */
const declare = (parameter: Parameter): string => {
  const type = parameter.type
  const name = type.name.toLowerCase()
  const options = parameter.options
  switch (type.id) {
    case Type.Tvp: {
      const t = table(parameter.value)
      return `${identifier(t.schema ?? "dbo")}.${identifier(t.name)} READONLY`
    }
    case Type.NVarChar:
    case Type.NChar:
    case Type.BigVarChar:
    case Type.BigChar:
    case Type.BigVarBinary:
    case Type.BigBinary: {
      const length = declaredLength(parameter)
      return `${name}(${length === Infinity ? "max" : length})`
    }
    case Type.DecimalN:
    case Type.NumericN: {
      const precision = options?.precision ?? 18
      integer(precision, 1, 38)
      integer(options?.scale ?? 0, 0, precision)
      return `${name}(${precision},${options?.scale ?? 0})`
    }
    case Type.Time:
    case Type.DateTime2:
    case Type.DateTimeOffset:
      return `${name}(${integer(options?.scale ?? 7, 0, 7)})`
  }
  if (!knownTypes.has(type.id)) encodeError(`Unsupported parameter type ${type.name}`)
  return name
}

/** Which parts of a typed value `writeTyped` writes. */
const typeInfoPart = 1
const valuePart = 2
const bothParts = 3

/**
 * Writes a parameter's TYPE_INFO, its value, or both. A table-valued
 * parameter writes its column TYPE_INFOs and its row values separately, which
 * is why the parts are separable.
 */
const writeTyped = (w: Writer, parameter: Parameter, collation: Uint8Array, parts: number): void => {
  const value = parameter.value
  const isNull = value === null || value === undefined
  const id = parameter.type.id
  const info = (parts & typeInfoPart) !== 0
  const body = (parts & valuePart) !== 0
  switch (id) {
    case Type.Tvp:
      return writeTable(w, parameter, collation)
    case Type.Text:
    case Type.NText:
    case Type.Image:
    case Type.Xml: {
      let data: Uint8Array = emptyBytes
      if (!isNull) {
        if (id === Type.Image) {
          if (!(value instanceof Uint8Array)) encodeError("Expected Uint8Array")
          data = value as Uint8Array
        } else {
          if (typeof value !== "string") encodeError("Expected string")
          data = id === Type.Text ? encodeCodePage(value as string, collation) : encodeUtf16(value as string)
        }
      }
      if (id === Type.Xml) {
        if (info) {
          w.uint8(Type.Xml)
          // No schema.
          w.uint8(0)
        }
        if (body) writePlp(w, isNull ? undefined : data)
        return
      }
      if (info) {
        w.uint8(id)
        w.uint32(isNull ? 0xffffffff : data.length)
        if (id !== Type.Image) w.raw(collation)
      }
      if (body) {
        w.uint32(isNull ? 0xffffffff : data.length)
        w.raw(data)
      }
      return
    }
    case Type.Int1:
    case Type.Int2:
    case Type.Int4:
    case Type.Int8: {
      const size = id === Type.Int1 ? 1 : id === Type.Int2 ? 2 : id === Type.Int4 ? 4 : 8
      if (info) {
        w.uint8(Type.IntN)
        w.uint8(size)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      w.uint8(size)
      if (size === 8) {
        if (typeof value === "number" && !Number.isSafeInteger(value)) {
          encodeError("BigInt number must be a safe integer")
        }
        if (typeof value !== "bigint" && typeof value !== "string" && typeof value !== "number") {
          encodeError("Invalid BigInt")
        }
        let n: bigint
        try {
          n = BigInt(value as bigint | string | number)
        } catch {
          return encodeError("Invalid BigInt")
        }
        if (n < -(BigInt(1) << BigInt(63)) || n >= BigInt(1) << BigInt(63)) encodeError("BigInt outside 64-bit range")
        w.bigInt64(n)
      } else if (size === 1) {
        w.uint8(integer(value, 0, 255))
      } else {
        const bound = 2 ** (size * 8 - 1)
        const n = integer(value, -bound, bound - 1)
        if (size === 2) w.uint16(n & 0xffff)
        else w.uint32(n >>> 0)
      }
      return
    }
    case Type.Bit: {
      if (info) {
        w.uint8(Type.BitN)
        w.uint8(1)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      if (typeof value !== "boolean" && value !== 0 && value !== 1) encodeError("Invalid Bit")
      w.uint8(1)
      w.uint8(value ? 1 : 0)
      return
    }
    case Type.Flt4:
    case Type.Flt8: {
      const size = id === Type.Flt4 ? 4 : 8
      if (info) {
        w.uint8(Type.FltN)
        w.uint8(size)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      const n = finite(value)
      w.uint8(size)
      if (size === 4) w.float32(n)
      else w.float64(n)
      return
    }
    case Type.NVarChar:
    case Type.NChar:
    case Type.BigVarChar:
    case Type.BigChar:
    case Type.BigVarBinary:
    case Type.BigBinary: {
      const unicode = isUnicode(id)
      const binary = isBinary(id)
      let data: Uint8Array = emptyBytes
      let text: string | undefined
      if (!isNull) {
        if (binary) {
          if (!(value instanceof Uint8Array)) encodeError("Expected Uint8Array")
          data = value as Uint8Array
        } else {
          if (typeof value !== "string") encodeError("Expected string")
          if (unicode) text = value as string
          else data = encodeCodePage(value as string, collation, "Unsupported SQL Server parameter collation")
        }
      }
      const declared = declaredLength(parameter)
      const max = declared === Infinity
      const byteLength = text !== undefined ? text.length * 2 : data.length
      const length = max ? 0xffff : declared * (unicode ? 2 : 1)
      if (!max && byteLength > length) encodeError("Parameter exceeds declared length")
      if (info) {
        w.uint8(id)
        w.uint16(length)
        if (!binary) w.raw(collation)
      }
      if (!body) return
      if (max) {
        if (isNull) return w.fill(0xff, 8)
        // A PLP value with a known length and a single chunk.
        w.bigUint64(BigInt(byteLength))
        w.uint32(byteLength)
        if (text !== undefined) w.utf16(text)
        else w.raw(data)
        if (byteLength > 0) w.uint32(0)
        return
      }
      if (isNull) return w.uint16(0xffff)
      w.uint16(byteLength)
      if (text !== undefined) w.utf16(text)
      else w.raw(data)
      return
    }
    case Type.Date:
    case Type.Time:
    case Type.DateTime2:
    case Type.DateTimeOffset:
      return writeTemporal(w, parameter, info, body)
    case Type.DateTime:
    case Type.DateTim4:
      return writeDateTime(w, parameter, info, body)
    case Type.DecimalN:
    case Type.NumericN: {
      const precision = parameter.options?.precision ?? 18
      const scale = parameter.options?.scale ?? 0
      const size = precision <= 9 ? 5 : precision <= 19 ? 9 : precision <= 28 ? 13 : 17
      if (info) {
        w.uint8(id)
        w.uint8(size)
        w.uint8(precision)
        w.uint8(scale)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      const n = scaledInteger(value, scale)
      let magnitude = n < BigInt(0) ? -n : n
      if (magnitude >= BigInt(10) ** BigInt(precision)) encodeError("Decimal exceeds declared precision")
      w.uint8(size)
      w.uint8(n < BigInt(0) ? 0 : 1)
      for (let i = 1; i < size; i++) {
        w.uint8(Number(magnitude & BigInt(255)))
        magnitude >>= BigInt(8)
      }
      return
    }
    case Type.Money:
    case Type.Money4: {
      const size = id === Type.Money ? 8 : 4
      if (info) {
        w.uint8(Type.MoneyN)
        w.uint8(size)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      const n = scaledInteger(value, 4)
      const limit = BigInt(1) << BigInt(size * 8 - 1)
      if (n < -limit || n >= limit) encodeError("Money outside SQL Server range")
      w.uint8(size)
      if (size === 4) {
        w.uint32(Number(BigInt.asUintN(32, n)))
      } else {
        // MONEY sends its high half first.
        w.uint32(Number(BigInt.asUintN(32, n >> BigInt(32))))
        w.uint32(Number(BigInt.asUintN(32, n)))
      }
      return
    }
    case Type.Guid: {
      if (info) {
        w.uint8(Type.Guid)
        w.uint8(16)
      }
      if (!body) return
      if (isNull) return w.uint8(0)
      if (typeof value !== "string" || !uuidPattern.test(value)) encodeError("Invalid UUID")
      w.uint8(16)
      const hex = (value as string).replaceAll("-", "")
      for (const index of guidByteOrder) w.uint8(parseInt(hex.slice(index * 2, index * 2 + 2), 16))
      return
    }
  }
  if (!knownTypes.has(id)) encodeError(`Unsupported parameter type ${parameter.type.name}`)
  encodeError(`Parameter encoding for ${parameter.type.name} is not implemented`)
}

const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

/** A GUID's first three groups are little-endian on the wire. */
const guidByteOrder = [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15] as const

/** A PLP value with a known length in one chunk, or PLP NULL. */
const writePlp = (w: Writer, data: Uint8Array | undefined): void => {
  if (data === undefined) return w.fill(0xff, 8)
  w.bigUint64(BigInt(data.length))
  w.uint32(data.length)
  w.raw(data)
  if (data.length > 0) w.uint32(0)
}

const encodeCodePage = (
  value: string,
  collation: Uint8Array,
  message = "Unsupported SQL Server collation"
): Uint8Array => {
  const codepage = collationEncoding(collation)
  if (codepage === undefined) encodeError(message)
  return Iconv.encode(value, codepage!)
}

const writeTable = (w: Writer, parameter: Parameter, collation: Uint8Array): void => {
  if (parameter.output) encodeError("TVPs cannot be output parameters")
  const t = table(parameter.value)
  const columns: Array<Parameter> = []
  for (const column of t.columns) {
    const id = column.type.id
    if (id === Type.Tvp || id === Type.Text || id === Type.NText || id === Type.Image) {
      encodeError("Unsupported TVP column type")
    }
    const length = column.length ?? (isUnicode(id) ? unicodeLimit : byteLimit)
    const parameter: Parameter = { name: column.name, type: column.type, value: null, options: { ...column, length } }
    declare(parameter)
    columns.push(parameter)
  }
  for (const value of [t.schema ?? "dbo", t.name]) {
    if (value.length > 128) encodeError("TVP type name too long")
  }
  w.uint8(Type.Tvp)
  // Database name: always empty for a parameter.
  w.uint8(0)
  w.bVarChar(t.schema ?? "dbo")
  w.bVarChar(t.name)
  w.uint16(columns.length)
  for (const column of columns) {
    // User type and flags.
    w.fill(0, 6)
    writeTyped(w, column, collation, typeInfoPart)
    // Column name: empty.
    w.uint8(0)
  }
  // TVP_END_TOKEN: no optional metadata.
  w.uint8(0)
  for (const row of t.rows) {
    if (!Array.isArray(row) || row.length !== columns.length) encodeError("TVP row does not match columns")
    // TVP_ROW_TOKEN.
    w.uint8(1)
    for (let i = 0; i < columns.length; i++) {
      writeTyped(w, { ...columns[i], value: row[i] }, collation, valuePart)
    }
  }
  // TVP_END_TOKEN.
  w.uint8(0)
}

const writeTemporal = (w: Writer, parameter: Parameter, info: boolean, body: boolean): void => {
  const id = parameter.type.id
  const scale = parameter.options?.scale ?? 7
  const timeSize = scale <= 2 ? 3 : scale <= 4 ? 4 : 5
  if (info) {
    w.uint8(id)
    if (id !== Type.Date) w.uint8(scale)
  }
  if (!body) return
  const value = parameter.value
  if (value === null || value === undefined) return w.uint8(0)
  const date = validDate(value)
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) encodeError("Date outside SQL Server range")
  let days = Math.floor((date.getTime() - dateEpochMillis) / millisPerDay)
  const time = ((date.getTime() % millisPerDay) + millisPerDay) % millisPerDay
  let ticks = 0
  if (id !== Type.Date) {
    // Decoded values carry tedious's plural spelling. Accept the legacy
    // singular spelling too, which tedious's input encoder used.
    const temporal = date as Date & { nanosecondsDelta?: unknown; nanosecondDelta?: unknown }
    const delta = temporal.nanosecondsDelta ?? temporal.nanosecondDelta ?? 0
    if (typeof delta !== "number" || !Number.isFinite(delta) || delta < 0 || delta >= 0.001) {
      encodeError("Invalid sub-millisecond time fraction")
    }
    ticks = Math.round(time * 10 ** (scale - 3) + (delta as number) * 10 ** scale)
    if (ticks === 86400 * 10 ** scale) {
      ticks = 0
      if (id !== Type.Time) days++
    }
    if (days > maxDays) encodeError("Rounded date outside SQL Server range")
  }
  const size = id === Type.Date ? 3 : id === Type.Time ? timeSize : id === Type.DateTime2 ? timeSize + 3 : timeSize + 5
  w.uint8(size)
  if (id !== Type.Date) w.uintN(ticks, timeSize)
  if (id !== Type.Time) w.uintN(days, 3)
  // A zero offset: DATETIMEOFFSET values are sent in UTC.
  if (id === Type.DateTimeOffset) w.uint16(0)
}

const writeDateTime = (w: Writer, parameter: Parameter, info: boolean, body: boolean): void => {
  const size = parameter.type.id === Type.DateTime ? 8 : 4
  if (info) {
    w.uint8(Type.DateTimeN)
    w.uint8(size)
  }
  if (!body) return
  const value = parameter.value
  if (value === null || value === undefined) return w.uint8(0)
  const date = validDate(value)
  let days = Math.floor((date.getTime() - datetimeEpochMillis) / millisPerDay)
  const time = ((date.getTime() % millisPerDay) + millisPerDay) % millisPerDay
  w.uint8(size)
  if (size === 8) {
    if (date.getUTCFullYear() < 1753 || date.getUTCFullYear() > 9999) {
      encodeError("DateTime outside SQL Server range")
    }
    // DATETIME counts 1/300 second ticks.
    let ticks = Math.round(time * 0.3)
    if (ticks === 25920000) {
      days++
      ticks = 0
    }
    if (new Date(days * millisPerDay + datetimeEpochMillis).getUTCFullYear() > 9999) {
      encodeError("Rounded DateTime outside SQL Server range")
    }
    w.uint32(days >>> 0)
    w.uint32(ticks)
  } else {
    let minutes = Math.round(time / 60000)
    if (minutes === 1440) {
      days++
      minutes = 0
    }
    integer(days, 0, 65535)
    w.uint16(days)
    w.uint16(minutes)
  }
}

const decimalPattern = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i

/** Rounds decimal text using integer arithmetic, including exponent notation. */
const scaledInteger = (value: unknown, scale: number): bigint => {
  if (typeof value !== "number" && typeof value !== "string" && typeof value !== "bigint") {
    encodeError("Invalid decimal")
  }
  const text = String(value)
  const match = decimalPattern.exec(text)
  if (!match || text.length > 1000) return encodeError("Invalid decimal")
  const exponent = Number(match[4] ?? 0) + scale - (match[3]?.length ?? 0)
  if (Math.abs(exponent) > 1000) encodeError("Decimal exponent outside supported range")
  let n = BigInt(match[2] + (match[3] ?? ""))
  if (exponent >= 0) {
    n *= BigInt(10) ** BigInt(exponent)
  } else {
    const divisor = BigInt(10) ** BigInt(-exponent)
    n = (n + divisor / BigInt(2)) / divisor
  }
  return match[1] === "-" ? -n : n
}

// -----------------------------------------------------------------------------
// tokens
// -----------------------------------------------------------------------------

/**
 * Metadata for one result column or return value.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Column {
  readonly name: string
  readonly type: number
  readonly length: number
  readonly scale: number
  readonly precision: number
  readonly collation?: Uint8Array | undefined
}

/**
 * The fields of an `ERROR` or `INFO` token.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ServerMessage {
  readonly number: number
  readonly state: number
  readonly class: number
  readonly message: string
  readonly serverName: string
  readonly procName: string
  readonly lineNumber: number
}

/**
 * A decoded `ENVCHANGE` token.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EnvChange =
  | { readonly _tag: "PacketSize"; readonly size: number }
  | { readonly _tag: "Collation"; readonly collation: Uint8Array }
  | { readonly _tag: "BeginTransaction"; readonly descriptor: Uint8Array }
  | { readonly _tag: "EndTransaction" }
  | { readonly _tag: "Routing"; readonly server: string; readonly port: number }
  | { readonly _tag: "Other"; readonly type: number }

/**
 * A decoded server token.
 *
 * **Details**
 *
 * `Done` covers `DONE`, `DONEPROC`, and `DONEINPROC`, told apart by `kind`.
 * Its `rowCount` is exact up to 2^53. `Ignored` covers tokens a client
 * does not act on, such as `ORDER` and `TABNAME`.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Token =
  | { readonly _tag: "Metadata"; readonly columns: ReadonlyArray<Column> }
  | { readonly _tag: "Row"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Done"; readonly kind: number; readonly status: number; readonly rowCount: number }
  | { readonly _tag: "Error" | "Info"; readonly message: ServerMessage }
  | { readonly _tag: "EnvChange"; readonly change: EnvChange }
  | { readonly _tag: "LoginAck"; readonly version: number }
  | { readonly _tag: "ReturnStatus"; readonly value: number }
  | { readonly _tag: "ReturnValue"; readonly name: string; readonly value: unknown }
  | { readonly _tag: "Sspi"; readonly data: Uint8Array }
  | { readonly _tag: "FeatureAck"; readonly features: ReadonlyMap<number, Uint8Array> }
  | { readonly _tag: "Ignored" }

/**
 * An incremental decoder for the token stream of a response.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface TokenParser {
  /**
   * The columns of the result being decoded, set by each `COLMETADATA`. Reset
   * it to `undefined` before a new request so a stray row cannot be decoded
   * with the previous result's columns.
   */
  columns: ReadonlyArray<Column> | undefined
  /**
   * Decodes a chunk and passes each complete token to `onToken` immediately.
   * A partial token is retained for the next call. Throws `ParseError` on
   * malformed input, after which the parser must not be reused.
   */
  readonly push: (chunk: Uint8Array, onToken: (token: Token) => void) => void
  /** Throws `ParseError` when a message ended inside a token. */
  readonly end: () => void
}

/**
 * Creates a `TokenParser`.
 *
 * **Details**
 *
 * `maxTokenSize` bounds the bytes held for one incomplete token, and so the
 * size of any single value, including PLP values. It defaults to 16 MiB.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeTokenParser = (options?: {
  readonly maxTokenSize?: number | undefined
}): TokenParser => {
  const maxTokenSize = options?.maxTokenSize ?? defaultMaxMessageSize
  if (!Number.isSafeInteger(maxTokenSize) || maxTokenSize < 1) parseError("Invalid token size limit")
  let buffer = new Uint8Array(Math.min(4096, maxTokenSize))
  let start = 0
  let end = 0
  const reader = new Reader()

  const parser: TokenParser = {
    columns: undefined,
    push: (chunk, onToken) => {
      let offset = 0
      while (offset < chunk.length) {
        if (start === end) {
          // Nothing is pending, so decode straight from the chunk and keep
          // only an incomplete tail.
          reader.reset(chunk, offset, chunk.length, false)
          offset = drain(chunk.length, onToken)
          const rest = chunk.length - offset
          if (rest === 0) return
          if (rest > maxTokenSize) parseError("TDS token exceeds configured size limit")
          if (rest > buffer.length) buffer = new Uint8Array(Math.min(maxTokenSize, Math.max(buffer.length * 2, rest)))
          buffer.set(chunk.subarray(offset))
          start = 0
          end = rest
          return
        }
        // Append in bounded pieces, so a large chunk of small tokens after a
        // partial one does not count as one oversized token.
        const pending = end - start
        const size = Math.min(chunk.length - offset, maxTokenSize - pending)
        if (size === 0) parseError("TDS token exceeds configured size limit")
        if (end + size > buffer.length) {
          if (pending + size <= buffer.length) {
            buffer.copyWithin(0, start, end)
          } else {
            const next = new Uint8Array(Math.min(maxTokenSize, Math.max(buffer.length * 2, pending + size)))
            next.set(buffer.subarray(start, end))
            buffer = next
          }
          start = 0
          end = pending
        }
        buffer.set(chunk.subarray(offset, offset + size), end)
        end += size
        offset += size
        reader.reset(buffer, start, end, false)
        start = drain(end, onToken)
        if (start === end) start = end = 0
      }
    },
    end: () => {
      if (start !== end) parseError("Truncated TDS token at end of message")
    }
  }

  /** Decodes whole tokens from `reader` and returns where the first incomplete one starts. */
  const drain = (limit: number, onToken: (token: Token) => void): number => {
    let position = reader.offset
    while (position < limit) {
      let token: Token
      try {
        token = readToken(reader, parser, maxTokenSize)
      } catch (error) {
        if (error === incomplete) return position
        throw error
      }
      if (reader.offset - position > maxTokenSize) parseError("TDS token exceeds configured size limit")
      position = reader.offset
      if (token._tag === "Metadata") parser.columns = token.columns
      onToken(token)
    }
    return position
  }

  return parser
}

const doneToken = (kind: number, status: number, rowCount: number): Token => ({
  _tag: "Done",
  kind,
  status,
  rowCount
})

const ignored: Token = { _tag: "Ignored" }

const readToken = (r: Reader, parser: TokenParser, maxValueSize: number): Token => {
  const kind = r.uint8()
  switch (kind) {
    case TokenType.Row:
    case TokenType.NbcRow: {
      const columns = parser.columns
      if (columns === undefined) return parseError("ROW received before COLMETADATA")
      const count = columns.length
      let nulls: Uint8Array | undefined
      if (kind === TokenType.NbcRow) nulls = r.raw(Math.ceil(count / 8))
      const values = new Array<unknown>(count)
      for (let i = 0; i < count; i++) {
        values[i] = nulls !== undefined && (nulls[i >> 3] & (1 << (i & 7))) !== 0
          ? null
          : readValue(r, columns[i], maxValueSize)
      }
      return { _tag: "Row", values }
    }
    case TokenType.Done:
    case TokenType.DoneProc:
    case TokenType.DoneInProc: {
      const status = r.uint16()
      // Current command.
      r.skip(2)
      return doneToken(kind, status, r.uint64())
    }
    case TokenType.ColMetadata: {
      const count = r.uint16()
      if (count === 0xffff) return ignored
      const columns: Array<Column> = []
      for (let i = 0; i < count; i++) {
        const column = readColumn(r)
        if (column.type === Type.Text || column.type === Type.NText || column.type === Type.Image) {
          // Legacy LOB columns carry their table name in parts.
          const parts = r.uint8()
          for (let p = 0; p < parts; p++) r.usVarChar()
        }
        columns.push({ ...column, name: r.bVarChar() })
      }
      return { _tag: "Metadata", columns }
    }
    case TokenType.Error:
    case TokenType.Info: {
      const body = r.sub(r.uint16())
      const message: ServerMessage = {
        number: body.uint32(),
        state: body.uint8(),
        class: body.uint8(),
        message: body.usVarChar(),
        serverName: body.bVarChar(),
        procName: body.bVarChar(),
        lineNumber: body.uint32()
      }
      return { _tag: kind === TokenType.Error ? "Error" : "Info", message }
    }
    case TokenType.EnvChange:
      return { _tag: "EnvChange", change: readEnvChange(r.sub(r.uint16())) }
    case TokenType.LoginAck: {
      const body = r.sub(r.uint16())
      // Interface.
      body.skip(1)
      const bytes = body.raw(4)
      // The TDS version is the one big-endian field in the token stream.
      const version = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
      body.bVarChar()
      body.skip(4)
      return { _tag: "LoginAck", version }
    }
    case TokenType.ReturnStatus:
      return { _tag: "ReturnStatus", value: r.int32() }
    case TokenType.ReturnValue: {
      // Parameter ordinal.
      r.skip(2)
      const name = r.bVarChar()
      // Status.
      r.skip(1)
      const column = readColumn(r)
      return {
        _tag: "ReturnValue",
        name: name.startsWith("@") ? name.slice(1) : name,
        value: readValue(r, column, maxValueSize)
      }
    }
    case TokenType.Sspi:
      return { _tag: "Sspi", data: r.copy(r.uint16()) }
    case TokenType.TabName:
    case TokenType.ColInfo:
    case TokenType.Order:
      r.skip(r.uint16())
      return ignored
    case TokenType.SessionState:
    case TokenType.FedAuthInfo:
      r.skip(r.uint32())
      return ignored
    case TokenType.FeatureExtAck: {
      const features = new Map<number, Uint8Array>()
      for (let id = r.uint8(); id !== Feature.Terminator; id = r.uint8()) {
        if (features.has(id)) parseError("Duplicate feature acknowledgement")
        features.set(id, r.copy(r.uint32()))
      }
      return { _tag: "FeatureAck", features }
    }
  }
  return parseError(`Unexpected TDS token 0x${kind.toString(16)}`)
}

const readEnvChange = (r: Reader): EnvChange => {
  const type = r.uint8()
  switch (type) {
    case EnvChangeType.PacketSize: {
      const size = Number(r.bVarChar())
      if (!isPacketSize(size)) parseError("Invalid negotiated packet size")
      return { _tag: "PacketSize", size }
    }
    case EnvChangeType.Collation: {
      const collation = r.copy(r.uint8())
      if (collation.length !== 5) parseError("Invalid negotiated collation")
      return { _tag: "Collation", collation }
    }
    case EnvChangeType.BeginTransaction: {
      const descriptor = r.copy(r.uint8())
      if (descriptor.length !== 8) parseError("Invalid transaction descriptor")
      return { _tag: "BeginTransaction", descriptor }
    }
    case EnvChangeType.CommitTransaction:
    case EnvChangeType.RollbackTransaction:
    case EnvChangeType.DefectTransaction:
      return { _tag: "EndTransaction" }
    case EnvChangeType.Routing: {
      const route = r.sub(r.uint16())
      if (route.uint8() !== 0) parseError("Unsupported routing protocol")
      const port = route.uint16()
      const server = route.usVarChar()
      if (port === 0 || !server || server.includes("\0") || route.remaining !== 0) {
        parseError("Invalid routing target")
      }
      return { _tag: "Routing", server, port }
    }
  }
  return { _tag: "Other", type }
}

/** Sizes of the fixed-length types, or -1. */
const fixedSize = (() => {
  const sizes = new Int8Array(256).fill(-1)
  sizes[Type.Null] = 0
  sizes[Type.Int1] = 1
  sizes[Type.Bit] = 1
  sizes[Type.Int2] = 2
  sizes[Type.Int4] = 4
  sizes[Type.DateTim4] = 4
  sizes[Type.Flt4] = 4
  sizes[Type.Money4] = 4
  sizes[Type.Money] = 8
  sizes[Type.DateTime] = 8
  sizes[Type.Flt8] = 8
  sizes[Type.Int8] = 8
  return sizes
})()

/** Types with a one-byte length in TYPE_INFO and before each value. */
const isByteLength = (type: number): boolean =>
  type === Type.Guid || type === Type.IntN || type === Type.BitN || type === Type.FltN ||
  type === Type.MoneyN || type === Type.DateTimeN

/** Types with a two-byte length: the `BIG*` and `N*` string and binary types. */
const isShortLength = (type: number): boolean =>
  type === Type.BigVarBinary || type === Type.BigBinary || type === Type.BigVarChar || type === Type.BigChar ||
  type === Type.NVarChar || type === Type.NChar

const isLegacyLob = (type: number): boolean => type === Type.Text || type === Type.NText || type === Type.Image

const hasCollation = (type: number): boolean =>
  type === Type.BigVarChar || type === Type.BigChar || type === Type.NVarChar || type === Type.NChar

const readColumn = (r: Reader): Column => {
  // User type.
  r.skip(4)
  const flags = r.uint16()
  if (flags & 0x0800) parseError("Encrypted column metadata is not supported")
  const type = r.uint8()
  let length = Math.max(0, fixedSize[type])
  let scale = 0
  let precision = 0
  let collation: Uint8Array | undefined
  if (fixedSize[type] >= 0 || type === Type.Date) {
    // Fixed types and DATE have no further metadata.
  } else if (isByteLength(type)) {
    length = r.uint8()
  } else if (type === Type.DecimalN || type === Type.NumericN) {
    length = r.uint8()
    precision = r.uint8()
    scale = r.uint8()
    if (precision < 1 || precision > 38 || scale > precision) parseError("Invalid decimal metadata")
  } else if (type === Type.Time || type === Type.DateTime2 || type === Type.DateTimeOffset) {
    scale = r.uint8()
    if (scale > 7) parseError("Invalid time scale")
  } else if (isShortLength(type)) {
    length = r.uint16()
    if (hasCollation(type)) collation = r.copy(5)
  } else if (isLegacyLob(type)) {
    length = r.uint32()
    if (type !== Type.Image) collation = r.copy(5)
  } else if (type === Type.Xml) {
    length = 0xffff
    if (r.uint8() === 1) {
      // Schema database, owning schema, and collection.
      r.bVarChar()
      r.bVarChar()
      r.usVarChar()
    }
  } else if (type === Type.Udt) {
    length = r.uint16()
    // Database, schema, type name, and assembly qualified name.
    r.bVarChar()
    r.bVarChar()
    r.bVarChar()
    r.usVarChar()
  } else if (type === Type.Variant) {
    length = r.uint32()
  } else {
    parseError(`Unsupported TDS type 0x${type.toString(16)}`)
  }
  return { name: "", type, length, scale, precision, collation }
}

const readPlp = (r: Reader, maxValueSize: number): Uint8Array | null => {
  const length = r.bigUint64()
  if (length === plpNull) return null
  const unknown = length === plpUnknown
  if (!unknown && length > BigInt(maxValueSize)) parseError("TDS value exceeds configured size limit")
  let first: Uint8Array | undefined
  let chunks: Array<Uint8Array> | undefined
  let total = 0
  while (true) {
    const size = r.uint32()
    if (size === 0) break
    total += size
    if (total > maxValueSize || (!unknown && BigInt(total) > length)) parseError("Invalid PLP chunk length")
    const chunk = r.raw(size)
    if (first === undefined) first = chunk
    else (chunks ??= [first]).push(chunk)
  }
  if (!unknown && BigInt(total) !== length) parseError("PLP total length mismatch")
  if (chunks !== undefined) return concat(chunks, total)
  return first ?? emptyBytes
}

const invalidSize = (size: number): never => parseError(`Invalid TDS value size ${size}`)

/** Decodes one column value at the reader's position. */
const readValue = (r: Reader, column: Column, maxValueSize: number): unknown => {
  const type = column.type
  const fixed = fixedSize[type]
  let size: number
  if (fixed >= 0) {
    size = fixed
  } else if (type === Type.Xml || type === Type.Udt || column.length === 0xffff) {
    const data = readPlp(r, maxValueSize)
    return data === null ? null : decodeBytes(data, 0, data.length, column)
  } else if (isShortLength(type)) {
    size = r.uint16()
    if (size === 0xffff) return null
    if (size > column.length) parseError("Value exceeds column length")
  } else if (isLegacyLob(type)) {
    const pointerLength = r.uint8()
    if (pointerLength === 0) return null
    // Text pointer and timestamp.
    r.skip(pointerLength + 8)
    size = r.uint32()
    if (size > maxValueSize) parseError("TDS value exceeds configured size limit")
  } else if (type === Type.Variant) {
    return readVariant(r, maxValueSize)
  } else {
    size = r.uint8()
    if (size === 0) return null
  }
  r.require(size)
  const offset = r.offset
  r.offset += size
  return decodeFixed(r, offset, size, column)
}

/** Decodes a value whose bytes sit in the reader at `offset`. */
const decodeFixed = (r: Reader, offset: number, size: number, column: Column): unknown => {
  const bytes = r.bytes
  switch (column.type) {
    case Type.Null:
      return null
    case Type.Int1:
      return bytes[offset]
    case Type.Int2:
      return (readUInt16(bytes, offset) << 16) >> 16
    case Type.Int4:
      return readUInt32(bytes, offset) | 0
    case Type.Int8:
      return r.view.getBigInt64(offset, true).toString()
    case Type.IntN:
      if (size !== 1 && size !== 2 && size !== 4 && size !== 8) invalidSize(size)
      return size === 8
        ? r.view.getBigInt64(offset, true).toString()
        : size === 1
        ? bytes[offset]
        : size === 2
        ? (readUInt16(bytes, offset) << 16) >> 16
        : readUInt32(bytes, offset) | 0
    case Type.Bit:
    case Type.BitN:
      if (size !== 1) invalidSize(size)
      return bytes[offset] !== 0
    case Type.Flt4:
      return r.view.getFloat32(offset, true)
    case Type.Flt8:
      return r.view.getFloat64(offset, true)
    case Type.FltN:
      if (size !== 4 && size !== 8) invalidSize(size)
      return size === 4 ? r.view.getFloat32(offset, true) : r.view.getFloat64(offset, true)
    case Type.Money4:
    case Type.Money:
    case Type.MoneyN:
      if (size !== 4 && size !== 8) invalidSize(size)
      return size === 4
        ? (readUInt32(bytes, offset) | 0) / 10000
        : ((readUInt32(bytes, offset) | 0) * 0x100000000 + readUInt32(bytes, offset + 4)) / 10000
    case Type.DecimalN:
    case Type.NumericN: {
      if (size !== 5 && size !== 9 && size !== 13 && size !== 17) invalidSize(size)
      let n = BigInt(0)
      for (let i = size - 1; i > 0; i--) n = (n << BigInt(8)) | BigInt(bytes[offset + i])
      if (bytes[offset] > 1) parseError("Invalid decimal sign")
      return Number(n) / 10 ** column.scale * (bytes[offset] === 0 ? -1 : 1)
    }
    case Type.Guid:
      if (size !== 16) invalidSize(size)
      return formatGuid(bytes, offset)
    case Type.DateTim4:
    case Type.DateTime:
    case Type.DateTimeN:
      if (size !== 4 && size !== 8) invalidSize(size)
      return size === 4
        ? new Date(
          datetimeEpochMillis + readUInt16(bytes, offset) * millisPerDay + readUInt16(bytes, offset + 2) * 60000
        )
        : new Date(
          datetimeEpochMillis + (readUInt32(bytes, offset) | 0) * millisPerDay +
            Math.round(readUInt32(bytes, offset + 4) * 10 / 3)
        )
    case Type.Date:
      if (size !== 3) invalidSize(size)
      return new Date(dateEpochMillis + readUIntN(bytes, offset, 3) * millisPerDay)
    case Type.Time:
    case Type.DateTime2:
    case Type.DateTimeOffset:
      return decodeTime(bytes, offset, size, column)
  }
  return decodeBytes(bytes, offset, size, column)
}

const decodeTime = (bytes: Uint8Array, offset: number, size: number, column: Column): Date => {
  const type = column.type
  const timeSize = column.scale <= 2 ? 3 : column.scale <= 4 ? 4 : 5
  if (size !== timeSize + (type === Type.Time ? 0 : type === Type.DateTime2 ? 3 : 5)) invalidSize(size)
  const ticks = readUIntN(bytes, offset, timeSize) * 10 ** (7 - column.scale)
  if (ticks >= ticksPerDay) parseError("Time outside SQL Server range")
  const days = type === Type.Time ? 0 : readUIntN(bytes, offset + timeSize, 3)
  if (days > maxDays) parseError("Date outside SQL Server range")
  // DATETIMEOFFSET's date and time fields are already UTC on the wire.
  const date = new Date((type === Type.Time ? 0 : dateEpochMillis) + days * millisPerDay + Math.floor(ticks / 10000))
  Object.defineProperty(date, "nanosecondsDelta", { value: (ticks % 10000) / 1e7, enumerable: false })
  return date
}

/** Decodes a character or binary value. */
const decodeBytes = (bytes: Uint8Array, offset: number, size: number, column: Column): unknown => {
  switch (column.type) {
    case Type.NVarChar:
    case Type.NChar:
    case Type.NText:
    case Type.Xml:
      if (size % 2 !== 0) parseError("Odd UTF-16 value length")
      return decodeUtf16(bytes, offset, size)
    case Type.BigVarChar:
    case Type.BigChar:
    case Type.Text: {
      const collation = column.collation
      if (collation === undefined) return parseError("Missing character collation")
      const codepage = collationEncoding(collation)
      if (codepage === undefined) return parseError("Unsupported SQL Server collation")
      return Iconv.decode(Buffer.from(bytes.buffer, bytes.byteOffset + offset, size), codepage)
    }
    case Type.BigVarBinary:
    case Type.BigBinary:
    case Type.Image:
    case Type.Udt:
      // A copy as a `Buffer`, as tedious returned binary values.
      return Buffer.from(bytes.subarray(offset, offset + size))
  }
  return parseError(`Unsupported value type ${column.type}`)
}

const hexPairs = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0").toUpperCase())

const formatGuid = (bytes: Uint8Array, offset: number): string => {
  let text = ""
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) text += "-"
    text += hexPairs[bytes[offset + guidByteOrder[i]]]
  }
  return text
}

/**
 * Decodes a SQL_VARIANT by rebuilding the value its base type would have had
 * as an ordinary column, then decoding that.
 */
const readVariant = (r: Reader, maxValueSize: number): unknown => {
  const length = r.uint32()
  if (length === 0) return null
  if (length > 8016) parseError("SQL_VARIANT exceeds type size limit")
  const variant = r.sub(length)
  const baseType = variant.uint8()
  const properties = variant.sub(variant.uint8())
  let column: Column = { name: "", type: baseType, length: Math.max(0, fixedSize[baseType]), scale: 0, precision: 0 }
  if (baseType === Type.DecimalN || baseType === Type.NumericN) {
    column = { ...column, precision: properties.uint8(), scale: properties.uint8() }
  } else if (baseType === Type.Time || baseType === Type.DateTime2 || baseType === Type.DateTimeOffset) {
    column = { ...column, scale: properties.uint8() }
  } else if (hasCollation(baseType)) {
    column = { ...column, collation: properties.copy(5), length: properties.uint16() }
  } else if (baseType === Type.BigVarBinary || baseType === Type.BigBinary) {
    column = { ...column, length: properties.uint16() }
  } else if (fixedSize[baseType] < 0 && baseType !== Type.Guid && baseType !== Type.Date) {
    parseError("Invalid SQL_VARIANT base type")
  }
  if (properties.remaining !== 0) parseError("Invalid SQL_VARIANT properties")
  const body = variant.raw(variant.remaining)
  const prefixSize = isShortLength(baseType) ? 2 : fixedSize[baseType] >= 0 ? 0 : 1
  const rebuilt = new Uint8Array(prefixSize + body.length)
  if (prefixSize === 2) {
    rebuilt[0] = body.length
    rebuilt[1] = body.length >>> 8
  } else if (prefixSize === 1) {
    rebuilt[0] = body.length
  }
  rebuilt.set(body, prefixSize)
  const reader = new Reader(rebuilt, true)
  const value = readValue(reader, column, maxValueSize)
  if (reader.remaining !== 0) parseError("SQL_VARIANT length mismatch")
  return value
}

// -----------------------------------------------------------------------------
// SQL Server Browser
// -----------------------------------------------------------------------------

const instanceNamePattern = /^[\x20-\x7e]{1,128}$/

/**
 * Encodes an SSRP `CLNT_UCAST_INST` request asking the SQL Server Browser
 * for one named instance (MC-SQLR 2.2.4).
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encodeInstanceRequest = (instance: string): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    if (!instanceNamePattern.test(instance) || instance.includes(";")) encodeError("Invalid instance name")
    const bytes = new Uint8Array(instance.length + 2)
    bytes[0] = 0x04
    for (let i = 0; i < instance.length; i++) bytes[i + 1] = instance.charCodeAt(i)
    return bytes
  })

/**
 * Decodes an SSRP `SVR_RESP` and returns the TCP port of `instance`
 * (MC-SQLR 2.2.5).
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const decodeInstanceResponse = (
  message: Uint8Array,
  instance: string
): Result.Result<number, ParseError> =>
  parseResult(() => {
    if (message.length < 3 || message[0] !== 0x05 || readUInt16(message, 1) !== message.length - 3) {
      parseError("Invalid SQL Browser response")
    }
    let text = ""
    for (let i = 3; i < message.length; i++) text += String.fromCharCode(message[i] & 0x7f)
    for (const record of text.split(";;")) {
      const parts = record.split(";")
      const fields = new Map<string, string>()
      for (let i = 0; i + 1 < parts.length; i += 2) fields.set(parts[i].toLowerCase(), parts[i + 1])
      if (fields.get("instancename")?.toLowerCase() !== instance.toLowerCase()) continue
      const port = Number(fields.get("tcp"))
      if (!Number.isInteger(port) || port < 1 || port > 65535) parseError("Invalid instance TCP port")
      return port
    }
    return parseError("Instance not present in SQL Browser response")
  })
