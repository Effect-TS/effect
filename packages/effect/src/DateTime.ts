/**
 * @since 3.6.0
 */
import { Duration } from "effect"
import { IllegalArgumentException } from "./Cause.js"
import * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import * as Either from "./Either.js"
import * as Equal from "./Equal.js"
import * as Equivalence_ from "./Equivalence.js"
import type { LazyArg } from "./Function.js"
import { dual, pipe } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import * as Hash from "./Hash.js"
import * as Inspectable from "./Inspectable.js"
import * as Option from "./Option.js"
import * as Order_ from "./Order.js"
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
export type DateTime = DateTime.Utc | DateTime.WithZone

/**
 * @since 3.6.0
 * @category models
 */
export declare namespace DateTime {
  /**
   * @since 3.6.0
   * @category models
   */
  export type Input = DateTime | Date | number

  /**
   * @since 3.6.0
   * @category models
   */
  export type PreserveZone<A extends DateTime.Input> = A extends DateTime.WithZone ? DateTime.WithZone : DateTime.Utc

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

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Utc extends Proto {
    readonly _tag: "Utc"
    readonly epochMillis: number
    /** @internal */
    partsAdjusted?: Parts
    /** @internal */
    partsUtc?: Parts
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface WithZone extends Proto {
    readonly _tag: "WithZone"
    readonly utc: Utc
    readonly zone: TimeZone
    /** @internal */
    adjustedEpochMillis?: number
    /** @internal */
    partsAdjusted?: Parts
    /** @internal */
    partsUtc?: Parts
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
  [Hash.symbol](this: DateTime.Utc) {
    return Hash.cached(this, Hash.number(this.epochMillis))
  },
  [Equal.symbol](this: DateTime.Utc, that: unknown) {
    return isDateTime(that) && that._tag === "Utc" && this.epochMillis === that.epochMillis
  },
  toString(this: DateTime.Utc) {
    return Inspectable.format({
      _op: "DateTime",
      _tag: this._tag,
      epochMillis: this.epochMillis
    })
  }
}

const ProtoWithZone = {
  ...Proto,
  _tag: "WithZone",
  [Hash.symbol](this: DateTime.WithZone) {
    return pipe(
      Hash.hash(this.utc),
      Hash.combine(Hash.hash(this.zone)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](this: DateTime.WithZone, that: unknown) {
    return isDateTime(that) && that._tag === "WithZone" && Equal.equals(this.utc, that.utc) &&
      Equal.equals(this.zone, that.zone)
  },
  toString(this: DateTime.WithZone) {
    return Inspectable.format({
      _id: "DateTime",
      _tag: this._tag,
      utc: this.utc.toJSON(),
      zone: this.zone
    })
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
export const isDateTimeInput = (u: unknown): u is DateTime.Input =>
  isDateTime(u) || u instanceof Date || typeof u === "number"

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZone = (u: unknown): u is TimeZone => Predicate.hasProperty(u, TimeZoneTypeId)

/**
 * @since 3.6.0
 * @category guards
 */
export const isUtc = (self: DateTime): self is DateTime.Utc => self._tag === "Utc"

/**
 * @since 3.6.0
 * @category guards
 */
export const isWithZone = (self: DateTime): self is DateTime.WithZone => self._tag === "WithZone"

// =============================================================================
// instances
// =============================================================================

/**
 * @since 3.6.0
 * @category instances
 */
export const Equivalence: Equivalence_.Equivalence<DateTime> = Equivalence_.make((a, b) =>
  toEpochMillis(a) === toEpochMillis(b)
)

/**
 * @since 3.6.0
 * @category instances
 */
export const Order: Order_.Order<DateTime> = Order_.make((a, b) => {
  const aMillis = toEpochMillis(a)
  const bMillis = toEpochMillis(b)
  return aMillis < bMillis ? -1 : aMillis > bMillis ? 1 : 0
})

// =============================================================================
// constructors
// =============================================================================

/**
 * Create a `DateTime` from the number of milliseconds since the Unix epoch.
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromEpochMillis = (epochMillis: number): DateTime.Utc => {
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
export const unsafeFromDate = (date: Date): DateTime.Utc => {
  const epochMillis = date.getTime()
  if (isNaN(epochMillis)) {
    throw new IllegalArgumentException("Invalid date")
  }
  const self = Object.create(ProtoUtc)
  self.epochMillis = epochMillis
  return self
}

/**
 * Create a `DateTime` from one of the following:
 * - A `DateTime`
 * - A `Date` instance (invalid dates will throw an `IllegalArgumentException`)
 * - The `number` of milliseconds since the Unix epoch
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromInput = <A extends DateTime.Input>(input: A): DateTime.PreserveZone<A> => {
  if (isDateTime(input)) {
    return input as DateTime.PreserveZone<A>
  } else if (typeof input === "number") {
    return fromEpochMillis(input) as DateTime.PreserveZone<A>
  }
  return unsafeFromDate(input) as DateTime.PreserveZone<A>
}

/**
 * Safely create a `DateTime` from a `Date`, returning `None` if the `Date` is invalid.
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromDate: (date: Date) => Option.Option<DateTime.Utc> = Option.liftThrowable(unsafeFromDate)

/**
 * Convert a partial `DateTime.Parts` into a `DateTime`.
 *
 * If a part is missing, it will default to the smallest possible value. (months will start at 1, days at 1, hours at 0 etc.)
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromParts = (parts: Partial<Exclude<DateTime.Parts, "weekDay">>): DateTime.Utc => {
  const date = new Date(0)
  date.setUTCFullYear(
    parts.year ?? 0,
    parts.month ? parts.month - 1 : 0,
    parts.day ?? 1
  )
  date.setUTCHours(
    parts.hours ?? 0,
    parts.minutes ?? 0,
    parts.seconds ?? 0,
    parts.millis ?? 0
  )
  return fromEpochMillis(date.getTime())
}

/**
 * Parse a string into a `DateTime`, using `Date.parse`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromString = (input: string): Option.Option<DateTime.Utc> => fromDate(new Date(input))

/**
 * Parse a string into a `DateTime`, using `Date.parse`.
 *
 * If the string is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeFromString = (input: string): DateTime.Utc => unsafeFromDate(new Date(input))

/**
 * Get the current time using the `Clock` service and convert it to a `DateTime`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const now: Effect.Effect<DateTime.Utc> = Effect.map(
  Effect.clock,
  (clock) => fromEpochMillis(clock.unsafeCurrentTimeMillis())
)

/**
 * Get the current time using `Date.now`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeNow: LazyArg<DateTime.Utc> = () => fromEpochMillis(Date.now())

// =============================================================================
// time zones
// =============================================================================

/**
 * Set the time zone of a `DateTime`, returning a new `DateTime.WithZone`.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZone: {
  (zone: TimeZone): (self: DateTime.Input) => DateTime.WithZone
  (self: DateTime.Input, zone: TimeZone): DateTime.WithZone
} = dual(2, (self: DateTime.Input, zone: TimeZone): DateTime.WithZone => {
  const dt = fromInput(self)
  const selfWithZone = Object.create(ProtoWithZone)
  selfWithZone.utc = dt._tag === "Utc" ? dt : dt.utc
  selfWithZone.zone = zone
  return selfWithZone
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
  (offset: number): (self: DateTime.Input) => DateTime.WithZone
  (self: DateTime.Input, offset: number): DateTime.WithZone
} = dual(2, (self: DateTime.Input, offset: number): DateTime.WithZone => {
  const zone = Object.create(ProtoTimeZoneOffset)
  zone.offset = offset
  return setZone(self, zone)
})

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

/**
 * Attempt to create a named time zone from a IANA time zone identifier.
 *
 * If the time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 */
export const unsafeMakeZoneNamed = (zoneId: string): TimeZone.Named => {
  if (validZoneCache.has(zoneId)) {
    return validZoneCache.get(zoneId)!
  }
  try {
    const format = new Intl.DateTimeFormat("en-US", {
      ...formatOptions,
      timeZone: zoneId
    })
    const zone = Object.create(ProtoTimeZoneNamed)
    zone.id = format.resolvedOptions().timeZone
    zone.format = format
    validZoneCache.set(zoneId, zone)
    return zone
  } catch (_) {
    throw new IllegalArgumentException(`Invalid time zone: ${zoneId}`)
  }
}

/**
 * Create a named time zone from a IANA time zone identifier. If the time zone
 * is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 */
export const makeZoneNamed: (zoneId: string) => Option.Option<TimeZone.Named> = Option.liftThrowable(
  unsafeMakeZoneNamed
)

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZoneNamed: {
  (zoneId: string): (self: DateTime.Input) => Option.Option<DateTime.WithZone>
  (self: DateTime.Input, zoneId: string): Option.Option<DateTime.WithZone>
} = dual(
  2,
  (self: DateTime.Input, zoneId: string): Option.Option<DateTime.WithZone> =>
    Option.map(makeZoneNamed(zoneId), (zone) => setZone(self, zone))
)

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 */
export const unsafeSetZoneNamed: {
  (zoneId: string): (self: DateTime.Input) => DateTime.WithZone
  (self: DateTime.Input, zoneId: string): DateTime.WithZone
} = dual(2, (self: DateTime.Input, zoneId: string): DateTime.WithZone => setZone(self, unsafeMakeZoneNamed(zoneId)))

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
  (other: DateTime.Input): (self: DateTime.Input) => number
  (self: DateTime.Input, other: DateTime.Input): number
} = dual(2, (self: DateTime.Input, other: DateTime.Input): number => toEpochMillis(other) - toEpochMillis(self))

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
  (other: DateTime.Input): (self: DateTime.Input) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime.Input, other: DateTime.Input): Either.Either<Duration.Duration, Duration.Duration>
} = dual(2, (self: DateTime.Input, other: DateTime.Input): Either.Either<Duration.Duration, Duration.Duration> => {
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
  (other: DateTime.Input): (self: DateTime.Input) => Duration.Duration
  (self: DateTime.Input, other: DateTime.Input): Duration.Duration
} = dual(
  2,
  (self: DateTime.Input, other: DateTime.Input): Duration.Duration => Duration.millis(Math.abs(diff(self, other)))
)

// =============================================================================
// conversions
// =============================================================================

/**
 * Get the UTC `Date` of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateUtc = (self: DateTime.Input): Date => new Date(toEpochMillis(self))

/**
 * Convert a `DateTime` to a `Date`, applying the time zone first.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateAdjusted = (self: DateTime.WithZone): Date => {
  if (self.zone._tag === "Offset") {
    return new Date(self.utc.epochMillis + self.zone.offset)
  } else if (self.adjustedEpochMillis !== undefined) {
    return new Date(self.adjustedEpochMillis)
  }
  const parts = self.zone.format.formatToParts(self.utc.epochMillis)
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
 * Calculate the time zone offset of a `DateTime` in milliseconds.
 *
 * @since 3.6.0
 * @category conversions
 */
export const zoneOffset = (self: DateTime.Input): number => {
  const dt = fromInput(self)
  if (dt._tag === "Utc") {
    return 0
  }
  const plainDate = toDateAdjusted(dt)
  return plainDate.getTime() - toEpochMillis(dt)
}

/**
 * Get the milliseconds since the Unix epoch of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toEpochMillis = (self: DateTime.Input): number => {
  const dt = fromInput(self)
  return dt._tag === "WithZone" ? dt.utc.epochMillis : dt.epochMillis
}

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be time zone adjusted.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toPartsAdjusted = (self: DateTime.WithZone): DateTime.Parts => {
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
export const toPartsUtc = (self: DateTime.Input): DateTime.Parts => {
  const dt = fromInput(self)
  if (dt.partsUtc !== undefined) {
    return dt.partsUtc
  }
  dt.partsUtc = withUtcDate(self, dateToParts)
  return dt.partsUtc
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
  (part: keyof DateTime.Parts): (self: DateTime.Input) => number
  (self: DateTime.Input, part: keyof DateTime.Parts): number
} = dual(2, (self: DateTime.Input, part: keyof DateTime.Parts): number => toPartsUtc(self)[part])

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be time zone adjusted.
 *
 * @since 3.6.0
 * @category conversions
 */
export const getPartAdjusted: {
  (part: keyof DateTime.Parts): (self: DateTime.WithZone) => number
  (self: DateTime.WithZone, part: keyof DateTime.Parts): number
} = dual(2, (self: DateTime.WithZone, part: keyof DateTime.Parts): number => toPartsAdjusted(self)[part])

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
export const setZoneCurrent = (self: DateTime.Input): Effect.Effect<DateTime.WithZone, never, CurrentTimeZone> =>
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
    Effect.flatMap(
      Effect.try({
        try: () => unsafeMakeZoneNamed(zone),
        catch: (e) => e as IllegalArgumentException
      }),
      (zone) => withCurrentZone(effect, zone)
    )
)

/**
 * Get the current time as a `DateTime.WithZone`, using the `CurrentTimeZone`.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const nowInCurrentZone: Effect.Effect<DateTime.WithZone, never, CurrentTimeZone> = Effect.flatMap(
  now,
  setZoneCurrent
)

// =============================================================================
// mapping
// =============================================================================

const calculateOffset = (date: Date, zone: TimeZone): number =>
  zone._tag === "Offset" ? zone.offset : calculateNamedOffset(date, zone)

const gmtOffsetRegex = /^GMT([+-])(\d{2}):(\d{2})$/
const calculateNamedOffset = (date: Date, zone: TimeZone.Named): number => {
  const parts = zone.format.formatToParts(date)
  const offset = parts[14].value
  if (offset === "GMT") {
    return 0
  }
  const match = gmtOffsetRegex.exec(offset)
  if (match === null) {
    // fallback to using the adjusted date
    return zoneOffset(setZone(date, zone))
  }
  const [, sign, hours, minutes] = match
  return (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes)) * 60 * 1000
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
export const mutate: {
  (f: (plainDate: Date) => void): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, f: (plainDate: Date) => void): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.Input, f: (plainDate: Date) => void): DateTime => {
  const dt = fromInput(self)
  if (dt._tag === "Utc") {
    const date = toDateUtc(dt)
    f(date)
    return fromEpochMillis(date.getTime())
  }
  const adjustedDate = toDateAdjusted(dt)
  const newAdjustedDate = new Date(adjustedDate.getTime())
  f(newAdjustedDate)
  const offset = calculateOffset(newAdjustedDate, dt.zone)
  return setZone(fromEpochMillis(newAdjustedDate.getTime() - offset), dt.zone)
})

/**
 * Transform a `DateTime` by applying a function to the number of milliseconds
 * since the Unix epoch.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mapEpochMillis: {
  (f: (millis: number) => number): (self: DateTime.Input) => DateTime
  (self: DateTime.Input, f: (millis: number) => number): DateTime
} = dual(2, (self: DateTime.Input, f: (millis: number) => number): DateTime => {
  const dt = fromInput(self)
  const newUtc = fromEpochMillis(f(toEpochMillis(dt)))
  return dt._tag === "Utc" ? newUtc : setZone(newUtc, dt.zone)
})

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 */
export const withAdjustedDate: {
  <A>(f: (date: Date) => A): (self: DateTime.WithZone) => A
  <A>(self: DateTime.Input, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime.WithZone, f: (date: Date) => A): A => f(toDateAdjusted(self)))

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 */
export const withUtcDate: {
  <A>(f: (date: Date) => A): (self: DateTime.Input) => A
  <A>(self: DateTime.Input, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime.Input, f: (date: Date) => A): A => f(toDateUtc(self)))

/**
 * @since 3.6.0
 * @category mapping
 */
export const match: {
  <A, B>(options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onWithZone: (_: DateTime.WithZone) => B
  }): (self: DateTime.Input) => A | B
  <A, B>(self: DateTime.Input, options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onWithZone: (_: DateTime.WithZone) => B
  }): A | B
} = dual(2, <A, B>(self: DateTime.Input, options: {
  readonly onUtc: (_: DateTime.Utc) => A
  readonly onWithZone: (_: DateTime.WithZone) => B
}): A | B => {
  const dt = fromInput(self)
  return dt._tag === "Utc" ? options.onUtc(dt) : options.onWithZone(dt)
})

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
  (duration: Duration.DurationInput): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.Input, duration: Duration.DurationInput): DateTime =>
    mapEpochMillis(self, (millis) => millis + Duration.toMillis(duration))
)

