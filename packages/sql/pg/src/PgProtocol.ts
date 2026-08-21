/**
 * Wire codec for the PostgreSQL frontend/backend protocol, version 3.0.
 *
 * The module encodes frontend messages and decodes backend messages. Every
 * function is pure: bytes in, bytes or plain data out. Nothing here opens a
 * socket, negotiates TLS, or tracks session state, and nothing here decodes
 * column values - `DataRow` fields stay raw bytes for `PgTypes` to interpret.
 *
 * Typed messages are a type byte, an `int32` length that counts itself but not
 * the type byte, and a payload. Integers are big-endian and strings are
 * NUL-terminated UTF-8 unless they are explicitly length-prefixed.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"

/**
 * Error raised when bytes cannot be interpreted as a protocol message.
 *
 * @category errors
 * @since 4.0.0
 */
export class ParseError extends Data.TaggedError("PgProtocolParseError")<{
  readonly message: string
}> {}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: true })

class Writer {
  bytes: Uint8Array
  view: DataView
  offset = 0

  constructor(capacity: number) {
    this.bytes = new Uint8Array(capacity)
    this.view = new DataView(this.bytes.buffer)
  }

  reserve(size: number): void {
    const required = this.offset + size
    if (required <= this.bytes.length) return
    let capacity = this.bytes.length
    while (capacity < required) capacity *= 2
    const next = new Uint8Array(capacity)
    next.set(this.bytes.subarray(0, this.offset))
    this.bytes = next
    this.view = new DataView(next.buffer)
  }

  uint8(value: number): void {
    this.reserve(1)
    this.view.setUint8(this.offset, value)
    this.offset += 1
  }

  int16(value: number): void {
    this.reserve(2)
    this.view.setInt16(this.offset, value)
    this.offset += 2
  }

  int32(value: number): void {
    this.reserve(4)
    this.view.setInt32(this.offset, value)
    this.offset += 4
  }

  raw(value: Uint8Array): void {
    this.reserve(value.length)
    this.bytes.set(value, this.offset)
    this.offset += value.length
  }

  cString(value: string): void {
    this.raw(textEncoder.encode(value))
    this.uint8(0)
  }

  finish(): Uint8Array {
    return this.bytes.slice(0, this.offset)
  }
}

class Reader {
  readonly bytes: Uint8Array
  readonly view: DataView
  offset = 0

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  require(size: number): void {
    if (size < 0) {
      throw new ParseError({ message: `Invalid read of ${size} byte(s)` })
    }
    if (this.offset + size > this.bytes.length) {
      throw new ParseError({ message: `Truncated message: expected ${size} more byte(s)` })
    }
  }

