/**
 * Renders statement parameters as Trino SQL literals.
 *
 * `/v1/statement` has no bind protocol: parameters travel inside the SQL text
 * as `EXECUTE IMMEDIATE '<sql>' USING <literal>, …`. Every literal is typed so
 * Trino infers the intended parameter type, and every string is quoted with
 * `'` doubled, so no value can change the statement's structure.
 */
import * as BigDecimal from "effect/BigDecimal"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import { IntervalYearMonth, PreciseTimestamp, Time } from "../TrinoTypes.ts"
import { EncodeFailure } from "./failure.ts"
import { JsonNumber } from "./json.ts"

/** A parameter with an explicit Trino type, produced by `TrinoClient.param(type, value)`. */
export class TypedValue {
  readonly type: string
  readonly value: unknown
  constructor(type: string, value: unknown) {
    this.type = type
    this.value = value
  }
}

class Refused {
  readonly message: string
  readonly value: unknown
  constructor(message: string, value: unknown) {
    this.message = message
    this.value = value
  }
}

const refuse = (message: string, value: unknown): never => {
  throw new Refused(message, value)
}

const quote = (text: string): string => `'${text.replaceAll("'", "''")}'`

const INT64_MIN = BigInt("-9223372036854775808")
const INT64_MAX = BigInt("9223372036854775807")
const MAX_DECIMAL_PRECISION = 38

const hex = (bytes: Uint8Array | Int8Array): string => {
  let out = ""
  for (const byte of bytes) out += (byte & 0xff).toString(16).padStart(2, "0")
  return out
}

/** Plain decimal text (no exponent) of `value * 10^-scale`, or a refusal past DECIMAL(38). */
const decimalText = (decimal: BigDecimal.BigDecimal): string => {
  const { scale, value } = decimal
  const negative = value < BigInt(0)
  let digits = (negative ? -value : value).toString()
  if (scale <= 0) {
    digits = digits === "0" ? "0" : digits + "0".repeat(-scale)
  } else {
    digits = digits.padStart(scale + 1, "0")
    digits = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
  }
  if (digits.replace(".", "").replace(/^0+(?=\d)/, "").length > MAX_DECIMAL_PRECISION) {
    return refuse(`Decimal ${digits} exceeds Trino's maximum precision of ${MAX_DECIMAL_PRECISION}`, decimal)
  }
  return negative ? `-${digits}` : digits
}

const pad = (n: number, width: number): string => String(n).padStart(width, "0")

const yearText = (year: number): string =>
  year >= 0 && year <= 9999 ? pad(year, 4) : `${year < 0 ? "-" : "+"}${pad(Math.abs(year), 4)}`

/** `yyyy-MM-dd HH:mm:ss.fff` wall clock of the instant in UTC. */
const utcWallClock = (dateTime: DateTime.DateTime): string => {
  const p = DateTime.toPartsUtc(dateTime)
  return `${yearText(p.year)}-${pad(p.month, 2)}-${pad(p.day, 2)} ${pad(p.hour, 2)}:${pad(p.minute, 2)}:${
    pad(p.second, 2)
  }.${pad(p.millisecond, 3)}`
}

/** Drops trailing zeros of a fraction but keeps at least `minimum` digits. */
const trimFraction = (fraction: string, minimum: number): string => {
  let end = fraction.length
  while (end > minimum && fraction[end - 1] === "0") end--
  return fraction.slice(0, end)
}

/**
 * The instant is written in UTC and moved into the value's zone with
 * `AT TIME ZONE`: a wall-clock literal in the zone would be ambiguous for the
 * repeated hour of a daylight-saving fall-back.
 */
const renderDateTime = (dateTime: DateTime.DateTime, picosOfMilli: number): string => {
  const fraction = trimFraction(pad(picosOfMilli, 9), 0)
  const utc = `TIMESTAMP ${quote(`${utcWallClock(dateTime)}${fraction} UTC`)}`
  return DateTime.isZoned(dateTime) ? `(${utc} AT TIME ZONE ${quote(DateTime.zoneToString(dateTime.zone))})` : utc
}

