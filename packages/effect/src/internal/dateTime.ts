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
  Object.defineProperty(self, "partsUtc", {
    value: partsUtc,
    enumerable: false,
    writable: true
  })
  Object.defineProperty(self, "adjustedEpochMillis", {
    value: undefined,
    enumerable: false,
    writable: true
  })
  Object.defineProperty(self, "partsAdjusted", {
    value: undefined,
    enumerable: false,
    writable: true
  })
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
  <Min extends DateTime.DateTime, Max extends DateTime.DateTime>(options: {
    readonly minimum: Min
    readonly maximum: Max
  }): <A extends DateTime.DateTime>(self: A) => A | Min | Max
  <A extends DateTime.DateTime, Min extends DateTime.DateTime, Max extends DateTime.DateTime>(
    self: A,
    options: { readonly minimum: Min; readonly maximum: Max }
  ): A | Min | Max
} = order.clamp(Order)

// =============================================================================
// constructors
// =============================================================================

const makeUtc = (epochMillis: number): DateTime.Utc => {
  const self = Object.create(ProtoUtc)
  self.epochMillis = epochMillis
  Object.defineProperty(self, "partsUtc", {
    value: undefined,
    enumerable: false,
    writable: true
  })
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
export const unsafeMake = <A extends DateTime.DateTime.Input>(
  input: A
): DateTime.DateTime.PreserveZone<A> => {
  if (isDateTime(input)) {
    return input as DateTime.DateTime.PreserveZone<A>
  } else if (input instanceof Date) {
    return unsafeFromDate(input) as DateTime.DateTime.PreserveZone<A>
  } else if (typeof input === "object") {
    const date = new Date(0)
    setPartsDate(date, input)
    return unsafeFromDate(date) as DateTime.DateTime.PreserveZone<A>
  } else if (typeof input === "string" && !hasZone(input)) {
    return unsafeFromDate(new Date(input + "Z")) as DateTime.DateTime.PreserveZone<A>
  }
  return unsafeFromDate(new Date(input)) as DateTime.DateTime.PreserveZone<A>
}

const hasZone = (input: string): boolean => /Z|[+-]\d{2}$|[+-]\d{2}:?\d{2}$|\]$/.test(input)

const minEpochMillis = -8640000000000000 + 12 * 60 * 60 * 1000
const maxEpochMillis = 8640000000000000 - 14 * 60 * 60 * 1000

