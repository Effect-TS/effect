/**
 * Parsing of the text Trino writes for date and time values, shared by the
 * default decoders and the `TrinoTypes` codecs. Failures are thrown as
 * `Invalid` and turned into results by the caller.
 */
import * as DateTime from "effect/DateTime"
import * as Option from "effect/Option"

/** A value the wire text does not describe. */
export class Invalid {
  readonly message: string
  constructor(message: string) {
    this.message = message
  }
}

export const invalid = (message: string): never => {
  throw new Invalid(message)
}

const MILLIS_PER_DAY = 86_400_000
const PICOS_PER_MILLI = BigInt(1_000_000_000)

export const PICOS_PER_SECOND = BigInt("1000000000000")
export const PICOS_PER_NANO = BigInt(1000)

/** Days since 1970-01-01 for a proleptic Gregorian date (Howard Hinnant's algorithm). */
const daysFromCivil = (year: number, month: number, day: number): number => {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}

const DATE = /^([+-]?\d{4,})-(\d{2})-(\d{2})$/
const LOCAL_TIME = /^(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,12}))?$/

/** Epoch milliseconds of a `yyyy-MM-dd` civil date at midnight UTC. */
export const parseDateMillis = (text: string): number => {
  const match = DATE.exec(text)
  if (match === null) return invalid(`Expected a yyyy-MM-dd date, received "${text}"`)
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return invalid(`Invalid date "${text}"`)
  return daysFromCivil(Number(match[1]), month, day) * MILLIS_PER_DAY
}

/** Picoseconds since midnight of `HH:mm:ss[.fraction]`. */
export const parseTimePicos = (text: string): bigint => {
  const match = LOCAL_TIME.exec(text)
  if (match === null) return invalid(`Expected an HH:mm:ss time, received "${text}"`)
  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3])
  if (hour > 23 || minute > 59 || second > 59) return invalid(`Invalid time "${text}"`)
  const fraction = BigInt((match[4] ?? "").padEnd(12, "0"))
  return BigInt((hour * 60 + minute) * 60 + second) * PICOS_PER_SECOND + fraction
}

/** Splits picoseconds since midnight into whole milliseconds and the picoseconds within the last one. */
const splitPicos = (picos: bigint): readonly [millis: number, picosOfMilli: number] => [
  Number(picos / PICOS_PER_MILLI),
  Number(picos % PICOS_PER_MILLI)
]

const TIMESTAMP = /^(\S+) (\S+)$/
const TIMESTAMP_WITH_ZONE = /^(\S+) (\S+) (\S+)$/

/** Wall-clock epoch milliseconds plus picoseconds within the millisecond. */
const parseWallClock = (date: string, time: string): readonly [millis: number, picosOfMilli: number] => {
  const [timeMillis, picosOfMilli] = splitPicos(parseTimePicos(time))
  return [parseDateMillis(date) + timeMillis, picosOfMilli]
}

export interface WallClock {
  /** The wall clock read as UTC fields, in epoch milliseconds. */
  readonly millis: number
  readonly picosOfMilli: number
}

/** `yyyy-MM-dd HH:mm:ss[.fraction]`, the text of `timestamp(p)`. */
export const parseTimestamp = (text: string): WallClock => {
  const match = TIMESTAMP.exec(text)
  if (match === null) return invalid(`Expected a timestamp, received "${text}"`)
  const [millis, picosOfMilli] = parseWallClock(match[1], match[2])
  return { millis, picosOfMilli }
}

export interface ZonedInstant {
  readonly dateTime: DateTime.Zoned
  readonly picosOfMilli: number
}

/**
 * `yyyy-MM-dd HH:mm:ss[.fraction] <zone>`, the text of `timestamp(p) with time
 * zone`: a wall clock in the zone, so ambiguous daylight-saving wall times
 * resolve to the earlier instant.
 */
export const parseZonedTimestamp = (text: string): ZonedInstant => {
  const match = TIMESTAMP_WITH_ZONE.exec(text)
  if (match === null) return invalid(`Expected a timestamp with a time zone, received "${text}"`)
  const zone = DateTime.zoneFromString(match[3])
  if (Option.isNone(zone)) return invalid(`Unknown time zone "${match[3]}"`)
  const [millis, picosOfMilli] = parseWallClock(match[1], match[2])
  const dateTime = DateTime.makeZoned(millis, { timeZone: zone.value, adjustForTimeZone: true })
  if (Option.isNone(dateTime)) return invalid(`Out of range: "${text}"`)
  return { dateTime: dateTime.value, picosOfMilli }
}

const OFFSET = /^([+-])(\d{2}):(\d{2})$/

export interface ParsedTime {
  readonly picosOfDay: bigint
  readonly offsetMinutes: number | undefined
}

/** `HH:mm:ss[.fraction]`, followed by `+HH:mm` when `withTimeZone`. */
export const parseTime = (text: string, withTimeZone: boolean): ParsedTime => {
  if (!withTimeZone) return { picosOfDay: parseTimePicos(text), offsetMinutes: undefined }
  const offset = OFFSET.exec(text.slice(-6))
  if (offset === null) return invalid(`Expected a time with an offset, received "${text}"`)
  const minutes = Number(offset[2]) * 60 + Number(offset[3])
  return { picosOfDay: parseTimePicos(text.slice(0, -6)), offsetMinutes: offset[1] === "-" ? -minutes : minutes }
}

const DAY_TIME_INTERVAL = /^(-)?(\d+) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,12}))?$/
const YEAR_MONTH_INTERVAL = /^(-)?(\d+)-(\d+)$/

/** Nanoseconds of an `interval day to second`; digits beyond nanoseconds (precision 10 to 12) are truncated. */
export const parseDayTimeIntervalNanos = (text: string): bigint => {
  const match = DAY_TIME_INTERVAL.exec(text)
  if (match === null) return invalid(`Expected a day to second interval, received "${text}"`)
  const seconds = ((BigInt(match[2]) * BigInt(24) + BigInt(match[3])) * BigInt(60) + BigInt(match[4])) * BigInt(60) +
    BigInt(match[5])
  const picos = seconds * PICOS_PER_SECOND + BigInt((match[6] ?? "").padEnd(12, "0"))
  const nanos = picos / PICOS_PER_NANO
  return match[1] === "-" ? -nanos : nanos
}

/** Signed months of an `interval year to month`. */
export const parseYearMonthIntervalMonths = (text: string): number => {
  const match = YEAR_MONTH_INTERVAL.exec(text)
  if (match === null) return invalid(`Expected a year to month interval, received "${text}"`)
  const months = Number(match[2]) * 12 + Number(match[3])
  return match[1] === "-" ? -months : months
}