const PICOS_PER_SECOND = BigInt("1000000000000")

const renderTime = (time: Time): string => {
  const seconds = Number(time.picosOfDay / PICOS_PER_SECOND)
  const fraction = trimFraction((time.picosOfDay % PICOS_PER_SECOND).toString().padStart(12, "0"), 0)
  let text = `${pad(Math.floor(seconds / 3600), 2)}:${pad(Math.floor(seconds / 60) % 60, 2)}:${pad(seconds % 60, 2)}`
  if (fraction.length > 0) text += `.${fraction}`
  if (time.offsetMinutes !== undefined) {
    const offset = Math.abs(time.offsetMinutes)
    text += `${time.offsetMinutes < 0 ? "-" : "+"}${pad(Math.floor(offset / 60), 2)}:${pad(offset % 60, 2)}`
  }
  return `TIME ${quote(text)}`
}

const NANOS_PER_SECOND = BigInt(1_000_000_000)

const renderDuration = (duration: Duration.Duration): string => {
  const total = Duration.toNanos(duration)
  if (Option.isNone(total)) return refuse("An infinite Duration has no INTERVAL literal", duration)
  const negative = total.value < BigInt(0)
  const nanos = negative ? -total.value : total.value
  const seconds = nanos / NANOS_PER_SECOND
  const days = seconds / BigInt(86_400)
  const secondOfDay = Number(seconds % BigInt(86_400))
  const fraction = trimFraction((nanos % NANOS_PER_SECOND).toString().padStart(9, "0"), 3)
  const text = `${days} ${pad(Math.floor(secondOfDay / 3600), 2)}:${pad(Math.floor(secondOfDay / 60) % 60, 2)}:${
    pad(secondOfDay % 60, 2)
  }.${fraction}`
  return `INTERVAL ${negative ? "- " : ""}${quote(text)} DAY TO SECOND`
}

const renderYearMonth = (interval: IntervalYearMonth): string => {
  const months = Math.abs(interval.months)
  const text = `${Math.floor(months / 12)}-${months % 12}`
  return `INTERVAL ${interval.months < 0 ? "- " : ""}${quote(text)} YEAR TO MONTH`
}

const renderNumber = (n: number): string => {
  if (Object.is(n, -0)) return "DOUBLE '-0'"
  if (Number.isSafeInteger(n)) return String(n)
  if (Number.isNaN(n)) return "DOUBLE 'NaN'"
  if (n === Number.POSITIVE_INFINITY) return "DOUBLE 'Infinity'"
  if (n === Number.NEGATIVE_INFINITY) return "DOUBLE '-Infinity'"
  return `DOUBLE '${n}'`
}

const renderBigint = (n: bigint): string => {
  if (n >= INT64_MIN && n <= INT64_MAX) return `BIGINT '${n}'`
  // wider than BIGINT: DECIMAL keeps it exact up to 38 digits
  return `DECIMAL '${decimalText(BigDecimal.fromBigInt(n))}'`
}

/**
 * A Trino type name: letters, digits, `_`, spaces, parentheses, commas and
 * `"`-quoted field names. Quotes, comment markers and `;` are refused, so the
 * type cannot carry SQL of its own into `CAST(… AS <type>)`.
 */
const validTypeName = (type: string): string => {
  let depth = 0
  let i = 0
  while (i < type.length) {
    const c = type[i]
    if (c === "\"") {
      const close = type.indexOf("\"", i + 1)
      if (close === -1) return refuse(`Invalid Trino type: ${type}`, type)
      i = close + 1
      continue
    }
    if (c === "(") depth++
    else if (c === ")") depth--
    else if (!/[A-Za-z0-9_ ,]/.test(c)) return refuse(`Invalid Trino type: ${type}`, type)
    if (depth < 0) return refuse(`Invalid Trino type: ${type}`, type)
    i++
  }
  if (depth !== 0 || !/^[A-Za-z]/.test(type.trim())) return refuse(`Invalid Trino type: ${type}`, type)
  return type.trim()
}

