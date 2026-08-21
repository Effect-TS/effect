/**
 * Binary codecs for PostgreSQL values, keyed by type OID.
 *
 * Version 1 implements the binary wire format (`format = 1`) only; passing
 * `format = 0` to `decode` is an error. Layouts follow rust-postgres'
 * `postgres-types`, including the infinity sentinels, and assume the server
 * was built with `integer_datetimes` (the only supported configuration since
 * PostgreSQL 10).
 *
 * There is no `typeof` inference: an OID is always supplied, either directly
 * or through a constructor such as `int4` that carries it.
 *
 * `timestamp` has no time zone on the wire and is treated as UTC in both
 * directions. Decoding drops sub-millisecond precision by truncating toward
 * zero, including for timestamps before the PostgreSQL epoch.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"
import type { ValueSink } from "./PgProtocol.ts"

/**
 * Error raised when a value cannot be encoded or decoded for its OID.
 *
 * @category errors
 * @since 4.0.0
 */
export class CodecError extends Data.TaggedError("PgTypesCodecError")<{
  readonly message: string
}> {}

const fail = (message: string): never => {
  throw new CodecError({ message })
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder("utf-8", { fatal: true })

const writeInt16 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value >>> 8
  bytes[offset + 1] = value
}

const readInt16 = (bytes: Uint8Array, offset: number): number => ((bytes[offset] << 8) | bytes[offset + 1]) << 16 >> 16

const readUint16 = (bytes: Uint8Array, offset: number): number => (bytes[offset] << 8) | bytes[offset + 1]

const writeInt32 = (bytes: Uint8Array, offset: number, value: number): void => {
  bytes[offset] = value >>> 24
  bytes[offset + 1] = value >>> 16
  bytes[offset + 2] = value >>> 8
  bytes[offset + 3] = value
}

const readInt32 = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]

/**
 * Constructing a `DataView` costs more than the reads and writes it performs,
 * so the fixed-width codecs stage values through these instead of wrapping
 * every freshly allocated array.
 */
const scratch4 = new ArrayBuffer(4)
const scratchView4 = new DataView(scratch4)
const scratchBytes4 = new Uint8Array(scratch4)
const scratch8 = new ArrayBuffer(8)
const scratchView8 = new DataView(scratch8)
const scratchBytes8 = new Uint8Array(scratch8)

/**
 * Above this length `TextEncoder.encodeInto` beats a per-character loop, below
 * it the call overhead dominates. Measured on V8: the loop runs at about a
 * nanosecond per character and `encodeInto` costs about 50 ns whatever the
 * length, so the crossover is around 50 characters.
 */
const asciiEncodeLimit = 48

/**
 * `encodeInto` needs somewhere to write. Encoding through this and copying out
 * still beats `TextEncoder.encode`, which allocates inside the call. Strings
 * that would need a larger one are rare enough to encode the slow way rather
 * than keep that much memory alive.
 */
let scratchUtf8 = new Uint8Array(4096)

const scratchUtf8Limit = 64 * 1024

/** Encodes into `scratchUtf8`, returning how many bytes it holds, or -1. */
const encodeUtf8Scratch = (text: string): number => {
  const capacity = text.length * 3
  if (capacity > scratchUtf8Limit) return -1
  if (capacity > scratchUtf8.length) scratchUtf8 = new Uint8Array(capacity)
  return textEncoder.encodeInto(text, scratchUtf8).written
}

const encodeUtf8 = (text: string): Uint8Array => {
  const length = text.length
  if (length <= asciiEncodeLimit) {
    const bytes = new Uint8Array(length)
    let i = 0
    for (; i < length; i++) {
      const code = text.charCodeAt(i)
      if (code > 0x7f) break
      bytes[i] = code
    }
    if (i === length) return bytes
  }
  const written = encodeUtf8Scratch(text)
  return written === -1 ? textEncoder.encode(text) : scratchUtf8.slice(0, written)
}

/** As `encodeUtf8`, but leaves `prefix` bytes free at the front. */
const encodeUtf8Prefixed = (text: string, prefix: number): Uint8Array => {
  const length = text.length
  if (length <= asciiEncodeLimit) {
    const bytes = new Uint8Array(prefix + length)
    let i = 0
    for (; i < length; i++) {
      const code = text.charCodeAt(i)
      if (code > 0x7f) break
      bytes[prefix + i] = code
    }
    if (i === length) return bytes
  }
  const written = encodeUtf8Scratch(text)
  if (written === -1) {
    const body = textEncoder.encode(text)
    const bytes = new Uint8Array(prefix + body.length)
    bytes.set(body, prefix)
    return bytes
  }
  const bytes = new Uint8Array(prefix + written)
  bytes.set(scratchUtf8.subarray(0, written), prefix)
  return bytes
}

const requireSize = (bytes: Uint8Array, size: number, name: string): void => {
  if (bytes.length !== size) {
    fail(`Expected ${size} byte(s) for ${name}, received ${bytes.length}`)
  }
}

const requireString = (value: unknown, name: string): string =>
  typeof value === "string" ? value : fail(`Expected a string for ${name}`)

const requireBigInt = (value: unknown, name: string): bigint =>
  typeof value === "bigint" ? value : fail(`Expected a bigint for ${name}`)

const requireNumber = (value: unknown, name: string): number =>
  typeof value === "number" ? value : fail(`Expected a number for ${name}`)

const requireInteger = (value: unknown, name: string, min: number, max: number): number => {
  const num = requireNumber(value, name)
  if (!Number.isInteger(num) || num < min || num > max) {
    fail(`Expected an integer in [${min}, ${max}] for ${name}, received ${num}`)
  }
  return num
}

const ZERO = BigInt(0)
const THOUSAND = BigInt(1000)
const MICROS_PER_SECOND = BigInt(1_000_000)
const INT64_MIN = BigInt("-9223372036854775808")
const INT64_MAX = BigInt("9223372036854775807")
const INT32_MIN = -2147483648
const INT32_MAX = 2147483647

