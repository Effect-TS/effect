/**
 * The MySQL client/server protocol: constants, packet framing, and message
 * codecs.
 *
 * Every function here is pure: bytes in, bytes or plain data out. Nothing here
 * opens a socket, negotiates TLS, or tracks session state, and nothing here
 * decodes column values.
 *
 * Unlike the PostgreSQL protocol, a MySQL packet does not name its own type. A
 * payload beginning `0x00` is an OK packet in one phase of a command and a
 * column count in another, so framing and interpretation are separate concerns:
 * `makeParser` yields raw `Packet`s and the caller, which knows the phase,
 * applies the matching decoder.
 *
 * @since 4.0.0
 */
import type * as Brand from "effect/Brand"
import * as Data from "effect/Data"
import * as Result from "effect/Result"
import { BufferError, decodeUtf8, lengthOf, Reader, view, Writer } from "./internal/buffer.ts"
import * as Flags from "./internal/flags.ts"
import * as Field from "./internal/packet.ts"

// -----------------------------------------------------------------------------
// constants
// -----------------------------------------------------------------------------

/**
 * The size in bytes of the header preceding every packet: a three-byte
 * little-endian payload length followed by a one-byte sequence id.
 *
 * @category constants
 * @since 4.0.0
 */
export const packetHeaderSize = 4

/**
 * The largest payload a single packet can carry. A payload of exactly this size
 * is always followed by a continuation packet, so a logical message of 16 MiB
 * arrives as two packets and an empty one terminates it.
 *
 * @category constants
 * @since 4.0.0
 */
export const maxPacketPayload = 0xffffff

/**
 * Default `maxMessageSize` for `makeParser`: 64 MiB, after continuation packets
 * are joined.
 *
 * @category constants
 * @since 4.0.0
 */
export const defaultMaxMessageSize = 64 * 1024 * 1024

/** Where a parser stops growing its buffer pool. */
const maxBufferSize = 64 * 1024

/**
 * One capability a client and server may agree on.
 *
 * @category models
 * @since 4.0.0
 */
export type Capability = Brand.Branded<number, "MysqlCapability">

/**
 * The set of capabilities in force on a connection.
 *
 * **Gotchas**
 *
 * The wire field is 32 bits wide, so its two highest flags sit outside the
 * range where JavaScript's bitwise operators stay positive. Going through this
 * type keeps that arithmetic in one place; `capabilities & Capability.ssl`
 * would silently return the wrong answer.
 *
 * @category models
 * @since 4.0.0
 */
export type Capabilities = Brand.Branded<number, "MysqlCapabilities">

/**
 * Operations on a set of capabilities.
 *
 * @category models
 * @since 4.0.0
 */
export const Capabilities = {
  none: 0 as Capabilities,
  of: (flags: Iterable<Capability>): Capabilities => Flags.of(flags) as Capabilities,
  has: (self: Capabilities, flag: Capability): boolean => Flags.has(self, flag),
  add: (self: Capabilities, flag: Capability): Capabilities => Flags.add(self, flag) as Capabilities,
  /** Keeps only the flags the other side also offers. */
  retain: (self: Capabilities, flags: Iterable<Capability>): Capabilities => Flags.retain(self, flags) as Capabilities,
  /** Rebuilds the set from the two halves the handshake sends separately. */
  fromHalves: (lower: number, upper: number): Capabilities => (lower + upper * 0x10000) as Capabilities,
  /** The value as it goes on the wire, reduced to 32 bits. */
  wire: (self: Capabilities): number => self % 0x100000000
} as const

const capability = (value: number): Capability => value as Capability

/**
 * The capability flags this protocol knows.
 *
 * @category constants
 * @since 4.0.0
 */
export const Capability = {
  longPassword: capability(2 ** 0),
  foundRows: capability(2 ** 1),
  longFlag: capability(2 ** 2),
  connectWithDb: capability(2 ** 3),
  noSchema: capability(2 ** 4),
  compress: capability(2 ** 5),
  odbc: capability(2 ** 6),
  localFiles: capability(2 ** 7),
  ignoreSpace: capability(2 ** 8),
  protocol41: capability(2 ** 9),
  interactive: capability(2 ** 10),
  ssl: capability(2 ** 11),
  ignoreSigpipe: capability(2 ** 12),
  transactions: capability(2 ** 13),
  reserved: capability(2 ** 14),
  secureConnection: capability(2 ** 15),
  multiStatements: capability(2 ** 16),
  multiResults: capability(2 ** 17),
  psMultiResults: capability(2 ** 18),
  pluginAuth: capability(2 ** 19),
  connectAttrs: capability(2 ** 20),
  pluginAuthLenencClientData: capability(2 ** 21),
  canHandleExpiredPasswords: capability(2 ** 22),
  sessionTrack: capability(2 ** 23),
  deprecateEof: capability(2 ** 24),
  optionalResultsetMetadata: capability(2 ** 25),
  zstdCompressionAlgorithm: capability(2 ** 26),
  queryAttributes: capability(2 ** 27),
  multiFactorAuthentication: capability(2 ** 28),
  capabilityExtension: capability(2 ** 29),
  sslVerifyServerCert: capability(2 ** 30),
  rememberOptions: capability(2 ** 31)
} as const

/**
 * Command bytes that open a client request packet.
 *
 * @category constants
 * @since 4.0.0
 */
export const Command = {
  quit: 0x01,
  initDb: 0x02,
  query: 0x03,
  ping: 0x0e,
  stmtPrepare: 0x16,
  stmtExecute: 0x17,
  stmtSendLongData: 0x18,
  stmtClose: 0x19,
  stmtReset: 0x1a,
  setOption: 0x1b,
  stmtFetch: 0x1c,
  resetConnection: 0x1f
} as const

/**
 * Column type bytes carried in `ColumnDefinition41` and in binary rows.
 *
 * @category constants
 * @since 4.0.0
 */
