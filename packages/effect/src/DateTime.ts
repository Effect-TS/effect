/**
 * @since 3.6.0
 */
import type { IllegalArgumentException } from "./Cause.js"
import * as Context from "./Context.js"
import type * as Duration from "./Duration.js"
import * as Effect from "./Effect.js"
import type * as Either from "./Either.js"
import type * as equivalence from "./Equivalence.js"
import { dual, type LazyArg } from "./Function.js"
import type { Inspectable } from "./Inspectable.js"
import * as Internal from "./internal/dateTime.js"
import * as Layer from "./Layer.js"
import type * as Option from "./Option.js"
import type * as order from "./Order.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 3.6.0
 * @category type ids
 */
export const TypeId: unique symbol = Internal.TypeId

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
  partsUtc: DateTime.PartsWithWeekday
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
  partsAdjusted?: DateTime.PartsWithWeekday
  /** @internal */
  partsUtc?: DateTime.PartsWithWeekday
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
  export type Unit = UnitSingular | UnitPlural

  /**
   * @since 3.6.0
   * @category models
   */
  export type UnitSingular =
    | "milli"
    | "second"
    | "minute"
    | "hour"
    | "day"
    | "week"
    | "month"
    | "year"

  /**
   * @since 3.6.0
   * @category models
   */
  export type UnitPlural =
    | "millis"
    | "seconds"
    | "minutes"
    | "hours"
    | "days"
    | "weeks"
    | "months"
    | "years"

  /**
   * @since 3.6.0
   * @category models
   */
  export interface PartsWithWeekday {
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
  export interface Parts {
    readonly millis: number
    readonly seconds: number
    readonly minutes: number
    readonly hours: number
    readonly day: number
    readonly month: number
    readonly year: number
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface PartsForMath {
    readonly millis: number
    readonly seconds: number
    readonly minutes: number
    readonly hours: number
    readonly days: number
    readonly weeks: number
    readonly months: number
    readonly years: number
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Proto extends Pipeable, Inspectable {
    readonly [TypeId]: TypeId
  }
}

/**
 * @since 3.6.0
 * @category type ids
 */
export const TimeZoneTypeId: unique symbol = Internal.TimeZoneTypeId

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
  export interface Proto extends Inspectable {
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

// =============================================================================
// guards
// =============================================================================

/**
 * @since 3.6.0
 * @category guards
 */
export const isDateTime: (u: unknown) => u is DateTime = Internal.isDateTime

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZone: (u: unknown) => u is TimeZone = Internal.isTimeZone

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZoneOffset: (u: unknown) => u is TimeZone.Offset = Internal.isTimeZoneOffset

/**
 * @since 3.6.0
 * @category guards
 */
export const isTimeZoneNamed: (u: unknown) => u is TimeZone.Named = Internal.isTimeZoneNamed

/**
 * @since 3.6.0
 * @category guards
 */
export const isUtc: (self: DateTime) => self is Utc = Internal.isUtc

/**
 * @since 3.6.0
 * @category guards
 */
export const isZoned: (self: DateTime) => self is Zoned = Internal.isZoned

// =============================================================================
// instances
// =============================================================================

/**
 * @since 3.6.0
 * @category instances
 */
export const Equivalence: equivalence.Equivalence<DateTime> = Internal.Equivalence

/**
 * @since 3.6.0
 * @category instances
 */
export const Order: order.Order<DateTime> = Internal.Order

/**
 * @since 3.6.0
 */
export const clamp: {
  (options: { minimum: DateTime; maximum: DateTime }): (self: DateTime) => DateTime
  (self: DateTime, options: { minimum: DateTime; maximum: DateTime }): DateTime
} = Internal.clamp

// =============================================================================
// constructors
// =============================================================================

/**
 * Create a `DateTime` from a `Date`.
 *
 * If the `Date` is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeFromDate: (date: Date) => Utc = Internal.unsafeFromDate

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
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // from Date
 * DateTime.unsafeMake(new Date())
 *
 * // from parts
 * DateTime.unsafeMake({ year: 2024 })
 *
 * // from string
 * DateTime.unsafeMake("2024-01-01")
 * ```
 */
export const unsafeMake: <A extends DateTime.Input>(input: A) => DateTime.PreserveZone<A> = Internal.unsafeMake

/**
 * Create a `DateTime.Zoned` using `DateTime.unsafeMake` and a time zone.
 *
 * The input is treated as UTC and then the time zone is attached, unless
 * `adjustForTimeZone` is set to `true`. In that case, the input is treated as
 * already in the time zone.
 *
 * @since 3.6.0
 * @category constructors
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * DateTime.unsafeMakeZoned(new Date(), { timeZone: "Europe/London" })
 * ```
 */
export const unsafeMakeZoned: (input: DateTime.Input, options?: {
  readonly timeZone?: number | string | TimeZone | undefined
  readonly adjustForTimeZone?: boolean | undefined
}) => Zoned = Internal.unsafeMakeZoned

/**
 * Create a `DateTime.Zoned` using `DateTime.make` and a time zone.
 *
 * The input is treated as UTC and then the time zone is attached.
 *
 * If the date time input or time zone is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category constructors
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * DateTime.makeZoned(new Date(), { timeZone: "Europe/London" })
 * ```
 */
export const makeZoned: (
  input: DateTime.Input,
  options?: {
    readonly timeZone?: number | string | TimeZone | undefined
    readonly adjustForTimeZone?: boolean | undefined
  }
) => Option.Option<Zoned> = Internal.makeZoned

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
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // from Date
 * DateTime.make(new Date())
 *
 * // from parts
 * DateTime.make({ year: 2024 })
 *
 * // from string
 * DateTime.make("2024-01-01")
 * ```
 */
export const make: <A extends DateTime.Input>(input: A) => Option.Option<DateTime.PreserveZone<A>> = Internal.make

/**
 * Create a `DateTime.Zoned` from a string.
 *
 * It uses the format: `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const makeZonedFromString: (input: string) => Option.Option<Zoned> = Internal.makeZonedFromString

/**
 * Get the current time using the `Clock` service and convert it to a `DateTime`.
 *
 * @since 3.6.0
 * @category constructors
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 * })
 * ```
 */
export const now: Effect.Effect<Utc> = Internal.now

/**
 * Get the current time using `Date.now`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const unsafeNow: LazyArg<Utc> = Internal.unsafeNow

// =============================================================================
// time zones
// =============================================================================

/**
 * Set the time zone of a `DateTime`, returning a new `DateTime.Zoned`.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const zone = DateTime.zoneUnsafeMakeNamed("Europe/London")
 *
 *   // set the time zone
 *   const zoned: DateTime.Zoned = DateTime.setZone(now, zone)
 * })
 * ```
 */
export const setZone: {
  (zone: TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, zone: TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = Internal.setZone

/**
 * Add a fixed offset time zone to a `DateTime`.
 *
 * The offset is in milliseconds.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *
 *   // set the offset time zone in milliseconds
 *   const zoned: DateTime.Zoned = DateTime.setZoneOffset(now, 3 * 60 * 60 * 1000)
 * })
 * ```
 */
export const setZoneOffset: {
  (offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = Internal.setZoneOffset

/**
 * Attempt to create a named time zone from a IANA time zone identifier.
 *
 * If the time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneUnsafeMakeNamed: (zoneId: string) => TimeZone.Named = Internal.zoneUnsafeMakeNamed

/**
 * Create a fixed offset time zone.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeOffset: (offset: number) => TimeZone.Offset = Internal.zoneMakeOffset

/**
 * Create a named time zone from a IANA time zone identifier. If the time zone
 * is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeNamed: (zoneId: string) => Option.Option<TimeZone.Named> = Internal.zoneMakeNamed

/**
 * Create a named time zone from a IANA time zone identifier. If the time zone
 * is invalid, it will fail with an `IllegalArgumentException`.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeNamedEffect: (zoneId: string) => Effect.Effect<TimeZone.Named, IllegalArgumentException> =
  Internal.zoneMakeNamedEffect

/**
 * Create a named time zone from the system's local time zone.
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneMakeLocal: () => TimeZone.Named = Internal.zoneMakeLocal

/**
 * Try parse a TimeZone from a string
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneFromString: (zone: string) => Option.Option<TimeZone> = Internal.zoneFromString

/**
 * Format a `TimeZone` as a string.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * // Outputs "+03:00"
 * DateTime.zoneToString(DateTime.zoneMakeOffset(3 * 60 * 60 * 1000))
 *
 * // Outputs "Europe/London"
 * DateTime.zoneToString(DateTime.zoneUnsafeMakeNamed("Europe/London"))
 * ```
 */
export const zoneToString: (self: TimeZone) => string = Internal.zoneToString

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   // set the time zone, returns an Option
 *   DateTime.setZoneNamed(now, "Europe/London")
 * })
 * ```
 */
export const setZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Option.Option<Zoned>
  (self: DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Option.Option<Zoned>
} = Internal.setZoneNamed

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   // set the time zone
 *   DateTime.unsafeSetZoneNamed(now, "Europe/London")
 * })
 * ```
 */
export const unsafeSetZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = Internal.unsafeSetZoneNamed

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
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const other = DateTime.add(now, { minutes: 1 })
 *
 *   // returns 60000
 *   DateTime.distance(now, other)
 * })
 * ```
 */
export const distance: {
  (other: DateTime): (self: DateTime) => number
  (self: DateTime, other: DateTime): number
} = Internal.distance

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
 * @category comparisons
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const other = DateTime.add(now, { minutes: 1 })
 *
 *   // returns Either.right(Duration.minutes(1))
 *   DateTime.distanceDurationEither(now, other)
 *
 *   // returns Either.left(Duration.minutes(1))
 *   DateTime.distanceDurationEither(other, now)
 * })
 * ```
 */
export const distanceDurationEither: {
  (other: DateTime): (self: DateTime) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime, other: DateTime): Either.Either<Duration.Duration, Duration.Duration>
} = Internal.distanceDurationEither

/**
 * Calulate the distance between two `DateTime` values.
 *
 * @since 3.6.0
 * @category comparisons
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const other = DateTime.add(now, { minutes: 1 })
 *
 *   // returns Duration.minutes(1)
 *   DateTime.distanceDuration(now, other)
 * })
 * ```
 */
export const distanceDuration: {
  (other: DateTime): (self: DateTime) => Duration.Duration
  (self: DateTime, other: DateTime): Duration.Duration
} = Internal.distanceDuration

/**
 * @since 3.6.0
 * @category comparisons
 */
export const min: {
  (that: DateTime): (self: DateTime) => DateTime
  (self: DateTime, that: DateTime): DateTime
} = Internal.min

/**
 * @since 3.6.0
 * @category comparisons
 */
export const max: {
  (that: DateTime): (self: DateTime) => DateTime
  (self: DateTime, that: DateTime): DateTime
} = Internal.max

/**
 * @since 3.6.0
 * @category comparisons
 */
export const greaterThan: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = Internal.greaterThan

/**
 * @since 3.6.0
 * @category comparisons
 */
export const greaterThanOrEqualTo: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = Internal.greaterThanOrEqualTo

/**
 * @since 3.6.0
 * @category comparisons
 */
export const lessThan: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = Internal.lessThan

/**
 * @since 3.6.0
 * @category comparisons
 */
export const lessThanOrEqualTo: {
  (that: DateTime): (self: DateTime) => boolean
  (self: DateTime, that: DateTime): boolean
} = Internal.lessThanOrEqualTo

/**
 * @since 3.6.0
 * @category comparisons
 */
export const between: {
  (options: { minimum: DateTime; maximum: DateTime }): (self: DateTime) => boolean
  (self: DateTime, options: { minimum: DateTime; maximum: DateTime }): boolean
} = Internal.between

/**
 * @since 3.6.0
 * @category comparisons
 */
export const isFuture: (self: DateTime) => Effect.Effect<boolean> = Internal.isFuture

/**
 * @since 3.6.0
 * @category comparisons
 */
export const unsafeIsFuture: (self: DateTime) => boolean = Internal.unsafeIsFuture

/**
 * @since 3.6.0
 * @category comparisons
 */
export const isPast: (self: DateTime) => Effect.Effect<boolean> = Internal.isPast

/**
 * @since 3.6.0
 * @category comparisons
 */
export const unsafeIsPast: (self: DateTime) => boolean = Internal.unsafeIsPast

// =============================================================================
// conversions
// =============================================================================

/**
 * Get the UTC `Date` of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateUtc: (self: DateTime) => Date = Internal.toDateUtc

/**
 * Convert a `DateTime` to a `Date`, applying the time zone first.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDate: (self: DateTime) => Date = Internal.toDate

/**
 * Calculate the time zone offset of a `DateTime.Zoned` in milliseconds.
 *
 * @since 3.6.0
 * @category conversions
 */
export const zonedOffset: (self: Zoned) => number = Internal.zonedOffset

/**
 * Calculate the time zone offset of a `DateTime` in milliseconds.
 *
 * The offset is formatted as "±HH:MM".
 *
 * @since 3.6.0
 * @category conversions
 */
export const zonedOffsetIso: (self: Zoned) => string = Internal.zonedOffsetIso

/**
 * Get the milliseconds since the Unix epoch of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toEpochMillis: (self: DateTime) => number = Internal.toEpochMillis

/**
 * Remove the time aspect of a `DateTime`, first adjusting for the time
 * zone. It will return a `DateTime.Utc` only containing the date.
 *
 * @since 3.6.0
 * @category conversions
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-01T00:00:00Z"
 * DateTime.unsafeMakeZoned("2024-01-01T05:00:00Z", {
 *   timeZone: "Pacific/Auckland",
 *   adjustForTimeZone: true
 * }).pipe(
 *   DateTime.removeTime,
 *   DateTime.formatIso
 * )
 * ```
 */
export const removeTime: (self: DateTime) => Utc = Internal.removeTime

// =============================================================================
// parts
// =============================================================================

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be time zone adjusted.
 *
 * @since 3.6.0
 * @category parts
 */
export const toParts: (self: DateTime) => DateTime.PartsWithWeekday = Internal.toParts

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be in UTC.
 *
 * @since 3.6.0
 * @category parts
 */
export const toPartsUtc: (self: DateTime) => DateTime.PartsWithWeekday = Internal.toPartsUtc

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be in the UTC time zone.
 *
 * @since 3.6.0
 * @category parts
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * const now = DateTime.unsafeMake({ year: 2024 })
 * const year = DateTime.getPartUtc(now, "year")
 * assert.strictEqual(year, 2024)
 * ```
 */
export const getPartUtc: {
  (part: keyof DateTime.PartsWithWeekday): (self: DateTime) => number
  (self: DateTime, part: keyof DateTime.PartsWithWeekday): number
} = Internal.getPartUtc

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be time zone adjusted.
 *
 * @since 3.6.0
 * @category parts
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * const now = DateTime.unsafeMakeZoned({ year: 2024 }, { timeZone: "Europe/London" })
 * const year = DateTime.getPart(now, "year")
 * assert.strictEqual(year, 2024)
 * ```
 */
export const getPart: {
  (part: keyof DateTime.PartsWithWeekday): (self: DateTime) => number
  (self: DateTime, part: keyof DateTime.PartsWithWeekday): number
} = Internal.getPart

/**
 * Set the different parts of a `DateTime` as an object.
 *
 * The Date will be time zone adjusted.
 *
 * @since 3.6.0
 * @category parts
 */
export const setParts: {
  (
    parts: Partial<DateTime.PartsWithWeekday>
  ): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(
    self: A,
    parts: Partial<DateTime.PartsWithWeekday>
  ): DateTime.PreserveZone<A>
} = Internal.setParts

/**
 * Set the different parts of a `DateTime` as an object.
 *
 * @since 3.6.0
 * @category parts
 */
export const setPartsUtc: {
  (
    parts: Partial<DateTime.PartsWithWeekday>
  ): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(
    self: A,
    parts: Partial<DateTime.PartsWithWeekday>
  ): DateTime.PreserveZone<A>
} = Internal.setPartsUtc

// =============================================================================
// current time zone
// =============================================================================

/**
 * @since 3.11.0
 * @category current time zone
 */
export class CurrentTimeZone extends Context.Tag("effect/DateTime/CurrentTimeZone")<CurrentTimeZone, TimeZone>() {}

/**
 * Set the time zone of a `DateTime` to the current time zone, which is
 * determined by the `CurrentTimeZone` service.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *
 *   // set the time zone to "Europe/London"
 *   const zoned = yield* DateTime.setZoneCurrent(now)
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
 * ```
 */
export const setZoneCurrent = (self: DateTime): Effect.Effect<Zoned, never, CurrentTimeZone> =>
  Effect.map(CurrentTimeZone, (zone) => setZone(self, zone))

/**
 * Provide the `CurrentTimeZone` to an effect.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * const zone = DateTime.zoneUnsafeMakeNamed("Europe/London")
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZone(zone))
 * ```
 */
export const withCurrentZone: {
  (
    zone: TimeZone
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, zone: TimeZone): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
} = dual(
  2,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    zone: TimeZone
  ): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>> => Effect.provideService(effect, CurrentTimeZone, zone)
)

/**
 * Provide the `CurrentTimeZone` to an effect, using the system's local time
 * zone.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the system's local time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneLocal)
 * ```
 */
export const withCurrentZoneLocal = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>> =>
  Effect.provideServiceEffect(effect, CurrentTimeZone, Effect.sync(zoneMakeLocal))

/**
 * Provide the `CurrentTimeZone` to an effect, using a offset.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the system's local time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneOffset(3 * 60 * 60 * 1000))
 * ```
 */
export const withCurrentZoneOffset: {
  (offset: number): <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, offset: number): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, offset: number): Effect.Effect<A, E, Exclude<R, CurrentTimeZone>> =>
    Effect.provideService(effect, CurrentTimeZone, zoneMakeOffset(offset))
)