/** Milliseconds between the Unix epoch and the PostgreSQL epoch (2000-01-01). */
const PG_EPOCH_MS = 946684800000
/** Days between the Unix epoch and the PostgreSQL epoch. */
const PG_EPOCH_DAYS = 10957

// -----------------------------------------------------------------------------
// OIDs
// -----------------------------------------------------------------------------

/**
 * Type OIDs implemented by version 1 of this codec.
 *
 * @category constants
 * @since 4.0.0
 */
export const OID = {
  bool: 16,
  bytea: 17,
  name: 19,
  int8: 20,
  int2: 21,
  int4: 23,
  text: 25,
  oid: 26,
  json: 114,
  cidr: 650,
  float4: 700,
  float8: 701,
  inet: 869,
  bpchar: 1042,
  varchar: 1043,
  date: 1082,
  time: 1083,
  timestamp: 1114,
  timestamptz: 1184,
  timetz: 1266,
  numeric: 1700,
  uuid: 2950,
  jsonb: 3802,
  boolArray: 1000,
  byteaArray: 1001,
  nameArray: 1003,
  int8Array: 1016,
  int2Array: 1005,
  int4Array: 1007,
  textArray: 1009,
  oidArray: 1028,
  jsonArray: 199,
  cidrArray: 651,
  float4Array: 1021,
  float8Array: 1022,
  inetArray: 1041,
  bpcharArray: 1014,
  varcharArray: 1015,
  dateArray: 1182,
  timeArray: 1183,
  timestampArray: 1115,
  timestamptzArray: 1185,
  timetzArray: 1270,
  numericArray: 1231,
  uuidArray: 2951,
  jsonbArray: 3807
} as const

const arrayToElement = new Map<number, number>([
  [OID.boolArray, OID.bool],
  [OID.byteaArray, OID.bytea],
  [OID.nameArray, OID.name],
  [OID.int8Array, OID.int8],
  [OID.int2Array, OID.int2],
  [OID.int4Array, OID.int4],
  [OID.textArray, OID.text],
  [OID.oidArray, OID.oid],
  [OID.jsonArray, OID.json],
  [OID.cidrArray, OID.cidr],
  [OID.float4Array, OID.float4],
  [OID.float8Array, OID.float8],
  [OID.inetArray, OID.inet],
  [OID.bpcharArray, OID.bpchar],
  [OID.varcharArray, OID.varchar],
  [OID.dateArray, OID.date],
  [OID.timeArray, OID.time],
  [OID.timestampArray, OID.timestamp],
  [OID.timestamptzArray, OID.timestamptz],
  [OID.timetzArray, OID.timetz],
  [OID.numericArray, OID.numeric],
  [OID.uuidArray, OID.uuid],
  [OID.jsonbArray, OID.jsonb]
])

const elementToArray = new Map<number, number>(
  Array.from(arrayToElement, ([array, element]) => [element, array])
)

/**
 * Returns the array OID whose elements have the given OID, or `undefined`
 * when there is no array type registered for it.
 *
 * @category getters
 * @since 4.0.0
 */
export const arrayOidFor = (elementOid: number): number | undefined => elementToArray.get(elementOid)

// -----------------------------------------------------------------------------
// calendar helpers
// -----------------------------------------------------------------------------

const pad = (value: number, size: number): string => String(value).padStart(size, "0")

/** Civil date from days since 1970-01-01, after Howard Hinnant's algorithm. */
const civilFromDays = (days: number): { year: number; month: number; day: number } => {
  const z = days + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: month <= 2 ? y + 1 : y, month, day }
}