export const ColumnType = {
  decimal: 0x00,
  tiny: 0x01,
  short: 0x02,
  long: 0x03,
  float: 0x04,
  double: 0x05,
  null: 0x06,
  timestamp: 0x07,
  longlong: 0x08,
  int24: 0x09,
  date: 0x0a,
  time: 0x0b,
  datetime: 0x0c,
  year: 0x0d,
  newdate: 0x0e,
  varchar: 0x0f,
  bit: 0x10,
  json: 0xf5,
  newdecimal: 0xf6,
  enum: 0xf7,
  set: 0xf8,
  tinyBlob: 0xf9,
  mediumBlob: 0xfa,
  longBlob: 0xfb,
  blob: 0xfc,
  varString: 0xfd,
  string: 0xfe,
  geometry: 0xff
} as const

/**
 * One flag on a column definition.
 *
 * @category models
 * @since 4.0.0
 */
export type ColumnFlag = Brand.Branded<number, "MysqlColumnFlag">

/**
 * The set of flags on a column definition.
 *
 * @category models
 * @since 4.0.0
 */
export type ColumnFlags = Brand.Branded<number, "MysqlColumnFlags">

/**
 * Operations on a column's flags.
 *
 * @category models
 * @since 4.0.0
 */
export const ColumnFlags = {
  none: 0 as ColumnFlags,
  of: (flags: Iterable<ColumnFlag>): ColumnFlags => Flags.of(flags) as ColumnFlags,
  has: (self: ColumnFlags, flag: ColumnFlag): boolean => Flags.has(self, flag)
} as const

const columnFlag = (value: number): ColumnFlag => value as ColumnFlag

/**
 * The column flags this protocol knows.
 *
 * @category constants
 * @since 4.0.0
 */
export const ColumnFlag = {
  notNull: columnFlag(2 ** 0),
  priKey: columnFlag(2 ** 1),
  uniqueKey: columnFlag(2 ** 2),
  multipleKey: columnFlag(2 ** 3),
  blob: columnFlag(2 ** 4),
  unsigned: columnFlag(2 ** 5),
  zerofill: columnFlag(2 ** 6),
  binary: columnFlag(2 ** 7),
  enum: columnFlag(2 ** 8),
  autoIncrement: columnFlag(2 ** 9),
  timestamp: columnFlag(2 ** 10),
  set: columnFlag(2 ** 11),
  noDefaultValue: columnFlag(2 ** 12),
  onUpdateNow: columnFlag(2 ** 13),
  num: columnFlag(2 ** 15)
} as const

/**
 * One status flag reported by an OK or EOF packet.
 *
 * @category models
 * @since 4.0.0
 */
export type ServerStatusFlag = Brand.Branded<number, "MysqlServerStatusFlag">

/**
 * The server status reported by an OK or EOF packet.
 *
 * @category models
 * @since 4.0.0
 */
export type ServerStatus = Brand.Branded<number, "MysqlServerStatus">

/**
 * Operations on a reported server status.
 *
 * @category models
 * @since 4.0.0
 */
export const ServerStatus = {
  none: 0 as ServerStatus,
  of: (flags: Iterable<ServerStatusFlag>): ServerStatus => Flags.of(flags) as ServerStatus,
  has: (self: ServerStatus, flag: ServerStatusFlag): boolean => Flags.has(self, flag)
} as const

const serverStatusFlag = (value: number): ServerStatusFlag => value as ServerStatusFlag

/**
 * The status flags this protocol knows.
 *
 * @category constants
 * @since 4.0.0
 */
export const ServerStatusFlag = {
  inTransaction: serverStatusFlag(2 ** 0),
  autocommit: serverStatusFlag(2 ** 1),
  moreResultsExists: serverStatusFlag(2 ** 3),
  noGoodIndexUsed: serverStatusFlag(2 ** 4),
  noIndexUsed: serverStatusFlag(2 ** 5),
  cursorExists: serverStatusFlag(2 ** 6),
  lastRowSent: serverStatusFlag(2 ** 7),
  dbDropped: serverStatusFlag(2 ** 8),
  noBackslashEscapes: serverStatusFlag(2 ** 9),
  metadataChanged: serverStatusFlag(2 ** 10),
  queryWasSlow: serverStatusFlag(2 ** 11),
  psOutParams: serverStatusFlag(2 ** 12),
  inTransactionReadonly: serverStatusFlag(2 ** 13),
  sessionStateChanged: serverStatusFlag(2 ** 14)
} as const

/**
 * The collation id for the `binary` character set. A column reporting this
 * collation holds bytes rather than text, which is the only way to tell
 * `BINARY`, `VARBINARY` and `BLOB` apart from `CHAR`, `VARCHAR` and `TEXT`.
 *
 * @category constants
 * @since 4.0.0
 */
export const binaryCollation = 63

/**
 * The collation id requested during the handshake. `utf8mb4_general_ci` keeps
 * the connection on four-byte UTF-8 whatever the server default is.
 *
 * @category constants
 * @since 4.0.0
 */
export const defaultCollation = 45

/**
 * Names of the authentication plugins this client implements.
 *
 * @category constants
 * @since 4.0.0
 */
export const AuthPlugin = {
  nativePassword: "mysql_native_password",
  cachingSha2Password: "caching_sha2_password",
  sha256Password: "sha256_password",
  clearPassword: "mysql_clear_password"
} as const

// -----------------------------------------------------------------------------
// errors
// -----------------------------------------------------------------------------

/**
 * A malformed or truncated packet from the server.
 *
 * @category errors
 * @since 4.0.0
 */
export class ParseError extends Data.TaggedError("MysqlProtocolParseError")<{
  readonly message: string
}> {}

/**
 * A value that cannot be represented on the wire.
 *
 * @category errors
 * @since 4.0.0
 */
