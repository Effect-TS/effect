/**
 * Converting MySQL column values to JavaScript values.
 *
 * MySQL sends a column's type in its definition and its value in one of two
 * formats: the text protocol writes every value as a string, and the binary
 * protocol writes typed bytes. Both formats decode to the same JavaScript
 * value, so the mapping is decided once here and each format reads it.
 *
 * Unlike PostgreSQL, MySQL has a closed type space: there are no user-defined
 * types on the wire, so there is no codec registry to extend. What is
 * configurable is the handful of choices where no single answer suits every
 * caller, which `DecodeOptions` collects.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import * as Result from "effect/Result"
import * as MysqlProtocol from "./MysqlProtocol.ts"

/**
 * A value that cannot be represented, in either direction.
 *
 * @category errors
 * @since 4.0.0
 */
export class CodecError extends Data.TaggedError("MysqlCodecError")<{
  readonly message: string
}> {}

/**
 * The choices where no single mapping suits every caller.
 *
 * @category models
 * @since 4.0.0
 */
export interface DecodeOptions {
  /**
   * Decodes `BIGINT` as a `number` rather than a `bigint`. Convenient, and
   * lossy above 2^53, so it is off by default.
   */
  readonly bigintAsNumber?: boolean | undefined
  /**
   * Decodes `DATETIME` and `TIMESTAMP` as `"YYYY-MM-DD HH:MM:SS"` strings
   * rather than epoch milliseconds, and `TIME` as `"HH:MM:SS"` rather than a
   * microsecond duration.
   */
  readonly dateStrings?: boolean | undefined
}

const textDecoder = new TextDecoder("utf-8", { fatal: true })

/** Below this length a per-character loop beats `TextDecoder.decode`. */
const asciiDecodeLimit = 10

interface MaybeNodeGlobals {
  readonly Buffer?: { readonly prototype?: { readonly utf8Slice?: (start: number, end: number) => string } }
}

const utf8Slice: ((this: Uint8Array, start: number, end: number) => string) | undefined =
  (globalThis as MaybeNodeGlobals).Buffer?.prototype?.utf8Slice

const decodeUtf8 = (bytes: Uint8Array, offset: number, size: number): string => {
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
    return textDecoder.decode(new Uint8Array(bytes.buffer, bytes.byteOffset + offset, size))
  } catch {
    throw new CodecError({ message: "Invalid UTF-8 in a column value" })
  }
}

/**
 * Parses an integer straight from its ASCII digits. Every value of every row
 * of a text-protocol result goes through a conversion like this one, so it
 * avoids building the intermediate string that `Number(text)` needs.
 */
const asciiInteger = (bytes: Uint8Array, offset: number, size: number): number => {
  let index = 0
  let negative = false
  if (size > 0 && (bytes[offset] === 0x2d || bytes[offset] === 0x2b)) {
    negative = bytes[offset] === 0x2d
    index = 1
  }
  if (index === size) throw new CodecError({ message: "Empty integer value" })
  let value = 0
  for (; index < size; index++) {
    const digit = bytes[offset + index] - 0x30
    if (digit < 0 || digit > 9) {
      // Not a plain integer after all; let the general parser decide.
      const text = decodeUtf8(bytes, offset, size)
      const parsed = Number(text)
      if (Number.isNaN(parsed)) throw new CodecError({ message: `Invalid numeric value "${text}"` })
      return parsed
    }
    value = value * 10 + digit
  }
  return negative ? -value : value
}

const asciiNumber = (bytes: Uint8Array, offset: number, size: number): number => {
  const text = decodeUtf8(bytes, offset, size)
  const value = Number(text)
  if (Number.isNaN(value) && text !== "NaN") {
    throw new CodecError({ message: `Invalid numeric value "${text}"` })
  }
  return value
}