/** Days since 1970-01-01 from a civil date. */
const daysFromCivil = (year: number, month: number, day: number): number => {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const mp = month > 2 ? month - 3 : month + 9
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

const dateRegex = /^(-?\d{4,})-(\d{2})-(\d{2})$/

const parseDate = (text: string): number => {
  const match = dateRegex.exec(text)
  if (match === null) {
    return fail(`Expected a YYYY-MM-DD date, received "${text}"`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return fail(`Invalid date "${text}"`)
  }
  const days = daysFromCivil(year, month, day)
  const civil = civilFromDays(days)
  if (civil.year !== year || civil.month !== month || civil.day !== day) {
    return fail(`Invalid date "${text}"`)
  }
  return days
}

const formatDate = (days: number): string => {
  const { day, month, year } = civilFromDays(days)
  const yearText = year < 0 ? `-${pad(-year, 4)}` : pad(year, 4)
  return `${yearText}-${pad(month, 2)}-${pad(day, 2)}`
}

const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/

const parseTimeOfDay = (text: string): bigint => {
  const match = timeRegex.exec(text)
  if (match === null) {
    return fail(`Expected a HH:MM[:SS[.ffffff]] time, received "${text}"`)
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] === undefined ? 0 : Number(match[3])
  const fraction = match[4] === undefined ? 0 : Number(match[4].padEnd(6, "0"))
  if (hours > 24 || minutes > 59 || seconds > 60) {
    return fail(`Invalid time "${text}"`)
  }
  return BigInt(hours * 3600 + minutes * 60 + seconds) * MICROS_PER_SECOND + BigInt(fraction)
}

const formatTimeOfDay = (micros: bigint): string => {
  const seconds = micros / MICROS_PER_SECOND
  const fraction = micros % MICROS_PER_SECOND
  const base = `${pad(Number(seconds / BigInt(3600)), 2)}:${pad(Number(seconds / BigInt(60) % BigInt(60)), 2)}:${
    pad(Number(seconds % BigInt(60)), 2)
  }`
  if (fraction === ZERO) return base
  return `${base}.${pad(Number(fraction), 6).replace(/0+$/, "")}`
}

const zoneRegex = /^(?:Z|([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?)$/

/** Parses a trailing time zone into seconds east of UTC. */
const parseZone = (text: string): number => {
  const match = zoneRegex.exec(text)
  if (match === null) {
    return fail(`Expected a time zone offset, received "${text}"`)
  }
  if (match[1] === undefined) return 0
  const seconds = Number(match[2]) * 3600 +
    (match[3] === undefined ? 0 : Number(match[3]) * 60) +
    (match[4] === undefined ? 0 : Number(match[4]))
  return match[1] === "-" ? -seconds : seconds
}

const formatZone = (secondsEast: number): string => {
  const sign = secondsEast < 0 ? "-" : "+"
  const total = Math.abs(secondsEast)
  return `${sign}${pad(Math.floor(total / 3600), 2)}:${pad(Math.floor(total / 60) % 60, 2)}`
}

// -----------------------------------------------------------------------------
// numeric
// -----------------------------------------------------------------------------

const NUMERIC_POS = 0x0000
const NUMERIC_NEG = 0x4000
const NUMERIC_NAN = 0xc000
const NUMERIC_PINF = 0xd000
const NUMERIC_NINF = 0xf000

const numericRegex = /^([+-])?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

const encodeNumeric = (value: unknown): Uint8Array => {
  const text = requireString(value, "numeric")
  if (text === "NaN") return numericSpecial(NUMERIC_NAN)
  if (text === "Infinity") return numericSpecial(NUMERIC_PINF)
  if (text === "-Infinity") return numericSpecial(NUMERIC_NINF)

  const match = numericRegex.exec(text)
  if (match === null || (match[2] ?? "") + (match[3] ?? "") === "") {
    return fail(`Expected a decimal numeric string, received "${text}"`)
  }
  const exponent = match[4] === undefined ? 0 : Number(match[4])
  let digits = (match[2] ?? "") + (match[3] ?? "")
  let scale = (match[3] ?? "").length - exponent
  if (scale < 0) {
    digits += "0".repeat(-scale)
    scale = 0
  }
  if (scale > 0x3fff) {
    return fail(`numeric scale ${scale} exceeds the PostgreSQL maximum`)
  }

  const rightPad = (4 - (scale % 4)) % 4
  digits += "0".repeat(rightPad)
  const fractionLength = scale + rightPad
  const leftPad = (4 - ((digits.length - fractionLength) % 4)) % 4
  digits = "0".repeat(leftPad) + digits

  const groups: Array<number> = []
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(Number(digits.slice(i, i + 4)))
  }
  let weight = (digits.length - fractionLength) / 4 - 1
  while (groups.length > 0 && groups[0] === 0) {
    groups.shift()
    weight -= 1
  }
  while (groups.length > 0 && groups[groups.length - 1] === 0) {
    groups.pop()
  }
  if (groups.length === 0) weight = 0

  const sign = groups.length > 0 && match[1] === "-" ? NUMERIC_NEG : NUMERIC_POS
  const bytes = new Uint8Array(8 + groups.length * 2)
  writeInt16(bytes, 0, groups.length)
  writeInt16(bytes, 2, weight)
  writeInt16(bytes, 4, sign)
  writeInt16(bytes, 6, scale)
  for (let i = 0; i < groups.length; i++) {
    writeInt16(bytes, 8 + i * 2, groups[i])
  }
  return bytes
}

const numericSpecial = (sign: number): Uint8Array => {
  const bytes = new Uint8Array(8)
  writeInt16(bytes, 4, sign)
  return bytes
}

const decodeNumeric = (bytes: Uint8Array): string => {
  if (bytes.length < 8) return fail("Truncated numeric value")
  const count = readInt16(bytes, 0)
  const weight = readInt16(bytes, 2)
  const sign = readUint16(bytes, 4)
  const scale = readInt16(bytes, 6)
  if (sign === NUMERIC_NAN) return "NaN"
  if (sign === NUMERIC_PINF) return "Infinity"
  if (sign === NUMERIC_NINF) return "-Infinity"
  if (sign !== NUMERIC_POS && sign !== NUMERIC_NEG) {
    return fail(`Invalid numeric sign: ${sign}`)
  }
  requireSize(bytes, 8 + count * 2, "numeric")

  const digitAt = (index: number): number => index >= 0 && index < count ? readInt16(bytes, 8 + index * 2) : 0

  let result = sign === NUMERIC_NEG ? "-" : ""
  if (weight < 0) {
    result += "0"
  } else {
    for (let i = 0; i <= weight; i++) {
      result += i === 0 ? String(digitAt(i)) : pad(digitAt(i), 4)
    }
  }
  if (scale > 0) {
    let fraction = ""
    for (let i = weight + 1; fraction.length < scale; i++) {
      fraction += pad(digitAt(i), 4)
    }
    result += `.${fraction.slice(0, scale)}`
  }
  return result
}

// -----------------------------------------------------------------------------
// network addresses
// -----------------------------------------------------------------------------

const PGSQL_AF_INET = 2
const PGSQL_AF_INET6 = 3

const parseIPv4 = (text: string): Uint8Array | undefined => {
  const parts = text.split(".")
  if (parts.length !== 4) return undefined
  const bytes = new Uint8Array(4)
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(parts[i])) return undefined
    const value = Number(parts[i])
    if (value > 255) return undefined
    bytes[i] = value
  }
  return bytes
}

const parseIPv6 = (text: string): Uint8Array | undefined => {
  const halves = text.split("::")
  if (halves.length > 2) return undefined
  const toGroups = (part: string): Array<string> => part === "" ? [] : part.split(":")
  const head = toGroups(halves[0])
  const tail = halves.length === 2 ? toGroups(halves[1]) : []
  const bytes = new Uint8Array(16)

  const trailing = tail.length > 0 ? tail[tail.length - 1] : head.length > 0 ? head[head.length - 1] : ""
  const embedded = trailing.includes(".") ? parseIPv4(trailing) : undefined
  if (trailing.includes(".") && embedded === undefined) return undefined
  if (embedded !== undefined) {
    if (tail.length > 0) tail.pop()
    else head.pop()
  }
  const groupCount = embedded === undefined ? 8 : 6
  if (head.length + tail.length > groupCount) return undefined
  if (halves.length === 1 && head.length !== groupCount) return undefined

  const writeGroup = (group: string, offset: number): boolean => {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return false
    const value = Number.parseInt(group, 16)
    bytes[offset] = value >> 8
    bytes[offset + 1] = value & 0xff
    return true
  }
  for (let i = 0; i < head.length; i++) {
    if (!writeGroup(head[i], i * 2)) return undefined
  }
  for (let i = 0; i < tail.length; i++) {
    if (!writeGroup(tail[i], (groupCount - tail.length + i) * 2)) return undefined
  }
  if (embedded !== undefined) bytes.set(embedded, 12)
  return bytes
}

const formatIPv4 = (bytes: Uint8Array): string => `${bytes[0]}.${bytes[1]}.${bytes[2]}.${bytes[3]}`

const formatIPv6 = (bytes: Uint8Array): string => {
  const isV4Mapped = bytes.subarray(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff
  if (isV4Mapped) return `::ffff:${formatIPv4(bytes.subarray(12))}`

  const groups: Array<number> = []
  for (let i = 0; i < 8; i++) groups.push(readUint16(bytes, i * 2))

  let bestStart = -1
  let bestLength = 0
  let start = -1
  for (let i = 0; i <= 8; i++) {
    if (i < 8 && groups[i] === 0) {
      if (start === -1) start = i
    } else if (start !== -1) {
      if (i - start > bestLength) {
        bestStart = start
        bestLength = i - start
      }
      start = -1
    }
  }
  if (bestLength < 2) {
    return groups.map((group) => group.toString(16)).join(":")
  }
  const head = groups.slice(0, bestStart).map((group) => group.toString(16)).join(":")
  const tail = groups.slice(bestStart + bestLength).map((group) => group.toString(16)).join(":")
  return `${head}::${tail}`
}

const encodeInet = (value: unknown, isCidr: boolean): Uint8Array => {
  const text = requireString(value, isCidr ? "cidr" : "inet")
  const slash = text.lastIndexOf("/")
  const address = slash === -1 ? text : text.slice(0, slash)
  const v4 = parseIPv4(address)
  const bytes = v4 ?? parseIPv6(address)
  if (bytes === undefined) {
    return fail(`Expected an IP address, received "${text}"`)
  }
  const fullBits = bytes.length * 8
  const bits = slash === -1 ? fullBits : Number(text.slice(slash + 1))
  if (!Number.isInteger(bits) || bits < 0 || bits > fullBits) {
    return fail(`Invalid netmask length in "${text}"`)
  }
  if (isCidr) {
    const wholeBytes = Math.floor(bits / 8)
    const partialBits = bits % 8
    if (partialBits !== 0 && (bytes[wholeBytes] & ((1 << (8 - partialBits)) - 1)) !== 0) {
      return fail(`CIDR address has host bits set in "${text}"`)
    }
    for (let index = wholeBytes + (partialBits === 0 ? 0 : 1); index < bytes.length; index++) {
      if (bytes[index] !== 0) return fail(`CIDR address has host bits set in "${text}"`)
    }
  }
  const result = new Uint8Array(4 + bytes.length)
  result[0] = v4 === undefined ? PGSQL_AF_INET6 : PGSQL_AF_INET
  result[1] = bits
  result[2] = isCidr ? 1 : 0
  result[3] = bytes.length
  result.set(bytes, 4)
  return result
}

const decodeInet = (bytes: Uint8Array): string => {
  if (bytes.length < 4) return fail("Truncated inet value")
  const family = bytes[0]
  const bits = bytes[1]
  const isCidr = bytes[2] === 1
  const size = bytes[3]
  const expected = family === PGSQL_AF_INET ? 4 : family === PGSQL_AF_INET6 ? 16 : -1
  if (expected === -1 || size !== expected) {
    return fail(`Invalid inet address family ${family} with ${size} byte(s)`)
  }
  requireSize(bytes, 4 + size, "inet")
  const address = bytes.subarray(4)
  const text = family === PGSQL_AF_INET ? formatIPv4(address) : formatIPv6(address)
  return isCidr || bits !== size * 8 ? `${text}/${bits}` : text
}

// -----------------------------------------------------------------------------
// uuid
// -----------------------------------------------------------------------------

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const hexDigits = "0123456789abcdef"

/** Byte value of each hex character code, `-1` for everything else. */
const hexValues = new Int8Array(128).fill(-1)
for (let i = 0; i < 16; i++) {
  hexValues[hexDigits.charCodeAt(i)] = i
  hexValues["0123456789ABCDEF".charCodeAt(i)] = i
}

/** Two-character hex text for each byte value. */
const hexPairs = Array.from({ length: 256 }, (_, i) => hexDigits[i >> 4] + hexDigits[i & 0xf])

/** Offsets of the 16 uuid bytes within the 36-character hyphenated text. */
const uuidOffsets = [0, 2, 4, 6, 9, 11, 14, 16, 19, 21, 24, 26, 28, 30, 32, 34]

const encodeUuid = (value: unknown): Uint8Array => {
  const text = requireString(value, "uuid")
  if (text.length !== 36 || !uuidRegex.test(text)) {
    return fail(`Expected a UUID, received "${text}"`)
  }
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    const offset = uuidOffsets[i]
    bytes[i] = (hexValues[text.charCodeAt(offset)] << 4) | hexValues[text.charCodeAt(offset + 1)]
  }
  return bytes
}

const decodeUuid = (bytes: Uint8Array): string => {
  requireSize(bytes, 16, "uuid")
  return hexPairs[bytes[0]] + hexPairs[bytes[1]] + hexPairs[bytes[2]] + hexPairs[bytes[3]] + "-" +
    hexPairs[bytes[4]] + hexPairs[bytes[5]] + "-" + hexPairs[bytes[6]] + hexPairs[bytes[7]] + "-" +
    hexPairs[bytes[8]] + hexPairs[bytes[9]] + "-" + hexPairs[bytes[10]] + hexPairs[bytes[11]] +
    hexPairs[bytes[12]] + hexPairs[bytes[13]] + hexPairs[bytes[14]] + hexPairs[bytes[15]]
}

// -----------------------------------------------------------------------------
// codecs
// -----------------------------------------------------------------------------

/**
 * A binary codec for a single OID.
 *
 * @category models
 * @since 4.0.0
 */
export interface Codec<A> {
  readonly encode: (value: A) => Uint8Array
  readonly decode: (bytes: Uint8Array) => A
  /**
   * Writes the value straight into a `Bind` frame, with no array of its own.
   * Optional: a codec without one falls back to `encode` and a copy.
   */
  readonly write?: (sink: ValueSink, value: A) => void
}

const utf8Codec: Codec<any> = {
  encode: (value) => encodeUtf8(requireString(value, "text")),
  write: (sink, value) => sink.utf8(requireString(value, "text")),
  decode: (bytes) => {
    try {
      return textDecoder.decode(bytes)
    } catch {
      return fail("Invalid UTF-8 in text value")
    }
  }
}

const int8Value = (value: unknown): bigint => {
  const big = requireBigInt(value, "int8")
  if (big < INT64_MIN || big > INT64_MAX) fail(`int8 out of range: ${big}`)
  return big
}

const MAX_TIME_MICROS = BigInt(86_400_000_000)

const timeValue = (value: unknown): bigint => {
  const micros = requireBigInt(value, "time")
  if (micros < ZERO || micros > MAX_TIME_MICROS) fail(`time out of range: ${micros}`)
  return micros
}

/** A 4- or 8-byte codec staged through the shared scratch views. */
const staged = (
  size: 4 | 8,
  name: string,
  write: (view: DataView, value: any) => void,
  read: (view: DataView) => any,
  writeInto: (sink: ValueSink, value: any) => void
): Codec<any> => {
  const view = size === 4 ? scratchView4 : scratchView8
  const scratch = size === 4 ? scratchBytes4 : scratchBytes8
  return {
    encode: size === 4
      ? (value) => {
        write(view, value)
        const bytes = new Uint8Array(4)
        // Unrolled: `set` on a four-byte array costs more than the stores.
        bytes[0] = scratch[0]
        bytes[1] = scratch[1]
        bytes[2] = scratch[2]
        bytes[3] = scratch[3]
        return bytes
      }
      : (value) => {
        write(view, value)
        const bytes = new Uint8Array(8)
        bytes[0] = scratch[0]
        bytes[1] = scratch[1]
        bytes[2] = scratch[2]
        bytes[3] = scratch[3]
        bytes[4] = scratch[4]
        bytes[5] = scratch[5]
        bytes[6] = scratch[6]
        bytes[7] = scratch[7]
        return bytes
      },
    write: writeInto,
    decode: (bytes) => {
      requireSize(bytes, size, name)
      scratch.set(bytes)
      return read(view)
    }
  }
}

const timestampCodec: Codec<any> = {
  encode: (value) => {
    const ms = requireNumber(value, "timestamp")
    if (Number.isNaN(ms)) {
      fail("timestamp cannot be NaN")
    } else if (ms === Number.POSITIVE_INFINITY) {
      scratchView8.setBigInt64(0, INT64_MAX)
    } else if (ms === Number.NEGATIVE_INFINITY) {
      scratchView8.setBigInt64(0, INT64_MIN)
    } else {
      const unixMicros = Math.trunc(ms * 1000)
      if (!Number.isFinite(unixMicros)) {
        fail(`timestamp out of range: ${ms}`)
      }
      const micros = BigInt(unixMicros) - BigInt(PG_EPOCH_MS) * THOUSAND
      if (micros < INT64_MIN || micros > INT64_MAX) {
        fail(`timestamp out of range: ${ms}`)
      }
      scratchView8.setBigInt64(0, micros)
    }
    const bytes = new Uint8Array(8)
    bytes.set(scratchBytes8)
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 8, "timestamp")
    scratchBytes8.set(bytes)
    const micros = scratchView8.getBigInt64(0)
    if (micros === INT64_MAX) return Number.POSITIVE_INFINITY
    if (micros === INT64_MIN) return Number.NEGATIVE_INFINITY
    return Number(micros / THOUSAND) + PG_EPOCH_MS
  }
}

