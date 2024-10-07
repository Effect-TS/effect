/**
 * @since 2.0.0
 */
import * as Arr from "./Array.js"
import * as Either from "./Either.js"
import * as Equal from "./Equal.js"
import * as equivalence from "./Equivalence.js"
import { dual, pipe } from "./Function.js"
import * as Hash from "./Hash.js"
import { format, type Inspectable, NodeInspectSymbol } from "./Inspectable.js"
import * as N from "./Number.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { hasProperty } from "./Predicate.js"
import * as String from "./String.js"
import type { Mutable } from "./Types.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TypeId: unique symbol = Symbol.for("effect/Cron")

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Cron extends Pipeable, Equal.Equal, Inspectable {
  readonly [TypeId]: TypeId
  readonly minutes: ReadonlySet<number>
  readonly hours: ReadonlySet<number>
  readonly days: ReadonlySet<number>
  readonly months: ReadonlySet<number>
  readonly weekdays: ReadonlySet<number>
}

const CronProto: Omit<Cron, "minutes" | "hours" | "days" | "months" | "weekdays"> = {
  [TypeId]: TypeId,
  [Equal.symbol](this: Cron, that: unknown) {
    return isCron(that) && equals(this, that)
  },
  [Hash.symbol](this: Cron): number {
    return pipe(
      Hash.array(Arr.fromIterable(this.minutes)),
      Hash.combine(Hash.array(Arr.fromIterable(this.hours))),
      Hash.combine(Hash.array(Arr.fromIterable(this.days))),
      Hash.combine(Hash.array(Arr.fromIterable(this.months))),
      Hash.combine(Hash.array(Arr.fromIterable(this.weekdays))),
      Hash.cached(this)
    )
  },
  toString(this: Cron) {
    return format(this.toJSON())
  },
  toJSON(this: Cron) {
    return {
      _id: "Cron",
      minutes: Arr.fromIterable(this.minutes),
      hours: Arr.fromIterable(this.hours),
      days: Arr.fromIterable(this.days),
      months: Arr.fromIterable(this.months),
      weekdays: Arr.fromIterable(this.weekdays)
    }
  },
  [NodeInspectSymbol](this: Cron) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
} as const

/**
 * Checks if a given value is a `Cron` instance.
 *
 * @param u - The value to check.
 *
 * @since 2.0.0
 * @category guards
 */
export const isCron = (u: unknown): u is Cron => hasProperty(u, TypeId)

/**
 * Creates a `Cron` instance from.
 *
 * @param constraints - The cron constraints.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make = ({
  days,
  hours,
  minutes,
  months,
  weekdays
}: {
  readonly minutes: Iterable<number>
  readonly hours: Iterable<number>
  readonly days: Iterable<number>
  readonly months: Iterable<number>
  readonly weekdays: Iterable<number>
}): Cron => {
  const o: Mutable<Cron> = Object.create(CronProto)
  o.minutes = new Set(Arr.sort(minutes, N.Order))
  o.hours = new Set(Arr.sort(hours, N.Order))
  o.days = new Set(Arr.sort(days, N.Order))
  o.months = new Set(Arr.sort(months, N.Order))
  o.weekdays = new Set(Arr.sort(weekdays, N.Order))
  return o
}

/**
 * @since 2.0.0
 * @category symbol
 */
export const ParseErrorTypeId: unique symbol = Symbol.for("effect/Cron/errors/ParseError")

/**
 * @since 2.0.0
 * @category symbols
 */
export type ParseErrorTypeId = typeof ParseErrorTypeId

/**
 * Represents a checked exception which occurs when decoding fails.
 *
 * @since 2.0.0
 * @category models
 */
export interface ParseError {
  readonly _tag: "ParseError"
  readonly [ParseErrorTypeId]: ParseErrorTypeId
  readonly message: string
  readonly input?: string
}

const ParseErrorProto: Omit<ParseError, "input" | "message"> = {
  _tag: "ParseError",
  [ParseErrorTypeId]: ParseErrorTypeId
}

const ParseError = (message: string, input?: string): ParseError => {
  const o: Mutable<ParseError> = Object.create(ParseErrorProto)
  o.message = message
  if (input !== undefined) {
    o.input = input
  }
  return o
}

/**
 * Returns `true` if the specified value is an `ParseError`, `false` otherwise.
 *
 * @param u - The value to check.
 *
 * @since 2.0.0
 * @category guards
 */
export const isParseError = (u: unknown): u is ParseError => hasProperty(u, ParseErrorTypeId)