const asciiBigInt = (bytes: Uint8Array, offset: number, size: number): bigint => {
  const text = decodeUtf8(bytes, offset, size)
  try {
    return BigInt(text)
  } catch {
    throw new CodecError({ message: `Invalid integer value "${text}"` })
  }
}

/**
 * Reads a `DATETIME` or `TIMESTAMP` as epoch milliseconds.
 *
 * The session runs on UTC — `MysqlConnection` sets `time_zone` on connect — so
 * the wire text is read as UTC rather than as local time. Sub-millisecond
 * precision is truncated, matching the `PgTypes` timestamp codec.
 */
const parseDateTime = (text: string): number => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/.exec(text)
  if (match === null) {
    // MySQL writes the zero date as 0000-00-00 00:00:00 when strict mode is off.
    if (text.startsWith("0000-00-00")) return Number.NaN
    throw new CodecError({ message: `Invalid datetime value "${text}"` })
  }
  const milliseconds = match[7] === undefined ? 0 : Math.floor(Number(match[7].padEnd(6, "0")) / 1000)
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    milliseconds
  )
}

/**
 * Reads a `TIME` as signed microseconds.
 *
 * MySQL's `TIME` is a duration rather than a clock reading: it spans
 * -838:59:59 to 838:59:59, so it can be negative and its hour field can exceed
 * 24. Microseconds keep the full precision the type can carry.
 */
const parseTime = (text: string): bigint => {
  const match = /^(-)?(\d{1,3}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/.exec(text)
  if (match === null) throw new CodecError({ message: `Invalid time value "${text}"` })
  const micros = match[5] === undefined ? BigInt("0") : BigInt(match[5].padEnd(6, "0"))
  const total = BigInt(match[2]) * BigInt("3600000000") +
    BigInt(match[3]) * BigInt("60000000") +
    BigInt(match[4]) * BigInt("1000000") +
    micros
  return match[1] === undefined ? total : -total
}

/** Reads a `BIT` column, which arrives as big-endian bytes in both formats. */
const parseBits = (bytes: Uint8Array, offset: number, size: number): bigint => {
  let value = BigInt("0")
  for (let index = 0; index < size; index++) {
    value = (value << BigInt("8")) | BigInt(bytes[offset + index])
  }
  return value
}

/** Decodes one column's text-format value. */
type TextReader = (bytes: Uint8Array, offset: number, size: number) => unknown

/**
 * Picks a column's reader from its type. A reader may depend on the column's
 * flags or on the caller's options, so an entry is a function rather than a
 * reader directly.
 */
type TextReaderFor = (column: MysqlProtocol.Column, options: DecodeOptions) => TextReader

/**
 * How each column type reads in the text protocol.
 *
 * Types absent from this table are strings or byte strings, told apart by the
 * column's collation, which is what `textReaderFor` falls back to.
 */
const textReaders: Partial<Record<number, TextReaderFor>> = {
  [MysqlProtocol.ColumnType.tiny]: () => asciiInteger,
  [MysqlProtocol.ColumnType.short]: () => asciiInteger,
  [MysqlProtocol.ColumnType.long]: () => asciiInteger,
  [MysqlProtocol.ColumnType.int24]: () => asciiInteger,
  [MysqlProtocol.ColumnType.year]: () => asciiInteger,
  [MysqlProtocol.ColumnType.longlong]: (_, options) => options.bigintAsNumber === true ? asciiInteger : asciiBigInt,
  [MysqlProtocol.ColumnType.float]: () => asciiNumber,
  [MysqlProtocol.ColumnType.double]: () => asciiNumber,
  // A fixed-point value is never a float: the text on the wire is exact and
  // parsing it would round.
  [MysqlProtocol.ColumnType.decimal]: () => decodeUtf8,
  [MysqlProtocol.ColumnType.newdecimal]: () => decodeUtf8,
  [MysqlProtocol.ColumnType.date]: () => decodeUtf8,
  [MysqlProtocol.ColumnType.newdate]: () => decodeUtf8,
  [MysqlProtocol.ColumnType.datetime]: (_, options) => options.dateStrings === true ? decodeUtf8 : readDateTimeText,
  [MysqlProtocol.ColumnType.timestamp]: (_, options) => options.dateStrings === true ? decodeUtf8 : readDateTimeText,
  [MysqlProtocol.ColumnType.time]: (_, options) => options.dateStrings === true ? decodeUtf8 : readTimeText,
  [MysqlProtocol.ColumnType.json]: () => readJsonText,
  [MysqlProtocol.ColumnType.bit]: () => parseBits,
  [MysqlProtocol.ColumnType.geometry]: () => copyBytes,
  [MysqlProtocol.ColumnType.null]: () => readNull
}

const readDateTimeText: TextReader = (bytes, offset, size) => parseDateTime(decodeUtf8(bytes, offset, size))

const readTimeText: TextReader = (bytes, offset, size) => parseTime(decodeUtf8(bytes, offset, size))

const readJsonText: TextReader = (bytes, offset, size) => parseJson(decodeUtf8(bytes, offset, size))

const readNull: TextReader = () => null

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    throw new CodecError({ message: "Invalid JSON in a column value" })
  }
}

