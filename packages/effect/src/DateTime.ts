/**
 * @since 3.6.0
 */
import { IllegalArgumentException } from "./Cause.js"
import * as Context from "./Context.js"
import * as Duration from "./Duration.js"
import * as Effect from "./Effect.js"
import * as Either from "./Either.js"
import * as Equal from "./Equal.js"
import * as Equivalence_ from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { dual, pipe } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import * as Hash from "./Hash.js"
import * as Inspectable from "./Inspectable.js"
import * as Layer from "./Layer.js"
import * as Option from "./Option.js"
import * as order from "./Order.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"

/**
 * @since 3.6.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/DateTime")

/**
 * @since 3.6.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * A `DateTime` represents a point in time. It can optionally have a time zone
 * associated with it.
 *
 * @since 3.6.0
 * @category models
 */
export type DateTime = Utc | Zoned

/**
 * @since 3.6.0
 * @category models
 */
export interface Utc extends DateTime.Proto {
  readonly _tag: "Utc"
  readonly epochMillis: number
  /** @internal */
  partsUtc: DateTime.Parts
}

/**
 * @since 3.6.0
 * @category models
 */
export interface Zoned extends DateTime.Proto {
  readonly _tag: "Zoned"
  readonly epochMillis: number
  readonly zone: TimeZone
  /** @internal */
  adjustedEpochMillis?: number
  /** @internal */
  partsAdjusted?: DateTime.Parts
  /** @internal */
  partsUtc?: DateTime.Parts
}

/**
 * @since 3.6.0
 * @category models
 */
export declare namespace DateTime {
  /**
   * @since 3.6.0
   * @category models
   */
  export type Input = DateTime | Partial<Parts> | Date | number | string

  /**
   * @since 3.6.0
   * @category models
   */
  export type PreserveZone<A extends DateTime.Input> = A extends Zoned ? Zoned : Utc

  /**
   * @since 3.6.0
   * @category models
   */
  export type Unit =
    | "milli"
    | "millis"
    | "second"
    | "seconds"
    | "minute"
    | "minutes"
    | "hour"
    | "hours"
    | "day"
    | "days"
    | "week"
    | "weeks"
    | "month"
    | "months"
    | "year"
    | "years"