/**
 * Subtract the given `Duration` from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const subtractDuration: {
  (duration: Duration.DurationInput): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.Input, duration: Duration.DurationInput): DateTime =>
    mapEpochMillis(self, (millis) => millis - Duration.toMillis(duration))
)

const addMillis = (date: DateTime.Input, amount: number): DateTime => mapEpochMillis(date, (millis) => millis + amount)

/**
 * Add the given `amount` of `unit`'s to a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 */
export const add: {
  (amount: number, unit: DateTime.Unit): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, amount: number, unit: DateTime.Unit): DateTime.PreserveZone<A>
} = dual(3, (self: DateTime.Input, amount: number, unit: DateTime.Unit): DateTime => {
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
  return mutate(self, (date) => {
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
        date.setUTCMonth(date.getUTCMonth() + amount)
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
  (amount: number, unit: DateTime.Unit): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, amount: number, unit: DateTime.Unit): DateTime.PreserveZone<A>
} = dual(3, (self: DateTime.Input, amount: number, unit: DateTime.Unit): DateTime => add(self, -amount, unit))

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
  }): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual((args) => typeof args[1] === "string", (self: DateTime.Input, part: DateTime.DatePart, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime =>
  mutate(self, (date) => {
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
  }): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, part: DateTime.DatePart, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual((args) => typeof args[1] === "string", (self: DateTime.Input, part: DateTime.DatePart, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime =>
  mutate(self, (date) => {
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
  ): (self: DateTime.Input) => string
  (
    self: DateTime.Input,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTimeInput(args[0]), (
  self: DateTime.Input,
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
  ): (self: DateTime.Input) => string
  (
    self: DateTime.Input,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTimeInput(args[0]), (
  self: DateTime.Input,
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
  (format: Intl.DateTimeFormat): (self: DateTime.Input) => string
  (self: DateTime.Input, format: Intl.DateTimeFormat): string
} = dual(2, (self: DateTime.Input, format: Intl.DateTimeFormat): string => format.format(toEpochMillis(self)))

const timeZoneOffset = (self: TimeZone): string => {
  if (self._tag === "Named") {
    return self.id
  }
  const abs = Math.abs(self.offset)
  const offsetHours = Math.floor(abs / (60 * 60 * 1000))
  const offsetMinutes = Math.round((abs % (60 * 60 * 1000)) / (60 * 1000))
  return `${self.offset < 0 ? "-" : "+"}${String(offsetHours).padStart(2, "0")}:${
    String(`${offsetMinutes}`).padStart(2, "0")
  }`
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
export const formatWithZone: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime.WithZone) => string
  (
    self: DateTime.WithZone,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual((args) => isDateTime(args[0]), (
  self: DateTime.WithZone,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => {
  try {
    return new Intl.DateTimeFormat(options?.locale, {
      ...options,
      timeZone: timeZoneOffset(self.zone)
    }).format(toEpochMillis(self))
  } catch (_) {
    return new Intl.DateTimeFormat(options?.locale, {
      ...options,
      timeZone: "UTC"
    }).format(toDateAdjusted(self))
  }
})