/** Chooses the reader for a column, from its type, flags and collation. */
const textReaderFor = (column: MysqlProtocol.Column, options: DecodeOptions = {}): TextReader => {
  const reader = textReaders[column.type]
  if (reader !== undefined) return reader(column, options)
  return MysqlProtocol.Column.isBinary(column) ? copyBytes : decodeUtf8
}

const copyBytes = (bytes: Uint8Array, offset: number, size: number): Uint8Array => bytes.slice(offset, offset + size)

/**
 * Builds the field reader for a text-protocol result set.
 *
 * **Details**
 *
 * The per-column readers are resolved once for the whole result rather than
 * per row, which is what makes decoding a row a switch-free walk.
 *
 * @category decoding
 * @since 4.0.0
 */
export const makeTextFieldReader = (
  columns: ReadonlyArray<MysqlProtocol.Column>,
  options: DecodeOptions = {}
): MysqlProtocol.FieldReader<unknown> => {
  const readers = columns.map((column) => textReaderFor(column, options))
  return (bytes, offset, size, column) => size === -1 ? null : readers[column](bytes, offset, size)
}

// -----------------------------------------------------------------------------
// binary protocol
// -----------------------------------------------------------------------------

/**
 * Reads a length-encoded length and returns it with the offset just past it.
 * A binary field is never SQL NULL - the row's bitmap says that instead - so
 * the NULL marker is malformed here.
 */
const readLength = (bytes: Uint8Array, offset: number, limit: number): readonly [length: number, next: number] => {
  if (offset >= limit) throw new CodecError({ message: "Truncated binary value" })
  const first = bytes[offset]
  if (first < 0xfb) return [first, offset + 1]
  if (first === 0xfc) return [bytes[offset + 1] | (bytes[offset + 2] << 8), offset + 3]
  if (first === 0xfd) {
    return [bytes[offset + 1] | (bytes[offset + 2] << 8) | (bytes[offset + 3] << 16), offset + 4]
  }
  if (first === 0xfe) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 8)
    const value = view.getBigUint64(0, true)
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new CodecError({ message: `Binary value length ${value} exceeds the safe integer range` })
    }
    return [Number(value), offset + 9]
  }
  throw new CodecError({ message: `Invalid length prefix 0x${first.toString(16)} in a binary value` })
}

let cachedBytes: Uint8Array | undefined
let cachedView: DataView | undefined

/**
 * A `DataView` over a row's payload.
 *
 * Allocating one per field read made this the largest frame in the module's
 * profile, ahead of the string decoder. Every column of a row is read from
 * the same payload, so caching the last one turns those allocations into a
 * single identity check. The view still spans exactly the payload, because
 * its bounds are what turns a truncated field into a thrown error rather
 * than a silent read into the next row.
 */
