/**
 * @since 3.6.0
 */
import { IllegalArgumentException } from "./Cause.js"
import * as Clock from "./Clock.js"
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
import type { Mutable } from "./Types.js"

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
  [Inspectable.NodeInspectSymbol](this: DateTime) {
    return this.toString()
  },
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
    return `DateTime.Zoned(${formatIsoZoned(this)})`
  }
}

const ProtoTimeZone = {
  [TimeZoneTypeId]: TimeZoneTypeId,
  [Inspectable.NodeInspectSymbol](this: TimeZone) {
    return this.toString()
  }
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
  toString(this: TimeZone.Named) {
    return `TimeZone.Named(${this.id})`
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
  toString(this: TimeZone.Offset) {
    return `TimeZone.Offset(${offsetToString(this.offset)})`
  },
  toJSON(this: TimeZone.Offset) {
    return {
      _id: "TimeZone",
      _tag: "Offset",
      offset: this.offset
    }
  }
}

const makeZonedProto = (epochMillis: number, zone: TimeZone, partsUtc?: DateTime.PartsWithWeekday): Zoned => {
  const self = Object.create(ProtoZoned)
  self.epochMillis = epochMillis
  self.zone = zone
  self.partsUtc = partsUtc
  return self
}

// =============================================================================
// guards
// =============================================================================

/**
 * @since 3.6.0
 * @category guards
 */
export const isDateTime = (u: unknown): u is DateTime => Predicate.hasProperty(u, TypeId)

const isDateTimeArgs = (args: IArguments) => isDateTime(args[0])

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
 * @example
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
 */
export const unsafeMake = <A extends DateTime.Input>(input: A): DateTime.PreserveZone<A> => {
  if (isDateTime(input)) {
    return input as DateTime.PreserveZone<A>
  } else if (input instanceof Date) {
    return unsafeFromDate(input) as DateTime.PreserveZone<A>
  } else if (typeof input === "object") {
    const date = new Date(0)
    setPartsDate(date, input)
    return unsafeFromDate(date) as DateTime.PreserveZone<A>
  }
  return unsafeFromDate(new Date(input)) as DateTime.PreserveZone<A>
}

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
 * import { DateTime } from "effect"
 *
 * DateTime.unsafeMakeZoned(new Date(), { timeZone: "Europe/London" })
 */
export const unsafeMakeZoned = (input: DateTime.Input, options: {
  readonly timeZone: number | string | TimeZone
  readonly adjustForTimeZone?: boolean | undefined
}): Zoned => {
  const self = unsafeMake(input)
  let zone: TimeZone
  if (isTimeZone(options.timeZone)) {
    zone = options.timeZone
  } else if (typeof options.timeZone === "number") {
    zone = zoneMakeOffset(options.timeZone)
  } else {
    const parsedZone = zoneFromString(options.timeZone)
    if (Option.isNone(parsedZone)) {
      throw new IllegalArgumentException(`Invalid time zone: ${options.timeZone}`)
    }
    zone = parsedZone.value
  }
  if (options.adjustForTimeZone !== true) {
    return makeZonedProto(self.epochMillis, zone, self.partsUtc)
  }
  return makeZonedFromAdjusted(self.epochMillis, zone)
}

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
 * import { DateTime } from "effect"
 *
 * DateTime.makeZoned(new Date(), { timeZone: "Europe/London" })
 */
export const makeZoned: (
  input: DateTime.Input,
  options: {
    readonly timeZone: number | string | TimeZone
    readonly adjustForTimeZone?: boolean | undefined
  }
) => Option.Option<Zoned> = Option
  .liftThrowable(unsafeMakeZoned)

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
 */
export const make: <A extends DateTime.Input>(input: A) => Option.Option<DateTime.PreserveZone<A>> = Option
  .liftThrowable(unsafeMake)

const zonedStringRegex = /^(.{17,35})\[(.+)\]$/

/**
 * Create a `DateTime.Zoned` from a string.
 *
 * It uses the format: `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const makeZonedFromString = (input: string): Option.Option<Zoned> => {
  const match = zonedStringRegex.exec(input)
  if (match === null) {
    const offset = parseOffset(input)
    return offset !== null ? makeZoned(input, { timeZone: offset }) : Option.none()
  }
  const [, isoString, timeZone] = match
  return makeZoned(isoString, { timeZone })
}

/**
 * Get the current time using the `Clock` service and convert it to a `DateTime`.
 *
 * @since 3.6.0
 * @category constructors
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 * })
 */
export const now: Effect.Effect<Utc> = Effect.map(Clock.currentTimeMillis, makeUtc)

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

/**
 * Set the time zone of a `DateTime`, returning a new `DateTime.Zoned`.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const zone = DateTime.zoneUnsafeMakeNamed("Europe/London")
 *
 *   // set the time zone
 *   const zoned: DateTime.Zoned = DateTime.setZone(now, zone)
 * })
 */
export const setZone: {
  (zone: TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, zone: TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = dual(isDateTimeArgs, (self: DateTime, zone: TimeZone, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): Zoned =>
  options?.adjustForTimeZone === true
    ? makeZonedFromAdjusted(self.epochMillis, zone)
    : makeZonedProto(self.epochMillis, zone, self.partsUtc))

/**
 * Add a fixed offset time zone to a `DateTime`.
 *
 * The offset is in milliseconds.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *
 *   // set the offset time zone in milliseconds
 *   const zoned: DateTime.Zoned = DateTime.setZoneOffset(now, 3 * 60 * 60 * 1000)
 * })
 */
export const setZoneOffset: {
  (offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = dual(isDateTimeArgs, (self: DateTime, offset: number, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): Zoned => setZone(self, zoneMakeOffset(offset), options))

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

const offsetZoneRegex = /^(?:GMT|[+-])/

/**
 * Try parse a TimeZone from a string
 *
 * @since 3.6.0
 * @category time zones
 */
export const zoneFromString = (zone: string): Option.Option<TimeZone> => {
  if (offsetZoneRegex.test(zone)) {
    const offset = parseOffset(zone)
    return offset === null ? Option.none() : Option.some(zoneMakeOffset(offset))
  }
  return zoneMakeNamed(zone)
}

/**
 * Format a `TimeZone` as a string.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * // Outputs "+03:00"
 * DateTime.zoneToString(DateTime.zoneMakeOffset(3 * 60 * 60 * 1000))
 *
 * // Outputs "Europe/London"
 * DateTime.zoneToString(DateTime.zoneUnsafeMakeNamed("Europe/London"))
 */
export const zoneToString = (self: TimeZone): string => {
  if (self._tag === "Offset") {
    return offsetToString(self.offset)
  }
  return self.id
}

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, `None` will be returned.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   // set the time zone, returns an Option
 *   DateTime.setZoneNamed(now, "Europe/London")
 * })
 */
export const setZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Option.Option<Zoned>
  (self: DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Option.Option<Zoned>
} = dual(
  isDateTimeArgs,
  (self: DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Option.Option<Zoned> => Option.map(zoneMakeNamed(zoneId), (zone) => setZone(self, zone, options))
)

/**
 * Set the time zone of a `DateTime` from an IANA time zone identifier. If the
 * time zone is invalid, an `IllegalArgumentException` will be thrown.
 *
 * @since 3.6.0
 * @category time zones
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   // set the time zone
 *   DateTime.unsafeSetZoneNamed(now, "Europe/London")
 * })
 */
export const unsafeSetZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime) => Zoned
  (self: DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Zoned
} = dual(isDateTimeArgs, (self: DateTime, zoneId: string, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): Zoned => setZone(self, zoneUnsafeMakeNamed(zoneId), options))

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
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const other = DateTime.add(now, { minutes: 1 })
 *
 *   // returns 60000
 *   DateTime.distance(now, other)
 * })
 */
export const distance: {
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
 * @category comparisons
 * @example
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
 */
export const distanceDurationEither: {
  (other: DateTime): (self: DateTime) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime, other: DateTime): Either.Either<Duration.Duration, Duration.Duration>
} = dual(2, (self: DateTime, other: DateTime): Either.Either<Duration.Duration, Duration.Duration> => {
  const diffMillis = distance(self, other)
  return diffMillis > 0
    ? Either.right(Duration.millis(diffMillis))
    : Either.left(Duration.millis(-diffMillis))
})

/**
 * Calulate the distance between two `DateTime` values.
 *
 * @since 3.6.0
 * @category comparisons
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *   const other = DateTime.add(now, { minutes: 1 })
 *
 *   // returns Duration.minutes(1)
 *   DateTime.distanceDuration(now, other)
 * })
 */
export const distanceDuration: {
  (other: DateTime): (self: DateTime) => Duration.Duration
  (self: DateTime, other: DateTime): Duration.Duration
} = dual(
  2,
  (self: DateTime, other: DateTime): Duration.Duration => Duration.millis(Math.abs(distance(self, other)))
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
export const unsafeIsFuture = (self: DateTime): boolean => lessThan(unsafeNow(), self)

/**
 * @since 3.6.0
 * @category comparisons
 */
export const isPast = (self: DateTime): Effect.Effect<boolean> => Effect.map(now, greaterThan(self))

/**
 * @since 3.6.0
 * @category comparisons
 */
export const unsafeIsPast = (self: DateTime): boolean => greaterThan(unsafeNow(), self)

// =============================================================================
// conversions
// =============================================================================

/**
 * Get the UTC `Date` of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDateUtc = (self: DateTime): Date => new Date(self.epochMillis)

/**
 * Convert a `DateTime` to a `Date`, applying the time zone first.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toDate = (self: DateTime): Date => {
  if (self._tag === "Utc") {
    return new Date(self.epochMillis)
  } else if (self.zone._tag === "Offset") {
    return new Date(self.epochMillis + self.zone.offset)
  } else if (self.adjustedEpochMillis !== undefined) {
    return new Date(self.adjustedEpochMillis)
  }
  const parts = self.zone.format.formatToParts(self.epochMillis).filter((_) => _.type !== "literal")
  const date = new Date(0)
  date.setUTCFullYear(
    Number(parts[2].value),
    Number(parts[0].value) - 1,
    Number(parts[1].value)
  )
  date.setUTCHours(
    Number(parts[3].value),
    Number(parts[4].value),
    Number(parts[5].value),
    Number(parts[6].value)
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
export const zonedOffset = (self: Zoned): number => {
  const date = toDate(self)
  return date.getTime() - toEpochMillis(self)
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
export const zonedOffsetIso = (self: Zoned): string => offsetToString(zonedOffset(self))

/**
 * Get the milliseconds since the Unix epoch of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toEpochMillis = (self: DateTime): number => self.epochMillis

/**
 * Remove the time aspect of a `DateTime`, first adjusting for the time
 * zone. It will return a `DateTime.Utc` only containing the date.
 *
 * @since 3.6.0
 * @category conversions
 * @example
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
 */
export const removeTime = (self: DateTime): Utc =>
  withDate(self, (date) => {
    date.setUTCHours(0, 0, 0, 0)
    return makeUtc(date.getTime())
  })

// =============================================================================
// parts
// =============================================================================

const dateToParts = (date: Date): DateTime.PartsWithWeekday => ({
  millis: date.getUTCMilliseconds(),
  seconds: date.getUTCSeconds(),
  minutes: date.getUTCMinutes(),
  hours: date.getUTCHours(),
  day: date.getUTCDate(),
  weekDay: date.getUTCDay(),
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear()
})

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be time zone adjusted.
 *
 * @since 3.6.0
 * @category parts
 */
export const toParts = (self: DateTime): DateTime.PartsWithWeekday => {
  if (self._tag === "Utc") {
    return toPartsUtc(self)
  } else if (self.partsAdjusted !== undefined) {
    return self.partsAdjusted
  }
  self.partsAdjusted = withDate(self, dateToParts)
  return self.partsAdjusted
}

/**
 * Get the different parts of a `DateTime` as an object.
 *
 * The parts will be in UTC.
 *
 * @since 3.6.0
 * @category parts
 */
export const toPartsUtc = (self: DateTime): DateTime.PartsWithWeekday => {
  if (self.partsUtc !== undefined) {
    return self.partsUtc
  }
  self.partsUtc = withDateUtc(self, dateToParts)
  return self.partsUtc
}

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be in the UTC time zone.
 *
 * @since 3.6.0
 * @category parts
 * @example
 * import { DateTime } from "effect"
 *
 * const now = DateTime.unsafeMake({ year: 2024 })
 * const year = DateTime.getPartUtc(now, "year")
 * assert.strictEqual(year, 2024)
 */
export const getPartUtc: {
  (part: keyof DateTime.PartsWithWeekday): (self: DateTime) => number
  (self: DateTime, part: keyof DateTime.PartsWithWeekday): number
} = dual(2, (self: DateTime, part: keyof DateTime.PartsWithWeekday): number => toPartsUtc(self)[part])

/**
 * Get a part of a `DateTime` as a number.
 *
 * The part will be time zone adjusted.
 *
 * @since 3.6.0
 * @category parts
 * @example
 * import { DateTime } from "effect"
 *
 * const now = DateTime.unsafeMakeZoned({ year: 2024 }, { timeZone: "Europe/London" })
 * const year = DateTime.getPart(now, "year")
 * assert.strictEqual(year, 2024)
 */
export const getPart: {
  (part: keyof DateTime.PartsWithWeekday): (self: DateTime) => number
  (self: DateTime, part: keyof DateTime.PartsWithWeekday): number
} = dual(2, (self: DateTime, part: keyof DateTime.PartsWithWeekday): number => toParts(self)[part])

const setPartsDate = (date: Date, parts: Partial<DateTime.PartsWithWeekday>): void => {
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
 * @category parts
 */
export const setParts: {
  (parts: Partial<DateTime.PartsWithWeekday>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.PartsWithWeekday>): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, parts: Partial<DateTime.PartsWithWeekday>): DateTime =>
    mutate(self, (date) => setPartsDate(date, parts))
)

/**
 * Set the different parts of a `DateTime` as an object.
 *
 * @since 3.6.0
 * @category parts
 */
export const setPartsUtc: {
  (parts: Partial<DateTime.PartsWithWeekday>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.PartsWithWeekday>): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, parts: Partial<DateTime.PartsWithWeekday>): DateTime =>
    mutateUtc(self, (date) => setPartsDate(date, parts))
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
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.now
 *
 *   // set the time zone to "Europe/London"
 *   const zoned = yield* DateTime.setZoneCurrent(now)
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
 */
export const setZoneCurrent = (self: DateTime): Effect.Effect<Zoned, never, CurrentTimeZone> =>
  Effect.map(CurrentTimeZone, (zone) => setZone(self, zone))

/**
 * Provide the `CurrentTimeZone` to an effect.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * const zone = DateTime.zoneUnsafeMakeNamed("Europe/London")
 *
 * Effect.gen(function* () {
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZone(zone))
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
 * Provide the `CurrentTimeZone` to an effect, using the system's local time
 * zone.
 *
 * @since 3.6.0
 * @category current time zone
 * @example
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the system's local time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneLocal)
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
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the system's local time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneOffset(3 * 60 * 60 * 1000))
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
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the "Europe/London" time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
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
 * import { DateTime, Effect } from "effect"
 *
 * Effect.gen(function* () {
 *   // will use the "Europe/London" time zone
 *   const now = yield* DateTime.nowInCurrentZone
 * }).pipe(DateTime.withCurrentZoneNamed("Europe/London"))
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
 * Create a Layer from the given time zone offset.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneOffset = (offset: number): Layer.Layer<CurrentTimeZone> =>
  Layer.succeed(CurrentTimeZone, zoneMakeOffset(offset))

/**
 * Create a Layer from the given IANA time zone identifier.
 *
 * @since 3.6.0
 * @category current time zone
 */
export const layerCurrentZoneNamed = (zoneId: string): Layer.Layer<CurrentTimeZone, IllegalArgumentException> =>
  Layer.effect(CurrentTimeZone, zoneMakeNamedEffect(zoneId))

/**
 * Create a Layer from the systems local time zone.
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

const makeZonedFromAdjusted = (adjustedMillis: number, zone: TimeZone): Zoned => {
  const offset = zone._tag === "Offset" ? zone.offset : calculateNamedOffset(adjustedMillis, zone)
  return makeZonedProto(adjustedMillis - offset, zone)
}

const offsetRegex = /([+-])(\d{2}):(\d{2})$/
const parseOffset = (offset: string): number | null => {
  const match = offsetRegex.exec(offset)
  if (match === null) {
    return null
  }
  const [, sign, hours, minutes] = match
  return (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes)) * 60 * 1000
}

const calculateNamedOffset = (adjustedMillis: number, zone: TimeZone.Named): number => {
  const offset = zone.format.formatToParts(adjustedMillis).find((_) => _.type === "timeZoneName")?.value ?? ""
  if (offset === "GMT") {
    return 0
  }
  const result = parseOffset(offset)
  if (result === null) {
    // fallback to using the adjusted date
    return zonedOffset(makeZonedProto(adjustedMillis, zone))
  }
  return result
}

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
} = dual(2, (self: DateTime, f: (date: Date) => void): DateTime => {
  if (self._tag === "Utc") {
    const date = toDateUtc(self)
    f(date)
    return makeUtc(date.getTime())
  }
  const adjustedDate = toDate(self)
  const newAdjustedDate = new Date(adjustedDate.getTime())
  f(newAdjustedDate)
  return makeZonedFromAdjusted(newAdjustedDate.getTime(), self.zone)
})

/**
 * Modify a `DateTime` by applying a function to a cloned UTC `Date` instance.
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
 * @example
 * import { DateTime } from "effect"
 *
 * // add 10 milliseconds
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.mapEpochMillis((millis) => millis + 10)
 * )
 */
export const mapEpochMillis: {
  (f: (millis: number) => number): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, f: (millis: number) => number): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, f: (millis: number) => number): DateTime => {
  const millis = f(toEpochMillis(self))
  return self._tag === "Utc" ? makeUtc(millis) : makeZonedProto(millis, self.zone)
})

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 * @example
 * import { DateTime } from "effect"
 *
 * // get the time zone adjusted date in milliseconds
 * DateTime.unsafeMakeZoned(0, { timeZone: "Europe/London" }).pipe(
 *   DateTime.withDate((date) => date.getTime())
 * )
 */
