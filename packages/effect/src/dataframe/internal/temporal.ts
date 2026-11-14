/**
 * Dates, timestamps and durations: unit conversions, calendar fields,
 * truncation and casts, on their integer storage (days since the epoch for
 * dates, units since the epoch for timestamps, units for durations).
 *
 * Calendar arithmetic uses Howard Hinnant's day-count algorithms, exact for
 * negative days. Timestamps are read as UTC: their calendar fields are UTC
 * fields (timestamps with another time zone are not supported yet).
 *
 * @internal
 */
import * as S from "../../arrow/ArrowSchema.ts"
import * as V from "./vector.ts"

/** @internal */
export const isTemporal = (t: S.DataType): boolean =>
  t._tag === "Date" || t._tag === "Timestamp" || t._tag === "Duration" || t._tag === "Time"

const perSecond: Record<S.TimeUnit, number> = {
  second: 1,
  millisecond: 1_000,
  microsecond: 1_000_000,
  nanosecond: 1_000_000_000
}
const fineness: Record<S.TimeUnit, number> = { second: 0, millisecond: 1, microsecond: 2, nanosecond: 3 }

/** The coarser of two units (the common unit of mixed operands, as in Polars). @internal */
export const coarser = (a: S.TimeUnit, b: S.TimeUnit): S.TimeUnit => (fineness[a] <= fineness[b] ? a : b)

const zoned = (t: S.Timestamp): boolean => t.timezone !== undefined && t.timezone !== "UTC" && t.timezone !== "+00:00"

/** Whether two timestamps' zones are compatible (no zone counts as UTC). */
const sameZone = (a: S.Timestamp, b: S.Timestamp): boolean => (zoned(a) || zoned(b) ? a.timezone === b.timezone : true)

/** The common type of two temporal types, if they have one. @internal */
export const supertype = (a: S.DataType, b: S.DataType): S.DataType | undefined => {
  if (a._tag === "Timestamp" && b._tag === "Timestamp") {
    return sameZone(a, b) ? S.timestamp(coarser(a.unit, b.unit), a.timezone ?? b.timezone) : undefined
  }
  if (a._tag === "Timestamp" && b._tag === "Date") return a
  if (a._tag === "Date" && b._tag === "Timestamp") return b
  if (a._tag === "Date" && b._tag === "Date") return S.date("day")
  if (a._tag === "Duration" && b._tag === "Duration") return S.duration(coarser(a.unit, b.unit))
  return undefined
}

// -----------------------------------------------------------------------------
// Integer helpers
// -----------------------------------------------------------------------------

const floorDiv = (a: bigint, b: bigint): bigint => {
  const q = a / b
  return (a % b !== BigInt(0)) && ((a < BigInt(0)) !== (b < BigInt(0))) ? q - BigInt(1) : q
}

/** Rescales integer counts of `from` units to `to` units (flooring). */
const rescale = (values: BigInt64Array, from: S.TimeUnit, to: S.TimeUnit): BigInt64Array => {
  if (from === to) return values
  const out = new BigInt64Array(values.length)
  if (fineness[to] > fineness[from]) {
    const f = BigInt(perSecond[to] / perSecond[from])
    for (let i = 0; i < values.length; i++) out[i] = BigInt.asIntN(64, values[i] * f)
  } else {
    const f = BigInt(perSecond[from] / perSecond[to])
    for (let i = 0; i < values.length; i++) out[i] = floorDiv(values[i], f)
  }
  return out
}

const dayUnits = (unit: S.TimeUnit): bigint => BigInt(86_400 * perSecond[unit])

/** Days since the epoch of every row (dates and timestamps). */
const days = (v: V.Vector): Float64Array => {
  const out = new Float64Array(v.length)
  if (v.kind === "i32") {
    for (let i = 0; i < v.length; i++) out[i] = v.values[i]
  } else if (v.kind === "i64") {
    const per = v.type._tag === "Timestamp" ? dayUnits(v.type.unit) : BigInt(86_400_000) // Date64: milliseconds
    for (let i = 0; i < v.length; i++) out[i] = Number(floorDiv(v.values[i], per))
  }
  return out
}

// -----------------------------------------------------------------------------
// Civil dates
// -----------------------------------------------------------------------------

/** Year, month (1-12) and day (1-31) of a day count. @internal */
export const civil = (z: number): readonly [number, number, number] => {
  z += 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp < 10 ? mp + 3 : mp - 9
  return [yoe + era * 400 + (m <= 2 ? 1 : 0), m, d]
}

