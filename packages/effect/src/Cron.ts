/**
 * @since 2.0.0
 */
import * as Either from "./Either.js"
import { pipe } from "./Function.js"
import * as N from "./Number.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { hasProperty } from "./Predicate.js"
import * as ReadonlyArray from "./ReadonlyArray.js"
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
export interface Segments {
  readonly minutes: ReadonlyArray<number>
  readonly hours: ReadonlyArray<number>
  readonly days: ReadonlyArray<number>
  readonly months: ReadonlyArray<number>
  readonly weekdays: ReadonlyArray<number>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Cron extends Pipeable {
  readonly [TypeId]: TypeId
  readonly segments: Segments
}

const CronProto: Omit<Cron, "segments"> = {
  [TypeId]: TypeId,
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
 * @param segments - The cron segments.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make = (segments: Segments): Cron => {
  const o = Object.create(CronProto)
  o.segments = segments
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
 * import * as Cron from "effect/Cron"
 * import * as Either from "effect/Either"
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
export const parse = (cron: string): Either.Either<ParseError, Cron> => {
  const segments = cron.split(" ").filter(String.isNonEmpty)
  if (segments.length !== 5) {
    return Either.left(ParseError(`Invalid cron expression`, cron))
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
 * Checks if a given date matches the `Cron` instance.
 *
 * @param cron - The `Cron` instance.
 * @param date - The `Date` to check against.
 *
 * @example
 * import * as Cron from "effect/Cron"
 * import * as Either from "effect/Either"
 *
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 04:00:00")), true)
 * assert.deepStrictEqual(Cron.match(cron, new Date("2021-01-08 05:00:00")), false)
 *
 * @since 2.0.0
 */
export const match = (cron: Cron, date: Date): boolean => {
  const {
    segments: { days, hours, minutes, months, weekdays }
  } = cron

  const minute = date.getMinutes()
  if (minutes.length !== 0 && minutes.indexOf(minute) === -1) {
    return false
  }

  const hour = date.getHours()
  if (hours.length !== 0 && hours.indexOf(hour) === -1) {
    return false
  }

  const month = date.getMonth() + 1
  if (months.length !== 0 && months.indexOf(month) === -1) {
    return false
  }

  if (days.length === 0 && weekdays.length === 0) {
    return true
  }

  const day = date.getDate()
  if (weekdays.length === 0) {
    return days.indexOf(day) !== -1
  }

  const weekday = date.getDay()
  if (days.length === 0) {
    return weekdays.indexOf(weekday) !== -1
  }

  return days.indexOf(day) !== -1 || weekdays.indexOf(weekday) !== -1
}

/**
 * Returns the next date that matches the `Cron` instance.
 *
 * If no date is provided, the current date is used.
 *
 * If no date can be found, `Option.none()` is returned. This should be a
 * no-op, but it's possible that the cron expression is invalid.
 *
 * @example
 * import * as Cron from "effect/Cron"
 * import * as Either from "effect/Either"
 * import * as Option from "effect/Option"
 *
 * const after = new Date("2021-01-01 00:00:00")
 * const cron = Either.getOrThrow(Cron.parse("0 4 8-14 * *"))
 * assert.deepStrictEqual(Cron.next(cron, after), Option.some(new Date("2021-01-08 04:00:00")))
 *
 * @param cron - The `Cron` instance.
 * @param after - The `Date` to start searching from.
 *
 * @since 2.0.0
 */
export const next = (cron: Cron, after?: Date): Option.Option<Date> => {
  const {
    segments: { days, hours, minutes, months, weekdays }
  } = cron

  const restrictMinutes = minutes.length !== 0
  const restrictHours = hours.length !== 0
  const restrictDays = days.length !== 0
  const restrictMonths = months.length !== 0
  const restrictWeekdays = weekdays.length !== 0

  const current = after ? new Date(after.getTime()) : new Date()
  // Increment by one minute to ensure we don't match the current date.
  current.setMinutes(current.getMinutes() + 1)
  current.setSeconds(0)

  // Only search 8 years into the future.
  const limit = new Date(current).setFullYear(current.getFullYear() + 8)
  while (current.getTime() <= limit) {
    if (restrictMonths && months.indexOf(current.getMonth() + 1) === -1) {
      current.setMonth(current.getMonth() + 1)
      current.setDate(1)
      current.setHours(0)
      current.setMinutes(0)
      continue
    }

    if (restrictDays && days.indexOf(current.getDate()) === -1) {
      current.setDate(current.getDate() + 1)
      current.setHours(0)
      current.setMinutes(0)
      continue
    }

    if (restrictWeekdays && weekdays.indexOf(current.getDay()) === -1) {
      current.setDate(current.getDate() + 1)
      current.setHours(0)
      current.setMinutes(0)
      continue
    }

    if (restrictHours && hours.indexOf(current.getHours()) === -1) {
      current.setHours(current.getHours() + 1)
      current.setMinutes(0)
      continue
    }

    if (restrictMinutes && minutes.indexOf(current.getMinutes()) === -1) {
      current.setMinutes(current.getMinutes() + 1)
      continue
    }

    return Option.some(current)
  }

  return Option.none()
}

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
): Either.Either<ParseError, ReadonlyArray<number>> => {
  const capacity = options.max - options.min + 1
  const values = new Set<number>()
  const fields = input.split(",")

  for (const field of fields) {
    const [raw, step] = splitStep(field)
    if (raw === "*" && step === undefined) {
      return Either.right(ReadonlyArray.empty())
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
      return Either.right(ReadonlyArray.empty())
    }
  }

  return Either.right(pipe(
    ReadonlyArray.fromIterable(values),
    ReadonlyArray.sort(N.Order)
  ))
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