/**
 * Provide the `CurrentTimeZone` to an effect using an IANA time zone
 * identifier.
 *
 * If the time zone is invalid, it will fail with an `IllegalArgumentException`.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the "Europe/London" time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
 * ```
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
 * @example
 * ```ts
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the "Europe/London" time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
 * ```
 */
export const nowInCurrentZone: Effect.Effect<Zoned, never, CurrentTimeZone> = Effect.flatMap(now, setZoneCurrent)

// =============================================================================
// mapping
// =============================================================================

/**
 * Modify a `DateTime` by applying a function to a cloned `Date` instance.
 *
 * The `Date` will first have the time zone applied if possible, and then be
 * converted back to a `DateTime` within the same time zone.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mutate: {
  (f: (date: Date) => void): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (date: Date) => void): DateTime.PreserveZone<A>
} = Internal.mutate

/**
 * Modify a `DateTime` by applying a function to a cloned UTC `Date` instance.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mutateUtc: {
  (f: (date: Date) => void): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (date: Date) => void): DateTime.PreserveZone<A>
} = Internal.mutateUtc

/**
 * Transform a `DateTime` by applying a function to the number of milliseconds
 * since the Unix epoch.
 *
 * @since 3.6.0
 * @category mapping
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // add 10 milliseconds
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.mapEpochMillis((millis) => millis + 10)
 * )
 * ```
 */