const viewOf = (bytes: Uint8Array): DataView => {
  if (bytes !== cachedBytes) {
    cachedBytes = bytes
    cachedView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  return cachedView!
}

/**
 * Builds an epoch-millisecond timestamp from the components a binary temporal
 * value carries. The session runs on UTC, so the components are read as UTC.
 */
const dateFromParts = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  micros: number
): number => Date.UTC(year, month - 1, day, hour, minute, second, Math.floor(micros / 1000))

const pad = (value: number, width: number): string => String(value).padStart(width, "0")

/**
 * Reads one column's binary-format value, returning it with the offset just
 * past it.
 */
type BinaryReader = (
  bytes: Uint8Array,
  offset: number,
  limit: number
) => readonly [value: unknown, next: number]

const readLenencBytes = (
  bytes: Uint8Array,
  offset: number,
  limit: number
): readonly [Uint8Array, number] => {
  const [length, start] = readLength(bytes, offset, limit)
  if (start + length > limit) throw new CodecError({ message: "Truncated binary string" })
  return [bytes.slice(start, start + length), start + length]
}

const readLenencText = (
  bytes: Uint8Array,
  offset: number,
  limit: number
): readonly [string, number] => {
  const [length, start] = readLength(bytes, offset, limit)
  if (start + length > limit) throw new CodecError({ message: "Truncated binary string" })
  return [decodeUtf8(bytes, start, length), start + length]
}

/**
 * Reads a binary `DATE`, `DATETIME` or `TIMESTAMP`, which carries no
 * components beyond the precision it needs: four bytes for a date, seven with
 * a time, eleven with microseconds, and zero for the all-zero value.
 */
const readTemporal = (
  bytes: Uint8Array,
  offset: number,
  limit: number
): readonly [
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  micros: number,
  next: number
] => {
  const [length, start] = readLength(bytes, offset, limit)
  if (start + length > limit) throw new CodecError({ message: "Truncated binary temporal value" })
  if (length === 0) return [0, 0, 0, 0, 0, 0, 0, start]
  const view = viewOf(bytes)
  const year = view.getUint16(start, true)
  const month = bytes[start + 2]
  const day = bytes[start + 3]
  if (length === 4) return [year, month, day, 0, 0, 0, 0, start + 4]
  const hour = bytes[start + 4]
  const minute = bytes[start + 5]
  const second = bytes[start + 6]
  if (length === 7) return [year, month, day, hour, minute, second, 0, start + 7]
  if (length !== 11) throw new CodecError({ message: `Invalid binary temporal length ${length}` })
  const micros = view.getUint32(start + 7, true)
  return [year, month, day, hour, minute, second, micros, start + 11]
}

/**
 * Reads a binary `TIME`, which is a signed duration carrying whole days
 * separately from the hour field.
 */
const readDuration = (bytes: Uint8Array, offset: number, limit: number): readonly [bigint, number] => {
  const [length, start] = readLength(bytes, offset, limit)
  if (start + length > limit) throw new CodecError({ message: "Truncated binary time value" })
  if (length === 0) return [BigInt("0"), start]
  if (length !== 8 && length !== 12) {
    throw new CodecError({ message: `Invalid binary time length ${length}` })
  }
  const view = viewOf(bytes)
  const negative = bytes[start] === 1
  const days = view.getUint32(start + 1, true)
  const hours = bytes[start + 5]
  const minutes = bytes[start + 6]
  const seconds = bytes[start + 7]
  const micros = length === 12 ? view.getUint32(start + 8, true) : 0
  const total = BigInt(days) * BigInt("86400000000") +
    BigInt(hours) * BigInt("3600000000") +
    BigInt(minutes) * BigInt("60000000") +
    BigInt(seconds) * BigInt("1000000") +
    BigInt(micros)
  return [negative ? -total : total, start + length]
}