/** @internal */
export const unsafeMakeZoned = (
  input: DateTime.DateTime.Input,
  options?: {
    readonly timeZone?: number | string | DateTime.TimeZone | undefined
    readonly adjustForTimeZone?: boolean | undefined
    readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
  }
): DateTime.Zoned => {
  if (options?.timeZone === undefined && isDateTime(input) && isZoned(input)) {
    return input
  }

  // Parse timezone first
  let zone: DateTime.TimeZone
  if (options?.timeZone === undefined) {
    const tempSelf = unsafeMake(input)
    const offset = new Date(tempSelf.epochMillis).getTimezoneOffset() * -60 * 1000
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

  const self = unsafeMake(input)
  if (self.epochMillis < minEpochMillis || self.epochMillis > maxEpochMillis) {
    throw new IllegalArgumentException(`Epoch millis out of range: ${self.epochMillis}`)
  }

  if (options?.adjustForTimeZone !== true) {
    return makeZonedProto(self.epochMillis, zone, self.partsUtc)
  }
  return makeZonedFromAdjusted(self.epochMillis, zone, options?.disambiguation)
}

/** @internal */
export const makeZoned: (
  input: DateTime.DateTime.Input,
  options?: {
    readonly timeZone?: number | string | DateTime.TimeZone | undefined
    readonly adjustForTimeZone?: boolean | undefined
    readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
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
export const nowAsDate: Effect.Effect<Date> = core.map(Clock.currentTimeMillis, (millis) => new Date(millis))

/** @internal */
export const unsafeNow: LazyArg<DateTime.Utc> = () => makeUtc(Date.now())

// =============================================================================
// time zones
// =============================================================================

/** @internal */
export const toUtc = (self: DateTime.DateTime): DateTime.Utc => makeUtc(self.epochMillis)

/** @internal */
export const setZone: {
  (
    zone: DateTime.TimeZone,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): (self: DateTime.DateTime) => DateTime.Zoned
  (
    self: DateTime.DateTime,
    zone: DateTime.TimeZone,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    zone: DateTime.TimeZone,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned =>
    options?.adjustForTimeZone === true
      ? makeZonedFromAdjusted(self.epochMillis, zone, options?.disambiguation)
      : makeZonedProto(self.epochMillis, zone, self.partsUtc)
)

/** @internal */
export const setZoneOffset: {
  (
    offset: number,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): (self: DateTime.DateTime) => DateTime.Zoned
  (
    self: DateTime.DateTime,
    offset: number,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    offset: number,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned => setZone(self, zoneMakeOffset(offset), options)
)

const validZoneCache = globalValue(
  "effect/DateTime/validZoneCache",
  () => new Map<string, DateTime.TimeZone.Named>()
)

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
export const zoneUnsafeMakeNamed = (
  zoneId: string
): DateTime.TimeZone.Named => {
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
  } catch {
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
export const zoneMakeNamed: (
  zoneId: string
) => Option.Option<DateTime.TimeZone.Named> = Option.liftThrowable(zoneUnsafeMakeNamed)

/** @internal */
export const zoneMakeNamedEffect = (
  zoneId: string
): Effect.Effect<DateTime.TimeZone.Named, IllegalArgumentException> =>
  internalEffect.try_({
    try: () => zoneUnsafeMakeNamed(zoneId),
    catch: (e) => e as IllegalArgumentException
  })

/** @internal */
export const zoneMakeLocal = (): DateTime.TimeZone.Named =>
  zoneMakeIntl(new Intl.DateTimeFormat("en-US", formatOptions))

const offsetZoneRegex = /^(?:GMT|[+-])/

/** @internal */
export const zoneFromString = (
  zone: string
): Option.Option<DateTime.TimeZone> => {
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
  (
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): (self: DateTime.DateTime) => Option.Option<DateTime.Zoned>
  (
    self: DateTime.DateTime,
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): Option.Option<DateTime.Zoned>
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): Option.Option<DateTime.Zoned> => Option.map(zoneMakeNamed(zoneId), (zone) => setZone(self, zone, options))
)

/** @internal */
export const unsafeSetZoneNamed: {
  (
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): (self: DateTime.DateTime) => DateTime.Zoned
  (
    self: DateTime.DateTime,
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    zoneId: string,
    options?: {
      readonly adjustForTimeZone?: boolean | undefined
      readonly disambiguation?: DateTime.DateTime.Disambiguation | undefined
    }
  ): DateTime.Zoned => setZone(self, zoneUnsafeMakeNamed(zoneId), options)
)

// =============================================================================
// comparisons
// =============================================================================

/** @internal */
export const distance: {
  (other: DateTime.DateTime): (self: DateTime.DateTime) => number
  (self: DateTime.DateTime, other: DateTime.DateTime): number
} = dual(
  2,
  (self: DateTime.DateTime, other: DateTime.DateTime): number => toEpochMillis(other) - toEpochMillis(self)
)

/** @internal */
export const distanceDurationEither: {
  (
    other: DateTime.DateTime
  ): (
    self: DateTime.DateTime
  ) => Either.Either<Duration.Duration, Duration.Duration>
  (
    self: DateTime.DateTime,
    other: DateTime.DateTime
  ): Either.Either<Duration.Duration, Duration.Duration>
} = dual(
  2,
  (
    self: DateTime.DateTime,
    other: DateTime.DateTime
  ): Either.Either<Duration.Duration, Duration.Duration> => {
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
  <That extends DateTime.DateTime>(
    that: That
  ): <Self extends DateTime.DateTime>(self: Self) => Self | That
  <Self extends DateTime.DateTime, That extends DateTime.DateTime>(
    self: Self,
    that: That
  ): Self | That
} = order.min(Order)

/** @internal */
export const max: {
  <That extends DateTime.DateTime>(
    that: That
  ): <Self extends DateTime.DateTime>(self: Self) => Self | That
  <Self extends DateTime.DateTime, That extends DateTime.DateTime>(
    self: Self,
    that: That
  ): Self | That
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
  (options: {
    minimum: DateTime.DateTime
    maximum: DateTime.DateTime
  }): (self: DateTime.DateTime) => boolean
  (
    self: DateTime.DateTime,
    options: { minimum: DateTime.DateTime; maximum: DateTime.DateTime }
  ): boolean
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
  const parts = self.zone.format
    .formatToParts(self.epochMillis)
    .filter((_) => _.type !== "literal")
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
  let hours = Math.floor(abs / (60 * 60 * 1000))
  let minutes = Math.round((abs % (60 * 60 * 1000)) / (60 * 1000))
  if (minutes === 60) {
    hours += 1
    minutes = 0
  }
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
export const toParts = (
  self: DateTime.DateTime
): DateTime.DateTime.PartsWithWeekday => {
  if (self._tag === "Utc") {
    return toPartsUtc(self)
  } else if (self.partsAdjusted !== undefined) {
    return self.partsAdjusted
  }
  self.partsAdjusted = withDate(self, dateToParts)
  return self.partsAdjusted
}

/** @internal */
export const toPartsUtc = (
  self: DateTime.DateTime
): DateTime.DateTime.PartsWithWeekday => {
  if (self.partsUtc !== undefined) {
    return self.partsUtc
  }
  self.partsUtc = withDateUtc(self, dateToParts)
  return self.partsUtc
}

/** @internal */
export const getPartUtc: {
  (
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): (self: DateTime.DateTime) => number
  (
    self: DateTime.DateTime,
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): number
} = dual(
  2,
  (
    self: DateTime.DateTime,
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): number => toPartsUtc(self)[part]
)

/** @internal */
export const getPart: {
  (
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): (self: DateTime.DateTime) => number
  (
    self: DateTime.DateTime,
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): number
} = dual(
  2,
  (
    self: DateTime.DateTime,
    part: keyof DateTime.DateTime.PartsWithWeekday
  ): number => toParts(self)[part]
)

const setPartsDate = (
  date: Date,
  parts: Partial<DateTime.DateTime.PartsWithWeekday>
): void => {
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
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): DateTime.DateTime => mutate(self, (date) => setPartsDate(date, parts))
)

/** @internal */
export const setPartsUtc: {
  (
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    parts: Partial<DateTime.DateTime.PartsWithWeekday>
  ): DateTime.DateTime => mutateUtc(self, (date) => setPartsDate(date, parts))
)

// =============================================================================
// mapping
// =============================================================================

/**
 * Creates a DateTime.Zoned from adjusted local time with proper DST disambiguation.
 *
 * This function handles the conversion from "wall-clock" local time to the correct UTC time,
 * accounting for DST transitions. For offset timezones, conversion is straightforward.
 * For named timezones, uses Temporal's disambiguation algorithm.
 *
 * @param adjustedMillis - Local time as milliseconds since epoch (timezone-agnostic representation)
 * @param zone - Target timezone (offset or named zone)
 * @param disambiguation - Strategy for resolving DST ambiguity (defaults to "earlier" for backward compatibility)
 * @returns DateTime.Zoned with correct UTC epochMillis for the given local time
 */
const makeZonedFromAdjusted = (
  adjustedMillis: number,
  zone: DateTime.TimeZone,
  disambiguation: DateTime.DateTime.Disambiguation = "earlier"
): DateTime.Zoned => {
  if (zone._tag === "Offset") {
    return makeZonedProto(adjustedMillis - zone.offset, zone)
  }

  // For named zones, use comprehensive disambiguation algorithm
  return handleTimeZoneDisambiguation(adjustedMillis, zone, disambiguation)
}

/**
 * Handle local time to UTC conversion with precise disambiguation for DST transitions.
 *
 * Uses Temporal's algorithm to find all possible UTC interpretations
 * of a local time, then applies the requested disambiguation strategy.
 *
 * @param adjustedMillis - Local time as milliseconds since epoch (naive UTC representation)
 * @param zone - Named timezone for disambiguation
 * @param disambiguation - Strategy for handling ambiguous/gap times
 * @returns DateTime.Zoned with correct UTC epochMillis
 */
const handleTimeZoneDisambiguation = (
  adjustedMillis: number,
  zone: DateTime.TimeZone.Named,
  disambiguation: DateTime.DateTime.Disambiguation
): DateTime.Zoned => {
  // Step 1: Find all possible UTC interpretations using Temporal's precise algorithm
  const possibleUtcTimes = getPossibleEpochTimes(adjustedMillis, zone)

  // Step 2: Apply disambiguation strategy based on number of interpretations
  return disambiguatePossibleTimes(
    possibleUtcTimes,
    adjustedMillis,
    zone,
    disambiguation
  )
}

/**
 * Find possible UTC epoch times for a local time using precise offset sampling.
 *
 * This function uses +/-1 day offset sampling to detect DST transitions and
 * mathematically derives all valid UTC interpretations for a given local time.
 *
 * @param adjustedMillis - Local time as milliseconds since epoch
 * @param zone - Named timezone to resolve against
 * @returns Array of valid UTC epoch times (0, 1, or 2 interpretations)
 */
const getPossibleEpochTimes = (
  adjustedMillis: number,
  zone: DateTime.TimeZone.Named
): Array<number> => {
  // Convert target local time to "naive UTC" (as if timezone-agnostic)
  const naiveUtc = adjustedMillis

  // Sample timezone offsets at +/-1 day from target time
  const dayMillis = 24 * 60 * 60 * 1000
  const earlierSample = naiveUtc - dayMillis
  const laterSample = naiveUtc + dayMillis

  const earlierOffset = calculateNamedOffset(earlierSample, zone)
  const laterOffset = calculateNamedOffset(laterSample, zone)

  // Determine candidate offsets: if same, only one; if different, test both
  const candidateOffsets = earlierOffset === laterOffset
    ? [earlierOffset]
    : [earlierOffset, laterOffset]

  // Test each offset to find valid UTC candidates
  const validCandidates: Array<number> = []

  for (const offset of candidateOffsets) {
    const candidateUtc = naiveUtc - offset
    const resultingLocal = candidateUtc + calculateNamedOffset(candidateUtc, zone)

    // Validate: Does this UTC convert back to our target local time?
    if (isSameWallClockTime(adjustedMillis, resultingLocal)) {
      validCandidates.push(candidateUtc)
    }
  }

  return validCandidates.sort((a, b) => a - b)
}

/**
 * Check if two timestamps represent the same wall-clock time.
 *
 * Compares only the calendar date and time components, ignoring timezone offsets.
 * Used to validate that a candidate UTC time produces the target local time.
 *
 * @param time1 - First timestamp in milliseconds
 * @param time2 - Second timestamp in milliseconds
 * @returns true if both represent the same year/month/day/hour/minute
 */
const isSameWallClockTime = (time1: number, time2: number): boolean => {
  const date1 = new Date(time1)
  const date2 = new Date(time2)

  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate() &&
    date1.getUTCHours() === date2.getUTCHours() &&
    date1.getUTCMinutes() === date2.getUTCMinutes()
  )
}

/**
 * Apply disambiguation strategy to possible UTC times.
 *
 * Handles three cases: normal times (1 interpretation), ambiguous times (2 interpretations),
 * and gap times (0 interpretations).
 *
 * @param possibleUtcTimes - Array of valid UTC interpretations
 * @param adjustedMillis - Original local time for gap time synthesis
 * @param zone - Named timezone context
 * @param disambiguation - Strategy for resolving ambiguity
 * @returns DateTime.Zoned with selected interpretation
 */
const disambiguatePossibleTimes = (
  possibleUtcTimes: Array<number>,
  adjustedMillis: number,
  zone: DateTime.TimeZone.Named,
  disambiguation: DateTime.DateTime.Disambiguation
): DateTime.Zoned => {
  const numInstants = possibleUtcTimes.length

  // Case 1: Normal time (exactly 1 interpretation)
  if (numInstants === 1) {
    return makeZonedProto(possibleUtcTimes[0], zone)
  }

  // Case 2: Ambiguous time (2+ interpretations) - Direct selection
  if (numInstants > 1) {
    switch (disambiguation) {
      case "compatible":
      case "earlier":
        return makeZonedProto(possibleUtcTimes[0], zone) // First (earlier) interpretation
      case "later":
        return makeZonedProto(possibleUtcTimes[numInstants - 1], zone) // Last (later) interpretation
      case "reject":
        throw new IllegalArgumentException(
          `Ambiguous time occurs twice in timezone ${zone.id}`
        )
    }
  }

  // Case 3: Gap time (0 interpretations) - Synthesize solution using precise offset calculation
  if (disambiguation === "reject") {
    throw new IllegalArgumentException(
      `Gap time: ${new Date(adjustedMillis).toISOString().slice(0, -1)} does not exist in timezone ${zone.id}`
    )
  }

  return synthesizeGapTimeSolution(adjustedMillis, zone, disambiguation)
}

/**
 * Synthesize a solution for gap times using a precise offset-based approach.
 *
 * When a local time doesn't exist due to DST transitions, this function calculates
 * the offset difference and adjusts the time accordingly, then finds valid epoch
 * times for the adjusted time.
 *
 * @param adjustedMillis - Non-existent local time as "naive UTC"
 * @param zone - Named timezone context
 * @param disambiguation - Strategy determining direction (earlier/later)
 * @returns DateTime.Zoned with synthesized valid time
 */
const synthesizeGapTimeSolution = (
  adjustedMillis: number,
  zone: DateTime.TimeZone.Named,
  disambiguation: DateTime.DateTime.Disambiguation
): DateTime.Zoned => {
  const naiveUtc = adjustedMillis
  const dayMillis = 24 * 60 * 60 * 1000

  // Sample offsets at ±1 day from the gap time for precise calculation
  const dayBefore = naiveUtc - dayMillis
  const dayAfter = naiveUtc + dayMillis
  const offsetBefore = calculateNamedOffset(dayBefore, zone)
  const offsetAfter = calculateNamedOffset(dayAfter, zone)
  const offsetDifferenceMillis = offsetAfter - offsetBefore

  switch (disambiguation) {
    case "earlier": {
      // Move time backward by the offset difference
      const adjustedTime = adjustedMillis - offsetDifferenceMillis
      const possibleTimes = getPossibleEpochTimes(adjustedTime, zone)
      return makeZonedProto(possibleTimes[0], zone)
    }
    case "compatible":
    case "later": {
      // Move time forward by the offset difference
      const adjustedTime = adjustedMillis + offsetDifferenceMillis
      const possibleTimes = getPossibleEpochTimes(adjustedTime, zone)
      return makeZonedProto(possibleTimes[possibleTimes.length - 1], zone)
    }
    default:
      throw new IllegalArgumentException(
        `Invalid disambiguation: ${disambiguation}`
      )
  }
}

/**
 * Regular expression for parsing timezone offset strings (e.g., "+02:00", "-05:00").
 */
const offsetRegex = /([+-])(\d{2}):(\d{2})$/

/**
 * Parse a timezone offset string into milliseconds.
 *
 * @param offset - Offset string in format "+HH:MM" or "-HH:MM"
 * @returns Offset in milliseconds, or null if parsing fails
 */
const parseOffset = (offset: string): number | null => {
  const match = offsetRegex.exec(offset)
  if (match === null) {
    return null
  }
  const [, sign, hours, minutes] = match
  return (
    (sign === "+" ? 1 : -1) * (Number(hours) * 60 + Number(minutes)) * 60 * 1000
  )
}

/**
 * Calculate the timezone offset for a named timezone at a specific UTC time.
 *
 * @param utcMillis - UTC time in milliseconds since epoch
 * @param zone - Named timezone to calculate offset for
 * @returns Offset in milliseconds (positive for ahead of UTC, negative for behind)
 */
const calculateNamedOffset = (
  utcMillis: number,
  zone: DateTime.TimeZone.Named
): number => {
  const offsetCurrent = zone.format.formatToParts(utcMillis).find((_) => _.type === "timeZoneName")
    ?.value ?? ""
  if (offsetCurrent === "GMT") {
    return 0
  }

  const result = parseOffset(offsetCurrent)
  if (result === null) {
    // fallback to using the adjusted date
    return zonedOffset(makeZonedProto(utcMillis, zone))
  }

  return result
}

/** @internal */
export const mutate: {
  (f: (date: Date) => void): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(self: A, f: (date: Date) => void): A
} = dual(
  2,
  (self: DateTime.DateTime, f: (date: Date) => void): DateTime.DateTime => {
    if (self._tag === "Utc") {
      const date = toDateUtc(self)
      f(date)
      return makeUtc(date.getTime())
    }
    const adjustedDate = toDate(self)
    const newAdjustedDate = new Date(adjustedDate.getTime())
    f(newAdjustedDate)
    return makeZonedFromAdjusted(newAdjustedDate.getTime(), self.zone)
  }
)

/** @internal */
export const mutateUtc: {
  (f: (date: Date) => void): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(self: A, f: (date: Date) => void): A
} = dual(
  2,
  (self: DateTime.DateTime, f: (date: Date) => void): DateTime.DateTime =>
    mapEpochMillis(self, (millis) => {
      const date = new Date(millis)
      f(date)
      return date.getTime()
    })
)

/** @internal */
export const mapEpochMillis: {
  (f: (millis: number) => number): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(self: A, f: (millis: number) => number): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    f: (millis: number) => number
  ): DateTime.DateTime => {
    const millis = f(toEpochMillis(self))
    return self._tag === "Utc"
      ? makeUtc(millis)
      : makeZonedProto(millis, self.zone)
  }
)

/** @internal */
export const withDate: {
  <A>(f: (date: Date) => A): (self: DateTime.DateTime) => A
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A
} = dual(
  2,
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A => f(toDate(self))
)

/** @internal */
export const withDateUtc: {
  <A>(f: (date: Date) => A): (self: DateTime.DateTime) => A
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A
} = dual(
  2,
  <A>(self: DateTime.DateTime, f: (date: Date) => A): A => f(toDateUtc(self))
)

/** @internal */
export const match: {
  <A, B>(options: {
    readonly onUtc: (_: DateTime.Utc) => A
    readonly onZoned: (_: DateTime.Zoned) => B
  }): (self: DateTime.DateTime) => A | B
  <A, B>(
    self: DateTime.DateTime,
    options: {
      readonly onUtc: (_: DateTime.Utc) => A
      readonly onZoned: (_: DateTime.Zoned) => B
    }
  ): A | B
} = dual(
  2,
  <A, B>(
    self: DateTime.DateTime,
    options: {
      readonly onUtc: (_: DateTime.Utc) => A
      readonly onZoned: (_: DateTime.Zoned) => B
    }
  ): A | B => self._tag === "Utc" ? options.onUtc(self) : options.onZoned(self)
)

// =============================================================================
// math
// =============================================================================

/** @internal */
export const addDuration: {
  (
    duration: Duration.DurationInput
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(self: A, duration: Duration.DurationInput): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    duration: Duration.DurationInput
  ): DateTime.DateTime => mapEpochMillis(self, (millis) => millis + Duration.toMillis(duration))
)

/** @internal */
export const subtractDuration: {
  (
    duration: Duration.DurationInput
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(self: A, duration: Duration.DurationInput): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    duration: Duration.DurationInput
  ): DateTime.DateTime => mapEpochMillis(self, (millis) => millis - Duration.toMillis(duration))
)

const addMillis = (date: Date, amount: number): void => {
  date.setTime(date.getTime() + amount)
}

/** @internal */
export const add: {
  (
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): DateTime.DateTime =>
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
        date.setUTCFullYear(date.getUTCFullYear() + parts.years, month + 1, 0)
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
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): A
} = dual(
  2,
  (
    self: DateTime.DateTime,
    parts: Partial<DateTime.DateTime.PartsForMath>
  ): DateTime.DateTime => {
    const newParts = {} as Partial<Mutable<DateTime.DateTime.PartsForMath>>
    for (const key in parts) {
      newParts[key as keyof DateTime.DateTime.PartsForMath] = -1 * parts[key as keyof DateTime.DateTime.PartsForMath]!
    }
    return add(self, newParts)
  }
)

const startOfDate = (
  date: Date,
  part: DateTime.DateTime.UnitSingular,
  options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }
) => {
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
  (
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): A
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): DateTime.DateTime => mutate(self, (date) => startOfDate(date, part, options))
)

const endOfDate = (
  date: Date,
  part: DateTime.DateTime.UnitSingular,
  options?: {
    readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
  }
) => {
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
  (
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): A
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): DateTime.DateTime => mutate(self, (date) => endOfDate(date, part, options))
)