export const mapEpochMillis: {
  (f: (millis: number) => number): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (millis: number) => number): DateTime.PreserveZone<A>
} = Internal.mapEpochMillis

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // get the time zone adjusted date in milliseconds
 * DateTime.unsafeMakeZoned(0, { timeZone: "Europe/London" }).pipe(
 *   DateTime.withDate((date) => date.getTime())
 * )
 * ```
 */
export const withDate: {
  <A>(f: (date: Date) => A): (self: DateTime) => A
  <A>(self: DateTime, f: (date: Date) => A): A
} = Internal.withDate

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // get the date in milliseconds
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.withDateUtc((date) => date.getTime())
 * )
 * ```
 */
export const withDateUtc: {
  <A>(f: (date: Date) => A): (self: DateTime) => A
  <A>(self: DateTime, f: (date: Date) => A): A
} = Internal.withDateUtc

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
} = Internal.match

// =============================================================================
// math
// =============================================================================

/**
 * Add the given `Duration` to a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // add 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.addDuration("5 minutes")
 * )
 * ```
 */
export const addDuration: {
  (duration: Duration.DurationInput): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = Internal.addDuration

/**
 * Subtract the given `Duration` from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // subtract 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.subtractDuration("5 minutes")
 * )
 * ```
 */
export const subtractDuration: {
  (duration: Duration.DurationInput): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = Internal.subtractDuration

/**
 * Add the given `amount` of `unit`'s to a `DateTime`.
 *
 * The time zone is taken into account when adding days, weeks, months, and
 * years.
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // add 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.add({ minutes: 5 })
 * )
 * ```
 */
export const add: {
  (
    parts: Partial<DateTime.PartsForMath>
  ): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(
    self: A,
    parts: Partial<DateTime.PartsForMath>
  ): DateTime.PreserveZone<A>
} = Internal.add

/**
 * Subtract the given `amount` of `unit`'s from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // subtract 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.subtract({ minutes: 5 })
 * )
 * ```
 */
export const subtract: {
  (
    parts: Partial<DateTime.PartsForMath>
  ): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(
    self: A,
    parts: Partial<DateTime.PartsForMath>
  ): DateTime.PreserveZone<A>
} = Internal.subtract

/**
 * Converts a `DateTime` to the start of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-01T00:00:00Z"
 * DateTime.unsafeMake("2024-01-01T12:00:00Z").pipe(
 *   DateTime.startOf("day"),
 *   DateTime.formatIso
 * )
 * ```
 */
export const startOf: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = Internal.startOf

/**
 * Converts a `DateTime` to the end of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-01T23:59:59.999Z"
 * DateTime.unsafeMake("2024-01-01T12:00:00Z").pipe(
 *   DateTime.endOf("day"),
 *   DateTime.formatIso
 * )
 * ```
 */
export const endOf: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = Internal.endOf

/**
 * Converts a `DateTime` to the nearest given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * ```ts
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-02T00:00:00Z"
 * DateTime.unsafeMake("2024-01-01T12:01:00Z").pipe(
 *   DateTime.nearest("day"),
 *   DateTime.formatIso
 * )
 * ```
 */
export const nearest: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = Internal.nearest

// =============================================================================
// formatting
// =============================================================================

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
} = Internal.format

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * It will use the system's local time zone & locale.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatLocal: {
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
} = Internal.formatLocal

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
} = Internal.formatUtc

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIntl: {
  (format: Intl.DateTimeFormat): (self: DateTime) => string
  (self: DateTime, format: Intl.DateTimeFormat): string
} = Internal.formatIntl