const readInt8: BinaryReader = (bytes, offset) => [viewOf(bytes).getInt8(offset), offset + 1]
const readUint8: BinaryReader = (bytes, offset) => [bytes[offset], offset + 1]
const readInt16: BinaryReader = (bytes, offset) => [viewOf(bytes).getInt16(offset, true), offset + 2]
const readUint16: BinaryReader = (bytes, offset) => [viewOf(bytes).getUint16(offset, true), offset + 2]
const readInt32: BinaryReader = (bytes, offset) => [viewOf(bytes).getInt32(offset, true), offset + 4]
const readUint32: BinaryReader = (bytes, offset) => [viewOf(bytes).getUint32(offset, true), offset + 4]
const readFloat32: BinaryReader = (bytes, offset) => [viewOf(bytes).getFloat32(offset, true), offset + 4]
const readFloat64: BinaryReader = (bytes, offset) => [viewOf(bytes).getFloat64(offset, true), offset + 8]
const readNullBinary: BinaryReader = (_, offset) => [null, offset]

const readBigInt = (unsigned: boolean, asNumber: boolean): BinaryReader => (bytes, offset) => {
  const view = viewOf(bytes)
  const value = unsigned ? view.getBigUint64(offset, true) : view.getBigInt64(offset, true)
  return [asNumber ? Number(value) : value, offset + 8]
}

const readDateBinary: BinaryReader = (bytes, offset, limit) => {
  const [year, month, day, , , , , next] = readTemporal(bytes, offset, limit)
  return [`${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`, next]
}

const readDateTimeBinary: BinaryReader = (bytes, offset, limit) => {
  const [year, month, day, hour, minute, second, micros, next] = readTemporal(bytes, offset, limit)
  return [dateFromParts(year, month, day, hour, minute, second, micros), next]
}

/**
 * Renders the fractional-seconds suffix a column's declared precision calls
 * for. The binary protocol omits the microseconds field when the value has
 * none, so the precision has to come from the column rather than the row, or
 * a `DATETIME(6)` holding a whole second would render differently from the
 * same value read over the text protocol.
 */
const fraction = (micros: number, decimals: number): string =>
  decimals > 0 ? `.${pad(micros, 6).slice(0, decimals)}` : ""