export const withDate: {
  <A>(f: (date: Date) => A): (self: DateTime) => A
  <A>(self: DateTime, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime, f: (date: Date) => A): A => f(toDate(self)))

/**
 * Using the time zone adjusted `Date`, apply a function to the `Date` and
 * return the result.
 *
 * @since 3.6.0
 * @category mapping
 * @example
 * import { DateTime } from "effect"
 *
 * // get the date in milliseconds
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.withDateUtc((date) => date.getTime())
 * )
 */
export const withDateUtc: {
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
 * @example
 * import { DateTime } from "effect"
 *
 * // add 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.addDuration("5 minutes")
 * )
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
 * @example
 * import { DateTime } from "effect"
 *
 * // subtract 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.subtractDuration("5 minutes")
 * )
 */
export const subtractDuration: {
  (duration: Duration.DurationInput): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, duration: Duration.DurationInput): DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime, duration: Duration.DurationInput): DateTime =>
    mapEpochMillis(self, (millis) => millis - Duration.toMillis(duration))
)

const addMillis = (date: Date, amount: number): void => {
  date.setTime(date.getTime() + amount)
}

/**
 * Add the given `amount` of `unit`'s to a `DateTime`.
 *
 * The time zone is taken into account when adding days, weeks, months, and
 * years.
 *
 * @since 3.6.0
 * @category math
 * @example
 * import { DateTime } from "effect"
 *
 * // add 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.add({ minutes: 5 })
 * )
 */