export class EncodeError extends Data.TaggedError("MysqlProtocolEncodeError")<{
  readonly message: string
}> {}

const sharedWriter = new Writer(8192)
const sharedReader = new Reader()

const encodeResult = <A>(evaluate: () => A): Result.Result<A, EncodeError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof EncodeError) return Result.fail(error)
    // The buffer reports running out of room without knowing which direction
    // it was serving.
    if (error instanceof BufferError) return Result.fail(new EncodeError({ message: error.message }))
    throw error
  }
}

const parseResult = <A>(evaluate: () => A): Result.Result<A, ParseError> => {
  try {
    return Result.succeed(evaluate())
  } catch (error) {
    if (error instanceof ParseError) return Result.fail(error)
    if (error instanceof BufferError) return Result.fail(new ParseError({ message: error.message }))
    throw error
  }
}

// -----------------------------------------------------------------------------
// framing
// -----------------------------------------------------------------------------

/**
 * One protocol packet: its sequence id and its payload.
 *
 * **Gotchas**
 *
 * A payload is normally a view into the parser's buffer, so copying is the
 * caller's job: one held beyond the current packet keeps its entire buffer in
 * memory. A payload joined from continuation packets is already a copy.
 *
 * @category models
 * @since 4.0.0
 */
export interface Packet {
  readonly sequenceId: number
  readonly payload: Uint8Array
}

/**
 * An incremental decoder for the packet stream.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parser {
  /**
   * The sequence id the next packet must carry. The server restarts the count
   * at zero for every command, so a client sending a command sets this to the
   * id that follows its own request packet.
   */
  expectedSequenceId: number

  /**
   * Decodes a chunk and returns every complete packet. A partial packet is
   * retained for the next call. Parse errors are terminal and discard packets
   * decoded earlier in the same call.
   */
  readonly push: (chunk: Uint8Array) => ReadonlyArray<Packet>

  /**
   * Decodes a chunk and passes each complete packet to `onPacket` immediately,
   * so a packet can change how the ones behind it in the same chunk are read.
   * Packets delivered before a failure are not discarded.
   */
  readonly pushEach: (chunk: Uint8Array, onPacket: (packet: Packet) => void) => void
}

/**
 * Creates a `Parser`.
 *
 * **Details**
 *
 * Continuation packets are joined transparently: a payload of exactly
 * `maxPacketPayload` bytes is held back and concatenated with the packets that
 * follow, so a caller only ever sees whole logical messages.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeParser = (options?: {
  readonly maxMessageSize?: number | undefined
  readonly expectedSequenceId?: number | undefined
}): Parser => {
  const maxMessageSize = options?.maxMessageSize ?? defaultMaxMessageSize
  let bufferSize = 8192
  let buffer = new Uint8Array(bufferSize)
  let store = buffer.buffer
  let start = 0
  let end = 0
  let failed = false
  let pendingParts: Array<Uint8Array> | undefined
  let pendingLength = 0

  // Bytes already handed to the caller are never overwritten, so a full buffer
  // is replaced rather than compacted in place. That lets a payload be a view
  // instead of a copy, which is the difference between one allocation per
  // buffer and one per packet.
  const append = (chunk: Uint8Array): void => {
    if (end + chunk.length > buffer.length) {
      const pending = end - start
      if (bufferSize < maxBufferSize) bufferSize *= 2
      let capacity = bufferSize
      while (capacity < pending + chunk.length) capacity *= 2
      const next = new Uint8Array(capacity)
      next.set(buffer.subarray(start, end))
      buffer = next
      store = next.buffer
      start = 0
      end = pending
    }
    buffer.set(chunk, end)
    end += chunk.length
  }

  const parser: Parser = {
    expectedSequenceId: options?.expectedSequenceId ?? 0,
    push(chunk) {
      const packets: Array<Packet> = []
      parser.pushEach(chunk, (packet) => {
        packets.push(packet)
      })
      return packets
    },
    pushEach(chunk, onPacket) {
      if (failed) {
        throw new ParseError({ message: "Parser cannot be reused after a failure" })
      }
      try {
        append(chunk)
        while (end - start >= packetHeaderSize) {
          const length = buffer[start] | (buffer[start + 1] << 8) | (buffer[start + 2] << 16)
          if (end - start < packetHeaderSize + length) break
          const sequenceId = buffer[start + 3]
          if (sequenceId !== parser.expectedSequenceId) {
            throw new ParseError({
              message: `Out-of-order packet: expected sequence id ${parser.expectedSequenceId}, got ${sequenceId}`
            })
          }
          parser.expectedSequenceId = (sequenceId + 1) & 0xff
          // `buffer` always starts at byte 0 of `store`, so offsets index both.
          const body = start + packetHeaderSize
          start = body + length
          if (length === maxPacketPayload) {
            pendingLength += length
            if (pendingLength > maxMessageSize) {
              throw new ParseError({
                message: `Message length ${pendingLength} exceeds maxMessageSize ${maxMessageSize}`
              })
            }
            pendingParts ??= []
            pendingParts.push(view(store, body, length))
            continue
          }
          if (pendingParts === undefined) {
            onPacket({ sequenceId, payload: view(store, body, length) })
            continue
          }
          pendingLength += length
          if (pendingLength > maxMessageSize) {
            throw new ParseError({
              message: `Message length ${pendingLength} exceeds maxMessageSize ${maxMessageSize}`
            })
          }
          const joined = new Uint8Array(pendingLength)
          let offset = 0
          for (const part of pendingParts) {
            joined.set(part, offset)
            offset += part.length
          }
          joined.set(view(store, body, length), offset)
          pendingParts = undefined
          pendingLength = 0
          onPacket({ sequenceId, payload: joined })
        }
      } catch (error) {
        failed = true
        throw error
      }
    }
  }
  return parser
}

/**
 * Frames a payload into one or more packets, starting at `sequenceId`.
 *
 * **Details**
 *
 * A payload of `maxPacketPayload` bytes or more is split, and a payload whose
 * length is an exact multiple of `maxPacketPayload` is terminated by an empty
 * packet, which is how the server tells a split message from a complete one.
 *
 * @category encoding
 * @since 4.0.0
 */
