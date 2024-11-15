import { IllegalArgumentException } from "../Cause.js"
import * as Clock from "../Clock.js"
import type * as DateTime from "../DateTime.js"
import * as Duration from "../Duration.js"
import type * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import * as equivalence from "../Equivalence.js"
import type { LazyArg } from "../Function.js"
import { dual, pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as Hash from "../Hash.js"
import * as Inspectable from "../Inspectable.js"
import * as Option from "../Option.js"
import * as order from "../Order.js"
import { pipeArguments } from "../Pipeable.js"
import * as Predicate from "../Predicate.js"
import type { Mutable } from "../Types.js"
import * as internalEffect from "./core-effect.js"
import * as core from "./core.js"

/** @internal */
export const TypeId: DateTime.TypeId = Symbol.for("effect/DateTime") as DateTime.TypeId

/** @internal */
export const TimeZoneTypeId: DateTime.TimeZoneTypeId = Symbol.for("effect/DateTime/TimeZone") as DateTime.TimeZoneTypeId

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Inspectable.NodeInspectSymbol](this: DateTime.DateTime) {
    return this.toString()
  },
  toJSON(this: DateTime.DateTime) {
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
    return `DateTime.Utc(${toDateUtc(this).toJSON()})`
  }
}

const ProtoZoned = {
  ...Proto,
  _tag: "Zoned",
  [Hash.symbol](this: DateTime.Zoned) {
    return pipe(
      Hash.number(this.epochMillis),
      Hash.combine(Hash.hash(this.zone)),
      Hash.cached(this)
    )
  },
  [Equal.symbol](this: DateTime.Zoned, that: unknown) {
    return isDateTime(that) && that._tag === "Zoned" && this.epochMillis === that.epochMillis &&
      Equal.equals(this.zone, that.zone)
  },
  toString(this: DateTime.Zoned) {
    return `DateTime.Zoned(${formatIsoZoned(this)})`
  }
}

const ProtoTimeZone = {
  [TimeZoneTypeId]: TimeZoneTypeId,
  [Inspectable.NodeInspectSymbol](this: DateTime.TimeZone) {
    return this.toString()
  }
}