export const add: {
  (parts: Partial<DateTime.PartsForMath>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.PartsForMath>): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, parts: Partial<DateTime.PartsForMath>): DateTime =>
  mutate(self, (date) => {
    if (parts.millis) {
      addMillis(date, parts.millis)
    }
    if (parts.seconds) {
      addMillis(date, parts.seconds * 1000)
    }
    if (parts.minutes) {
      addMillis(date, parts.minutes * 60 * 1000)
    }
    if (parts.hours) {
      addMillis(date, parts.hours * 60 * 60 * 1000)
    }
    if (parts.days) {
      date.setUTCDate(date.getUTCDate() + parts.days)
    }
    if (parts.weeks) {
      date.setUTCDate(date.getUTCDate() + parts.weeks * 7)
    }
    if (parts.months) {
      const day = date.getUTCDate()
      date.setUTCMonth(date.getUTCMonth() + parts.months + 1, 0)
      if (day < date.getUTCDate()) {
        date.setUTCDate(day)
      }
    }
    if (parts.years) {
      const day = date.getUTCDate()
      const month = date.getUTCMonth()
      date.setUTCFullYear(
        date.getUTCFullYear() + parts.years,
        month + 1,
        0
      )
      if (day < date.getUTCDate()) {
        date.setUTCDate(day)
      }
    }
  }))