/** The day count of a date. @internal */
export const daysFromCivil = (year: number, month: number, day: number): number => {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

// -----------------------------------------------------------------------------
// Fields
// -----------------------------------------------------------------------------

/** @internal */
export type Field =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "millisecond"
  | "weekday"
  | "ordinalDay"

const fieldType: Record<Field, S.DataType> = {
  year: S.int32,
  month: S.int8,
  day: S.int8,
  hour: S.int8,
  minute: S.int8,
  second: S.int8,
  millisecond: S.int32,
  weekday: S.int8,
  ordinalDay: S.int16
}

const checkTimestamp = (v: V.Vector, fn: string): void => {
  if (v.type._tag !== "Date" && v.type._tag !== "Timestamp") {
    V.fail(`${fn} is defined for dates and timestamps, not ${v.type._tag}`)
  }
  if (v.type._tag === "Timestamp" && zoned(v.type)) V.fail(`${fn} of timestamps with a time zone is not supported yet`)
}

/** A calendar or clock field of every date or timestamp. @internal */
export const field = (fn: Field, v: V.Vector): V.Vector => {
  checkTimestamp(v, fn)
  const n = v.length
  const out = new Int32Array(n)
  const d = days(v)
  if (fn === "hour" || fn === "minute" || fn === "second" || fn === "millisecond") {
    if (v.type._tag !== "Timestamp" || v.kind !== "i64") return V.i32(fieldType[fn], out, v.valid)
    const unit = v.type.unit
    const per = dayUnits(unit)
    const second = BigInt(perSecond[unit])
    for (let i = 0; i < n; i++) {
      const rem = v.values[i] - floorDiv(v.values[i], per) * per
      const seconds = Number(rem / second)
      out[i] = fn === "hour"
        ? Math.floor(seconds / 3600)
        : fn === "minute"
        ? Math.floor(seconds / 60) % 60
        : fn === "second"
        ? seconds % 60
        : Number((rem % second) * BigInt(1000) / second)
    }
    return V.i32(fieldType[fn], out, v.valid)
  }
  for (let i = 0; i < n; i++) {
    const z = d[i]
    switch (fn) {
      case "weekday":
        out[i] = (((z + 3) % 7) + 7) % 7 + 1
        break
      case "ordinalDay": {
        const [y] = civil(z)
        out[i] = z - daysFromCivil(y, 1, 1) + 1
        break
      }
      default: {
        const [y, m, day] = civil(z)
        out[i] = fn === "year" ? y : fn === "month" ? m : day
      }
    }
  }
  return V.i32(fieldType[fn], out, v.valid)
}

// -----------------------------------------------------------------------------
// Truncation
// -----------------------------------------------------------------------------

const parseEvery = (every: string): { readonly n: number; readonly unit: string } => {
  const match = /^(\d+)(ns|us|ms|s|m|h|d|w|mo|y)$/.exec(every)
  if (match === null) return V.fail(`truncate expects an interval like "1h", "1d", "1w", "1mo" or "1y", got ${every}`)
  const n = Number(match[1])
  if (n < 1) return V.fail(`truncate needs a positive interval, got ${every}`)
  return { n, unit: match[2] }
}

const fixed: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400, w: 7 * 86_400 }

/**
 * Every date or timestamp rounded down to a multiple of `every`: seconds,
 * minutes, hours and days from the epoch, weeks from a Monday, months and
 * years from the start of the calendar month or year.
 *
 * @internal
 */
export const truncate = (v: V.Vector, every: string): V.Vector => {
  checkTimestamp(v, "truncate")
  const { n: k, unit } = parseEvery(every)
  const n = v.length
  if (unit === "mo" || unit === "y") {
    const months = unit === "y" ? 12 * k : k
    const d = days(v)
    const starts = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      const [y, m] = civil(d[i])
      const index = Math.floor((y * 12 + (m - 1)) / months) * months
      starts[i] = daysFromCivil(Math.floor(index / 12), (index % 12) + 1, 1)
    }
    return fromDays(v, starts)
  }
  if (v.kind === "i32") {
    // dates: whole days
    if (unit !== "d" && unit !== "w") return v
    const size = k * (unit === "w" ? 7 : 1)
    const offset = unit === "w" ? 3 : 0 // 1970-01-01 is a Thursday; weeks start on Monday
    const out = new Int32Array(n)
    for (let i = 0; i < n; i++) out[i] = Math.floor((v.values[i] + offset) / size) * size - offset
    return V.i32(v.type, out, v.valid)
  }
  if (v.kind !== "i64" || v.type._tag !== "Timestamp") return V.fail(`truncate is not defined for ${v.type._tag}`)
  const per = perSecond[v.type.unit]
  const sub: Record<string, number> = { ns: 1e-9, us: 1e-6, ms: 1e-3 }
  const size = BigInt(Math.round((fixed[unit] ?? sub[unit]) * k * per))
  if (size <= BigInt(0)) return v
  const offset = unit === "w" ? BigInt(3) * dayUnits(v.type.unit) : BigInt(0)
  const out = new BigInt64Array(n)
  for (let i = 0; i < n; i++) out[i] = floorDiv(v.values[i] + offset, size) * size - offset
  return V.i64(v.type, out, v.valid)
}