const dateCodec: Codec<any> = {
  encode: (value) => {
    const text = requireString(value, "date")
    const bytes = new Uint8Array(4)
    if (text === "infinity") {
      writeInt32(bytes, 0, INT32_MAX)
    } else if (text === "-infinity") {
      writeInt32(bytes, 0, INT32_MIN)
    } else {
      const days = parseDate(text) - PG_EPOCH_DAYS
      if (days <= INT32_MIN || days >= INT32_MAX) {
        fail(`date out of range: "${text}"`)
      }
      writeInt32(bytes, 0, days)
    }
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 4, "date")
    const days = readInt32(bytes, 0)
    if (days === INT32_MAX) return "infinity"
    if (days === INT32_MIN) return "-infinity"
    return formatDate(days + PG_EPOCH_DAYS)
  }
}

const timetzCodec: Codec<any> = {
  encode: (value) => {
    const text = requireString(value, "timetz")
    const split = Math.max(text.lastIndexOf("+"), text.lastIndexOf("-"), text.lastIndexOf("Z"))
    if (split <= 0) {
      return fail(`Expected a timetz with a zone offset, received "${text}"`)
    }
    scratchView8.setBigInt64(0, parseTimeOfDay(text.slice(0, split)))
    const bytes = new Uint8Array(12)
    bytes.set(scratchBytes8)
    writeInt32(bytes, 8, -parseZone(text.slice(split)))
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 12, "timetz")
    scratchBytes8.set(bytes.subarray(0, 8))
    return formatTimeOfDay(scratchView8.getBigInt64(0)) + formatZone(-readInt32(bytes, 8))
  }
}