/**
 * Subtract the given `amount` of `unit`'s from a `DateTime`.
 *
 * @since 3.6.0
 * @category math
 * @example
 * import { DateTime } from "effect"
 *
 * // subtract 5 minutes
 * DateTime.unsafeMake(0).pipe(
 *   DateTime.subtract({ minutes: 5 })
 * )
 */
export const subtract: {
  (parts: Partial<DateTime.PartsForMath>): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, parts: Partial<DateTime.PartsForMath>): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime, parts: Partial<DateTime.PartsForMath>): DateTime => {
  const newParts = {} as Partial<Mutable<DateTime.PartsForMath>>
  for (const key in parts) {
    newParts[key as keyof DateTime.PartsForMath] = -1 * parts[key as keyof DateTime.PartsForMath]!
  }
  return add(self, newParts)
})

function startOfDate(date: Date, part: DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}) {
  switch (part) {
    case "second": {
      date.setUTCMilliseconds(0)
      break
    }
    case "minute": {
      date.setUTCSeconds(0, 0)
      break
    }
    case "hour": {
      date.setUTCMinutes(0, 0, 0)
      break
    }
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
}

/**
 * Converts a `DateTime` to the start of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-01T00:00:00Z"
 * DateTime.unsafeMake("2024-01-01T12:00:00Z").pipe(
 *   DateTime.startOf("day"),
 *   DateTime.formatIso
 * )
 */
export const startOf: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime, part: DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime => mutate(self, (date) => startOfDate(date, part, options)))