/** @internal */
export const nearest: {
  (
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): <A extends DateTime.DateTime>(self: A) => A
  <A extends DateTime.DateTime>(
    self: A,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): A
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    part: DateTime.DateTime.UnitSingular,
    options?: {
      readonly weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined
    }
  ): DateTime.DateTime =>
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
    })
)

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
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string => {
    try {
      return new Intl.DateTimeFormat(options?.locale, {
        timeZone: self._tag === "Utc" ? "UTC" : intlTimeZone(self.zone),
        ...options
      }).format(self.epochMillis)
    } catch {
      return new Intl.DateTimeFormat(options?.locale, {
        timeZone: "UTC",
        ...options
      }).format(toDate(self))
    }
  }
)

/** @internal */
export const formatLocal: {
  (
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string => new Intl.DateTimeFormat(options?.locale, options).format(self.epochMillis)
)

/** @internal */
export const formatUtc: {
  (
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): (self: DateTime.DateTime) => string
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string
} = dual(
  isDateTimeArgs,
  (
    self: DateTime.DateTime,
    options?:
      | (Intl.DateTimeFormatOptions & {
        readonly locale?: Intl.LocalesArgument
      })
      | undefined
  ): string =>
    new Intl.DateTimeFormat(options?.locale, {
      ...options,
      timeZone: "UTC"
    }).format(self.epochMillis)
)

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
  return self._tag === "Utc"
    ? date.toISOString()
    : `${date.toISOString().slice(0, -1)}${zonedOffsetIso(self)}`
}

/** @internal */
export const formatIsoZoned = (self: DateTime.Zoned): string =>
  self.zone._tag === "Offset"
    ? formatIsoOffset(self)
    : `${formatIsoOffset(self)}[${self.zone.id}]`