const isPlainObject = (u: object): boolean => {
  const proto = Object.getPrototypeOf(u)
  return proto === Object.prototype || proto === null
}

const renderValue = (value: unknown): string => {
  switch (typeof value) {
    case "undefined":
      return "NULL"
    case "boolean":
      return value ? "true" : "false"
    case "number":
      return renderNumber(value)
    case "bigint":
      return renderBigint(value)
    case "string":
      return quote(value)
    case "object":
      return value === null ? "NULL" : renderObject(value)
  }
  return refuse(`Unsupported parameter of type ${typeof value}`, value)
}

const renderObject = (value: object): string => {
  if (value instanceof TypedValue) {
    const type = validTypeName(value.type)
    if (/^json$/i.test(type) && typeof value.value === "string") return `JSON ${quote(value.value)}`
    return `CAST(${renderValue(value.value)} AS ${type})`
  }
  if (value instanceof Uint8Array || value instanceof Int8Array) return `X'${hex(value)}'`
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return refuse("Invalid Date", value)
    const dateTime = DateTime.make(value)
    return Option.isSome(dateTime) ? renderDateTime(dateTime.value, 0) : refuse("Date out of range", value)
  }
  if (DateTime.isDateTime(value)) return renderDateTime(value, 0)
  if (value instanceof PreciseTimestamp) return renderDateTime(value.dateTime, value.picosOfMilli)
  if (BigDecimal.isBigDecimal(value)) return `DECIMAL '${decimalText(value)}'`
  if (Duration.isDuration(value)) return renderDuration(value)
  if (value instanceof Time) return renderTime(value)
  if (value instanceof IntervalYearMonth) return renderYearMonth(value)
  if (value instanceof JsonNumber) {
    return /^-?\d+$/.test(value.source) ? renderBigint(BigInt(value.source)) : `DOUBLE '${value.source}'`
  }
  if (Array.isArray(value)) return `ARRAY[${value.map(renderValue).join(", ")}]`
  if (value instanceof Map) {
    const keys: Array<string> = []
    const values: Array<string> = []
    for (const [k, v] of value) {
      keys.push(renderValue(k))
      values.push(renderValue(v))
    }
    return keys.length === 0 ? "MAP()" : `MAP(ARRAY[${keys.join(", ")}], ARRAY[${values.join(", ")}])`
  }
  if (isPlainObject(value)) {
    // a decoded ROW: field values in declaration order
    const fields = Object.values(value)
    if (fields.length === 0) return refuse("A ROW needs at least one field", value)
    return `ROW(${fields.map(renderValue).join(", ")})`
  }
  return refuse(`Unsupported parameter: ${Object.prototype.toString.call(value)}`, value)
}

const attempt = (render: () => string): Result.Result<string, EncodeFailure> => {
  try {
    return Result.succeed(render())
  } catch (error) {
    if (error instanceof Refused) {
      return Result.fail(new EncodeFailure({ message: error.message, cause: error.value }))
    }
    throw error
  }
}

/** SQL literal for one parameter, typed so Trino can infer the parameter type. */
export const render = (value: unknown): Result.Result<string, EncodeFailure> => attempt(() => renderValue(value))

/** `sql` unchanged without params; otherwise `EXECUTE IMMEDIATE '<sql>' USING <literal>, …`. */
export const renderStatement = (sql: string, params: ReadonlyArray<unknown>): Result.Result<string, EncodeFailure> =>
  params.length === 0
    ? Result.succeed(sql)
    : attempt(() => `EXECUTE IMMEDIATE ${quote(sql)} USING ${params.map(renderValue).join(", ")}`)