  /**
   * @since 3.6.0
   * @category models
   */
  export type DatePart =
    | "day"
    | "week"
    | "month"
    | "year"

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Parts {
    readonly millis: number
    readonly seconds: number
    readonly minutes: number
    readonly hours: number
    readonly day: number
    readonly weekDay: number
    readonly month: number
    readonly year: number
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Proto extends Pipeable, Inspectable.Inspectable {
    readonly [TypeId]: TypeId
  }
}

/**
 * @since 3.6.0
 * @category type ids
 */
export const TimeZoneTypeId: unique symbol = Symbol.for("effect/DateTime/TimeZone")

/**
 * @since 3.6.0
 * @category type ids
 */
export type TimeZoneTypeId = typeof TimeZoneTypeId

/**
 * @since 3.6.0
 * @category models
 */
export type TimeZone = TimeZone.Offset | TimeZone.Named

/**
 * @since 3.6.0
 * @category models
 */
export declare namespace TimeZone {
  /**
   * @since 3.6.0
   * @category models
   */
  export interface Proto extends Inspectable.Inspectable {
    readonly [TimeZoneTypeId]: TimeZoneTypeId
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Offset extends Proto {
    readonly _tag: "Offset"
    readonly offset: number
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Named extends Proto {
    readonly _tag: "Named"
    readonly id: string
    /** @internal */
    readonly format: Intl.DateTimeFormat
  }
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  ...Inspectable.BaseProto,
  toJSON(this: DateTime) {
    return toDateUtc(this).toJSON()
  }
}

const ProtoUtc = {
  ...Proto,
  _tag: "Utc",
  [Hash.symbol](this: Utc) {
    return Hash.cached(this, Hash.number(this.epochMillis))
  },
  [Equal.symbol](this: Utc, that: unknown) {
    return isDateTime(that) && that._tag === "Utc" && this.epochMillis === that.epochMillis
  },
  toString(this: Utc) {
    return `DateTime.Utc(${toDateUtc(this).toJSON()})`
  }
}

const ProtoZoned = {
  ...Proto,
  _tag: "Zoned",
  [Hash.symbol](this: Zoned) {
    return pipe(
      Hash.number(this.epochMillis),
      Hash.combine(Hash.hash(this.zone)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](this: Zoned, that: unknown) {
    return isDateTime(that) && that._tag === "Zoned" && this.epochMillis === that.epochMillis &&
      Equal.equals(this.zone, that.zone)
  },
  toString(this: Zoned) {
    return `DateTime.Zoned(${toDateUtc(this).toJSON()}, ${zoneToString(this.zone)})`
  }
}

const ProtoTimeZone = {
  [TimeZoneTypeId]: TimeZoneTypeId,
  ...Inspectable.BaseProto
}

const ProtoTimeZoneNamed = {
  ...ProtoTimeZone,
  _tag: "Named",
  [Hash.symbol](this: TimeZone.Named) {
    return Hash.cached(this, Hash.string(`Named:${this.id}`))
  },
  [Equal.symbol](this: TimeZone.Named, that: unknown) {
    return isTimeZone(that) && that._tag === "Named" && this.id === that.id
  },
  toJSON(this: TimeZone.Named) {
    return {
      _id: "TimeZone",
      _tag: "Named",
      id: this.id
    }
  }
}

const ProtoTimeZoneOffset = {
  ...ProtoTimeZone,
  _tag: "Offset",
  [Hash.symbol](this: TimeZone.Offset) {
    return Hash.cached(this, Hash.string(`Offset:${this.offset}`))
  },
  [Equal.symbol](this: TimeZone.Offset, that: unknown) {
    return isTimeZone(that) && that._tag === "Offset" && this.offset === that.offset
  },
  toJSON(this: TimeZone.Offset) {
    return {
      _id: "TimeZone",
      _tag: "Offset",
      offset: this.offset
    }
  }
}

// =============================================================================
// guards
// =============================================================================

/**
 * @since 3.6.0
 * @category guards
 */
export const isDateTime = (u: unknown): u is DateTime => Predicate.hasProperty(u, TypeId)

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZone = (u: unknown): u is TimeZone => Predicate.hasProperty(u, TimeZoneTypeId)

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZoneOffset = (u: unknown): u is TimeZone.Offset => isTimeZone(u) && u._tag === "Offset"

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZoneNamed = (u: unknown): u is TimeZone.Named => isTimeZone(u) && u._tag === "Named"

/**
 * @since 3.6.0
 * @category guards
 */
export const isUtc = (self: DateTime): self is Utc => self._tag === "Utc"

/**
 * @since 3.6.0
 * @category guards
 */
export const isZoned = (self: DateTime): self is Zoned => self._tag === "Zoned"

// =============================================================================
// instances
// =============================================================================

/**
 * @since 3.6.0
 * @category instances
 */
export const Equivalence: Equivalence_.Equivalence<DateTime> = Equivalence_.make((a, b) =>
  a.epochMillis === b.epochMillis
)

/**
 * @since 3.6.0
 * @category instances
 */
export const Order: order.Order<DateTime> = order.make((self, that) =>
  self.epochMillis < that.epochMillis ? -1 : self.epochMillis > that.epochMillis ? 1 : 0
)

/**
 * @since 3.6.0
 */
export const clamp: {
  (options: { minimum: DateTime; maximum: DateTime }): (self: DateTime) => DateTime
  (self: DateTime, options: { minimum: DateTime; maximum: DateTime }): DateTime
} = order.clamp(Order)

// =============================================================================
// constructors
// =============================================================================

const makeUtc = (epochMillis: number): Utc => {
  const self = Object.create(ProtoUtc)
  self.epochMillis = epochMillis
  return self
}

/**
 * Create a `DateTime` from a `Date`.
 *
 * If the `Date` is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeFromDate = (date: Date): Utc => {
  const epochMillis = date.getTime()
  if (Number.isNaN(epochMillis)) {
    throw new IllegalArgumentException("Invalid date")
  }
  return makeUtc(epochMillis)
}

/**
 * Create a `DateTime` from one of the following:
 *
 * - A `DateTime`
 * - A `Date` instance (invalid dates will throw an `IllegalArgumentException`)
 * - The `number` of milliseconds since the Unix epoch
 * - An object with the parts of a date
 * - A `string` that can be parsed by `Date.parse`
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeMake = <A extends DateTime.Input>(input: A): DateTime.PreserveZone<A> => {
  if (isDateTime(input)) {
    return input as DateTime.PreserveZone<A>
  } else if (input instanceof Date) {
    return unsafeFromDate(input) as DateTime.PreserveZone<A>
  } else if (typeof input === "object") {
    const date = new Date(0)
    date.setUTCFullYear(
      input.year ?? 0,
      input.month ? input.month - 1 : 0,
      input.day ?? 1
    )
    date.setUTCHours(
      input.hours ?? 0,
      input.minutes ?? 0,
      input.seconds ?? 0,
      input.millis ?? 0
    )
    if (input.weekDay !== undefined) {
      const diff = input.weekDay - date.getUTCDay()
      date.setUTCDate(date.getUTCDate() + diff)
    }
    return unsafeFromDate(date) as DateTime.PreserveZone<A>
  }
  return unsafeFromDate(new Date(input)) as DateTime.PreserveZone<A>
}

/**
 * Create a `DateTime` from one of the following:
 *
 * - A `DateTime`
 * - A `Date` instance (invalid dates will throw an `IllegalArgumentException`)
 * - The `number` of milliseconds since the Unix epoch
 * - An object with the parts of a date
 * - A `string` that can be parsed by `Date.parse`
 *
 * If the input is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category constructors
 */
export const make: <A extends DateTime.Input>(input: A) => Option.Option<DateTime.PreserveZone<A>> = Option
  .liftThrowable(unsafeMake)

/**
 * Create a `DateTime.Zoned` from a string.
 *
 * It uses the format: `YYYY-MM-DDTHH:mm:ss.sssZ IANA/TimeZone`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const makeZonedFromString = (input: string): Option.Option<Zoned> => {
  const parts = input.split(" ")
  if (parts.length !== 2) {
    return Option.none()
  }
  return Option.flatMap(
    make(parts[0]),
    (dt) => Option.map(zoneFromString(parts[1]), (zone) => setZone(dt, zone))
  )
}

/**
 * Get the current time using the `Clock` service and convert it to a `DateTime`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const now: Effect.Effect<Utc> = Effect.map(
  Effect.clock,
  (clock) => makeUtc(clock.unsafeCurrentTimeMillis())
)

/**
 * Get the current time using `Date.now`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeNow: LazyArg<Utc> = () => makeUtc(Date.now())

// =============================================================================
// time zones
// =============================================================================

const makeZoned = (epochMillis: number, zone: TimeZone, partsUtc?: DateTime.Parts): Zoned => {
  const self = Object.create(ProtoZoned)
  self.epochMillis = epochMillis
  self.zone = zone
  self.partsUtc = partsUtc
  return self
}

/**
 * Set the time zone of a `DateTime`, returning a new `DateTime.Zoned`.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZone: {
  (zone: TimeZone): (self: DateTime) => Zoned
  (self: DateTime, zone: TimeZone): Zoned
} = dual(2, (self: DateTime, zone: TimeZone): Zoned => {
  return makeZoned(self.epochMillis, zone, self.partsUtc)
})

/**
 * Add a fixed offset time zone to a `DateTime`.
 *
 * The offset is in milliseconds.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZoneOffset: {
  (offset: number): (self: DateTime) => Zoned
  (self: DateTime, offset: number): Zoned
} = dual(2, (self: DateTime, offset: number): Zoned => setZone(self, zoneMakeOffset(offset)))

const validZoneCache = globalValue("effect/DateTime/validZoneCache", () => new Map<string, TimeZone.Named>())

const formatOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  timeZoneName: "longOffset",
  fractionalSecondDigits: 3,
  hourCycle: "h23"
}

const zoneMakeIntl = (format: Intl.DateTimeFormat): TimeZone.Named => {
  const zoneId = format.resolvedOptions().timeZone
  if (validZoneCache.has(zoneId)) {
    return validZoneCache.get(zoneId)!
  }
  const zone = Object.create(ProtoTimeZoneNamed)
  zone.id = zoneId
  zone.format = format
  validZoneCache.set(zoneId, zone)
  return zone
}

/**
 * Attempt to create a named time zone from a IANA time zone identifier.
 *
 * If the time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneUnsafeMakeNamed = (zoneId: string): TimeZone.Named => {
  if (validZoneCache.has(zoneId)) {
    return validZoneCache.get(zoneId)!
  }
  try {
    return zoneMakeIntl(
      new Intl.DateTimeFormat("en-US", {
        ...formatOptions,
        timeZone: zoneId
      })
    )
  } catch (_) {
    throw new IllegalArgumentException(`Invalid time zone: ${zoneId}`)
  }
}

/**
 * Create a fixed offset time zone.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeOffset = (offset: number): TimeZone.Offset => {
  const zone = Object.create(ProtoTimeZoneOffset)
  zone.offset = offset
  return zone
}

/**
 * Create a named time zone from a IANA time zone identifier. If the time zone
 * is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeNamed: (zoneId: string) => Option.Option<TimeZone.Named> = Option.liftThrowable(
  zoneUnsafeMakeNamed
)

/**
 * Create a named time zone from a IANA time zone identifier. If the time zone
 * is invalid, it will fail with an `IllegalArgumentException`.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeNamedEffect = (zoneId: string): Effect.Effect<TimeZone.Named, IllegalArgumentException> =>
  Effect.try({
    try: () => zoneUnsafeMakeNamed(zoneId),
    catch: (e) => e as IllegalArgumentException
  })

/**
 * Create a named time zone from the system's local time zone.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeLocal = (): TimeZone.Named => zoneMakeIntl(new Intl.DateTimeFormat("en-US", formatOptions))

/**
 * Try parse a TimeZone from a string
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneFromString = (zone: string): Option.Option<TimeZone> => {
  if (zone.startsWith("GMT")) {
    const offset = parseGmtOffset(zone)
    return offset === null ? Option.none() : Option.some(zoneMakeOffset(offset))
  }
  return zoneMakeNamed(zone)
}

/**
 * Format a `TimeZone` as a string.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneToString = (self: TimeZone): string => {
  if (self._tag === "Offset") {
    return `GMT${offsetToString(self.offset)}`
  }
  return self.id
}

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZoneNamed: {
  (zoneId: string): (self: DateTime) => Option.Option<Zoned>
  (self: DateTime, zoneId: string): Option.Option<Zoned>
} = dual(
  2,
  (self: DateTime, zoneId: string): Option.Option<Zoned> =>
    Option.map(zoneMakeNamed(zoneId), (zone) => setZone(self, zone))
)

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 */
export const unsafeSetZoneNamed: {
  (zoneId: string): (self: DateTime) => Zoned
  (self: DateTime, zoneId: string): Zoned
} = dual(2, (self: DateTime, zoneId: string): Zoned => setZone(self, zoneUnsafeMakeNamed(zoneId)))

// =============================================================================
// comparisons
// =============================================================================

/**
 * Calulate the difference between two `DateTime` values, returning the number
 * of milliseconds the `other` DateTime is from `self`.
 *
 * If `other` is *after* `self`, the result will be a positive number.
 *
 * @since 3.6.0
 * @category comparisons
 */
export const diff: {
  (other: DateTime): (self: DateTime) => number
  (self: DateTime, other: DateTime): number
} = dual(2, (self: DateTime, other: DateTime): number => toEpochMillis(other) - toEpochMillis(self))

/**
 * Calulate the difference between two `DateTime` values.
 *
 * If the `other` DateTime is before `self`, the result will be a negative
 * `Duration`, returned as a `Left`.
 *
 * If the `other` DateTime is after `self`, the result will be a positive
 * `Duration`, returned as a `Right`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const diffDurationEither: {
  (other: DateTime): (self: DateTime) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime, other: DateTime): Either.Either<Duration.Duration, Duration.Duration>
} = dual(2, (self: DateTime, other: DateTime): Either.Either<Duration.Duration, Duration.Duration> => {
  const diffMillis = diff(self, other)
  return diffMillis > 0
    ? Either.right(Duration.millis(diffMillis))
    : Either.left(Duration.millis(-diffMillis))
})

/**
 * Calulate the distance between two `DateTime` values.
 *
 * @since 3.6.0
 * @category constructors
 */
export const diffDuration: {
  (other: DateTime): (self: DateTime) => Duration.Duration
  (self: DateTime, other: DateTime): Duration.Duration
} = dual(
  2,
  (self: DateTime, other: DateTime): Duration.Duration => Duration.millis(Math.abs(diff(self, other)))
)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const min: {
  (that: DateTime): (self: DateTime) => DateTime
  (self: DateTime, that: DateTime): DateTime
} = order.min(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const max: {
  (that: DateTime): (self: DateTime) => DateTime
  (self: DateTime, that: DateTime): DateTime
} = order.max(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const greaterThan: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = order.greaterThan(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const greaterThanOrEqualTo: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = order.greaterThanOrEqualTo(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const lessThan: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = order.lessThan(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const lessThanOrEqualTo: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = order.lessThanOrEqualTo(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const between: {
  (options: { minimum: DateTime; maximum: DateTime }): (self: DateTime) => boolean
  (self: DateTime, options: { minimum: DateTime; maximum: DateTime }): boolean
} = order.between(Order)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const isFuture = (self: DateTime): Effect.Effect<boolean> => Effect.map(now, lessThan(self))

/**
 * @since 3.6.0
 * @category comparisons
 */
export const isPast = (self: DateTime): Effect.Effect<boolean> => Effect.map(now, greaterThan(self))

// =============================================================================
// conversions
// =============================================================================

/**
 * Get the UTC `Date` of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateUtc = (self: DateTime): Date => new Date(toEpochMillis(self))

/**
 * Convert a `DateTime` to a `Date`, applying the time zone first.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateAdjusted = (self: Zoned): Date => {
  if (self.zone._tag === "Offset") {
    return new Date(self.epochMillis + self.zone.offset)
  } else if (self.adjustedEpochMillis !== undefined) {
    return new Date(self.adjustedEpochMillis)
  }
  const parts = self.zone.format.formatToParts(self.epochMillis)
  const date = new Date(0)
  date.setUTCFullYear(
    Number(parts[4].value),
    Number(parts[0].value) - 1,
    Number(parts[2].value)
  )
  date.setUTCHours(
    Number(parts[6].value),
    Number(parts[8].value),
    Number(parts[10].value),
    Number(parts[12].value)
  )
  self.adjustedEpochMillis = date.getTime()
  return date
}

/**
 * Calculate the time zone offset of a `DateTime.Zoned` in milliseconds.
 *
 * @since 3.6.0
 * @category conversions
 */
export const zoneOffset = (self: Zoned): number => {
  const plainDate = toDateAdjusted(self)
  return plainDate.getTime() - toEpochMillis(self)
}

const offsetToString = (offset: number): string => {
  const abs = Math.abs(offset)
  const hours = Math.floor(abs / (60 * 60 * 1000))
  const minutes = Math.round((abs % (60 * 60 * 1000)) / (60 * 1000))
  return `${offset < 0 ? "-" : "+"}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/**
 * Calculate the time zone offset of a `DateTime` in milliseconds.
 *
 * The offset is formatted as "±HH:MM".
 *
 * @since 3.6.0
 * @category conversions
 */
export const zoneOffsetISOString = (self: Zoned): string => offsetToString(zoneOffset(self))

/**
 * Format a `DateTime.Zoned` as a string.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toStringZoned = (self: Zoned): string => `${formatIso(self)} ${zoneToString(self.zone)}`

/**
 * Get the milliseconds since the Unix epoch of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toEpochMillis = (self: DateTime): number => self.epochMillis

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be time zone adjusted.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toPartsAdjusted = (self: Zoned): DateTime.Parts => {
  if (self.partsAdjusted !== undefined) {
    return self.partsAdjusted
  }
  self.partsAdjusted = withAdjustedDate(self, dateToParts)
  return self.partsAdjusted
}

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be in UTC.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toPartsUtc = (self: DateTime): DateTime.Parts => {
  if (self.partsUtc !== undefined) {
    return self.partsUtc
  }
  self.partsUtc = withUtcDate(self, dateToParts)
  return self.partsUtc
}

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be in the UTC time zone.
 *
 * @since 3.6.0
 * @category conversions
 * @example
 * import { DateTime } from "effect"
 *
 * const now = DateTime.fromParts({ year: 2024 })
 * const year = DateTime.getPartUtc(now, "year")
 * assert.strictEqual(year, 2024)
 */
export const getPartUtc: {
  (part: keyof DateTime.Parts): (self: DateTime) => number
  (self: DateTime, part: keyof DateTime.Parts): number
} = dual(2, (self: DateTime, part: keyof DateTime.Parts): number => toPartsUtc(self)[part])

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be time zone adjusted.
 *
 * @since 3.6.0
 * @category conversions
 */
export const getPartAdjusted: {
  (part: keyof DateTime.Parts): (self: Zoned) => number
  (self: Zoned, part: keyof DateTime.Parts): number
} = dual(2, (self: Zoned, part: keyof DateTime.Parts): number => toPartsAdjusted(self)[part])

const setParts = (date: Date, parts: Partial<DateTime.Parts>): void => {
  if (parts.year !== undefined) {
    date.setUTCFullYear(parts.year)
  }
  if (parts.month !== undefined) {
    date.setUTCMonth(parts.month - 1)
  }
  if (parts.day !== undefined) {
    date.setUTCDate(parts.day)
  }
  if (parts.weekDay !== undefined) {
    const diff = parts.weekDay - date.getUTCDay()
    date.setUTCDate(date.getUTCDate() + diff)
  }
  if (parts.hours !== undefined) {
    date.setUTCHours(parts.hours)
  }
  if (parts.minutes !== undefined) {
    date.setUTCMinutes(parts.minutes)
  }
  if (parts.seconds !== undefined) {
    date.setUTCSeconds(parts.seconds)
  }
  if (parts.millis !== undefined) {
    date.setUTCMilliseconds(parts.millis)
  }
}

/**
 * Set the different parts of a `DateTime` as an object.
 *
 * The Date will be time zone adjusted.
 *
 * @since 3.6.0
 * @category conversions
 */
export const setPartsAdjusted: {
  (parts: Partial<DateTime.Parts>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.Parts>): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, parts: Partial<DateTime.Parts>): DateTime => mutateAdjusted(self, (date) => setParts(date, parts))
)

/**
 * Set the different parts of a `DateTime` as an object.
 *
 * @since 3.6.0
 * @category conversions
 */
export const setPartsUtc: {
  (parts: Partial<DateTime.Parts>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.Parts>): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, parts: Partial<DateTime.Parts>): DateTime => mutateUtc(self, (date) => setParts(date, parts))
)

// =============================================================================
// current time zone
// =============================================================================

/**
 * @since 3.6.0
 * @category current time zone
 */
export class CurrentTimeZone extends Context.Tag("effect/DateTime/CurrentTimeZone")<
  CurrentTimeZone,
  TimeZone
>() {}

/**
 * Set the time zone of a `DateTime` to the current time zone, which is
 * determined by the `CurrentTimeZone` service.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const setZoneCurrent = (self: DateTime): Effect.Effect<Zoned, never, CurrentTimeZone> =>
  Effect.map(CurrentTimeZone, (zone) => setZone(self, zone))

/**
 * Provide the `CurrentTimeZone` to an effect.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const withCurrentZone: {
  (zone: TimeZone): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, zone: TimeZone): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, zone: TimeZone): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>> =>
    Effect.provideService(effect, CurrentTimeZone, zone)
)

/**
 * Provide the `CurrentTimeZone` to an effect.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const withCurrentZoneLocal = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>> =>
  Effect.provideServiceEffect(effect, CurrentTimeZone, Effect.sync(zoneMakeLocal))

/**
 * Provide the `CurrentTimeZone` to an effect using an IANA time zone
 * identifier.
 *
 * If the time zone is invalid, it will fail with an `IllegalArgumentException`.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const withCurrentZoneNamed: {
  (zone: string): <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | IllegalArgumentException, Exclude<R, CurrentTimeZone>>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    zone: string
  ): Effect.Effect<A, E | IllegalArgumentException, Exclude<R, CurrentTimeZone>>
} = dual(
  2,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    zone: string
  ): Effect.Effect<A, E | IllegalArgumentException, Exclude<R, CurrentTimeZone>> =>
    Effect.provideServiceEffect(effect, CurrentTimeZone, zoneMakeNamedEffect(zone))
)

/**
 * Get the current time as a `DateTime.Zoned`, using the `CurrentTimeZone`.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const nowInCurrentZone: Effect.Effect<Zoned, never, CurrentTimeZone> = Effect.flatMap(
  now,
  setZoneCurrent
)

/**
 * Create a Layer from the given time zone.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZone = (zone: TimeZone): Layer.Layer<CurrentTimeZone> => Layer.succeed(CurrentTimeZone, zone)

/**
 * Create a Layer from the given IANA time zone identifier.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneNamed = (zoneId: string): Layer.Layer<CurrentTimeZone, IllegalArgumentException> =>
  Layer.effect(CurrentTimeZone, zoneMakeNamedEffect(zoneId))

/**
 * Create a Layer from the given IANA time zone identifier.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneLocal: Layer.Layer<CurrentTimeZone> = Layer.sync(
  CurrentTimeZone,
  zoneMakeLocal
)

// =============================================================================
// mapping
// =============================================================================

const calculateOffset = (date: Date, zone: TimeZone): number =>
  zone._tag === "Offset" ? zone.offset : calculateNamedOffset(date, zone)

const gmtOffsetRegex = /^GMT([+-])(\d{2}):(\d{2})$/
const parseGmtOffset = (offset: string): number | null => {
  const match = gmtOffsetRegex.exec(offset)
  if (match === null) {
    return null
  }
  const [, sign, hours, minutes] = match
  return (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes)) * 60 * 1000
}

const calculateNamedOffset = (date: Date, zone: TimeZone.Named): number => {
  const parts = zone.format.formatToParts(date)
  const offset = parts[14].value
  if (offset === "GMT") {
    return 0
  }
  const result = parseGmtOffset(offset)
  if (result === null) {
    // fallback to using the adjusted date
    return zoneOffset(makeZoned(date.getTime(), zone))
  }
  return result
}

/**
 * Modify a `DateTime` by applying a function to the underlying `Date`.
 *
 * The `Date` will first have the time zone applied if possible, and then be
 * converted back to a `DateTime` within the same time zone.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mutateAdjusted: {
  (f: (date: Date) => void): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (date: Date) => void): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, f: (date: Date) => void): DateTime => {
  if (self._tag === "Utc") {
    const date = toDateUtc(self)
    f(date)
    return makeUtc(date.getTime())
  }
  const adjustedDate = toDateAdjusted(self)
  const newAdjustedDate = new Date(adjustedDate.getTime())
  f(newAdjustedDate)
  const offset = calculateOffset(newAdjustedDate, self.zone)
  return makeZoned(newAdjustedDate.getTime() - offset, self.zone)
})

/**
 * Modify a `DateTime` by applying a function to the underlying UTC `Date`.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mutateUtc: {
  (f: (date: Date) => void): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (date: Date) => void): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, f: (date: Date) => void): DateTime =>
  mapEpochMillis(self, (millis) => {
    const date = new Date(millis)
    f(date)
    return date.getTime()
  }))

/**
 * Transform a `DateTime` by applying a function to the number of milliseconds
 * since the Unix epoch.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mapEpochMillis: {
  (f: (millis: number) => number): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (millis: number) => number): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, f: (millis: number) => number): DateTime => {
  const millis = f(toEpochMillis(self))
  return self._tag === "Utc" ? makeUtc(millis) : makeZoned(millis, self.zone)
})

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 */
export const withAdjustedDate: {
  <A>(f: (date: Date) => A): (self: Zoned) => A
  <A>(self: Zoned, f: (date: Date) => A): A
} = dual(2, <A>(self: Zoned, f: (date: Date) => A): A => f(toDateAdjusted(self)))

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 */
export const withUtcDate: {
  <A>(f: (date: Date) => A): (self: DateTime) => A
  <A>(self: DateTime, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime, f: (date: Date) => A): A => f(toDateUtc(self)))

/**
 * @since 3.6.0
 * @category mapping
 */
export const match: {
  <A, B>(options: {
    readonly onUtc: (_: Utc) => A
    readonly onZoned: (_: Zoned) => B
  }): (self: DateTime) => A | B
  <A, B>(self: DateTime, options: {
    readonly onUtc: (_: Utc) => A
    readonly onZoned: (_: Zoned) => B
  }): A | B
} = dual(2, <A, B>(self: DateTime, options: {
  readonly onUtc: (_: Utc) => A
  readonly onZoned: (_: Zoned) => B
}): A | B => self._tag === "Utc" ? options.onUtc(self) : options.onZoned(self))

// =============================================================================
// math
// =============================================================================

/**
 * Add the given `Duration` to a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const addDuration: {
  (duration: Duration.DurationInput): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, duration: Duration.DurationInput): DateTime =>
    mapEpochMillis(self, (millis) => millis + Duration.toMillis(duration))
)

/**
 * Subtract the given `Duration` from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const subtractDuration: {
  (duration: Duration.DurationInput): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, duration: Duration.DurationInput): DateTime =>
    mapEpochMillis(self, (millis) => millis - Duration.toMillis(duration))
)

const addMillis = (date: DateTime, amount: number): DateTime => mapEpochMillis(date, (millis) => millis + amount)

/**
 * Add the given `amount` of `unit`'s to a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const add: {
  (amount: number, unit: DateTime.Unit): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, amount: number, unit: DateTime.Unit): DateTime.PreserveZone<A>
} = dual(3, (self: DateTime, amount: number, unit: DateTime.Unit): DateTime => {
  switch (unit) {
    case "millis":
    case "milli":
      return addMillis(self, amount)
    case "seconds":
    case "second":
      return addMillis(self, amount * 1000)
    case "minutes":
    case "minute":
      return addMillis(self, amount * 60 * 1000)
    case "hours":
    case "hour":
      return addMillis(self, amount * 60 * 60 * 1000)
  }
  return mutateAdjusted(self, (date) => {
    switch (unit) {
      case "days":
      case "day": {
        date.setUTCDate(date.getUTCDate() + amount)
        return date
      }
      case "weeks":
      case "week": {
        date.setUTCDate(date.getUTCDate() + amount * 7)
        return date
      }
      case "months":
      case "month": {
        const day = date.getUTCDate()
        date.setUTCMonth(date.getUTCMonth() + amount + 1, 0)
        if (day < date.getUTCDate()) {
          date.setUTCDate(day)
        }
        return date
      }
      case "years":
      case "year": {
        date.setUTCFullYear(date.getUTCFullYear() + amount)
        return date
      }
    }
  })
})

/**
 * Subtract the given `amount` of `unit`'s from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const subtract: {
  (amount: number, unit: DateTime.Unit): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, amount: number, unit: DateTime.Unit): DateTime.PreserveZone<A>
} = dual(3, (self: DateTime, amount: number, unit: DateTime.Unit): DateTime => add(self, -amount, unit))

/**
 * Converts a `DateTime` to the start of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 */
export const startOf: {
  (part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual((args) => typeof args[1] === "string", (self: DateTime, part: DateTime.DatePart, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime =>
  mutateAdjusted(self, (date) => {
    switch (part) {
      case "day": {
        date.setUTCHours(0, 0, 0, 0)
        break
      }
      case "week": {
        const weekStartsOn = options?.weekStartsOn ?? 0
        const day = date.getUTCDay()
        const diff = (day - weekStartsOn + 7) % 7
        date.setUTCDate(date.getUTCDate() - diff)
        date.setUTCHours(0, 0, 0, 0)
        break
      }
      case "month": {
        date.setUTCDate(1)
        date.setUTCHours(0, 0, 0, 0)
        break
      }
      case "year": {
        date.setUTCMonth(0, 1)
        date.setUTCHours(0, 0, 0, 0)
        break
      }
    }
  }))

/**
 * Converts a `DateTime` to the end of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 */
export const endOf: {
  (part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual((args) => typeof args[1] === "string", (self: DateTime, part: DateTime.DatePart, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime =>
  mutateAdjusted(self, (date) => {
    switch (part) {
      case "day": {
        date.setUTCHours(23, 59, 59, 999)
        break
      }
      case "week": {
        const weekStartsOn = options?.weekStartsOn ?? 0
        const day = date.getUTCDay()
        const diff = (day - weekStartsOn + 7) % 7
        date.setUTCDate(date.getUTCDate() - diff + 6)
        date.setUTCHours(23, 59, 59, 999)
        break
      }
      case "month": {
        date.setUTCMonth(date.getUTCMonth() + 1, 0)
        date.setUTCHours(23, 59, 59, 999)
        break
      }
      case "year": {
        date.setUTCMonth(11, 31)
        date.setUTCHours(23, 59, 59, 999)
        break
      }
    }
  }))

const dateToParts = (date: Date): DateTime.Parts => ({
  millis: date.getUTCMilliseconds(),
  seconds: date.getUTCSeconds(),
  minutes: date.getUTCMinutes(),
  hours: date.getUTCHours(),
  day: date.getUTCDate(),
  weekDay: date.getUTCDay(),
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear()
})

// =============================================================================
// formatting
// =============================================================================

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * @since 3.6.0
 * @category formatting
 */
export const format: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime) => string
  (
    self: DateTime,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTime(args[0]), (
  self: DateTime,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => new Intl.DateTimeFormat(options?.locale, options).format(toEpochMillis(self)))

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * This forces the time zone to be UTC.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatUtc: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime) => string
  (
    self: DateTime,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTime(args[0]), (
  self: DateTime,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string =>
  new Intl.DateTimeFormat(options?.locale, {
    ...options,
    timeZone: "UTC"
  }).format(toEpochMillis(self)))

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIntl: {
  (format: Intl.DateTimeFormat): (self: DateTime) => string
  (self: DateTime, format: Intl.DateTimeFormat): string
} = dual(2, (self: DateTime, format: Intl.DateTimeFormat): string => format.format(toEpochMillis(self)))

const intlTimeZone = (self: TimeZone): string => {
  if (self._tag === "Named") {
    return self.id
  }
  return offsetToString(self.offset)
}

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * The `timeZone` option is set to the offset of the time zone.
 *
 * Note: On Node versions < 22, fixed "Offset" zones will set the time zone to
 * "UTC" and use the adjusted `Date`.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatZoned: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: Zoned) => string
  (
    self: Zoned,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTime(args[0]), (
  self: Zoned,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => {
  try {
    return new Intl.DateTimeFormat(options?.locale, {
      ...options,
      timeZone: intlTimeZone(self.zone)
    }).format(toEpochMillis(self))
  } catch (_) {
    return new Intl.DateTimeFormat(options?.locale, {
      ...options,
      timeZone: "UTC"
    }).format(toDateAdjusted(self))
  }
})

/**
 * Format a `DateTime` as a UTC ISO string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIso = (self: DateTime): string => toDateUtc(self).toISOString()

/**
 * Format a `DateTime.Zoned` as a ISO string with an offset.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoOffset = (self: Zoned): string => {
  const date = toDateAdjusted(self)
  return `${date.toISOString().slice(0, 19)}${zoneOffsetISOString(self)}`
}