/**
 * Format a `DateTime` as a UTC ISO string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIso: (self: DateTime) => string = Internal.formatIso

/**
 * Format a `DateTime` as a time zone adjusted ISO date string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoDate: (self: DateTime) => string = Internal.formatIsoDate

/**
 * Format a `DateTime` as a UTC ISO date string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoDateUtc: (self: DateTime) => string = Internal.formatIsoDateUtc

/**
 * Format a `DateTime.Zoned` as a ISO string with an offset.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoOffset: (self: DateTime) => string = Internal.formatIsoOffset

/**
 * Format a `DateTime.Zoned` as a string.
 *
 * It uses the format: `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]`.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoZoned: (self: Zoned) => string = Internal.formatIsoZoned

/**
 * Create a Layer from the given time zone.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZone = (zone: TimeZone): Layer.Layer<CurrentTimeZone> => Layer.succeed(CurrentTimeZone, zone)

/**
 * Create a Layer from the given time zone offset.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneOffset = (offset: number): Layer.Layer<CurrentTimeZone> =>
  Layer.succeed(CurrentTimeZone, Internal.zoneMakeOffset(offset))

/**
 * Create a Layer from the given IANA time zone identifier.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneNamed = (
  zoneId: string
): Layer.Layer<CurrentTimeZone, IllegalArgumentException> =>
  Layer.effect(CurrentTimeZone, Internal.zoneMakeNamedEffect(zoneId))

/**
 * Create a Layer from the systems local time zone.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneLocal: Layer.Layer<CurrentTimeZone> = Layer.sync(CurrentTimeZone, zoneMakeLocal)