  uint8(): number {
    this.require(1)
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  int16(): number {
    this.require(2)
    const value = this.view.getInt16(this.offset)
    this.offset += 2
    return value
  }

  int32(): number {
    this.require(4)
    const value = this.view.getInt32(this.offset)
    this.offset += 4
    return value
  }

  uint32(): number {
    this.require(4)
    const value = this.view.getUint32(this.offset)
    this.offset += 4
    return value
  }

  raw(size: number): Uint8Array {
    this.require(size)
    const value = this.bytes.slice(this.offset, this.offset + size)
    this.offset += size
    return value
  }

  rest(): Uint8Array {
    return this.raw(this.bytes.length - this.offset)
  }

  cString(): string {
    const end = this.bytes.indexOf(0, this.offset)
    if (end === -1) {
      throw new ParseError({ message: "Unterminated string" })
    }
    const value = decodeUtf8(this.bytes.subarray(this.offset, end))
    this.offset = end + 1
    return value
  }
}

const decodeUtf8 = (bytes: Uint8Array): string => {
  try {
    return textDecoder.decode(bytes)
  } catch {
    throw new ParseError({ message: "Invalid UTF-8 in message" })
  }
}

// -----------------------------------------------------------------------------
// frontend messages
// -----------------------------------------------------------------------------

/**
 * Prepares a named or unnamed statement.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parse {
  readonly _tag: "Parse"
  readonly name: string
  readonly query: string
  readonly parameterTypes: ReadonlyArray<number>
}

/**
 * Binds parameter values to a prepared statement, creating a portal.
 *
 * Parameters and results always use the binary format code.
 *
 * @category models
 * @since 4.0.0
 */
export interface Bind {
  readonly _tag: "Bind"
  readonly portal: string
  readonly statement: string
  readonly parameters: ReadonlyArray<Uint8Array | null>
}

/**
 * Runs a portal, optionally limiting the number of rows returned.
 *
 * @category models
 * @since 4.0.0
 */
export interface Execute {
  readonly _tag: "Execute"
  readonly portal: string
  readonly maxRows: number
}

/**
 * Which kind of object a `Describe` or `Close` message names.
 *
 * @category models
 * @since 4.0.0
 */
export type DescribeTarget = "statement" | "portal"

/**
 * Asks for the parameter and row shape of a statement or portal.
 *
 * @category models
 * @since 4.0.0
 */
export interface Describe {
  readonly _tag: "Describe"
  readonly target: DescribeTarget
  readonly name: string
}

/**
 * Drops a prepared statement or portal.
 *
 * @category models
 * @since 4.0.0
 */
export interface Close {
  readonly _tag: "Close"
  readonly target: DescribeTarget
  readonly name: string
}

/**
 * Closes the current transaction block and requests a `ReadyForQuery`.
 *
 * @category models
 * @since 4.0.0
 */
export interface Sync {
  readonly _tag: "Sync"
}

/**
 * Asks the backend to deliver buffered output without ending the transaction.
 *
 * @category models
 * @since 4.0.0
 */
export interface Flush {
  readonly _tag: "Flush"
}

/**
 * Ends the session.
 *
 * @category models
 * @since 4.0.0
 */
export interface Terminate {
  readonly _tag: "Terminate"
}

/**
 * Answers a cleartext or MD5 password request.
 *
 * @category models
 * @since 4.0.0
 */
export interface PasswordMessage {
  readonly _tag: "PasswordMessage"
  readonly password: string
}

/**
 * Selects a SASL mechanism and carries its opaque initial response.
 *
 * @category models
 * @since 4.0.0
 */
export interface SASLInitialResponse {
  readonly _tag: "SASLInitialResponse"
  readonly mechanism: string
  readonly initialResponse: Uint8Array | null
}

/**
 * Carries an opaque SASL continuation payload.
 *
 * @category models
 * @since 4.0.0
 */
export interface SASLResponse {
  readonly _tag: "SASLResponse"
  readonly data: Uint8Array
}

/**
 * Any message the client sends after startup.
 *
 * @category models
 * @since 4.0.0
 */
export type FrontendMessage =
  | Parse
  | Bind
  | Execute
  | Describe
  | Close
  | Sync
  | Flush
  | Terminate
  | PasswordMessage
  | SASLInitialResponse
  | SASLResponse

const typed = (type: string, write: (writer: Writer) => void): Uint8Array => {
  const writer = new Writer(64)
  writer.uint8(type.charCodeAt(0))
  const lengthOffset = writer.offset
  writer.int32(0)
  write(writer)
  writer.view.setInt32(lengthOffset, writer.offset - lengthOffset)
  return writer.finish()
}

const targetByte = (target: DescribeTarget): number => target === "statement" ? 0x53 : 0x50

/**
 * Encodes a `Parse` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeParse = (options: Omit<Parse, "_tag">): Uint8Array =>
  typed("P", (writer) => {
    writer.cString(options.name)
    writer.cString(options.query)
    writer.int16(options.parameterTypes.length)
    for (const oid of options.parameterTypes) {
      writer.int32(oid)
    }
  })

/**
 * Encodes a `Bind` message using the binary format code for parameters and
 * results.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeBind = (options: Omit<Bind, "_tag">): Uint8Array =>
  typed("B", (writer) => {
    writer.cString(options.portal)
    writer.cString(options.statement)
    writer.int16(1)
    writer.int16(1)
    writer.int16(options.parameters.length)
    for (const parameter of options.parameters) {
      if (parameter === null) {
        writer.int32(-1)
      } else {
        writer.int32(parameter.length)
        writer.raw(parameter)
      }
    }
    writer.int16(1)
    writer.int16(1)
  })

/**
 * Encodes an `Execute` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeExecute = (options: Omit<Execute, "_tag">): Uint8Array =>
  typed("E", (writer) => {
    writer.cString(options.portal)
    writer.int32(options.maxRows)
  })

/**
 * Encodes a `Describe` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeDescribe = (options: Omit<Describe, "_tag">): Uint8Array =>
  typed("D", (writer) => {
    writer.uint8(targetByte(options.target))
    writer.cString(options.name)
  })

/**
 * Encodes a `Close` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeClose = (options: Omit<Close, "_tag">): Uint8Array =>
  typed("C", (writer) => {
    writer.uint8(targetByte(options.target))
    writer.cString(options.name)
  })

/**
 * Encodes a `Sync` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeSync = (): Uint8Array => typed("S", () => {})

/**
 * Encodes a `Flush` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeFlush = (): Uint8Array => typed("H", () => {})

/**
 * Encodes a `Terminate` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeTerminate = (): Uint8Array => typed("X", () => {})

/**
 * Encodes a `PasswordMessage`. The password is sent verbatim, so MD5 hashing
 * belongs to the caller - see `PgAuth.md5Password`.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodePasswordMessage = (options: Omit<PasswordMessage, "_tag">): Uint8Array =>
  typed("p", (writer) => {
    writer.cString(options.password)
  })

/**
 * Encodes a `SASLInitialResponse` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeSASLInitialResponse = (options: Omit<SASLInitialResponse, "_tag">): Uint8Array =>
  typed("p", (writer) => {
    writer.cString(options.mechanism)
    if (options.initialResponse === null) {
      writer.int32(-1)
    } else {
      writer.int32(options.initialResponse.length)
      writer.raw(options.initialResponse)
    }
  })

/**
 * Encodes a `SASLResponse` message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeSASLResponse = (options: Omit<SASLResponse, "_tag">): Uint8Array =>
  typed("p", (writer) => {
    writer.raw(options.data)
  })

/**
 * Encodes any frontend message.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode = (message: FrontendMessage): Uint8Array => {
  switch (message._tag) {
    case "Parse":
      return encodeParse(message)
    case "Bind":
      return encodeBind(message)
    case "Execute":
      return encodeExecute(message)
    case "Describe":
      return encodeDescribe(message)
    case "Close":
      return encodeClose(message)
    case "Sync":
      return encodeSync()
    case "Flush":
      return encodeFlush()
    case "Terminate":
      return encodeTerminate()
    case "PasswordMessage":
      return encodePasswordMessage(message)
    case "SASLInitialResponse":
      return encodeSASLInitialResponse(message)
    case "SASLResponse":
      return encodeSASLResponse(message)
  }
}

// -----------------------------------------------------------------------------
// special messages
// -----------------------------------------------------------------------------

const PROTOCOL_VERSION_3_0 = 196608
const SSL_REQUEST_CODE = 80877103
const CANCEL_REQUEST_CODE = 80877102

/**
 * Startup parameters. `user` is required; any other run-time parameter the
 * server accepts may be passed alongside it.
 *
 * @category models
 * @since 4.0.0
 */
export interface StartupParameters {
  readonly [key: string]: string | undefined
  readonly user: string
  readonly database?: string | undefined
  readonly application_name?: string | undefined
}

/**
 * Encodes an `SSLRequest`. It has no type byte and is only valid before
 * startup.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeSslRequest = (): Uint8Array => {
  const writer = new Writer(8)
  writer.int32(8)
  writer.int32(SSL_REQUEST_CODE)
  return writer.finish()
}

/**
 * Decodes the single byte the server sends in reply to an `SSLRequest`. `"S"`
 * means the server will speak TLS, `"N"` means it will not.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeSslResponse = (byte: number): "S" | "N" => {
  if (byte === 0x53) return "S"
  if (byte === 0x4e) return "N"
  throw new ParseError({ message: `Invalid SSLRequest response byte: ${byte}` })
}

/**
 * Encodes a `StartupMessage` for protocol 3.0. It has no type byte.
 * `client_encoding` defaults to `UTF8` because this codec always writes UTF-8.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeStartupMessage = (parameters: StartupParameters): Uint8Array => {
  const writer = new Writer(128)
  writer.int32(0)
  writer.int32(PROTOCOL_VERSION_3_0)
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined) continue
    writer.cString(key)
    writer.cString(value)
  }
  if (parameters.client_encoding === undefined) {
    writer.cString("client_encoding")
    writer.cString("UTF8")
  }
  writer.uint8(0)
  writer.view.setInt32(0, writer.offset)
  return writer.finish()
}

/**
 * Encodes a `CancelRequest`. It has no type byte and is sent on a separate
 * connection, using the `pid` and `secret` from `BackendKeyData`.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeCancelRequest = (options: {
  readonly pid: number
  readonly secret: number
}): Uint8Array => {
  const writer = new Writer(16)
  writer.int32(16)
  writer.int32(CANCEL_REQUEST_CODE)
  writer.int32(options.pid)
  writer.int32(options.secret)
  return writer.finish()
}

// -----------------------------------------------------------------------------
// backend messages
// -----------------------------------------------------------------------------

/**
 * Authentication succeeded.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationOk {
  readonly _tag: "AuthenticationOk"
}

/**
 * The server wants the password in the clear.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationCleartextPassword {
  readonly _tag: "AuthenticationCleartextPassword"
}

/**
 * The server wants an MD5-hashed password, salted with these four bytes.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationMD5Password {
  readonly _tag: "AuthenticationMD5Password"
  readonly salt: Uint8Array
}

/**
 * The server offers these SASL mechanisms.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationSASL {
  readonly _tag: "AuthenticationSASL"
  readonly mechanisms: ReadonlyArray<string>
}

/**
 * An opaque SASL challenge.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationSASLContinue {
  readonly _tag: "AuthenticationSASLContinue"
  readonly data: Uint8Array
}

/**
 * The opaque final SASL payload, carrying the server signature.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationSASLFinal {
  readonly _tag: "AuthenticationSASLFinal"
  readonly data: Uint8Array
}

/**
 * An authentication request this codec does not model, such as GSSAPI or
 * SSPI. The `method` is the raw sub-type integer.
 *
 * @category models
 * @since 4.0.0
 */
export interface AuthenticationUnsupported {
  readonly _tag: "AuthenticationUnsupported"
  readonly method: number
  readonly payload: Uint8Array
}

/**
 * Reports a run-time parameter value, at startup or whenever it changes.
 *
 * @category models
 * @since 4.0.0
 */
export interface ParameterStatus {
  readonly _tag: "ParameterStatus"
  readonly name: string
  readonly value: string
}

/**
 * The identity a `CancelRequest` needs.
 *
 * @category models
 * @since 4.0.0
 */
export interface BackendKeyData {
  readonly _tag: "BackendKeyData"
  readonly pid: number
  readonly secret: number
}

/**
 * Transaction status: idle, in a transaction block, or in a failed
 * transaction block.
 *
 * @category models
 * @since 4.0.0
 */
export type TransactionStatus = "I" | "T" | "E"

/**
 * The backend is ready for a new query cycle.
 *
 * @category models
 * @since 4.0.0
 */
export interface ReadyForQuery {
  readonly _tag: "ReadyForQuery"
  readonly status: TransactionStatus
}

/**
 * One column of a `RowDescription`.
 *
 * @category models
 * @since 4.0.0
 */
export interface FieldDescription {
  readonly name: string
  readonly tableOid: number
  readonly columnAttributeNumber: number
  readonly dataTypeOid: number
  readonly dataTypeSize: number
  readonly typeModifier: number
  readonly format: number
}

/**
 * Describes the columns a portal will return.
 *
 * @category models
 * @since 4.0.0
 */
export interface RowDescription {
  readonly _tag: "RowDescription"
  readonly fields: ReadonlyArray<FieldDescription>
}

/**
 * One result row. Values stay raw bytes; `null` is SQL NULL. Decoding them
 * requires the OIDs from the matching `RowDescription`.
 *
 * @category models
 * @since 4.0.0
 */
export interface DataRow {
  readonly _tag: "DataRow"
  readonly values: ReadonlyArray<Uint8Array | null>
}

/**
 * A command finished, reporting its tag such as `SELECT 3`.
 *
 * @category models
 * @since 4.0.0
 */
export interface CommandComplete {
  readonly _tag: "CommandComplete"
  readonly commandTag: string
}

/**
 * The query string was empty.
 *
 * @category models
 * @since 4.0.0
 */
export interface EmptyQueryResponse {
  readonly _tag: "EmptyQueryResponse"
}

/**
 * The statement or portal returns no rows.
 *
 * @category models
 * @since 4.0.0
 */
export interface NoData {
  readonly _tag: "NoData"
}

/**
 * A `Parse` succeeded.
 *
 * @category models
 * @since 4.0.0
 */
export interface ParseComplete {
  readonly _tag: "ParseComplete"
}

/**
 * A `Bind` succeeded.
 *
 * @category models
 * @since 4.0.0
 */
export interface BindComplete {
  readonly _tag: "BindComplete"
}

/**
 * A `Close` succeeded.
 *
 * @category models
 * @since 4.0.0
 */
export interface CloseComplete {
  readonly _tag: "CloseComplete"
}

/**
 * An `Execute` stopped at its row limit; the portal can be executed again.
 *
 * @category models
 * @since 4.0.0
 */
export interface PortalSuspended {
  readonly _tag: "PortalSuspended"
}

/**
 * The parameter OIDs of a described statement.
 *
 * @category models
 * @since 4.0.0
 */
export interface ParameterDescription {
  readonly _tag: "ParameterDescription"
  readonly parameterTypes: ReadonlyArray<number>
}

/**
 * The fields of an `ErrorResponse` or `NoticeResponse`. Unrecognised field
 * codes are kept under their raw single-character key.
 *
 * @category models
 * @since 4.0.0
 */
export interface ErrorFields {
  readonly [key: string]: string | undefined
  readonly severity?: string | undefined
  readonly severityUnlocalized?: string | undefined
  readonly code?: string | undefined
  readonly message?: string | undefined
  readonly detail?: string | undefined
  readonly hint?: string | undefined
  readonly position?: string | undefined
  readonly internalPosition?: string | undefined
  readonly internalQuery?: string | undefined
  readonly where?: string | undefined
  readonly schema?: string | undefined
  readonly table?: string | undefined
  readonly column?: string | undefined
  readonly dataType?: string | undefined
  readonly constraint?: string | undefined
  readonly file?: string | undefined
  readonly line?: string | undefined
  readonly routine?: string | undefined
}

/**
 * An error. `code` is the SQLSTATE.
 *
 * @category models
 * @since 4.0.0
 */
export interface ErrorResponse {
  readonly _tag: "ErrorResponse"
  readonly fields: ErrorFields
}

/**
 * A warning or notice. Same field set as `ErrorResponse`.
 *
 * @category models
 * @since 4.0.0
 */
export interface NoticeResponse {
  readonly _tag: "NoticeResponse"
  readonly fields: ErrorFields
}

/**
 * A `LISTEN`/`NOTIFY` message.
 *
 * @category models
 * @since 4.0.0
 */
export interface NotificationResponse {
  readonly _tag: "NotificationResponse"
  readonly pid: number
  readonly channel: string
  readonly payload: string
}

/**
 * The server speaks an older minor protocol version, or did not recognise
 * some startup options.
 *
 * @category models
 * @since 4.0.0
 */
export interface NegotiateProtocolVersion {
  readonly _tag: "NegotiateProtocolVersion"
  readonly minorVersion: number
  readonly unrecognizedOptions: ReadonlyArray<string>
}

/**
 * The server is ready to receive `COPY` data.
 *
 * @category models
 * @since 4.0.0
 */
export interface CopyInResponse {
  readonly _tag: "CopyInResponse"
  readonly format: number
  readonly columnFormats: ReadonlyArray<number>
}

/**
 * The server is about to send `COPY` data.
 *
 * @category models
 * @since 4.0.0
 */
export interface CopyOutResponse {
  readonly _tag: "CopyOutResponse"
  readonly format: number
  readonly columnFormats: ReadonlyArray<number>
}

/**
 * The connection entered bidirectional `COPY` mode, as used by replication.
 *
 * @category models
 * @since 4.0.0
 */
export interface CopyBothResponse {
  readonly _tag: "CopyBothResponse"
  readonly format: number
  readonly columnFormats: ReadonlyArray<number>
}

/**
 * A chunk of `COPY` data.
 *
 * @category models
 * @since 4.0.0
 */
export interface CopyData {
  readonly _tag: "CopyData"
  readonly data: Uint8Array
}

/**
 * The `COPY` stream ended.
 *
 * @category models
 * @since 4.0.0
 */
export interface CopyDone {
  readonly _tag: "CopyDone"
}

/**
 * A message whose type byte this codec does not know. The payload excludes
 * the type byte and the length prefix.
 *
 * @category models
 * @since 4.0.0
 */
export interface Unknown {
  readonly _tag: "Unknown"
  readonly type: number
  readonly payload: Uint8Array
}

/**
 * Any message the server sends after startup.
 *
 * @category models
 * @since 4.0.0
 */
export type BackendMessage =
  | AuthenticationOk
  | AuthenticationCleartextPassword
  | AuthenticationMD5Password
  | AuthenticationSASL
  | AuthenticationSASLContinue
  | AuthenticationSASLFinal
  | AuthenticationUnsupported
  | ParameterStatus
  | BackendKeyData
  | ReadyForQuery
  | RowDescription
  | DataRow
  | CommandComplete
  | EmptyQueryResponse
  | NoData
  | ParseComplete
  | BindComplete
  | CloseComplete
  | PortalSuspended
  | ParameterDescription
  | ErrorResponse
  | NoticeResponse
  | NotificationResponse
  | NegotiateProtocolVersion
  | CopyInResponse
  | CopyOutResponse
  | CopyBothResponse
  | CopyData
  | CopyDone
  | Unknown

const BackendType = {
  NotificationResponse: 0x41, // A
  CommandComplete: 0x43, // C
  DataRow: 0x44, // D
  ErrorResponse: 0x45, // E
  CopyInResponse: 0x47, // G
  CopyOutResponse: 0x48, // H
  EmptyQueryResponse: 0x49, // I
  BackendKeyData: 0x4b, // K
  NoticeResponse: 0x4e, // N
  Authentication: 0x52, // R
  ParameterStatus: 0x53, // S
  RowDescription: 0x54, // T
  CopyBothResponse: 0x57, // W
  ReadyForQuery: 0x5a, // Z
  CopyDone: 0x63, // c
  CopyData: 0x64, // d
  NoData: 0x6e, // n
  PortalSuspended: 0x73, // s
  ParameterDescription: 0x74, // t
  NegotiateProtocolVersion: 0x76, // v
  ParseComplete: 0x31, // 1
  BindComplete: 0x32, // 2
  CloseComplete: 0x33 // 3
} as const

const errorFieldNames: Record<string, string> = {
  S: "severity",
  V: "severityUnlocalized",
  C: "code",
  M: "message",
  D: "detail",
  H: "hint",
  P: "position",
  p: "internalPosition",
  q: "internalQuery",
  W: "where",
  s: "schema",
  t: "table",
  c: "column",
  d: "dataType",
  n: "constraint",
  F: "file",
  L: "line",
  R: "routine"
}

const decodeAuthentication = (reader: Reader): BackendMessage => {
  const method = reader.int32()
  switch (method) {
    case 0:
      return { _tag: "AuthenticationOk" }
    case 3:
      return { _tag: "AuthenticationCleartextPassword" }
    case 5:
      return { _tag: "AuthenticationMD5Password", salt: reader.raw(4) }
    case 10: {
      const mechanisms: Array<string> = []
      for (;;) {
        const mechanism = reader.cString()
        if (mechanism === "") break
        mechanisms.push(mechanism)
      }
      return { _tag: "AuthenticationSASL", mechanisms }
    }
    case 11:
      return { _tag: "AuthenticationSASLContinue", data: reader.rest() }
    case 12:
      return { _tag: "AuthenticationSASLFinal", data: reader.rest() }
    default:
      return { _tag: "AuthenticationUnsupported", method, payload: reader.rest() }
  }
}

const decodeErrorFields = (reader: Reader): ErrorFields => {
  const fields: Record<string, string> = {}
  for (;;) {
    const code = reader.uint8()
    if (code === 0) break
    const key = String.fromCharCode(code)
    fields[errorFieldNames[key] ?? key] = reader.cString()
  }
  return fields
}

const decodeCopyResponse = (
  reader: Reader
): { readonly format: number; readonly columnFormats: ReadonlyArray<number> } => {
  const format = reader.uint8()
  const count = reader.int16()
  const columnFormats: Array<number> = new Array(count)
  for (let i = 0; i < count; i++) {
    columnFormats[i] = reader.int16()
  }
  return { format, columnFormats }
}

const decodeBackend = (type: number, payload: Uint8Array): BackendMessage => {
  const reader = new Reader(payload)
  switch (type) {
    case BackendType.Authentication:
      return decodeAuthentication(reader)
    case BackendType.ParameterStatus:
      return { _tag: "ParameterStatus", name: reader.cString(), value: reader.cString() }
    case BackendType.BackendKeyData:
      return { _tag: "BackendKeyData", pid: reader.int32(), secret: reader.int32() }
    case BackendType.ReadyForQuery: {
      const status = String.fromCharCode(reader.uint8())
      if (status !== "I" && status !== "T" && status !== "E") {
        throw new ParseError({ message: `Invalid ReadyForQuery status: ${status}` })
      }
      return { _tag: "ReadyForQuery", status }
    }
    case BackendType.RowDescription: {
      const count = reader.int16()
      const fields: Array<FieldDescription> = new Array(count)
      for (let i = 0; i < count; i++) {
        fields[i] = {
          name: reader.cString(),
          tableOid: reader.uint32(),
          columnAttributeNumber: reader.int16(),
          dataTypeOid: reader.uint32(),
          dataTypeSize: reader.int16(),
          typeModifier: reader.int32(),
          format: reader.int16()
        }
      }
      return { _tag: "RowDescription", fields }
    }
    case BackendType.DataRow: {
      const count = reader.int16()
      const values: Array<Uint8Array | null> = new Array(count)
      for (let i = 0; i < count; i++) {
        const size = reader.int32()
        if (size < -1) {
          throw new ParseError({ message: `Invalid DataRow field length: ${size}` })
        }
        values[i] = size === -1 ? null : reader.raw(size)
      }
      return { _tag: "DataRow", values }
    }
    case BackendType.CommandComplete:
      return { _tag: "CommandComplete", commandTag: reader.cString() }
    case BackendType.EmptyQueryResponse:
      return { _tag: "EmptyQueryResponse" }
    case BackendType.NoData:
      return { _tag: "NoData" }
    case BackendType.ParseComplete:
      return { _tag: "ParseComplete" }
    case BackendType.BindComplete:
      return { _tag: "BindComplete" }
    case BackendType.CloseComplete:
      return { _tag: "CloseComplete" }
    case BackendType.PortalSuspended:
      return { _tag: "PortalSuspended" }
    case BackendType.ParameterDescription: {
      const count = reader.int16()
      const parameterTypes: Array<number> = new Array(count)
      for (let i = 0; i < count; i++) {
        parameterTypes[i] = reader.uint32()
      }
      return { _tag: "ParameterDescription", parameterTypes }
    }
    case BackendType.ErrorResponse:
      return { _tag: "ErrorResponse", fields: decodeErrorFields(reader) }
    case BackendType.NoticeResponse:
      return { _tag: "NoticeResponse", fields: decodeErrorFields(reader) }
    case BackendType.NotificationResponse:
      return {
        _tag: "NotificationResponse",
        pid: reader.int32(),
        channel: reader.cString(),
        payload: reader.cString()
      }
    case BackendType.NegotiateProtocolVersion: {
      const minorVersion = reader.int32()
      const count = reader.int32()
      const unrecognizedOptions: Array<string> = new Array(count)
      for (let i = 0; i < count; i++) {
        unrecognizedOptions[i] = reader.cString()
      }
      return { _tag: "NegotiateProtocolVersion", minorVersion, unrecognizedOptions }
    }
    case BackendType.CopyInResponse:
      return { _tag: "CopyInResponse", ...decodeCopyResponse(reader) }
    case BackendType.CopyOutResponse:
      return { _tag: "CopyOutResponse", ...decodeCopyResponse(reader) }
    case BackendType.CopyBothResponse:
      return { _tag: "CopyBothResponse", ...decodeCopyResponse(reader) }
    case BackendType.CopyData:
      return { _tag: "CopyData", data: reader.rest() }
    case BackendType.CopyDone:
      return { _tag: "CopyDone" }
    default:
      return { _tag: "Unknown", type, payload: reader.rest() }
  }
}

/**
 * Default `maxMessageSize` for `makeParser`: 16 MiB.
 *
 * @category constants
 * @since 4.0.0
 */
export const defaultMaxMessageSize = 16 * 1024 * 1024

/**
 * An incremental decoder for the post-startup backend message stream.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parser {
  /**
   * Feeds the next chunk of socket bytes and returns every message that is now
   * complete. A partial trailing message is retained until the bytes that
   * finish it arrive. A `ParseError` is terminal and the parser cannot be
   * reused afterward; any messages decoded earlier in the failing push are
   * discarded.
   */
  readonly push: (chunk: Uint8Array) => ReadonlyArray<BackendMessage>
}