/**
 * Parses a cron expression into a `Cron` instance.
 *
 * @param cron - The cron expression to parse.
 *
 * @example
 * import { Cron, Either } from "effect"
 *
 * // At 04:00 on every day-of-month from 8 through 14.
 * assert.deepStrictEqual(Cron.parse("0 4 8-14 * *"), Either.right(Cron.make({
 *   minutes: [0],
 *   hours: [4],
 *   days: [8, 9, 10, 11, 12, 13, 14],
 *   months: [],
 *   weekdays: []
 * })))
 *
 * @since 2.0.0
 * @category constructors
 */
export const parse = (cron: string): Either.Either<Cron, ParseError> => {
  const segments = cron.split(" ").filter(String.isNonEmpty)
  if (segments.length !== 5) {
    return Either.left(ParseError(`Invalid number of segments in cron expression`, cron))
  }

  const [minutes, hours, days, months, weekdays] = segments
  return Either.all({
    minutes: parseSegment(minutes, minuteOptions),
    hours: parseSegment(hours, hourOptions),
    days: parseSegment(days, dayOptions),
    months: parseSegment(months, monthOptions),
    weekdays: parseSegment(weekdays, weekdayOptions)
  }).pipe(Either.map((segments) => make(segments)))
}

/**
 * Checks if a given `Date` falls within an active `Cron` time window.
 *
 * @param cron - The `Cron` instance.
 * @param date - The `Date` to check against.
 *
 * @example
 * import { Cron, Either } from "effect"
 *
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 04:00:00")), true)
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 05:00:00")), false)
 *
 * @since 2.0.0
 */
export const match = (cron: Cron, date: Date): boolean => {
  const { days, hours, minutes, months, weekdays } = cron

  const minute = date.getMinutes()
  if (minutes.size !== 0 && !minutes.has(minute)) {
    return false
  }

  const hour = date.getHours()
  if (hours.size !== 0 && !hours.has(hour)) {
    return false
  }

  const month = date.getMonth() + 1
  if (months.size !== 0 && !months.has(month)) {
    return false
  }

  if (days.size === 0 && weekdays.size === 0) {
    return true
  }

  const day = date.getDate()
  if (weekdays.size === 0) {
    return days.has(day)
  }

  const weekday = date.getDay()
  if (days.size === 0) {
    return weekdays.has(weekday)
  }

  return days.has(day) || weekdays.has(weekday)
}

/**
 * Returns the next run `Date` for the given `Cron` instance.
 *
 * Uses the current time as a starting point if no value is provided for `now`.
 *
 * @example
 * import { Cron, Either } from "effect"
 *
 * const after = new Date("2021-01-01 00:00:00")
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.next(cron, after), new Date("2021-01-08 04:00:00"))
 *
 * @param cron - The `Cron` instance.
 * @param now - The `Date` to start searching from.
 *
 * @since 2.0.0
 */
export const next = (cron: Cron, now?: Date): Date => {
  const { days, hours, minutes, months, weekdays } = cron

  const restrictMinutes = minutes.size !== 0
  const restrictHours = hours.size !== 0
  const restrictDays = days.size !== 0
  const restrictMonths = months.size !== 0
  const restrictWeekdays = weekdays.size !== 0

  const current = now ? new Date(now.getTime()) : new Date()
  // Increment by one minute to ensure we don't match the current date.
  current.setMinutes(current.getMinutes() + 1)
  current.setSeconds(0)
  current.setMilliseconds(0)

  // Only search 8 years into the future.
  const limit = new Date(current).setFullYear(current.getFullYear() + 8)
  while (current.getTime() <= limit) {
    if (restrictMonths && !months.has(current.getMonth() + 1)) {
      current.setMonth(current.getMonth() + 1)
      current.setDate(1)
      current.setHours(0)
      current.setMinutes(0)
      continue
    }

    if (restrictDays && restrictWeekdays) {
      if (!days.has(current.getDate()) && !weekdays.has(current.getDay())) {
        current.setDate(current.getDate() + 1)
        current.setHours(0)
        current.setMinutes(0)
        continue
      }
    } else if (restrictDays) {
      if (!days.has(current.getDate())) {
        current.setDate(current.getDate() + 1)
        current.setHours(0)
        current.setMinutes(0)
        continue
      }
    } else if (restrictWeekdays) {
      if (!weekdays.has(current.getDay())) {
        current.setDate(current.getDate() + 1)
        current.setHours(0)
        current.setMinutes(0)
        continue
      }
    }

    if (restrictHours && !hours.has(current.getHours())) {
      current.setHours(current.getHours() + 1)
      current.setMinutes(0)
      continue
    }

    if (restrictMinutes && !minutes.has(current.getMinutes())) {
      current.setMinutes(current.getMinutes() + 1)
      continue
    }

    return current
  }

  throw new Error("Unable to find next cron date")
}

