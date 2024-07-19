/**
 * @since 3.6.0
 */
import { Duration } from "effect"
import { IllegalArgumentException } from "./Cause.js"
import * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import * as Either from "./Either.js"
import * as Equal from "./Equal.js"
import type { LazyArg } from "./Function.js"
import { dual, pipe } from "./Function.js"
import { globalValue } from "./GlobalValue.js"
import * as Hash from "./Hash.js"
import * as Inspectable from "./Inspectable.js"
import * as Option from "./Option.js"
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
    plainDateCache?: number
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

/**
 * @since 3.6.0
 * @category time zones
 */
export class CurrentTimeZone extends Context.Tag("effect/DateTime/CurrentTimeZone")<
  CurrentTimeZone,
  TimeZone
>() {}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  ...Inspectable.BaseProto
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
  toJSON(this: DateTime.Utc) {
    return {
      _op: "DateTime",
      _tag: this._tag,
      epochMillis: this.epochMillis
    }
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
  toJSON(this: DateTime.WithZone) {
    return {
      _id: "DateTime",
      _tag: this._tag,
      utc: this.utc.toJSON(),
      zone: this.zone
    }
  }
}

const ProtoTimeZone = {
  [TimeZoneTypeId]: TimeZoneTypeId,
  ...Inspectable.BaseProto
}

const ProtoTimeZoneNamed = {
  ...ProtoTimeZone,
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
export const isUtc = (self: DateTime): self is DateTime.Utc => self._tag === "Utc"

/**
 * @since 3.6.0
 * @category guards
 */
export const isWithZone = (self: DateTime): self is DateTime.WithZone => self._tag === "WithZone"

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
 * Safely create a `DateTime` from a `Date`, returning `None` if the `Date` is
 * invalid.
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromDate: (date: Date) => Option.Option<DateTime.Utc> = Option.liftThrowable(unsafeFromDate)

/**
 * Parse a string into a `DateTime`, using `Date.parse`.
 *
 * @since 3.6.0
 * @category constructors
 */
export const fromString = (input: string): Option.Option<DateTime.Utc> => fromDate(new Date(input))

/**
 * Get the current time using the `Clock` service and convert it to a
 * `DateTime`.
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

/**
 * Set the time zone of a `DateTime` to the current time zone, which is
 * determined by the `CurrentTimeZone` service.
 *
 * @since 3.6.0
 * @category time zones
 */
export const setZoneCurrent = (self: DateTime.Input): Effect.Effect<DateTime.WithZone, never, CurrentTimeZone> =>
  Effect.map(CurrentTimeZone, (zone) => setZone(self, zone))

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
 * Get the UTC `Date` of a `DateTime`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toUtcDate = (self: DateTime.Input): Date => new Date(toEpochMillis(self))

/**
 * Convert a `DateTime` to a `Date`, applying the time zone first if necessary.
 *
 * The returned Date will be offset by the time zone if the `DateTime` is a
 * `DateTime.WithZone`.
 *
 * @since 3.6.0
 * @category conversions
 */
export const toPlainDate = (self: DateTime.Input): Date => {
  const dt = fromInput(self)
  if (dt._tag === "Utc") {
    return new Date(dt.epochMillis)
  } else if (dt.zone._tag === "Offset") {
    return new Date(dt.utc.epochMillis + dt.zone.offset)
  } else if (dt.plainDateCache !== undefined) {
    return new Date(dt.plainDateCache)
  }
  const parts = dt.zone.format.formatToParts(dt.utc.epochMillis)
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
  dt.plainDateCache = date.getTime()
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
  const plainDate = toPlainDate(dt)
  return plainDate.getTime() - toEpochMillis(dt)
}

const calcutateOffset = (date: Date, zone: TimeZone): number =>
  zone._tag === "Offset" ? zone.offset : calcutateNamedOffset(date, zone)

const gmtOffsetRegex = /^GMT([+-])(\d{2}):(\d{2})$/
const calcutateNamedOffset = (date: Date, zone: TimeZone.Named): number => {
  const parts = zone.format.formatToParts(date)
  const offset = parts[14].value
  if (offset === "GMT") {
    return 0
  }
  const match = gmtOffsetRegex.exec(offset)
  if (match === null) {
    // fallback to using the plain date
    return zoneOffset(setZone(date, zone))
  }
  const [, sign, hours, minutes] = match
  return (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes)) * 60 * 1000
}

/**
 * Modify a `DateTime` by applying a function to the underlying plain `Date`.
 *
 * The `Date` will first have the time zone applied if necessary, and then be
 * converted back to a `DateTime` with the same time zone.
 *
 * @since 3.6.0
 * @category mapping
 */
export const mutate: {
  (f: (plainDate: Date) => void): <A extends DateTime.Input>(self: A) => DateTime.PreserveZone<A>
  <A extends DateTime.Input>(self: A, f: (plainDate: Date) => void): DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.Input, f: (plainDate: Date) => void): DateTime => {
  const dt = fromInput(self)
  const plainDate = toPlainDate(dt)
  const newPlainDate = new Date(plainDate.getTime())
  f(newPlainDate)
  if (dt._tag === "Utc") {
    return fromEpochMillis(newPlainDate.getTime())
  }
  const offset = calcutateOffset(newPlainDate, dt.zone)
  return setZone(fromEpochMillis(newPlainDate.getTime() - offset), dt.zone)
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
  const prevEpochMillis = toEpochMillis(dt)
  const newUtc = fromEpochMillis(f(prevEpochMillis))
  return dt._tag === "Utc" ? newUtc : setZone(newUtc, dt.zone)
})

/**
 * @since 3.6.0
 * @category pattern matching
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

/**
 * Provide the `CurrentTimeZone` to an effect.
 *
 * @since 3.6.0
 * @category time zones
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
 * @category time zones
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
 * @category constructors
 */
export const nowInCurrentZone: Effect.Effect<DateTime.WithZone, never, CurrentTimeZone> = Effect.flatMap(
  now,
  setZoneCurrent
)

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
export const diff: {
  (other: DateTime.Input): (self: DateTime.Input) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime.Input, other: DateTime.Input): Either.Either<Duration.Duration, Duration.Duration>
} = dual(2, (self: DateTime.Input, other: DateTime.Input): Either.Either<Duration.Duration, Duration.Duration> => {
  const selfEpochMillis = toEpochMillis(self)
  const otherEpochMillis = toEpochMillis(other)
  const diffMillis = otherEpochMillis - selfEpochMillis
  return diffMillis > 0
    ? Either.right(Duration.millis(diffMillis))
    : Either.left(Duration.millis(-diffMillis))
})

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
  (amount: number, unit: DateTime.Unit): (self: DateTime.Input) => DateTime
  (self: DateTime.Input, amount: number, unit: DateTime.Unit): DateTime
} = dual(3, (self: DateTime.Input, amount: number, unit: DateTime.Unit): DateTime => add(self, -amount, unit))