/**
 * Creates a `Parser`.
 *
 * Special pre-startup replies have no type byte and are not handled here; use
 * `decodeSslResponse` for those.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeParser = (options?: {
  readonly maxMessageSize?: number | undefined
}): Parser => {
  const maxMessageSize = options?.maxMessageSize ?? defaultMaxMessageSize
  let buffer = new Uint8Array(8192)
  let view = new DataView(buffer.buffer)
  let start = 0
  let end = 0
  let failed = false

  const append = (chunk: Uint8Array): void => {
    if (end + chunk.length > buffer.length) {
      const pending = end - start
      if (pending + chunk.length <= buffer.length) {
        buffer.copyWithin(0, start, end)
      } else {
        let capacity = buffer.length
        while (capacity < pending + chunk.length) capacity *= 2
        const next = new Uint8Array(capacity)
        next.set(buffer.subarray(start, end))
        buffer = next
        view = new DataView(next.buffer)
      }
      start = 0
      end = pending
    }
    buffer.set(chunk, end)
    end += chunk.length
  }

  return {
    push: (chunk) => {
      if (failed) {
        throw new ParseError({ message: "Parser cannot be reused after a ParseError" })
      }
      try {
        append(chunk)
        const messages: Array<BackendMessage> = []
        while (end - start >= 5) {
          const length = view.getInt32(start + 1)
          if (length < 4) {
            throw new ParseError({ message: `Invalid message length: ${length}` })
          }
          if (length > maxMessageSize) {
            throw new ParseError({
              message: `Message length ${length} exceeds maxMessageSize ${maxMessageSize}`
            })
          }
          if (end - start < length + 1) break
          const type = buffer[start]
          messages.push(decodeBackend(type, buffer.subarray(start + 5, start + 1 + length)))
          start += length + 1
        }
        if (start === end) {
          start = 0
          end = 0
        }
        return messages
      } catch (error) {
        failed = true
        throw error
      }
    }
  }
}
