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
 * directions.
 *
 * @since 4.0.0
 */
import * as Data from "effect/Data"

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

const viewOf = (bytes: Uint8Array): DataView => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

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
  return daysFromCivil(year, month, day)
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
  const view = viewOf(bytes)
  view.setInt16(0, groups.length)
  view.setInt16(2, weight)
  view.setUint16(4, sign)
  view.setInt16(6, scale)
  for (let i = 0; i < groups.length; i++) {
    view.setInt16(8 + i * 2, groups[i])
  }
  return bytes
}

const numericSpecial = (sign: number): Uint8Array => {
  const bytes = new Uint8Array(8)
  viewOf(bytes).setUint16(4, sign)
  return bytes
}

const decodeNumeric = (bytes: Uint8Array): string => {
  if (bytes.length < 8) return fail("Truncated numeric value")
  const view = viewOf(bytes)
  const count = view.getInt16(0)
  const weight = view.getInt16(2)
  const sign = view.getUint16(4)
  const scale = view.getInt16(6)
  if (sign === NUMERIC_NAN) return "NaN"
  if (sign === NUMERIC_PINF) return "Infinity"
  if (sign === NUMERIC_NINF) return "-Infinity"
  if (sign !== NUMERIC_POS && sign !== NUMERIC_NEG) {
    return fail(`Invalid numeric sign: ${sign}`)
  }
  requireSize(bytes, 8 + count * 2, "numeric")

  const digitAt = (index: number): number => index >= 0 && index < count ? view.getInt16(8 + index * 2) : 0

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
  const view = viewOf(bytes)
  const isV4Mapped = bytes.subarray(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff
  if (isV4Mapped) return `::ffff:${formatIPv4(bytes.subarray(12))}`

  const groups: Array<number> = []
  for (let i = 0; i < 8; i++) groups.push(view.getUint16(i * 2))

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

const encodeUuid = (value: unknown): Uint8Array => {
  const text = requireString(value, "uuid")
  if (!uuidRegex.test(text)) {
    return fail(`Expected a UUID, received "${text}"`)
  }
  const hex = text.replaceAll("-", "")
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

const decodeUuid = (bytes: Uint8Array): string => {
  requireSize(bytes, 16, "uuid")
  let hex = ""
  for (let i = 0; i < 16; i++) {
    hex += hexDigits[bytes[i] >> 4] + hexDigits[bytes[i] & 0xf]
    if (i === 3 || i === 5 || i === 7 || i === 9) hex += "-"
  }
  return hex
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
}

const utf8Codec: Codec<any> = {
  encode: (value) => textEncoder.encode(requireString(value, "text")),
  decode: (bytes) => {
    try {
      return textDecoder.decode(bytes)
    } catch {
      return fail("Invalid UTF-8 in text value")
    }
  }
}

const fixed = (
  size: number,
  name: string,
  write: (view: DataView, value: any) => void,
  read: (view: DataView) => any
): Codec<any> => ({
  encode: (value) => {
    const bytes = new Uint8Array(size)
    write(viewOf(bytes), value)
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, size, name)
    return read(viewOf(bytes))
  }
})

const timestampCodec: Codec<any> = {
  encode: (value) => {
    const ms = requireNumber(value, "timestamp")
    const bytes = new Uint8Array(8)
    const view = viewOf(bytes)
    if (Number.isNaN(ms)) {
      fail("timestamp cannot be NaN")
    } else if (ms === Number.POSITIVE_INFINITY) {
      view.setBigInt64(0, INT64_MAX)
    } else if (ms === Number.NEGATIVE_INFINITY) {
      view.setBigInt64(0, INT64_MIN)
    } else {
      view.setBigInt64(0, BigInt(Math.trunc((ms - PG_EPOCH_MS) * 1000)))
    }
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 8, "timestamp")
    const micros = viewOf(bytes).getBigInt64(0)
    if (micros === INT64_MAX) return Number.POSITIVE_INFINITY
    if (micros === INT64_MIN) return Number.NEGATIVE_INFINITY
    return Number(micros / THOUSAND) + PG_EPOCH_MS
  }
}

const dateCodec: Codec<any> = {
  encode: (value) => {
    const text = requireString(value, "date")
    const bytes = new Uint8Array(4)
    const view = viewOf(bytes)
    if (text === "infinity") {
      view.setInt32(0, INT32_MAX)
    } else if (text === "-infinity") {
      view.setInt32(0, INT32_MIN)
    } else {
      view.setInt32(0, parseDate(text) - PG_EPOCH_DAYS)
    }
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 4, "date")
    const days = viewOf(bytes).getInt32(0)
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
    const bytes = new Uint8Array(12)
    const view = viewOf(bytes)
    view.setBigInt64(0, parseTimeOfDay(text.slice(0, split)))
    view.setInt32(8, -parseZone(text.slice(split)))
    return bytes
  },
  decode: (bytes) => {
    requireSize(bytes, 12, "timetz")
    const view = viewOf(bytes)
    return formatTimeOfDay(view.getBigInt64(0)) + formatZone(-view.getInt32(8))
  }
}

const jsonCodec: Codec<any> = {
  encode: (value) => {
    const text = JSON.stringify(value)
    if (text === undefined) return fail("Value cannot be serialised as JSON")
    return textEncoder.encode(text)
  },
  decode: (bytes) => JSON.parse(utf8Codec.decode(bytes))
}