function endOfDate(date: Date, part: DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}) {
  switch (part) {
    case "second": {
      date.setUTCMilliseconds(999)
      break
    }
    case "minute": {
      date.setUTCSeconds(59, 999)
      break
    }
    case "hour": {
      date.setUTCMinutes(59, 59, 999)
      break
    }
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
}

/**
 * Converts a `DateTime` to the end of the given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-01T23:59:59.999Z"
 * DateTime.unsafeMake("2024-01-01T12:00:00Z").pipe(
 *   DateTime.endOf("day"),
 *   DateTime.formatIso
 * )
 */
export const endOf: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime, part: DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime => mutate(self, (date) => endOfDate(date, part, options)))

/**
 * Converts a `DateTime` to the nearest given `part`.
 *
 * If the part is `week`, the `weekStartsOn` option can be used to specify the
 * day of the week that the week starts on. The default is 0 (Sunday).
 *
 * @since 3.6.0
 * @category math
 * @example
 * import { DateTime } from "effect"
 *
 * // returns "2024-01-02T00:00:00Z"
 * DateTime.unsafeMake("2024-01-01T12:01:00Z").pipe(
 *   DateTime.nearest("day"),
 *   DateTime.formatIso
 * )
 */
export const nearest: {
  (part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime>(self: A, part: DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime, part: DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime =>
  mutate(self, (date) => {
    if (part === "milli") return
    const millis = date.getTime()
    const start = new Date(millis)
    startOfDate(start, part, options)
    const startMillis = start.getTime()
    const end = new Date(millis)
    endOfDate(end, part, options)
    const endMillis = end.getTime() + 1
    const diffStart = millis - startMillis
    const diffEnd = endMillis - millis
    if (diffStart < diffEnd) {
      date.setTime(startMillis)
    } else {
      date.setTime(endMillis)
    }
  }))

// =============================================================================
// formatting
// =============================================================================

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
} = dual(isDateTimeArgs, (
  self: DateTime,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => {
  try {
    return new Intl.DateTimeFormat(options?.locale, {
      timeZone: self._tag === "Utc" ? "UTC" : intlTimeZone(self.zone),
      ...options
    }).format(self.epochMillis)
  } catch (_) {
    return new Intl.DateTimeFormat(options?.locale, {
      timeZone: "UTC",
      ...options
    }).format(toDate(self))
  }
})

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
} = dual(isDateTimeArgs, (
  self: DateTime,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => new Intl.DateTimeFormat(options?.locale, options).format(self.epochMillis))

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
} = dual(isDateTimeArgs, (
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
  }).format(self.epochMillis))