export const frame = (payload: Uint8Array, sequenceId = 0): Uint8Array => {
  const total = payload.length
  const packets = Math.floor(total / maxPacketPayload) + 1
  const output = new Uint8Array(total + packetHeaderSize * packets)
  let read = 0
  let write = 0
  let sequence = sequenceId
  for (let index = 0; index < packets; index++) {
    const size = Math.min(maxPacketPayload, total - read)
    output[write] = size
    output[write + 1] = size >>> 8
    output[write + 2] = size >>> 16
    output[write + 3] = sequence
    write += packetHeaderSize
    if (size > 0) {
      output.set(payload.subarray(read, read + size), write)
      read += size
      write += size
    }
    sequence = (sequence + 1) & 0xff
  }
  return output
}

/**
 * Frames a command byte and its body into a request, starting at sequence id
 * zero.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeCommand = (command: number, body?: Uint8Array | string | undefined): Uint8Array => {
  sharedWriter.begin()
  sharedWriter.uint8(command)
  if (typeof body === "string") sharedWriter.utf8(body)
  else if (body !== undefined) sharedWriter.raw(body)
  return frame(sharedWriter.finish())
}

/**
 * Frames a `COM_QUERY` request carrying a text statement.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeQuery = (sql: string): Uint8Array => encodeCommand(Command.query, sql)

/**
 * Frames a `COM_PING` request.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodePing = (): Uint8Array => encodeCommand(Command.ping)

/**
 * Frames a `COM_QUIT` request.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeQuit = (): Uint8Array => encodeCommand(Command.quit)

/**
 * Frames a `COM_INIT_DB` request selecting a default schema.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeInitDb = (database: string): Uint8Array => encodeCommand(Command.initDb, database)

/**
 * Frames a `COM_RESET_CONNECTION` request, which clears session state without
 * reauthenticating.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeResetConnection = (): Uint8Array => encodeCommand(Command.resetConnection)

// -----------------------------------------------------------------------------
// response classification
// -----------------------------------------------------------------------------

/**
 * What the first packet of a command's reply turns out to be.
 *
 * **Details**
 *
 * A reply begins in exactly one of these shapes, so reading it is a matter of
 * naming which, rather than of consulting a classifier that has to be right in
 * every position.
 *
 * @category models
 * @since 4.0.0
 */
export type Response = Data.TaggedEnum<{
  readonly Ok: { readonly ok: Ok }
  readonly Error: { readonly error: Err }
  readonly LocalInfile: {}
  readonly ResultSet: { readonly columnCount: number }
}>

/**
 * Constructors and guards for `Response`.
 *
 * @category models
 * @since 4.0.0
 */
export const Response = Data.taggedEnum<Response>()

/**
 * What a packet turns out to be where a row is expected.
 *
 * **Gotchas**
 *
 * The bytes that open a row overlap with the bytes that open other packets:
 * `0x00` starts a row whose first column is an empty string, and `0xfb` one
 * whose first column is NULL. Neither is an OK packet or a LOCAL INFILE
 * request, which is why this is a separate decoder rather than a shared one.
 *
 * @category models
 * @since 4.0.0
 */
export type RowPacket = Data.TaggedEnum<{
  readonly Row: { readonly payload: Uint8Array }
  readonly End: { readonly ok: Ok }
  readonly Error: { readonly error: Err }
}>

/**
 * Constructors and guards for `RowPacket`.
 *
 * @category models
 * @since 4.0.0
 */
export const RowPacket = Data.taggedEnum<RowPacket>()

/**
 * A terminator is `0xfe` in a payload too short to be a value, since `0xfe` as
 * a length prefix is followed by eight more bytes.
 */
const isTerminator = (payload: Uint8Array): boolean => payload.length > 0 && payload[0] === 0xfe && payload.length < 9

/**
 * Whether a packet is an ERR.
 *
 * **Details**
 *
 * `0xff` never opens a length-encoded value, so unlike the OK and EOF headers
 * this one is unambiguous in any position — including before the handshake,
 * where a server that refuses the connection outright sends an ERR in place
 * of its greeting.
 *
 * @category predicates
 * @since 4.0.0
 */
export const isErr = (payload: Uint8Array): boolean => payload.length > 0 && payload[0] === 0xff

/**
 * Reads the packet that opens a command's reply.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeResponse = (payload: Uint8Array): Result.Result<Response, ParseError> => {
  if (isErr(payload)) {
    return Result.map(decodeErr(payload), (error) => Response.Error({ error }))
  }
  if (payload.length > 0 && (payload[0] === 0x00 || isTerminator(payload))) {
    return Result.map(decodeOk(payload), (ok) => Response.Ok({ ok }))
  }
  // 0xfb only means LOCAL INFILE here: it is not a valid column count, and in
  // a row it is simply SQL NULL.
  if (payload.length > 0 && payload[0] === 0xfb) {
    return Result.succeed(Response.LocalInfile())
  }
  return parseResult(() => {
    const count = columnCount(payload)
    if (count === undefined) throw new ParseError({ message: "Malformed result set header" })
    return Response.ResultSet({ columnCount: count })
  })
}

/**
 * Reads a packet where a row is expected.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeRow = (payload: Uint8Array): Result.Result<RowPacket, ParseError> => {
  if (isErr(payload)) {
    return Result.map(decodeErr(payload), (error) => RowPacket.Error({ error }))
  }
  if (isTerminator(payload)) {
    return Result.map(decodeOk(payload), (ok) => RowPacket.End({ ok }))
  }
  return Result.succeed(RowPacket.Row({ payload }))
}

/** Reads the length-encoded column count that opens a result set. */
const columnCount = (payload: Uint8Array): number | undefined => {
  if (payload.length === 0) return undefined
  const first = payload[0]
  if (first < 0xfb) return payload.length === 1 ? first : undefined
  if (first === 0xfc && payload.length === 3) return payload[1] | (payload[2] << 8)
  if (first === 0xfd && payload.length === 4) return payload[1] | (payload[2] << 8) | (payload[3] << 16)
  return undefined
}