const jsonCodec: Codec<any> = {
  encode: (value) => {
    const text = JSON.stringify(value)
    if (text === undefined) return fail("Value cannot be serialised as JSON")
    return encodeUtf8(text)
  },
  write: (sink, value) => {
    const text = JSON.stringify(value)
    if (text === undefined) return fail("Value cannot be serialised as JSON")
    sink.utf8(text)
  },
  decode: (bytes) => JSON.parse(utf8Codec.decode(bytes))
}

const jsonbCodec: Codec<any> = {
  encode: (value) => {
    const text = JSON.stringify(value)
    if (text === undefined) return fail("Value cannot be serialised as JSON")
    const bytes = encodeUtf8Prefixed(text, 1)
    bytes[0] = 1
    return bytes
  },
  write: (sink, value) => {
    const text = JSON.stringify(value)
    if (text === undefined) return fail("Value cannot be serialised as JSON")
    sink.uint8(1)
    sink.utf8(text)
  },
  decode: (bytes) => {
    if (bytes.length === 0 || bytes[0] !== 1) {
      return fail("Unsupported jsonb version byte")
    }
    return JSON.parse(utf8Codec.decode(bytes.subarray(1)))
  }
}

const builtins = new Map<number, Codec<any>>([
  [OID.bool, {
    encode: (value) => {
      if (typeof value !== "boolean") fail("Expected a boolean for bool")
      const bytes = new Uint8Array(1)
      bytes[0] = value ? 1 : 0
      return bytes
    },
    write: (sink, value) => {
      if (typeof value !== "boolean") fail("Expected a boolean for bool")
      sink.uint8(value ? 1 : 0)
    },
    decode: (bytes) => {
      requireSize(bytes, 1, "bool")
      return bytes[0] !== 0
    }
  }],
  [OID.bytea, {
    encode: (value) => value instanceof Uint8Array ? value.slice() : fail("Expected a Uint8Array for bytea"),
    write: (sink, value) => value instanceof Uint8Array ? sink.raw(value) : fail("Expected a Uint8Array for bytea"),
    decode: (bytes) => bytes
  }],
  [OID.int2, {
    encode: (value) => {
      const num = requireInteger(value, "int2", -32768, 32767)
      const bytes = new Uint8Array(2)
      bytes[0] = num >>> 8
      bytes[1] = num
      return bytes
    },
    write: (sink, value) => sink.int16(requireInteger(value, "int2", -32768, 32767)),
    decode: (bytes) => {
      requireSize(bytes, 2, "int2")
      return ((bytes[0] << 8) | bytes[1]) << 16 >> 16
    }
  }],
  [OID.int4, {
    encode: (value) => {
      const num = requireInteger(value, "int4", INT32_MIN, INT32_MAX)
      const bytes = new Uint8Array(4)
      bytes[0] = num >>> 24
      bytes[1] = num >>> 16
      bytes[2] = num >>> 8
      bytes[3] = num
      return bytes
    },
    write: (sink, value) => sink.int32(requireInteger(value, "int4", INT32_MIN, INT32_MAX)),
    decode: (bytes) => {
      requireSize(bytes, 4, "int4")
      return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    }
  }],
  [OID.oid, {
    encode: (value) => {
      const num = requireInteger(value, "oid", 0, 4294967295)
      const bytes = new Uint8Array(4)
      bytes[0] = num >>> 24
      bytes[1] = num >>> 16
      bytes[2] = num >>> 8
      bytes[3] = num
      return bytes
    },
    write: (sink, value) => sink.int32(requireInteger(value, "oid", 0, 4294967295)),
    decode: (bytes) => {
      requireSize(bytes, 4, "oid")
      return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
    }
  }],
  [
    OID.int8,
    staged(
      8,
      "int8",
      (view, value) => view.setBigInt64(0, int8Value(value)),
      (view) => view.getBigInt64(0),
      (sink, value) => sink.bigInt64(int8Value(value))
    )
  ],
  [
    OID.float4,
    staged(
      4,
      "float4",
      (view, value) => view.setFloat32(0, requireNumber(value, "float4")),
      (view) => view.getFloat32(0),
      (sink, value) => sink.float32(requireNumber(value, "float4"))
    )
  ],
  [
    OID.float8,
    staged(
      8,
      "float8",
      (view, value) => view.setFloat64(0, requireNumber(value, "float8")),
      (view) => view.getFloat64(0),
      (sink, value) => sink.float64(requireNumber(value, "float8"))
    )
  ],
  [
    OID.time,
    staged(
      8,
      "time",
      (view, value) => view.setBigInt64(0, timeValue(value)),
      (view) => view.getBigInt64(0),
      (sink, value) => sink.bigInt64(timeValue(value))
    )
  ],
  [OID.numeric, { encode: encodeNumeric, decode: decodeNumeric }],
  [OID.text, utf8Codec],
  [OID.varchar, utf8Codec],
  [OID.bpchar, utf8Codec],
  [OID.name, utf8Codec],
  [OID.json, jsonCodec],
  [OID.jsonb, jsonbCodec],
  [OID.uuid, { encode: encodeUuid, decode: decodeUuid }],
  [OID.inet, { encode: (value) => encodeInet(value, false), decode: decodeInet }],
  [OID.cidr, { encode: (value) => encodeInet(value, true), decode: decodeInet }],
  [OID.date, dateCodec],
  [OID.timetz, timetzCodec],
  [OID.timestamp, timestampCodec],
  [OID.timestamptz, timestampCodec]
])

