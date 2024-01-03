/**
 * @since 2.0.0
 */
import * as Either from "./Either.js"
import * as N from "./Number.js"
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
  readonly minutes: ReadonlyArray.NonEmptyReadonlyArray<number>
  readonly hours: ReadonlyArray.NonEmptyReadonlyArray<number>
  readonly days: ReadonlyArray.NonEmptyReadonlyArray<number>
  readonly months: ReadonlyArray.NonEmptyReadonlyArray<number>
  readonly weekdays: ReadonlyArray.NonEmptyReadonlyArray<number>
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
 * import { parse, make } from "effect/Cron"
 * import { right } from "effect/Either"
 *
 * // At 04:00 on every day-of-month from 8 through 14.
 * assert.deepStrictEqual(parse("0 4 8-14 * *"), right(make({
 *   minutes: [0],
 *   hours: [4],
 *   days: [8, 9, 10, 11, 12, 13, 14],
 *   months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
 *   weekdays: [0, 1, 2, 3, 4, 5, 6]
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
): Either.Either<ParseError, ReadonlyArray.NonEmptyReadonlyArray<number>> => {
  const values = new Set<number>()
  const fields = input.split(",")

  for (const field of fields) {
    const [raw, step] = splitStep(field)
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
  }

  return ReadonlyArray.match(ReadonlyArray.fromIterable(values), {
    onEmpty: () => Either.left(ParseError(`Expected at least one ${options.segment}`, input)),
    onNonEmpty: (values) => Either.right(ReadonlyArray.sort(values, N.Order))
  })
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