// -----------------------------------------------------------------------------
// decoding
// -----------------------------------------------------------------------------

/**
 * A successful command result.
 *
 * @category models
 * @since 4.0.0
 */
export interface Ok {
  readonly affectedRows: number | bigint
  readonly lastInsertId: number | bigint
  readonly statusFlags: ServerStatus
  readonly warnings: number
  readonly info: string
}

const okPacket = Field.decoder({
  header: Field.tag(0x00, 0xfe),
  affectedRows: Field.lenencInt,
  lastInsertId: Field.lenencInt,
  statusFlags: Field.uint16,
  warnings: Field.uint16,
  // The trailing human-readable info is optional, and its shape depends on
  // CLIENT_SESSION_TRACK, which this client does not negotiate.
  info: Field.whenPresent(Field.restString)
})

/**
 * Decodes an OK packet.
 *
 * **Details**
 *
 * With `CLIENT_DEPRECATE_EOF` negotiated the end of a result set is also an OK
 * packet, distinguished only by its `0xfe` header byte, so both headers are
 * accepted here.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeOk = (payload: Uint8Array): Result.Result<Ok, ParseError> =>
  parseResult(() => {
    const fields = okPacket(sharedReader, payload)
    if (fields.affectedRows === null || fields.lastInsertId === null) {
      throw new ParseError({ message: "OK packet has a null length-encoded integer" })
    }
    return {
      affectedRows: fields.affectedRows,
      lastInsertId: fields.lastInsertId,
      statusFlags: fields.statusFlags as ServerStatus,
      warnings: fields.warnings,
      info: fields.info ?? ""
    }
  })

/**
 * A server error response.
 *
 * @category models
 * @since 4.0.0
 */
export interface Err {
  readonly code: number
  readonly sqlState: string | undefined
  readonly message: string
}

const errPacket = Field.decoder({
  header: Field.tag(0xff),
  code: Field.uint16,
  // The marker and state are only present under CLIENT_PROTOCOL_41, and are
  // absent from the ERR packet that can arrive before capabilities are agreed.
  sqlState: Field.whenByte(
    0x23,
    Field.make((reader) => {
      reader.skip(1)
      return reader.string(5)
    })
  ),
  message: Field.restString
})

/**
 * Decodes an ERR packet.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeErr = (payload: Uint8Array): Result.Result<Err, ParseError> =>
  parseResult(() => {
    const fields = errPacket(sharedReader, payload)
    return { code: fields.code, sqlState: fields.sqlState, message: fields.message }
  })

/**
 * The legacy end-of-result marker, sent only when `CLIENT_DEPRECATE_EOF` was
 * not negotiated.
 *
 * @category models
 * @since 4.0.0
 */
export interface Eof {
  readonly warnings: number
  readonly statusFlags: ServerStatus
}

const eofPacket = Field.decoder({
  header: Field.tag(0xfe),
  warnings: Field.uint16,
  statusFlags: Field.uint16
})

/**
 * Decodes a legacy EOF packet.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeEof = (payload: Uint8Array): Result.Result<Eof, ParseError> =>
  parseResult(() => {
    const fields = eofPacket(sharedReader, payload)
    return { warnings: fields.warnings, statusFlags: fields.statusFlags as ServerStatus }
  })

/**
 * A column of a result set.
 *
 * @category models
 * @since 4.0.0
 */
export interface Column {
  readonly schema: string
  readonly table: string
  readonly orgTable: string
  readonly name: string
  readonly orgName: string
  readonly collation: number
  readonly columnLength: number
  readonly type: number
  readonly flags: ColumnFlags
  readonly decimals: number
}

/**
 * Questions worth asking of a column, so callers do not read its bits.
 *
 * @category models
 * @since 4.0.0
 */
export const Column = {
  /**
   * Whether the column holds bytes rather than text. The binary collation is
   * the only thing separating `BLOB` from `TEXT`, which share a type byte.
   */
  isBinary: (column: Column): boolean => column.collation === binaryCollation,
  isUnsigned: (column: Column): boolean => ColumnFlags.has(column.flags, ColumnFlag.unsigned)
} as const

const columnPacket = Field.decoder({
  catalog: Field.lenencString,
  schema: Field.lenencString,
  table: Field.lenencString,
  orgTable: Field.lenencString,
  name: Field.lenencString,
  orgName: Field.lenencString,
  fixedLength: Field.lenencInt,
  collation: Field.uint16,
  columnLength: Field.uint32,
  type: Field.uint8,
  flags: Field.uint16,
  decimals: Field.uint8
})

/**
 * Decodes a `ColumnDefinition41` packet.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeColumn = (payload: Uint8Array): Result.Result<Column, ParseError> =>
  parseResult(() => {
    const fields = columnPacket(sharedReader, payload)
    if (fields.fixedLength === null || lengthOf(fields.fixedLength) < 0x0c) {
      throw new ParseError({ message: "Column definition has a short fixed-length block" })
    }
    return {
      schema: fields.schema ?? "",
      table: fields.table ?? "",
      orgTable: fields.orgTable ?? "",
      name: fields.name ?? "",
      orgName: fields.orgName ?? "",
      collation: fields.collation,
      columnLength: fields.columnLength,
      type: fields.type,
      flags: fields.flags as ColumnFlags,
      decimals: fields.decimals
    }
  })

/**
 * Reads one field of a row.
 *
 * **Gotchas**
 *
 * `size` is `-1` for SQL NULL, in which case `bytes` and `offset` carry no
 * meaning. `bytes` is the parser's own buffer, so a reader that keeps the value
 * beyond the current row has to copy it.
 *
 * @category models
 * @since 4.0.0
 */
