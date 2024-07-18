/**
 * @since 3.6.0
 */
import { IllegalArgumentException } from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"

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
  export interface Proto extends Pipeable {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface Utc extends Proto {
    readonly _tag: "Utc"
    readonly date: Date
  }

  /**
   * @since 3.6.0
   * @category models
   */
  export interface WithZone extends Proto {
    readonly _tag: "WithZone"
    readonly utc: Utc
    readonly zone: TimeZone
  }
}

/**
 * @since 3.6.0
 * @category time zones
 */
export type TimeZone = TimeZone.Offset | TimeZone.Named

/**
 * @since 3.6.0
 * @category time zones
 */
export declare namespace TimeZone {
  /**
   * @since 3.6.0
   * @category time zones
   */
  export interface Offset {
    readonly _tag: "Offset"
    readonly offset: number
  }

  /**
   * @since 3.6.0
   * @category time zones
   */
  export interface Named {
    readonly _tag: "Named"
    readonly id: string
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
  }
}
const ProtoUtc = {
  ...Proto,
  _tag: "Utc"
}
const ProtoWithZone = {
  ...Proto,
  _tag: "WithZone"
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
export const isUtc = (self: DateTime): self is DateTime.Utc => self._tag === "Utc"

/**
 * @since 3.6.0
 * @category guards
 */
export const isWithZone = (self: DateTime): self is DateTime.WithZone => self._tag === "WithZone"

/**
 * @since 3.6.0
 * @category constructors
 */
export const fromEpochMillis = (epochMillis: number): DateTime => {
  const self = Object.create(ProtoUtc)
  self.date = new Date(epochMillis)
  return self
}

/**
 * @since 3.6.0
 * @category constructors
 */
export const unsafeFromDate = (date: Date): DateTime => {
  if (isNaN(date.getTime())) {
    throw new IllegalArgumentException("Invalid date")
  }
  const self = Object.create(ProtoUtc)
  self.date = date
  return self
}

/**
 * @since 3.6.0
 * @category constructors
 */
export const fromInput = (input: DateTime.Input): DateTime => {
  if (isDateTime(input)) {
    return input
  } else if (typeof input === "number") {
    return fromEpochMillis(input)
  }
  return unsafeFromDate(input)
}

/**
 * @since 3.6.0
 * @category constructors
 */
export const fromDate: (date: Date) => Option.Option<DateTime> = Option.liftThrowable(unsafeFromDate)

/**
 * @since 3.6.0
 * @category constructors
 */
export const fromString = (input: string): Option.Option<DateTime> => fromDate(new Date(input))

/**
 * @since 3.6.0
 * @category constructors
 */
export const now: Effect.Effect<DateTime> = Effect.map(
  Effect.clock,
  (clock) => fromEpochMillis(clock.unsafeCurrentTimeMillis())
)

/**
 * @since 3.6.0
 * @category time zones
 */
export const setZone: {
  (zone: TimeZone): (self: DateTime) => DateTime
  (self: DateTime, zone: TimeZone): DateTime
} = dual(2, (self: DateTime, zone: TimeZone) => {
  const selfWithZone = Object.create(ProtoWithZone)
  selfWithZone.utc = self._tag === "Utc" ? self : self.utc
  selfWithZone.zone = zone
  return selfWithZone
})

/**
 * @since 3.6.0
 * @category time zones
 */
export const setZoneOffset: {
  (offset: number): (self: DateTime) => DateTime
  (self: DateTime, offset: number): DateTime
} = dual(2, (self: DateTime, offset: number) => setZone(self, { _tag: "Offset", offset }))

/**
 * @since 3.6.0
 * @category time zones
 */
export const unsafeMakeZoneNamed = (zoneId: string): TimeZone.Named => {
  const format = new Intl.DateTimeFormat("en-US", { timeZone: zoneId })
  return { _tag: "Named", id: format.resolvedOptions().timeZone }
}

/**
 * @since 3.6.0
 * @category time zones
 */
export const makeZoneNamed: (zoneId: string) => Option.Option<TimeZone.Named> = Option.liftThrowable(
  unsafeMakeZoneNamed
)

/**
 * @since 3.6.0
 * @category time zones
 */
export const setZoneNamed: {
  (zoneId: string): (self: DateTime) => Option.Option<DateTime>
  (self: DateTime, zoneId: string): Option.Option<DateTime>
} = dual(2, (self: DateTime, zoneId: string) => Option.map(makeZoneNamed(zoneId), (zone) => setZone(self, zone)))

/**
 * @since 3.6.0
 * @category time zones
 */
export const unsafeSetZoneNamed: {
  (zoneId: string): (self: DateTime) => DateTime
  (self: DateTime, zoneId: string): DateTime
} = dual(2, (self: DateTime, zoneId: string) => setZone(self, unsafeMakeZoneNamed(zoneId)))

/**
 * @since 3.6.0
 * @category conversions
 */
export const toEpochMillis = (self: DateTime): number =>
  self._tag === "WithZone" ? self.utc.date.getTime() : self.date.getTime()

/**
 * @since 3.6.0
 * @category pattern matching
 */
export const match: {
  <A, B>(options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onWithZone: (_: DateTime.WithZone) => B
  }): (self: DateTime) => A | B
  <A, B>(self: DateTime, options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onWithZone: (_: DateTime.WithZone) => B
  }): A | B
} = dual(2, <A, B>(self: DateTime, options: {
  readonly onUtc: (_: DateTime.Utc) => A
  readonly onWithZone: (_: DateTime.WithZone) => B
}): A | B => self._tag === "Utc" ? options.onUtc(self) : options.onWithZone(self))

/**
 * @since 3.6.0
 * @category pattern matching
 */
export const matchUtc: {
  <A>(f: (_: DateTime.Utc) => A): (self: DateTime) => A
  <A>(self: DateTime, f: (_: DateTime.Utc) => A): A
} = dual(2, <A>(self: DateTime, f: (_: DateTime.Utc) => A) => f(self._tag === "WithZone" ? self.utc : self))

/**
 * @since 3.6.0
 * @category time zones
 */
export const withCurrentZone = (self: DateTime): Effect.Effect<DateTime, never, CurrentTimeZone> =>
  Effect.map(CurrentTimeZone, (zone) => setZone(self, zone))