for (const [arrayOid, elementOid] of arrayToElement) {
  builtins.set(arrayOid, {
    encode: (value) => encodeArray(value, elementOid),
    write: (sink, value) => writeArray(sink, value, elementOid),
    decode: (bytes) => decodeArray(bytes, elementOid)
  })
}

/**
 * Built-ins with registered codecs layered over them, so `encode` and `decode`
 * resolve an OID with a single lookup.
 */
const codecs = new Map<number, Codec<any>>(builtins)

/**
 * Every built-in OID is below this, and PostgreSQL hands user-defined types
 * OIDs from 16384 up, so a direct table covers the common case and the map
 * covers registered ones.
 */
const tableSize = 4096

const table = new Array<Codec<any> | undefined>(tableSize)
for (const [oid, codec] of codecs) table[oid] = codec

const lookup = (oid: number): Codec<any> | undefined => oid >= 0 && oid < tableSize ? table[oid] : codecs.get(oid)

/**
 * Registers a binary codec for an OID the built-in catalogue does not cover,
 * or overrides a built-in one. Registered codecs take precedence.
 *
 * @category registry
 * @since 4.0.0
 */
export const register = <A>(oid: number, codec: Codec<A>): void => {
  codecs.set(oid, codec)
  if (oid >= 0 && oid < tableSize) table[oid] = codec
}