const readDateTimeBinaryString = (decimals: number): BinaryReader => (bytes, offset, limit) => {
  const [year, month, day, hour, minute, second, micros, next] = readTemporal(bytes, offset, limit)
  return [
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)} ${pad(hour, 2)}:${pad(minute, 2)}:${pad(second, 2)}${
      fraction(micros, decimals)
    }`,
    next
  ]
}

const readTimeBinary: BinaryReader = (bytes, offset, limit) => readDuration(bytes, offset, limit)

const readTimeBinaryString = (decimals: number): BinaryReader => (bytes, offset, limit) => {
  const [micros, next] = readDuration(bytes, offset, limit)
  const absolute = micros < BigInt("0") ? -micros : micros
  const hours = absolute / BigInt("3600000000")
  const minutes = (absolute / BigInt("60000000")) % BigInt("60")
  const seconds = (absolute / BigInt("1000000")) % BigInt("60")
  const sign = micros < BigInt("0") ? "-" : ""
  return [
    `${sign}${pad(Number(hours), 2)}:${pad(Number(minutes), 2)}:${pad(Number(seconds), 2)}${
      fraction(Number(absolute % BigInt("1000000")), decimals)
    }`,
    next
  ]
}

const readJsonBinary: BinaryReader = (bytes, offset, limit) => {
  const [text, next] = readLenencText(bytes, offset, limit)
  return [parseJson(text), next]
}

const readBitsBinary: BinaryReader = (bytes, offset, limit) => {
  const [value, next] = readLenencBytes(bytes, offset, limit)
  return [parseBits(value, 0, value.length), next]
}

/** Picks a column's binary reader from its type. */
type BinaryReaderFor = (column: MysqlProtocol.Column, options: DecodeOptions) => BinaryReader

/**
 * How each column type reads in the binary protocol.
 *
 * Types absent from this table are length-encoded strings or byte strings,
 * told apart by the column's collation.
 */
const binaryReaders: Partial<Record<number, BinaryReaderFor>> = {
  [MysqlProtocol.ColumnType.tiny]: (column) => MysqlProtocol.Column.isUnsigned(column) ? readUint8 : readInt8,
  [MysqlProtocol.ColumnType.short]: (column) => MysqlProtocol.Column.isUnsigned(column) ? readUint16 : readInt16,
  [MysqlProtocol.ColumnType.year]: (column) => MysqlProtocol.Column.isUnsigned(column) ? readUint16 : readInt16,
  [MysqlProtocol.ColumnType.long]: (column) => MysqlProtocol.Column.isUnsigned(column) ? readUint32 : readInt32,
  [MysqlProtocol.ColumnType.int24]: (column) => MysqlProtocol.Column.isUnsigned(column) ? readUint32 : readInt32,
  [MysqlProtocol.ColumnType.longlong]: (column, options) =>
    readBigInt(MysqlProtocol.Column.isUnsigned(column), options.bigintAsNumber === true),
  [MysqlProtocol.ColumnType.float]: () => readFloat32,
  [MysqlProtocol.ColumnType.double]: () => readFloat64,
  [MysqlProtocol.ColumnType.decimal]: () => readLenencText,
  [MysqlProtocol.ColumnType.newdecimal]: () => readLenencText,
  [MysqlProtocol.ColumnType.date]: () => readDateBinary,
  [MysqlProtocol.ColumnType.newdate]: () => readDateBinary,
  [MysqlProtocol.ColumnType.datetime]: (column, options) =>
    options.dateStrings === true ? readDateTimeBinaryString(column.decimals) : readDateTimeBinary,
  [MysqlProtocol.ColumnType.timestamp]: (column, options) =>
    options.dateStrings === true ? readDateTimeBinaryString(column.decimals) : readDateTimeBinary,
  [MysqlProtocol.ColumnType.time]: (column, options) =>
    options.dateStrings === true ? readTimeBinaryString(column.decimals) : readTimeBinary,
  [MysqlProtocol.ColumnType.json]: () => readJsonBinary,
  [MysqlProtocol.ColumnType.bit]: () => readBitsBinary,
  [MysqlProtocol.ColumnType.geometry]: () => readLenencBytes,
  [MysqlProtocol.ColumnType.null]: () => readNullBinary
}

/** Chooses the binary reader for a column, from its type, flags and collation. */
const binaryReaderFor = (column: MysqlProtocol.Column, options: DecodeOptions = {}): BinaryReader => {
  const reader = binaryReaders[column.type]
  if (reader !== undefined) return reader(column, options)
  return MysqlProtocol.Column.isBinary(column) ? readLenencBytes : readLenencText
}

/**
 * Builds the field reader for a binary-protocol result set.
 *
 * @category decoding
 * @since 4.0.0
 */
export const makeBinaryFieldReader = (
  columns: ReadonlyArray<MysqlProtocol.Column>,
  options: DecodeOptions = {}
): MysqlProtocol.BinaryFieldReader<unknown> => {
  const readers = columns.map((column) => binaryReaderFor(column, options))
  return (bytes, offset, limit, column) => readers[column](bytes, offset, limit)
}

// -----------------------------------------------------------------------------
// parameters
// -----------------------------------------------------------------------------

const sqlNullParameter: MysqlProtocol.BoundParameter = {
  type: MysqlProtocol.ColumnType.null,
  unsigned: false,
  write: undefined
}

const INT32_MIN = -2147483648
const INT32_MAX = 2147483647
const INT64_MAX = BigInt("2") ** BigInt("63") - BigInt("1")

/**
 * Binds one JavaScript value as a prepared-statement parameter, choosing the
 * wire type from the value.
 *
 * **Details**
 *
 * Unlike the text protocol, nothing here is written into the statement, so a
 * value cannot change how the statement parses.
 *
 * @category encoding
 * @since 4.0.0
 */
export const bindParameter = (value: unknown): MysqlProtocol.BoundParameter => {
  if (value === null || value === undefined) return sqlNullParameter
  switch (typeof value) {
    case "boolean":
      return {
        type: MysqlProtocol.ColumnType.tiny,
        unsigned: false,
        write: (sink) => sink.uint8(value ? 1 : 0)
      }
    case "number": {
      if (!Number.isFinite(value)) {
        throw new CodecError({ message: `Cannot bind the non-finite number ${value}` })
      }
      if (!Number.isInteger(value)) {
        return {
          type: MysqlProtocol.ColumnType.double,
          unsigned: false,
          write: (sink) => sink.float64(value)
        }
      }
      if (value >= INT32_MIN && value <= INT32_MAX) {
        return {
          type: MysqlProtocol.ColumnType.long,
          unsigned: false,
          write: (sink) => sink.uint32(value >>> 0)
        }
      }
      return {
        type: MysqlProtocol.ColumnType.longlong,
        unsigned: false,
        write: (sink) => sink.int64(BigInt(value))
      }
    }
    case "bigint": {
      const unsigned = value > INT64_MAX
      return {
        type: MysqlProtocol.ColumnType.longlong,
        unsigned,
        write: (sink) => unsigned ? sink.uint64(value) : sink.int64(value)
      }
    }
    case "string":
      return {
        type: MysqlProtocol.ColumnType.varString,
        unsigned: false,
        write: (sink) => sink.lenencString(value)
      }
    case "object":
      break
    default:
      throw new CodecError({ message: `Cannot bind a value of type ${typeof value}` })
  }
  if (value instanceof Date) {
    const time = value.getTime()
    if (Number.isNaN(time)) throw new CodecError({ message: "Cannot bind an invalid Date" })
    return {
      type: MysqlProtocol.ColumnType.datetime,
      unsigned: false,
      write: (sink) => {
        sink.uint8(11)
        sink.uint16(value.getUTCFullYear())
        sink.uint8(value.getUTCMonth() + 1)
        sink.uint8(value.getUTCDate())
        sink.uint8(value.getUTCHours())
        sink.uint8(value.getUTCMinutes())
        sink.uint8(value.getUTCSeconds())
        sink.uint32(value.getUTCMilliseconds() * 1000)
      }
    }
  }
  if (value instanceof Uint8Array) {
    return {
      type: MysqlProtocol.ColumnType.blob,
      unsigned: false,
      write: (sink) => sink.lenencBytes(value)
    }
  }
  if (value instanceof Int8Array) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.length)
    return {
      type: MysqlProtocol.ColumnType.blob,
      unsigned: false,
      write: (sink) => sink.lenencBytes(bytes)
    }
  }
  // Anything else is stored as JSON, matching how a JSON column round-trips.
  const json = JSON.stringify(value)
  return {
    type: MysqlProtocol.ColumnType.varString,
    unsigned: false,
    write: (sink) => sink.lenencString(json)
  }
}

/**
 * Binds a statement's parameters, reporting a value it cannot represent rather
 * than throwing.
 *
 * @category encoding
 * @since 4.0.0
 */
export const bindParameters = (
  params: ReadonlyArray<unknown>
): Result.Result<Array<MysqlProtocol.BoundParameter>, CodecError> => {
  try {
    return Result.succeed(params.map(bindParameter))
  } catch (error) {
    if (error instanceof CodecError) return Result.fail(error)
    throw error
  }
}