/**
 * Returns an `IterableIterator` which yields the sequence of `Date`s that match the `Cron` instance.
 *
 * @param cron - The `Cron` instance.
 * @param now - The `Date` to start searching from.
 *
 * @since 2.0.0
 */
export const sequence = function*(cron: Cron, now?: Date): IterableIterator<Date> {
  while (true) {
    yield now = next(cron, now)
  }
}

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<Cron> = equivalence.make((self, that) =>
  restrictionsEquals(self.minutes, that.minutes) &&
  restrictionsEquals(self.hours, that.hours) &&
  restrictionsEquals(self.days, that.days) &&
  restrictionsEquals(self.months, that.months) &&
  restrictionsEquals(self.weekdays, that.weekdays)
)

const restrictionsArrayEquals = equivalence.array(equivalence.number)
const restrictionsEquals = (self: ReadonlySet<number>, that: ReadonlySet<number>): boolean =>
  restrictionsArrayEquals(Arr.fromIterable(self), Arr.fromIterable(that))

/**
 * Checks if two `Cron`s are equal.
 *
 * @since 2.0.0
 * @category predicates
 */
export const equals: {
  (that: Cron): (self: Cron) => boolean
  (self: Cron, that: Cron): boolean
} = dual(2, (self: Cron, that: Cron): boolean => Equivalence(self, that))

interface SegmentOptions {
  segment: string
  min: number
  max: number
  aliases?: Record<string, number> | undefined
}

const minuteOptions: SegmentOptions = {
  segment: "minute",
  min: 0,
  max: 59
}

const hourOptions: SegmentOptions = {
  segment: "hour",
  min: 0,
  max: 23
}

const dayOptions: SegmentOptions = {
  segment: "day",
  min: 1,
  max: 31
}

const monthOptions: SegmentOptions = {
  segment: "month",
  min: 1,
  max: 12,
  aliases: {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  }
}

const weekdayOptions: SegmentOptions = {
  segment: "weekday",
  min: 0,
  max: 6,
  aliases: {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  }
}

const parseSegment = (
  input: string,
  options: SegmentOptions
): Either.Either<ReadonlySet<number>, ParseError> => {
  const capacity = options.max - options.min + 1
  const values = new Set<number>()
  const fields = input.split(",")

  for (const field of fields) {
    const [raw, step] = splitStep(field)
    if (raw === "*" && step === undefined) {
      return Either.right(new Set())
    }

    if (step !== undefined) {
      if (!Number.isInteger(step)) {
        return Either.left(ParseError(`Expected step value to be a positive integer`, input))
      }
      if (step < 1) {
        return Either.left(ParseError(`Expected step value to be greater than 0`, input))
      }
      if (step > options.max) {
        return Either.left(ParseError(`Expected step value to be less than ${options.max}`, input))
      }
    }

    if (raw === "*") {
      for (let i = options.min; i <= options.max; i += step ?? 1) {
        values.add(i)
      }
    } else {
      const [left, right] = splitRange(raw, options.aliases)
      if (!Number.isInteger(left)) {
        return Either.left(ParseError(`Expected a positive integer`, input))
      }
      if (left < options.min || left > options.max) {
        return Either.left(ParseError(`Expected a value between ${options.min} and ${options.max}`, input))
      }

      if (right === undefined) {
        values.add(left)
      } else {
        if (!Number.isInteger(right)) {
          return Either.left(ParseError(`Expected a positive integer`, input))
        }
        if (right < options.min || right > options.max) {
          return Either.left(ParseError(`Expected a value between ${options.min} and ${options.max}`, input))
        }
        if (left > right) {
          return Either.left(ParseError(`Invalid value range`, input))
        }

        for (let i = left; i <= right; i += step ?? 1) {
          values.add(i)
        }
      }
    }

    if (values.size >= capacity) {
      return Either.right(new Set())
    }
  }

  return Either.right(values)
}

const splitStep = (input: string): [string, number | undefined] => {
  const seperator = input.indexOf("/")
  if (seperator !== -1) {
    return [input.slice(0, seperator), Number(input.slice(seperator + 1))]
  }

  return [input, undefined]
}

const splitRange = (input: string, aliases?: Record<string, number>): [number, number | undefined] => {
  const seperator = input.indexOf("-")
  if (seperator !== -1) {
    return [aliasOrValue(input.slice(0, seperator), aliases), aliasOrValue(input.slice(seperator + 1), aliases)]
  }

  return [aliasOrValue(input, aliases), undefined]
}

function aliasOrValue(field: string, aliases?: Record<string, number>): number {
  return aliases?.[field.toLocaleLowerCase()] ?? Number(field)
}