/**
 * Removes a previously registered codec.
 *
 * @category registry
 * @since 4.0.0
 */
export const unregister = (oid: number): void => {
  const builtin = builtins.get(oid)
  if (builtin === undefined) codecs.delete(oid)
  else codecs.set(oid, builtin)
  if (oid >= 0 && oid < tableSize) table[oid] = builtin
}

// -----------------------------------------------------------------------------
// arrays
// -----------------------------------------------------------------------------

const encodeArray = (value: unknown, elementOid: number): Uint8Array => {
  if (!Array.isArray(value)) {
    return fail("Expected an array")
  }
  const count = value.length
  const elements: Array<Uint8Array | null> = new Array(count)
  let hasNull = false
  let payloadSize = 0
  for (let i = 0; i < count; i++) {
    const element = value[i]
    if (element === null) {
      elements[i] = null
      hasNull = true
      payloadSize += 4
    } else {
      const encoded = encode(element, elementOid)
      elements[i] = encoded
      payloadSize += 4 + encoded.length
    }
  }
  const dimensions = count === 0 ? 0 : 1
  const bytes = new Uint8Array(12 + dimensions * 8 + payloadSize)
  writeInt32(bytes, 0, dimensions)
  writeInt32(bytes, 4, hasNull ? 1 : 0)
  writeInt32(bytes, 8, elementOid)
  let offset = 12
  if (dimensions === 1) {
    writeInt32(bytes, offset, count)
    writeInt32(bytes, offset + 4, 1)
    offset += 8
  }
  for (let i = 0; i < count; i++) {
    const element = elements[i]
    if (element === null) {
      writeInt32(bytes, offset, -1)
      offset += 4
    } else {
      writeInt32(bytes, offset, element.length)
      bytes.set(element, offset + 4)
      offset += 4 + element.length
    }
  }
  return bytes
}

/**
 * As `encodeArray`, but into a sink: each element is framed with `beginLength`
 * and written in place, so neither the elements nor the array itself needs an
 * array of bytes of its own.
 */
const writeArray = (sink: ValueSink, value: unknown, elementOid: number): void => {
  if (!Array.isArray(value)) {
    return fail("Expected an array")
  }
  const count = value.length
  // The null flag sits ahead of the elements, so it is the one thing that has
  // to be known before any of them are written.
  let hasNull = false
  for (let i = 0; i < count; i++) {
    if (value[i] === null) {
      hasNull = true
      break
    }
  }
  const dimensions = count === 0 ? 0 : 1
  sink.int32(dimensions)
  sink.int32(hasNull ? 1 : 0)
  sink.int32(elementOid)
  if (dimensions === 1) {
    sink.int32(count)
    sink.int32(1)
  }
  // One lookup for the whole array. A codec with no writer of its own is left
  // to `writeValue`, which allocates for the element anyway.
  const write = lookup(elementOid)?.write
  for (let i = 0; i < count; i++) {
    const element = value[i]
    if (element === null) {
      sink.int32(-1)
    } else {
      const token = sink.beginLength()
      if (write === undefined) writeValue(sink, element, elementOid)
      else write(sink, element)
      sink.endLength(token)
    }
  }
}

const decodeArray = (bytes: Uint8Array, elementOid: number): ReadonlyArray<unknown> => {
  if (bytes.length < 12) return fail("Truncated array value")
  const dimensions = readInt32(bytes, 0)
  if (dimensions === 0) return []
  if (dimensions !== 1) {
    return fail(`Only 1-dimensional arrays are supported, received ${dimensions} dimensions`)
  }
  if (bytes.length < 20) return fail("Truncated array value")
  const length = readInt32(bytes, 12)
  const lowerBound = readInt32(bytes, 16)
  if (lowerBound !== 1) return fail(`Only arrays with a lower bound of 1 are supported, received ${lowerBound}`)
  const values: Array<unknown> = new Array(length)
  let offset = 20
  for (let i = 0; i < length; i++) {
    if (offset + 4 > bytes.length) return fail("Truncated array element")
    const size = readInt32(bytes, offset)
    offset += 4
    if (size < -1) return fail(`Invalid array element length: ${size}`)
    if (size === -1) {
      values[i] = null
    } else {
      if (offset + size > bytes.length) return fail("Truncated array element")
      values[i] = decode(bytes.subarray(offset, offset + size), elementOid, 1)
      offset += size
    }
  }
  return values
}