export type FieldReader<A> = (bytes: Uint8Array, offset: number, size: number, column: number) => A

/**
 * Decodes a text-protocol row, the row format `COM_QUERY` returns.
 *
 * **Details**
 *
 * Every field arrives as a length-encoded string, so no column metadata is
 * needed to walk the row; converting a field to a typed value is the
 * `readField` reader's job.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeTextRow = <A>(
  payload: Uint8Array,
  columnCount: number,
  readField: FieldReader<A>
): Result.Result<Array<A>, ParseError> =>
  parseResult(() => {
    const limit = payload.length
    const row = new Array<A>(columnCount)
    let offset = 0
    for (let column = 0; column < columnCount; column++) {
      if (offset >= limit) {
        throw new ParseError({ message: `Truncated row: expected ${columnCount} column(s), got ${column}` })
      }
      const first = payload[offset]
      if (first === 0xfb) {
        offset += 1
        row[column] = readField(payload, 0, -1, column)
        continue
      }
      let size: number
      if (first < 0xfb) {
        size = first
        offset += 1
      } else if (first === 0xfc) {
        size = payload[offset + 1] | (payload[offset + 2] << 8)
        offset += 3
      } else if (first === 0xfd) {
        size = payload[offset + 1] | (payload[offset + 2] << 8) | (payload[offset + 3] << 16)
        offset += 4
      } else {
        sharedReader.reset(payload, offset, limit)
        const value = sharedReader.lenencInt()
        if (value === null) throw new ParseError({ message: "Unexpected null length in a row" })
        size = lengthOf(value)
        offset = sharedReader.offset
      }
      if (offset + size > limit) {
        throw new ParseError({ message: `Truncated field: column ${column} claims ${size} byte(s)` })
      }
      row[column] = readField(payload, offset, size, column)
      offset += size
    }
    if (offset !== limit) {
      throw new ParseError({ message: `Row has ${limit - offset} trailing byte(s)` })
    }
    return row
  })

/**
 * Reads a field as a view over the parser's buffer, or `null` for SQL NULL.
 * This is the default reader, and the one to use when the caller copies or
 * decodes fields itself.
 *
 * @category decoding
 * @since 4.0.0
 */
export const readFieldBytes: FieldReader<Uint8Array | null> = (bytes, offset, size) =>
  size === -1 ? null : view(bytes.buffer, bytes.byteOffset + offset, size)

/**
 * Reads a field as a UTF-8 string, or `null` for SQL NULL.
 *
 * @category decoding
 * @since 4.0.0
 */
export const readFieldString: FieldReader<string | null> = (bytes, offset, size) =>
  size === -1 ? null : decodeUtf8(bytes, offset, size)

/**
 * Writes bytes with the protocol's own primitives, for building fixtures and
 * request payloads a named encoder does not cover.
 *
 * **Gotchas**
 *
 * Each call gets a writer of its own, so nesting two of them is safe. The
 * named encoders share one writer and are not reentrant, which is why this
 * does not reuse it.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeWith = (
  write: (writer: {
    readonly uint8: (value: number) => void
    readonly uint16: (value: number) => void
    readonly uint24: (value: number) => void
    readonly uint32: (value: number) => void
    readonly uint64: (value: bigint) => void
    readonly lenencInt: (value: number | bigint) => void
    readonly lenencString: (value: string) => void
    readonly lenencBytes: (value: Uint8Array) => void
    readonly raw: (value: Uint8Array) => void
    readonly fill: (byte: number, count: number) => void
    readonly utf8: (value: string, nul?: boolean) => void
    readonly cString: (value: string) => void
  }) => void
): Result.Result<Uint8Array, EncodeError> =>
  encodeResult(() => {
    const writer = new Writer(256)
    write(writer)
    return writer.finish()
  })

// -----------------------------------------------------------------------------
// handshake
// -----------------------------------------------------------------------------

/**
 * The maximum packet size the client advertises. Framing already caps a single
 * packet at `maxPacketPayload`, and larger messages are split, so this is the
 * ceiling on one packet rather than on one result.
 *
 * @category constants
 * @since 4.0.0
 */
export const maxAllowedPacket = 0xffffff

/**
 * The server's opening message, sent before the client says anything.
 *
 * @category models
 * @since 4.0.0
 */
export interface Handshake {
  readonly protocolVersion: number
  readonly serverVersion: string
  readonly connectionId: number
  readonly capabilities: Capabilities
  readonly collation: number
  readonly statusFlags: ServerStatus
  /** The 20-byte challenge, joined from the two halves the server sends. */
  readonly scramble: Uint8Array
  readonly authPlugin: string
}

/**
 * The part of the greeting every server sends. What follows it depends on a
 * length the greeting itself carries, so it is read separately.
 */
const handshakeHead = Field.decoder({
  protocolVersion: Field.make((reader) => {
    const version = reader.uint8()
    if (version !== 10) {
      throw new BufferError({ message: `Unsupported handshake protocol version ${version}` })
    }
    return version
  }),
  serverVersion: Field.cString,
  connectionId: Field.uint32,
  scrambleHead: Field.bytes(8),
  filler: Field.skip(1),
  capabilityLower: Field.uint16
})