const jsonbCodec: Codec<any> = {
  encode: (value) => {
    const body = jsonCodec.encode(value)
    const bytes = new Uint8Array(body.length + 1)
    bytes[0] = 1
    bytes.set(body, 1)
    return bytes
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
    encode: (value) =>
      new Uint8Array([typeof value === "boolean" ? (value ? 1 : 0) : fail("Expected a boolean for bool")]),
    decode: (bytes) => {
      requireSize(bytes, 1, "bool")
      return bytes[0] !== 0
    }
  }],
  [OID.bytea, {
    encode: (value) => value instanceof Uint8Array ? value : fail("Expected a Uint8Array for bytea"),
    decode: (bytes) => bytes
  }],
  [
    OID.int2,
    fixed(
      2,
      "int2",
      (view, value) => view.setInt16(0, requireInteger(value, "int2", -32768, 32767)),
      (view) => view.getInt16(0)
    )
  ],
  [
    OID.int4,
    fixed(
      4,
      "int4",
      (view, value) => view.setInt32(0, requireInteger(value, "int4", INT32_MIN, INT32_MAX)),
      (view) => view.getInt32(0)
    )
  ],
  [
    OID.oid,
    fixed(
      4,
      "oid",
      (view, value) => view.setUint32(0, requireInteger(value, "oid", 0, 4294967295)),
      (view) => view.getUint32(0)
    )
  ],
  [
    OID.int8,
    fixed(8, "int8", (view, value) => {
      const big = requireBigInt(value, "int8")
      if (big < INT64_MIN || big > INT64_MAX) fail(`int8 out of range: ${big}`)
      view.setBigInt64(0, big)
    }, (view) => view.getBigInt64(0))
  ],
  [
    OID.float4,
    fixed(
      4,
      "float4",
      (view, value) => view.setFloat32(0, requireNumber(value, "float4")),
      (view) => view.getFloat32(0)
    )
  ],
  [
    OID.float8,
    fixed(
      8,
      "float8",
      (view, value) => view.setFloat64(0, requireNumber(value, "float8")),
      (view) => view.getFloat64(0)
    )
  ],
  [
    OID.time,
    fixed(8, "time", (view, value) => {
      const micros = requireBigInt(value, "time")
      if (micros < ZERO || micros > BigInt(86_400_000_000)) fail(`time out of range: ${micros}`)
      view.setBigInt64(0, micros)
    }, (view) => view.getBigInt64(0))
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

const registry = new Map<number, Codec<any>>()

/**
 * Registers a binary codec for an OID the built-in catalogue does not cover,
 * or overrides a built-in one. Registered codecs take precedence.
 *
 * @category registry
 * @since 4.0.0
 */
export const register = <A>(oid: number, codec: Codec<A>): void => {
  registry.set(oid, codec)
}

/**
 * Removes a previously registered codec.
 *
 * @category registry
 * @since 4.0.0
 */
export const unregister = (oid: number): void => {
  registry.delete(oid)
}

const codecFor = (oid: number): Codec<any> | undefined => registry.get(oid) ?? builtins.get(oid)

// -----------------------------------------------------------------------------
// arrays
// -----------------------------------------------------------------------------

const encodeArray = (value: unknown, elementOid: number): Uint8Array => {
  if (!Array.isArray(value)) {
    return fail("Expected an array")
  }
  const elements: Array<Uint8Array | null> = value.map((element) =>
    element === null ? null : encode(element, elementOid)
  )
  const hasNull = elements.includes(null)
  const dimensions = elements.length === 0 ? 0 : 1
  const size = 12 + dimensions * 8 + elements.reduce((total, element) => total + 4 + (element?.length ?? 0), 0)
  const bytes = new Uint8Array(size)
  const view = viewOf(bytes)
  view.setInt32(0, dimensions)
  view.setInt32(4, hasNull ? 1 : 0)
  view.setUint32(8, elementOid)
  let offset = 12
  if (dimensions === 1) {
    view.setInt32(offset, elements.length)
    view.setInt32(offset + 4, 1)
    offset += 8
  }
  for (const element of elements) {
    if (element === null) {
      view.setInt32(offset, -1)
      offset += 4
    } else {
      view.setInt32(offset, element.length)
      bytes.set(element, offset + 4)
      offset += 4 + element.length
    }
  }
  return bytes
}

const decodeArray = (bytes: Uint8Array, elementOid: number): ReadonlyArray<unknown> => {
  if (bytes.length < 12) return fail("Truncated array value")
  const view = viewOf(bytes)
  const dimensions = view.getInt32(0)
  if (dimensions === 0) return []
  if (dimensions !== 1) {
    return fail(`Only 1-dimensional arrays are supported, received ${dimensions} dimensions`)
  }
  if (bytes.length < 20) return fail("Truncated array value")
  const length = view.getInt32(12)
  const values: Array<unknown> = new Array(length)
  let offset = 20
  for (let i = 0; i < length; i++) {
    if (offset + 4 > bytes.length) return fail("Truncated array element")
    const size = view.getInt32(offset)
    offset += 4
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
  const codec = codecFor(oid)
  if (codec !== undefined) return codec.encode(value)
  const elementOid = arrayToElement.get(oid)
  if (elementOid !== undefined) return encodeArray(value, elementOid)
  return fail(`No codec registered for OID ${oid}`)
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
  const codec = codecFor(oid)
  if (codec !== undefined) return codec.decode(bytes)
  const elementOid = arrayToElement.get(oid)
  if (elementOid !== undefined) return decodeArray(bytes, elementOid)
  return bytes
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