const ProtoTimeZoneNamed = {
  ...ProtoTimeZone,
  _tag: "Named",
  [Hash.symbol](this: DateTime.TimeZone.Named) {
    return Hash.cached(this, Hash.string(`Named:${this.id}`))
  },
  [Equal.symbol](this: DateTime.TimeZone.Named, that: unknown) {
    return isTimeZone(that) && that._tag === "Named" && this.id === that.id
  },
  toString(this: DateTime.TimeZone.Named) {
    return `TimeZone.Named(${this.id})`
  },
  toJSON(this: DateTime.TimeZone.Named) {
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
  [Hash.symbol](this: DateTime.TimeZone.Offset) {
    return Hash.cached(this, Hash.string(`Offset:${this.offset}`))
  },
  [Equal.symbol](this: DateTime.TimeZone.Offset, that: unknown) {
    return isTimeZone(that) && that._tag === "Offset" && this.offset === that.offset
  },
  toString(this: DateTime.TimeZone.Offset) {
    return `TimeZone.Offset(${offsetToString(this.offset)})`
  },
  toJSON(this: DateTime.TimeZone.Offset) {
    return {
      _id: "TimeZone",
      _tag: "Offset",
      offset: this.offset
    }
  }
}

/** @internal */
export const makeZonedProto = (
  epochMillis: number,
  zone: DateTime.TimeZone,
  partsUtc?: DateTime.DateTime.PartsWithWeekday
): DateTime.Zoned => {
  const self = Object.create(ProtoZoned)
  self.epochMillis = epochMillis
  self.zone = zone
  self.partsUtc = partsUtc
  return self
}

// =============================================================================
// guards
// =============================================================================

/** @internal */
export const isDateTime = (u: unknown): u is DateTime.DateTime => Predicate.hasProperty(u, TypeId)

const isDateTimeArgs = (args: IArguments) => isDateTime(args[0])

/** @internal */
export const isTimeZone = (u: unknown): u is DateTime.TimeZone => Predicate.hasProperty(u, TimeZoneTypeId)

/** @internal */
export const isTimeZoneOffset = (u: unknown): u is DateTime.TimeZone.Offset => isTimeZone(u) && u._tag === "Offset"

/** @internal */
export const isTimeZoneNamed = (u: unknown): u is DateTime.TimeZone.Named => isTimeZone(u) && u._tag === "Named"

/** @internal */
export const isUtc = (self: DateTime.DateTime): self is DateTime.Utc => self._tag === "Utc"

/** @internal */
export const isZoned = (self: DateTime.DateTime): self is DateTime.Zoned => self._tag === "Zoned"

// =============================================================================
// instances
// =============================================================================

/** @internal */
export const Equivalence: equivalence.Equivalence<DateTime.DateTime> = equivalence.make((a, b) =>
  a.epochMillis === b.epochMillis
)

/** @internal */
export const Order: order.Order<DateTime.DateTime> = order.make((self, that) =>
  self.epochMillis < that.epochMillis ? -1 : self.epochMillis > that.epochMillis ? 1 : 0
)

/** @internal */
export const clamp: {
  (options: { minimum: DateTime.DateTime; maximum: DateTime.DateTime }): (self: DateTime.DateTime) => DateTime.DateTime
  (self: DateTime.DateTime, options: { minimum: DateTime.DateTime; maximum: DateTime.DateTime }): DateTime.DateTime
} = order.clamp(Order)

// =============================================================================
// constructors
// =============================================================================

const makeUtc = (epochMillis: number): DateTime.Utc => {
  const self = Object.create(ProtoUtc)
  self.epochMillis = epochMillis
  return self
}

/** @internal */
export const unsafeFromDate = (date: Date): DateTime.Utc => {
  const epochMillis = date.getTime()
  if (Number.isNaN(epochMillis)) {
    throw new IllegalArgumentException("Invalid date")
  }
  return makeUtc(epochMillis)
}

/** @internal */
export const unsafeMake = <A extends DateTime.DateTime.Input>(input: A): DateTime.DateTime.PreserveZone<A> => {
  if (isDateTime(input)) {
    return input as DateTime.DateTime.PreserveZone<A>
  } else if (input instanceof Date) {
    return unsafeFromDate(input) as DateTime.DateTime.PreserveZone<A>
  } else if (typeof input === "object") {
    const date = new Date(0)
    setPartsDate(date, input)
    return unsafeFromDate(date) as DateTime.DateTime.PreserveZone<A>
  }
  return unsafeFromDate(new Date(input)) as DateTime.DateTime.PreserveZone<A>
}

/** @internal */
export const unsafeMakeZoned = (input: DateTime.DateTime.Input, options?: {
  readonly timeZone?: number | string | DateTime.TimeZone | undefined
  readonly adjustForTimeZone?: boolean | undefined
}): DateTime.Zoned => {
  if (options?.timeZone === undefined && isDateTime(input) && isZoned(input)) {
    return input
  }
  const self = unsafeMake(input)
  let zone: DateTime.TimeZone
  if (options?.timeZone === undefined) {
    const offset = new Date(self.epochMillis).getTimezoneOffset() * -60 * 1000
    zone = zoneMakeOffset(offset)
  } else if (isTimeZone(options?.timeZone)) {
    zone = options.timeZone
  } else if (typeof options?.timeZone === "number") {
    zone = zoneMakeOffset(options.timeZone)
  } else {
    const parsedZone = zoneFromString(options.timeZone)
    if (Option.isNone(parsedZone)) {
      throw new IllegalArgumentException(`Invalid time zone: ${options.timeZone}`)
    }
    zone = parsedZone.value
  }
  if (options?.adjustForTimeZone !== true) {
    return makeZonedProto(self.epochMillis, zone, self.partsUtc)
  }
  return makeZonedFromAdjusted(self.epochMillis, zone)
}

/** @internal */
export const makeZoned: (
  input: DateTime.DateTime.Input,
  options?: {
    readonly timeZone?: number | string | DateTime.TimeZone | undefined
    readonly adjustForTimeZone?: boolean | undefined
  }
) => Option.Option<DateTime.Zoned> = Option.liftThrowable(unsafeMakeZoned)

/** @internal */
export const make: <A extends DateTime.DateTime.Input>(input: A) => Option.Option<DateTime.DateTime.PreserveZone<A>> =
  Option.liftThrowable(unsafeMake)

const zonedStringRegex = /^(.{17,35})\[(.+)\]$/

/** @internal */
export const makeZonedFromString = (input: string): Option.Option<DateTime.Zoned> => {
  const match = zonedStringRegex.exec(input)
  if (match === null) {
    const offset = parseOffset(input)
    return offset !== null ? makeZoned(input, { timeZone: offset }) : Option.none()
  }
  const [, isoString, timeZone] = match
  return makeZoned(isoString, { timeZone })
}

/** @internal */
export const now: Effect.Effect<DateTime.Utc> = core.map(Clock.currentTimeMillis, makeUtc)

/** @internal */
export const unsafeNow: LazyArg<DateTime.Utc> = () => makeUtc(Date.now())

// =============================================================================
// time zones
// =============================================================================

/** @internal */
export const setZone: {
  (zone: DateTime.TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime.DateTime) => DateTime.Zoned
  (self: DateTime.DateTime, zone: DateTime.TimeZone, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): DateTime.Zoned
} = dual(isDateTimeArgs, (self: DateTime.DateTime, zone: DateTime.TimeZone, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): DateTime.Zoned =>
  options?.adjustForTimeZone === true
    ? makeZonedFromAdjusted(self.epochMillis, zone)
    : makeZonedProto(self.epochMillis, zone, self.partsUtc))

/** @internal */
export const setZoneOffset: {
  (offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime.DateTime) => DateTime.Zoned
  (self: DateTime.DateTime, offset: number, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): DateTime.Zoned
} = dual(isDateTimeArgs, (self: DateTime.DateTime, offset: number, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): DateTime.Zoned => setZone(self, zoneMakeOffset(offset), options))

const validZoneCache = globalValue("effect/DateTime/validZoneCache", () => new Map<string, DateTime.TimeZone.Named>())

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

const zoneMakeIntl = (format: Intl.DateTimeFormat): DateTime.TimeZone.Named => {
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

/** @internal */
export const zoneUnsafeMakeNamed = (zoneId: string): DateTime.TimeZone.Named => {
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

/** @internal */
export const zoneMakeOffset = (offset: number): DateTime.TimeZone.Offset => {
  const zone = Object.create(ProtoTimeZoneOffset)
  zone.offset = offset
  return zone
}

/** @internal */
export const zoneMakeNamed: (zoneId: string) => Option.Option<DateTime.TimeZone.Named> = Option.liftThrowable(
  zoneUnsafeMakeNamed
)

/** @internal */
export const zoneMakeNamedEffect = (zoneId: string): Effect.Effect<DateTime.TimeZone.Named, IllegalArgumentException> =>
  internalEffect.try_({
    try: () => zoneUnsafeMakeNamed(zoneId),
    catch: (e) => e as IllegalArgumentException
  })

/** @internal */
export const zoneMakeLocal = (): DateTime.TimeZone.Named =>
  zoneMakeIntl(new Intl.DateTimeFormat("en-US", formatOptions))

const offsetZoneRegex = /^(?:GMT|[+-])/

/** @internal */
export const zoneFromString = (zone: string): Option.Option<DateTime.TimeZone> => {
  if (offsetZoneRegex.test(zone)) {
    const offset = parseOffset(zone)
    return offset === null ? Option.none() : Option.some(zoneMakeOffset(offset))
  }
  return zoneMakeNamed(zone)
}

/** @internal */
export const zoneToString = (self: DateTime.TimeZone): string => {
  if (self._tag === "Offset") {
    return offsetToString(self.offset)
  }
  return self.id
}

/** @internal */
export const setZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime.DateTime) => Option.Option<DateTime.Zoned>
  (self: DateTime.DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Option.Option<DateTime.Zoned>
} = dual(
  isDateTimeArgs,
  (self: DateTime.DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): Option.Option<DateTime.Zoned> => Option.map(zoneMakeNamed(zoneId), (zone) => setZone(self, zone, options))
)

/** @internal */
export const unsafeSetZoneNamed: {
  (zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): (self: DateTime.DateTime) => DateTime.Zoned
  (self: DateTime.DateTime, zoneId: string, options?: {
    readonly adjustForTimeZone?: boolean | undefined
  }): DateTime.Zoned
} = dual(isDateTimeArgs, (self: DateTime.DateTime, zoneId: string, options?: {
  readonly adjustForTimeZone?: boolean | undefined
}): DateTime.Zoned => setZone(self, zoneUnsafeMakeNamed(zoneId), options))

// =============================================================================
// comparisons
// =============================================================================

/** @internal */
export const distance: {
  (other: DateTime.DateTime): (self: DateTime.DateTime) => number
  (self: DateTime.DateTime, other: DateTime.DateTime): number
} = dual(2, (self: DateTime.DateTime, other: DateTime.DateTime): number => toEpochMillis(other) - toEpochMillis(self))

/** @internal */
export const distanceDurationEither: {
  (other: DateTime.DateTime): (self: DateTime.DateTime) => Either.Either<Duration.Duration, Duration.Duration>
  (self: DateTime.DateTime, other: DateTime.DateTime): Either.Either<Duration.Duration, Duration.Duration>
} = dual(
  2,
  (self: DateTime.DateTime, other: DateTime.DateTime): Either.Either<Duration.Duration, Duration.Duration> => {
    const diffMillis = distance(self, other)
    return diffMillis > 0
      ? Either.right(Duration.millis(diffMillis))
      : Either.left(Duration.millis(-diffMillis))
  }
)

/** @internal */
export const distanceDuration: {
  (other: DateTime.DateTime): (self: DateTime.DateTime) => Duration.Duration
  (self: DateTime.DateTime, other: DateTime.DateTime): Duration.Duration
} = dual(
  2,
  (self: DateTime.DateTime, other: DateTime.DateTime): Duration.Duration =>
    Duration.millis(Math.abs(distance(self, other)))
)

/** @internal */
export const min: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => DateTime.DateTime
  (self: DateTime.DateTime, that: DateTime.DateTime): DateTime.DateTime
} = order.min(Order)

/** @internal */
export const max: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => DateTime.DateTime
  (self: DateTime.DateTime, that: DateTime.DateTime): DateTime.DateTime
} = order.max(Order)