/** Day counts as the input's type (dates stay dates). */
const fromDays = (v: V.Vector, d: Float64Array): V.Vector => {
  if (v.kind === "i32") return V.i32(v.type, Int32Array.from(d), v.valid)
  const per = v.type._tag === "Timestamp" ? dayUnits(v.type.unit) : BigInt(86_400_000)
  return V.i64(v.type, BigInt64Array.from(d, (x) => BigInt(x) * per), v.valid)
}

// -----------------------------------------------------------------------------
// Durations
// -----------------------------------------------------------------------------

/** @internal */
export type Total = "totalDays" | "totalHours" | "totalMinutes" | "totalSeconds" | "totalMilliseconds"

const totalSeconds: Record<Total, number> = {
  totalDays: 86_400,
  totalHours: 3600,
  totalMinutes: 60,
  totalSeconds: 1,
  totalMilliseconds: 0.001
}

/** A duration in whole units, rounded toward zero, as Int64. @internal */
export const total = (fn: Total, v: V.Vector): V.Vector => {
  if (v.type._tag !== "Duration" || v.kind !== "i64") {
    return V.fail(`${fn} is defined for durations, not ${v.type._tag}`)
  }
  const per = BigInt(Math.round(totalSeconds[fn] * perSecond[v.type.unit]))
  const out = new BigInt64Array(v.length)
  for (let i = 0; i < v.length; i++) out[i] = v.values[i] / per
  return V.i64(S.int64, out, v.valid)
}

// -----------------------------------------------------------------------------
// Casts
// -----------------------------------------------------------------------------

const asI64 = (v: V.Vector): BigInt64Array =>
  v.kind === "i64" ? v.values : v.kind === "i32" ? BigInt64Array.from(v.values, BigInt) : V.fail("expected integers")

/**
 * Casts between dates, timestamps, durations and their integers; `undefined`
 * when neither side is temporal.
 *
 * @internal
 */
export const cast = (v: V.Vector, target: S.DataType): V.Vector | undefined => {
  const from = v.type
  if (!isTemporal(from) && !isTemporal(target)) return undefined
  if (from._tag === "Timestamp" && target._tag === "Timestamp") {
    return V.i64(target, rescale(asI64(v), from.unit, target.unit), v.valid)
  }
  if (from._tag === "Duration" && target._tag === "Duration") {
    return V.i64(target, rescale(asI64(v), from.unit, target.unit), v.valid)
  }
  if (from._tag === "Timestamp" && target._tag === "Date") {
    return target.unit === "day"
      ? V.i32(target, Int32Array.from(days(v)), v.valid)
      : V.i64(target, rescale(asI64(v), from.unit, "millisecond"), v.valid)
  }
  if (from._tag === "Date" && target._tag === "Timestamp") {
    const per = from.unit === "day" ? dayUnits(target.unit) : BigInt(perSecond[target.unit] / 1000)
    return V.i64(target, BigInt64Array.from(asI64(v), (x) => BigInt.asIntN(64, x * per)), v.valid)
  }
  // Integers and temporal values of the same width reinterpret each other.
  if (target._tag === "Int" || isTemporal(target)) {
    const kind = V.kindOf(target)
    if (kind === "i64") return V.i64(target, asI64(v), v.valid)
    if (kind === "i32" && v.kind === "i32") return V.i32(target, v.values, v.valid)
    if (kind === "i32" && v.kind === "i64") {
      return V.i32(target, Int32Array.from(v.values, (x) => Number(BigInt.asIntN(32, x))), v.valid)
    }
  }
  return undefined
}