/**
 * Decodes the server's `HandshakeV10` packet.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeHandshake = (payload: Uint8Array): Result.Result<Handshake, ParseError> =>
  parseResult(() => {
    const reader = sharedReader
    const head = handshakeHead(reader, payload)
    // A pre-4.1 server stops here. Nothing this client supports does, but the
    // greeting is the one packet that arrives before capabilities are known.
    if (reader.offset >= reader.limit) {
      return {
        protocolVersion: head.protocolVersion,
        serverVersion: head.serverVersion,
        connectionId: head.connectionId,
        capabilities: head.capabilityLower as Capabilities,
        collation: 0,
        statusFlags: ServerStatus.none,
        scramble: head.scrambleHead,
        authPlugin: ""
      }
    }
    const collation = reader.uint8()
    const statusFlags = reader.uint16() as ServerStatus
    const capabilityUpper = reader.uint16()
    const scrambleLength = reader.uint8()
    reader.skip(10) // reserved
    // The second half is padded to at least 13 bytes and carries a trailing NUL
    // that is not part of the challenge, so its length comes from the greeting
    // rather than from the bytes on the wire.
    const tailLength = Math.max(13, scrambleLength - 8)
    const tail = reader.raw(tailLength)
    const tailUsed = Math.max(0, Math.min(tailLength, scrambleLength - 8) - 1)
    const scramble = new Uint8Array(head.scrambleHead.length + tailUsed)
    scramble.set(head.scrambleHead)
    scramble.set(tail.subarray(0, tailUsed), head.scrambleHead.length)
    return {
      protocolVersion: head.protocolVersion,
      serverVersion: head.serverVersion,
      connectionId: head.connectionId,
      capabilities: Capabilities.fromHalves(head.capabilityLower, capabilityUpper),
      collation,
      statusFlags,
      scramble,
      authPlugin: reader.offset < reader.limit ? reader.cString() : ""
    }
  })

/**
 * Frames the 32-byte `SSLRequest`, which is the header of a handshake response
 * and nothing else. The client upgrades the socket to TLS straight after
 * writing it and then sends the full response over the encrypted connection.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeSslRequest = (options: {
  readonly capabilities: Capabilities
  readonly collation: number
  readonly sequenceId: number
}): Uint8Array => {
  sharedWriter.begin()
  sharedWriter.uint32(Capabilities.wire(options.capabilities))
  sharedWriter.uint32(maxAllowedPacket)
  sharedWriter.uint8(options.collation)
  sharedWriter.fill(0, 23)
  return frame(sharedWriter.finish(), options.sequenceId)
}

/**
 * Frames a `HandshakeResponse41`.
 *
 * **Gotchas**
 *
 * The auth response is written length-encoded, which requires the client to
 * have set `pluginAuthLenencClientData` in `capabilities`.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeHandshakeResponse = (options: {
  readonly capabilities: Capabilities
  readonly collation: number
  readonly username: string
  readonly authResponse: Uint8Array
  readonly database: string | undefined
  readonly authPlugin: string
  readonly sequenceId: number
}): Uint8Array => {
  sharedWriter.begin()
  sharedWriter.uint32(Capabilities.wire(options.capabilities))
  sharedWriter.uint32(maxAllowedPacket)
  sharedWriter.uint8(options.collation)
  sharedWriter.fill(0, 23)
  sharedWriter.cString(options.username)
  sharedWriter.lenencBytes(options.authResponse)
  if (options.database !== undefined) sharedWriter.cString(options.database)
  sharedWriter.cString(options.authPlugin)
  return frame(sharedWriter.finish(), options.sequenceId)
}

/**
 * The server's request to continue authenticating with a different plugin.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthSwitchRequest {
  readonly plugin: string
  readonly scramble: Uint8Array
}

const authSwitchPacket = Field.decoder({
  header: Field.tag(0xfe),
  plugin: Field.cString,
  challenge: Field.rest
})

/**
 * Decodes an `AuthSwitchRequest` packet.
 *
 * **Gotchas**
 *
 * This shares its `0xfe` header byte with EOF, so only decode it where the
 * handshake expects one.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeAuthSwitchRequest = (payload: Uint8Array): Result.Result<AuthSwitchRequest, ParseError> =>
  parseResult(() => {
    const fields = authSwitchPacket(sharedReader, payload)
    const challenge = fields.challenge
    // The challenge carries a trailing NUL that is not part of it.
    const scramble = challenge.length > 0 && challenge[challenge.length - 1] === 0
      ? challenge.subarray(0, challenge.length - 1)
      : challenge
    return { plugin: fields.plugin, scramble }
  })

/**
 * Decodes an `AuthMoreData` packet, returning the plugin-specific payload that
 * follows its `0x01` header.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeAuthMoreData = (payload: Uint8Array): Result.Result<Uint8Array, ParseError> =>
  parseResult(() => {
    if (payload.length === 0 || payload[0] !== 0x01) {
      throw new ParseError({ message: "Expected an AuthMoreData packet" })
    }
    return payload.subarray(1)
  })

/**
 * Frames a raw authentication payload, used for the replies that continue an
 * exchange after the initial handshake response.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeAuthData = (data: Uint8Array, sequenceId: number): Uint8Array => frame(data, sequenceId)

// -----------------------------------------------------------------------------
// prepared statements
// -----------------------------------------------------------------------------

/**
 * What the server reports about a statement it has prepared.
 *
 * @category models
 * @since 4.0.0
 */
export interface StmtPrepareOk {
  readonly statementId: number
  readonly columnCount: number
  readonly parameterCount: number
  readonly warnings: number
}

const stmtPreparePacket = Field.decoder({
  header: Field.tag(0x00),
  statementId: Field.uint32,
  columnCount: Field.uint16,
  parameterCount: Field.uint16,
  reserved: Field.skip(1),
  warnings: Field.whenPresent(Field.uint16)
})