/** @internal */
export const greaterThan: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => boolean
  (self: DateTime.DateTime, that: DateTime.DateTime): boolean
} = order.greaterThan(Order)

/** @internal */
export const greaterThanOrEqualTo: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => boolean
  (self: DateTime.DateTime, that: DateTime.DateTime): boolean
} = order.greaterThanOrEqualTo(Order)

/** @internal */
export const lessThan: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => boolean
  (self: DateTime.DateTime, that: DateTime.DateTime): boolean
} = order.lessThan(Order)

/** @internal */
export const lessThanOrEqualTo: {
  (that: DateTime.DateTime): (self: DateTime.DateTime) => boolean
  (self: DateTime.DateTime, that: DateTime.DateTime): boolean
} = order.lessThanOrEqualTo(Order)

/** @internal */
export const between: {
  (options: { minimum: DateTime.DateTime; maximum: DateTime.DateTime }): (self: DateTime.DateTime) => boolean
  (self: DateTime.DateTime, options: { minimum: DateTime.DateTime; maximum: DateTime.DateTime }): boolean
} = order.between(Order)

/** @internal */
export const isFuture = (self: DateTime.DateTime): Effect.Effect<boolean> => core.map(now, lessThan(self))

/** @internal */
export const unsafeIsFuture = (self: DateTime.DateTime): boolean => lessThan(unsafeNow(), self)