// -----------------------------------------------------------------------------
// entry points
// -----------------------------------------------------------------------------

/**
 * Encodes a JavaScript value as the binary representation of the given OID.
 *
 * Fails when the value has the wrong JavaScript type, or when the OID is
 * neither built in nor registered.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode = (value: unknown, oid: number): Uint8Array => {
  const codec = lookup(oid)
  if (codec === undefined) return fail(`No codec registered for OID ${oid}`)
  return codec.encode(value)
}

/**
 * Decodes the binary representation of the given OID.
 *
 * `format` must be `1`; the text format is not implemented. An OID that is
 * neither built in nor registered decodes to the raw bytes.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = (bytes: Uint8Array, oid: number, format: number): unknown => {
  if (format !== 1) {
    return fail(`Only the binary format is supported, received format ${format}`)
  }
  const codec = lookup(oid)
  return codec === undefined ? bytes : codec.decode(bytes)
}

// -----------------------------------------------------------------------------
// parameter constructors
// -----------------------------------------------------------------------------

/**
 * A value paired with the OID it should be encoded as.
 *
 * @category models
 * @since 4.0.0
 */
export interface Parameter {
  readonly oid: number
  readonly value: unknown
}

/**
 * Encodes a parameter for a `Bind` message. SQL NULL stays `null`.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeParameter = (parameter: Parameter): Uint8Array | null =>
  parameter.value === null ? null : encode(parameter.value, parameter.oid)

/**
 * Writes a parameter into a `Bind` frame, for `PgProtocol.makeBindEncoder`.
 * Codecs that can write their bytes in place do; the rest fall back to
 * `encode` and a copy.
 *
 * @category encoding
 * @since 4.0.0
 */
const writeValue = (sink: ValueSink, value: unknown, oid: number): void => {
  const codec = lookup(oid)
  if (codec === undefined) return fail(`No codec registered for OID ${oid}`)
  if (codec.write === undefined) sink.raw(codec.encode(value))
  else codec.write(sink, value)
}

export const writeParameter = (sink: ValueSink, parameter: Parameter): void =>
  parameter.value === null ? sink.sqlNull() : writeValue(sink, parameter.value, parameter.oid)

const parameter = (oid: number) => (value: unknown): Parameter => ({ oid, value })

/**
 * A `bool` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bool: (value: boolean | null) => Parameter = parameter(OID.bool)

/**
 * An `int2` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const int2: (value: number | null) => Parameter = parameter(OID.int2)

/**
 * An `int4` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const int4: (value: number | null) => Parameter = parameter(OID.int4)

/**
 * An `int8` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const int8: (value: bigint | null) => Parameter = parameter(OID.int8)

/**
 * An `oid` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const oid: (value: number | null) => Parameter = parameter(OID.oid)

/**
 * A `float4` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const float4: (value: number | null) => Parameter = parameter(OID.float4)

/**
 * A `float8` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const float8: (value: number | null) => Parameter = parameter(OID.float8)

/**
 * A `numeric` parameter, given as a decimal string or `"NaN"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const numeric: (value: string | null) => Parameter = parameter(OID.numeric)

/**
 * A `text` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const text: (value: string | null) => Parameter = parameter(OID.text)

/**
 * A `varchar` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const varchar: (value: string | null) => Parameter = parameter(OID.varchar)

/**
 * A `bpchar` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bpchar: (value: string | null) => Parameter = parameter(OID.bpchar)

/**
 * A `name` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const name: (value: string | null) => Parameter = parameter(OID.name)

/**
 * A `bytea` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const bytea: (value: Uint8Array | null) => Parameter = parameter(OID.bytea)

/**
 * A `json` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const json: (value: unknown) => Parameter = parameter(OID.json)

/**
 * A `jsonb` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const jsonb: (value: unknown) => Parameter = parameter(OID.jsonb)

/**
 * A `uuid` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const uuid: (value: string | null) => Parameter = parameter(OID.uuid)

/**
 * An `inet` parameter, such as `"10.0.0.1"` or `"10.0.0.0/8"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const inet: (value: string | null) => Parameter = parameter(OID.inet)

/**
 * A `cidr` parameter.
 *
 * @category constructors
 * @since 4.0.0
 */
export const cidr: (value: string | null) => Parameter = parameter(OID.cidr)

/**
 * A `date` parameter, given as `YYYY-MM-DD`, `"infinity"`, or `"-infinity"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const date: (value: string | null) => Parameter = parameter(OID.date)

/**
 * A `time` parameter, given as microseconds since midnight.
 *
 * @category constructors
 * @since 4.0.0
 */
export const time: (value: bigint | null) => Parameter = parameter(OID.time)

/**
 * A `timetz` parameter, such as `"12:34:56+02:00"`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const timetz: (value: string | null) => Parameter = parameter(OID.timetz)

/**
 * A `timestamp` parameter, given as Unix epoch milliseconds and interpreted
 * as UTC.
 *
 * @category constructors
 * @since 4.0.0
 */
export const timestamp: (value: number | null) => Parameter = parameter(OID.timestamp)

/**
 * A `timestamptz` parameter, given as Unix epoch milliseconds.
 *
 * @category constructors
 * @since 4.0.0
 */
export const timestamptz: (value: number | null) => Parameter = parameter(OID.timestamptz)

/**
 * A one-dimensional array parameter whose elements have the given OID.
 *
 * @category constructors
 * @since 4.0.0
 */
export const array = (values: ReadonlyArray<unknown> | null, elementOid: number): Parameter => {
  const arrayOid = elementToArray.get(elementOid)
  if (arrayOid === undefined) {
    return fail(`No array type known for element OID ${elementOid}`)
  }
  return { oid: arrayOid, value: values }
}