/**
 * Decodes the reply to `COM_STMT_PREPARE`.
 *
 * **Details**
 *
 * `parameterCount` column definitions follow, then `columnCount` of them. With
 * `CLIENT_DEPRECATE_EOF` negotiated there is no EOF packet between or after
 * the two groups.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeStmtPrepareOk = (payload: Uint8Array): Result.Result<StmtPrepareOk, ParseError> =>
  parseResult(() => {
    const fields = stmtPreparePacket(sharedReader, payload)
    return {
      statementId: fields.statementId,
      columnCount: fields.columnCount,
      parameterCount: fields.parameterCount,
      warnings: fields.warnings ?? 0
    }
  })

/**
 * Frames a `COM_STMT_PREPARE` request.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeStmtPrepare = (sql: string): Uint8Array => encodeCommand(Command.stmtPrepare, sql)

/**
 * Frames a `COM_STMT_CLOSE` request.
 *
 * **Gotchas**
 *
 * The server sends no reply, so a caller must not wait for one.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeStmtClose = (statementId: number): Uint8Array => {
  sharedWriter.begin()
  sharedWriter.uint8(Command.stmtClose)
  sharedWriter.uint32(statementId)
  return frame(sharedWriter.finish())
}

/**
 * Frames a `COM_STMT_RESET` request, which drops the data a statement has
 * accumulated without closing it.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeStmtReset = (statementId: number): Uint8Array => {
  sharedWriter.begin()
  sharedWriter.uint8(Command.stmtReset)
  sharedWriter.uint32(statementId)
  return frame(sharedWriter.finish())
}

/**
 * Writes one parameter value into a `COM_STMT_EXECUTE` request.
 *
 * @category models
 * @since 4.0.0
 */
export interface ValueSink {
  readonly uint8: (value: number) => void
  readonly uint16: (value: number) => void
  readonly uint32: (value: number) => void
  readonly uint64: (value: bigint) => void
  readonly int64: (value: bigint) => void
  readonly float32: (value: number) => void
  readonly float64: (value: number) => void
  readonly lenencString: (value: string) => void
  readonly lenencBytes: (value: Uint8Array) => void
  readonly raw: (value: Uint8Array) => void
}

/**
 * A parameter bound to a prepared statement: its wire type, its signedness,
 * and how to write it.
 *
 * @category models
 * @since 4.0.0
 */
export interface BoundParameter {
  readonly type: number
  readonly unsigned: boolean
  /** Writes the value, or `undefined` for SQL NULL. */
  readonly write: ((sink: ValueSink) => void) | undefined
}

/**
 * Frames a `COM_STMT_EXECUTE` request.
 *
 * **Details**
 *
 * Parameters are laid out in two groups: a null bitmap and one `(type,
 * unsigned)` pair per parameter, then the values of the parameters that are
 * not null. The layout assumes `CLIENT_QUERY_ATTRIBUTES` was not negotiated,
 * which is what this client does.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeStmtExecute = (options: {
  readonly statementId: number
  readonly parameters: ReadonlyArray<BoundParameter>
}): Uint8Array => {
  const parameters = options.parameters
  sharedWriter.begin()
  sharedWriter.uint8(Command.stmtExecute)
  sharedWriter.uint32(options.statementId)
  sharedWriter.uint8(0) // CURSOR_TYPE_NO_CURSOR
  sharedWriter.uint32(1) // iteration count, always one
  if (parameters.length > 0) {
    const bitmapSize = (parameters.length + 7) >> 3
    const bitmap = new Uint8Array(bitmapSize)
    for (let index = 0; index < parameters.length; index++) {
      if (parameters[index].write === undefined) bitmap[index >> 3] |= 1 << (index & 7)
    }
    sharedWriter.raw(bitmap)
    sharedWriter.uint8(1) // the types that follow are being (re)bound
    for (const parameter of parameters) {
      sharedWriter.uint8(parameter.type)
      sharedWriter.uint8(parameter.unsigned ? 0x80 : 0x00)
    }
    for (const parameter of parameters) {
      parameter.write?.(sharedWriter)
    }
  }
  return frame(sharedWriter.finish())
}

/**
 * Reads one field of a binary row, returning its value and the offset just
 * past it. Unlike a text field, a binary field's width comes from its column
 * type rather than a length prefix, so the reader reports how far it read.
 *
 * @category models
 * @since 4.0.0
 */
export type BinaryFieldReader<A> = (
  bytes: Uint8Array,
  offset: number,
  limit: number,
  column: number
) => readonly [value: A, next: number]

/**
 * Decodes a binary-protocol row, the row format `COM_STMT_EXECUTE` returns.
 *
 * **Details**
 *
 * A binary row opens with `0x00` and a null bitmap whose bits are offset by
 * two, so column `n` is bit `n + 2`. Only the columns the bitmap leaves unset
 * are passed to `readField`.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeBinaryRow = <A>(
  payload: Uint8Array,
  columnCount: number,
  readField: BinaryFieldReader<A>
): Result.Result<Array<A | null>, ParseError> =>
  parseResult(() => {
    if (payload.length === 0 || payload[0] !== 0x00) {
      throw new ParseError({ message: "Expected a binary row" })
    }
    const bitmapSize = (columnCount + 9) >> 3
    if (payload.length < 1 + bitmapSize) {
      throw new ParseError({ message: "Truncated binary row: the null bitmap does not fit" })
    }
    const row = new Array<A | null>(columnCount)
    const limit = payload.length
    let offset = 1 + bitmapSize
    for (let column = 0; column < columnCount; column++) {
      // The bitmap reserves its first two bits, so column n is bit n + 2.
      const bit = column + 2
      if ((payload[1 + (bit >> 3)] & (1 << (bit & 7))) !== 0) {
        row[column] = null
        continue
      }
      const [value, next] = readField(payload, offset, limit, column)
      if (next > limit || next < offset) {
        throw new ParseError({ message: `Truncated binary row at column ${column}` })
      }
      row[column] = value
      offset = next
    }
    if (offset !== limit) {
      throw new ParseError({ message: `Binary row has ${limit - offset} trailing byte(s)` })
    }
    return row
  })