/** @internal */
export const isPast = (self: DateTime.DateTime): Effect.Effect<boolean> => core.map(now, greaterThan(self))

/** @internal */
export const unsafeIsPast = (self: DateTime.DateTime): boolean => greaterThan(unsafeNow(), self)

// =============================================================================
// conversions
// =============================================================================

/** @internal */
export const toDateUtc = (self: DateTime.DateTime): Date => new Date(self.epochMillis)

/** @internal */
export const toDate = (self: DateTime.DateTime): Date => {
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

/** @internal */
export const zonedOffset = (self: DateTime.Zoned): number => {
  const date = toDate(self)
  return date.getTime() - toEpochMillis(self)
}

const offsetToString = (offset: number): string => {
  const abs = Math.abs(offset)
  const hours = Math.floor(abs / (60 * 60 * 1000))
  const minutes = Math.round((abs % (60 * 60 * 1000)) / (60 * 1000))
  return `${offset < 0 ? "-" : "+"}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/** @internal */
export const zonedOffsetIso = (self: DateTime.Zoned): string => offsetToString(zonedOffset(self))

/** @internal */
export const toEpochMillis = (self: DateTime.DateTime): number => self.epochMillis

/** @internal */
export const removeTime = (self: DateTime.DateTime): DateTime.Utc =>
  withDate(self, (date) => {
    date.setUTCHours(0, 0, 0, 0)
    return makeUtc(date.getTime())
  })

// =============================================================================
// parts
// =============================================================================

const dateToParts = (date: Date): DateTime.DateTime.PartsWithWeekday => ({
  millis: date.getUTCMilliseconds(),
  seconds: date.getUTCSeconds(),
  minutes: date.getUTCMinutes(),
  hours: date.getUTCHours(),
  day: date.getUTCDate(),
  weekDay: date.getUTCDay(),
  month: date.getUTCMonth() + 1,
  year: date.getUTCFullYear()
})

/** @internal */
export const toParts = (self: DateTime.DateTime): DateTime.DateTime.PartsWithWeekday => {
  if (self._tag === "Utc") {
    return toPartsUtc(self)
  } else if (self.partsAdjusted !== undefined) {
    return self.partsAdjusted
  }
  self.partsAdjusted = withDate(self, dateToParts)
  return self.partsAdjusted
}

/** @internal */
export const toPartsUtc = (self: DateTime.DateTime): DateTime.DateTime.PartsWithWeekday => {
  if (self.partsUtc !== undefined) {
    return self.partsUtc
  }
  self.partsUtc = withDateUtc(self, dateToParts)
  return self.partsUtc
}

/** @internal */
export const getPartUtc: {
  (part: keyof DateTime.DateTime.PartsWithWeekday): (self: DateTime.DateTime) => number
  (self: DateTime.DateTime, part: keyof DateTime.DateTime.PartsWithWeekday): number
} = dual(2, (self: DateTime.DateTime, part: keyof DateTime.DateTime.PartsWithWeekday): number => toPartsUtc(self)[part])

/** @internal */
export const getPart: {
  (part: keyof DateTime.DateTime.PartsWithWeekday): (self: DateTime.DateTime) => number
  (self: DateTime.DateTime, part: keyof DateTime.DateTime.PartsWithWeekday): number
} = dual(2, (self: DateTime.DateTime, part: keyof DateTime.DateTime.PartsWithWeekday): number => toParts(self)[part])

const setPartsDate = (date: Date, parts: Partial<DateTime.DateTime.PartsWithWeekday>): void => {
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

/** @internal */
export const setParts: {
  (
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): DateTime.DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.DateTime, parts: Partial<DateTime.DateTime.PartsWithWeekday>): DateTime.DateTime =>
    mutate(self, (date) => setPartsDate(date, parts))
)

/** @internal */
export const setPartsUtc: {
  (
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): DateTime.DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.DateTime, parts: Partial<DateTime.DateTime.PartsWithWeekday>): DateTime.DateTime =>
    mutateUtc(self, (date) => setPartsDate(date, parts))
)

// =============================================================================
// mapping
// =============================================================================

const makeZonedFromAdjusted = (adjustedMillis: number, zone: DateTime.TimeZone): DateTime.Zoned => {
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

const calculateNamedOffset = (adjustedMillis: number, zone: DateTime.TimeZone.Named): number => {
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

/** @internal */
export const mutate: {
  (f: (date: Date) => void): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, f: (date: Date) => void): DateTime.DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.DateTime, f: (date: Date) => void): DateTime.DateTime => {
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

/** @internal */
export const mutateUtc: {
  (f: (date: Date) => void): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, f: (date: Date) => void): DateTime.DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.DateTime, f: (date: Date) => void): DateTime.DateTime =>
  mapEpochMillis(self, (millis) => {
    const date = new Date(millis)
    f(date)
    return date.getTime()
  }))

/** @internal */
export const mapEpochMillis: {
  (f: (millis: number) => number): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, f: (millis: number) => number): DateTime.DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.DateTime, f: (millis: number) => number): DateTime.DateTime => {
  const millis = f(toEpochMillis(self))
  return self._tag === "Utc" ? makeUtc(millis) : makeZonedProto(millis, self.zone)
})

/** @internal */
export const withDate: {
  <A>(f: (date: Date) => A): (self: DateTime.DateTime) => A
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime.DateTime, f: (date: Date) => A): A => f(toDate(self)))

/** @internal */
export const withDateUtc: {
  <A>(f: (date: Date) => A): (self: DateTime.DateTime) => A
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A
} = dual(2, <A>(self: DateTime.DateTime, f: (date: Date) => A): A => f(toDateUtc(self)))

/** @internal */
export const match: {
  <A, B>(options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onZoned: (_: DateTime.Zoned) => B
  }): (self: DateTime.DateTime) => A | B
  <A, B>(self: DateTime.DateTime, options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onZoned: (_: DateTime.Zoned) => B
  }): A | B
} = dual(2, <A, B>(self: DateTime.DateTime, options: {
  readonly onUtc: (_: DateTime.Utc) => A
  readonly onZoned: (_: DateTime.Zoned) => B
}): A | B => self._tag === "Utc" ? options.onUtc(self) : options.onZoned(self))

// =============================================================================
// math
// =============================================================================

/** @internal */
export const addDuration: {
  (duration: Duration.DurationInput): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, duration: Duration.DurationInput): DateTime.DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.DateTime, duration: Duration.DurationInput): DateTime.DateTime =>
    mapEpochMillis(self, (millis) => millis + Duration.toMillis(duration))
)

/** @internal */
export const subtractDuration: {
  (duration: Duration.DurationInput): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, duration: Duration.DurationInput): DateTime.DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.DateTime, duration: Duration.DurationInput): DateTime.DateTime =>
    mapEpochMillis(self, (millis) => millis - Duration.toMillis(duration))
)

const addMillis = (date: Date, amount: number): void => {
  date.setTime(date.getTime() + amount)
}

/** @internal */
export const add: {
  (
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): DateTime.DateTime.PreserveZone<A>
} = dual(
  2,
  (self: DateTime.DateTime, parts: Partial<DateTime.DateTime.PartsForMath>): DateTime.DateTime =>
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
    })
)

/** @internal */
export const subtract: {
  (
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): DateTime.DateTime.PreserveZone<A>
} = dual(2, (self: DateTime.DateTime, parts: Partial<DateTime.DateTime.PartsForMath>): DateTime.DateTime => {
  const newParts = {} as Partial<Mutable<DateTime.DateTime.PartsForMath>>
  for (const key in parts) {
    newParts[key as keyof DateTime.DateTime.PartsForMath] = -1 * parts[key as keyof DateTime.DateTime.PartsForMath]!
  }
  return add(self, newParts)
})

const startOfDate = (date: Date, part: DateTime.DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}) => {
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

/** @internal */
export const startOf: {
  (part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime.DateTime, part: DateTime.DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime.DateTime => mutate(self, (date) => startOfDate(date, part, options)))

const endOfDate = (date: Date, part: DateTime.DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}) => {
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

/** @internal */
export const endOf: {
  (part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime.DateTime, part: DateTime.DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime.DateTime => mutate(self, (date) => endOfDate(date, part, options)))

/** @internal */
export const nearest: {
  (part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): <A extends DateTime.DateTime>(self: A) => DateTime.DateTime.PreserveZone<A>
  <A extends DateTime.DateTime>(self: A, part: DateTime.DateTime.UnitSingular, options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }): DateTime.DateTime.PreserveZone<A>
} = dual(isDateTimeArgs, (self: DateTime.DateTime, part: DateTime.DateTime.UnitSingular, options?: {
  readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
}): DateTime.DateTime =>
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

const intlTimeZone = (self: DateTime.TimeZone): string => {
  if (self._tag === "Named") {
    return self.id
  }
  return offsetToString(self.offset)
}

/** @internal */
export const format: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual(isDateTimeArgs, (
  self: DateTime.DateTime,
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

/** @internal */
export const formatLocal: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual(isDateTimeArgs, (
  self: DateTime.DateTime,
  options?:
    | Intl.DateTimeFormatOptions & {
      readonly locale?: string | undefined
    }
    | undefined
): string => new Intl.DateTimeFormat(options?.locale, options).format(self.epochMillis))

/** @internal */
export const formatUtc: {
  (
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | Intl.DateTimeFormatOptions & {
        readonly locale?: string | undefined
      }
      | undefined
  ): string
} = dual(isDateTimeArgs, (
  self: DateTime.DateTime,
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

/** @internal */
export const formatIntl: {
  (format: Intl.DateTimeFormat): (self: DateTime.DateTime) => string
  (self: DateTime.DateTime, format: Intl.DateTimeFormat): string
} = dual(2, (self: DateTime.DateTime, format: Intl.DateTimeFormat): string => format.format(self.epochMillis))

/** @internal */
export const formatIso = (self: DateTime.DateTime): string => toDateUtc(self).toISOString()

/** @internal */
export const formatIsoDate = (self: DateTime.DateTime): string => toDate(self).toISOString().slice(0, 10)

/** @internal */
export const formatIsoDateUtc = (self: DateTime.DateTime): string => toDateUtc(self).toISOString().slice(0, 10)

/** @internal */
export const formatIsoOffset = (self: DateTime.DateTime): string => {
  const date = toDate(self)
  return self._tag === "Utc" ? date.toISOString() : `${date.toISOString().slice(0, -1)}${zonedOffsetIso(self)}`
}

/** @internal */
export const formatIsoZoned = (self: DateTime.Zoned): string =>
  self.zone._tag === "Offset" ? formatIsoOffset(self) : `${formatIsoOffset(self)}[${self.zone.id}]`