/**
 * Format a `DateTime` as a string using the `DateTimeFormat` API.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIntl: {
  (format: Intl.DateTimeFormat): (self: DateTime) => string
  (self: DateTime, format: Intl.DateTimeFormat): string
} = dual(2, (self: DateTime, format: Intl.DateTimeFormat): string => format.format(self.epochMillis))

/**
 * Format a `DateTime` as a UTC ISO string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIso = (self: DateTime): string => toDateUtc(self).toISOString()

/**
 * Format a `DateTime` as a time zone adjusted ISO date string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoDate = (self: DateTime): string => toDate(self).toISOString().slice(0, 10)

/**
 * Format a `DateTime` as a UTC ISO date string.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoDateUtc = (self: DateTime): string => toDateUtc(self).toISOString().slice(0, 10)

/**
 * Format a `DateTime.Zoned` as a ISO string with an offset.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoOffset = (self: DateTime): string => {
  const date = toDate(self)
  return self._tag === "Utc" ? date.toISOString() : `${date.toISOString().slice(0, -1)}${zonedOffsetIso(self)}`
}

/**
 * Format a `DateTime.Zoned` as a string.
 *
 * It uses the format: `YYYY-MM-DDTHH:mm:ss.sss+HH:MM[Time/Zone]`.
 *
 * @since 3.6.0
 * @category formatting
 */
export const formatIsoZoned = (self: Zoned): string =>
  self.zone._tag === "Offset" ? formatIsoOffset(self) : `${formatIsoOffset(self)}[${self.zone.id}]`
