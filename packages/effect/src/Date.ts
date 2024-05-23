/**
 * This module provides utility functions for working with dates in TypeScript.
 *
 * @since 3.3.0
 */
import type { Branded } from "./Brand.js"
import * as Duration from "./Duration.js"
import * as Either from "./Either.js"
import * as eEquivalence from "./Equivalence.js"
import { constant, dual, flow, pipe, unsafeCoerce } from "./Function.js"
import { getUTCWeekNumBaseYear, getWeekNumBaseYear, isDateFirstArg, isDateFirstTwoArgs } from "./internal/date.js"
import * as Option from "./Option.js"
import * as eOrder from "./Order.js"
import * as Predicate from "./Predicate.js"
import * as String from "./String.js"

import type { LazyArg } from "./Function.js"

/**
 * @since 3.3.0
 * @category instances
 */
export const Equivalence = eEquivalence.Date

/**
 * @since 3.3.0
 * @category instances
 */
export const Order = eOrder.Date

/**
 * @since 3.3.0
 * @category instances
 */
export const isDate = Predicate.isDate

/**
 * Branded type representing the number of milliseconds elapsed since midnight, January 1, 1970 Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category models
 */
export type Milliseconds = Branded<number, "Milliseconds">

/**
 * Branded type representing a date string that can be safely parsed to a `Date`.
 *
 * @since 3.3.0
 * @category models
 */
export type DateString = Branded<string, "DateString">

/**
 * Convert a `number` to the `Milliseconds` branded type.
 *
 * @since 3.3.0
 * @category conversions
 */
export const mkMilliseconds = unsafeCoerce<number, Milliseconds>

/**
 * Convert the `Milliseconds` branded type back to the underlying `number` type.
 *
 * @since 3.3.0
 * @category conversions
 */
export const unMilliseconds = unsafeCoerce<Milliseconds, number>

/**
 * Convert the `DateString` branded type back to the underlying `string` type.
 *
 * @since 3.3.0
 * @category conversions */
export const unDateString = unsafeCoerce<DateString, string>

/**
 * @since 3.3.0
 * @category constants
 */
export const MILLIS_PER_SECOND = 1_000 as const

/**
 * @since 3.3.0
 * @category constants
 */
export const MILLIS_PER_MINUTE = 60_000 as const

/**
 * @since 3.3.0
 * @category constants
 */
export const MILLIS_PER_HOUR = 3_600_000 as const

/**
 * @since 3.3.0
 * @category constants
 */
export const MILLIS_PER_DAY = 86_400_000 as const

/**
 * @since 3.3.0
 * @category constants
 */
export const MILLIS_PER_WEEK = 604_800_000 as const

/**
 * Returns the number of milliseconds elapsed since midnight, January 1, 1970 Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category utils
 */
export const now: LazyArg<Milliseconds> = Date.now as any

/**
 * Returns a date based on the number of milliseconds elapsed since midnight, January 1, 1970 Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category constructors
 */
export const create: LazyArg<Date> = () => new Date(now())

/**
 * Gets the difference in minutes between the time on the local computer and Universal Coordinated Time (UTC).
 *
 * Works based on the date of the input (and whether it's in daylight-savings-time or not), but with respect to local time.
 *
 * @since 3.3.0
 * @category utils
 */
export const getTimeZoneOffset = (self: Date): number => self.getTimezoneOffset()

/**
 * Gets the milliseconds component of a date, using local time.
 *
 * Not to be confused with {@link getTime}.
 *
 * @since 3.3.0
 * @category getters
 */
export const getMilliseconds = (self: Date): number => self.getMilliseconds()

/**
 * Gets the milliseconds component of a date, using Universal Coordinated Time (UTC).
 *
 * Not to be confused with {@link getTime}.
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCMilliseconds = (self: Date): number => self.getUTCMilliseconds()

/**
 * Gets the seconds component of a date object, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getSeconds = (self: Date): number => self.getSeconds()

/**
 * Gets the seconds component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCSeconds = (self: Date): number => self.getUTCSeconds()

/**
 * Gets the minutes component of a date, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getMinutes = (self: Date): number => self.getMinutes()

/**
 * Gets the minutes component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCMinutes = (self: Date): number => self.getUTCMinutes()

/**
 * Gets the hours component of a date, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getHours = (self: Date): number => self.getHours()

/**
 * Gets the hours component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCHours = (self: Date): number => self.getUTCHours()

/**
 * Gets the day of the week, using local time, with 0 representing Sunday.
 *
 * @since 3.3.0
 * @category getters
 */
export const getDay = (self: Date): number => self.getDay()

/**
 * Gets the day of the week, using Universal Coordinated Time (UTC), with 0 representing Sunday.
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCDay = (self: Date): number => self.getUTCDay()

/**
 * Gets the day-of-the-month, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getDate = (self: Date): number => self.getDate()

/**
 * Gets the day-of-the-month, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCDate = (self: Date): number => self.getUTCDate()

/**
 * Gets the month, using local time, with 0 representing January.
 *
 * @since 3.3.0
 * @category getters
 */
export const getMonth = (self: Date): number => self.getMonth()

/**
 * Gets the month, using Universal Coordinated Time (UTC), with 0 representing January.
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCMonth = (self: Date): number => self.getUTCMonth()

/**
 * Gets the year, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getYear = (self: Date): number => self.getFullYear()

/**
 * Gets the year, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getUTCYear = (self: Date): number => self.getUTCFullYear()

/**
 * Returns the stored time value in milliseconds since midnight, January 1, 1970 UTC.
 *
 * @since 3.3.0
 * @category getters
 */
export const getTime = (self: Date): Milliseconds => self.getTime() as Milliseconds

/**
 * Sets the milliseconds component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setMilliseconds: {
  (millis: number): (self: Date) => Date
  (self: Date, millis: number): Date
} = dual(2, (self: Date, millis: number): Date => new Date(new Date(self).setMilliseconds(millis)))

/**
 * Sets the milliseconds component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCMilliseconds: {
  (millis: number): (self: Date) => Date
  (self: Date, millis: number): Date
} = dual(2, (self: Date, millis: number): Date => new Date(new Date(self).setUTCMilliseconds(millis)))

/**
 * Sets the seconds component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setSeconds: {
  (seconds: number): (self: Date) => Date
  (self: Date, seconds: number): Date
} = dual(2, (self: Date, seconds: number): Date => new Date(new Date(self).setSeconds(seconds)))

/**
 * Sets the seconds component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCSeconds: {
  (seconds: number): (self: Date) => Date
  (self: Date, seconds: number): Date
} = dual(2, (self: Date, seconds: number): Date => new Date(new Date(self).setUTCSeconds(seconds)))

/**
 * Sets the minutes component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setMinutes: {
  (minutes: number): (self: Date) => Date
  (self: Date, minutes: number): Date
} = dual(2, (self: Date, minutes: number): Date => new Date(new Date(self).setMinutes(minutes)))

/**
 * Sets the minutes component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCMinutes: {
  (seconds: number): (self: Date) => Date
  (self: Date, seconds: number): Date
} = dual(2, (self: Date, minutes: number): Date => new Date(new Date(self).setUTCMinutes(minutes)))

/**
 * Sets the hours component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setHours: {
  (hours: number): (self: Date) => Date
  (self: Date, hours: number): Date
} = dual(2, (self: Date, hours: number): Date => new Date(new Date(self).setHours(hours)))

/**
 * Sets the hours component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCHours: {
  (hours: number): (self: Date) => Date
  (self: Date, hours: number): Date
} = dual(2, (self: Date, hours: number): Date => new Date(new Date(self).setUTCHours(hours)))

/**
 * Sets day-of-the-week of a date object, using local time.
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category setters
 */
export const setDay: {
  (day: number, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, day: number, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(
  isDateFirstArg,
  (self: Date, day: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date =>
    addDays(self, day + dowOffset - getDay(self))
)

/**
 * Sets day-of-the-week of a date object, using Universal Coordinated Time (UTC).
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCDay: {
  (day: number, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, day: number, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(
  isDateFirstArg,
  (self: Date, day: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date =>
    addUTCDays(self, day + dowOffset - getUTCDay(self))
)

/**
 * Sets the day-of-the-month component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setDate: {
  (date: number): (self: Date) => Date
  (self: Date, date: number): Date
} = dual(2, (self: Date, date: number): Date => new Date(new Date(self).setDate(date)))

/**
 * Sets the day-of-the-month component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCDate: {
  (date: number): (self: Date) => Date
  (self: Date, date: number): Date
} = dual(2, (self: Date, date: number): Date => new Date(new Date(self).setUTCDate(date)))

/**
 * Sets the month component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setMonth: {
  (month: number): (self: Date) => Date
  (self: Date, month: number): Date
} = dual(2, (self: Date, month: number): Date => new Date(new Date(self).setMonth(month)))

/**
 * Sets the month component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCMonth: {
  (month: number): (self: Date) => Date
  (self: Date, month: number): Date
} = dual(2, (self: Date, month: number): Date => new Date(new Date(self).setUTCMonth(month)))

/**
 * Sets the year component of a date object, using local time.
 *
 * @since 3.3.0
 * @category setters
 */
export const setYear: {
  (year: number): (self: Date) => Date
  (self: Date, year: number): Date
} = dual(2, (self: Date, year: number): Date => new Date(new Date(self).setFullYear(year)))

/**
 * Sets the year component of a date object, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category setters
 */
export const setUTCYear: {
  (year: number): (self: Date) => Date
  (self: Date, year: number): Date
} = dual(2, (self: Date, year: number): Date => new Date(new Date(self).setUTCFullYear(year)))

/**
 * Add milliseconds to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addMilliseconds: {
  (millis: number): (self: Date) => Date
  (self: Date, millis: number): Date
} = dual(
  2,
  (self: Date, millis: number): Date => millis === 0 ? self : setMilliseconds(self, getMilliseconds(self) + millis)
)

/**
 * Add milliseconds to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCMilliseconds: {
  (millis: number): (self: Date) => Date
  (self: Date, millis: number): Date
} = dual(
  2,
  (self: Date, millis: number): Date =>
    millis === 0 ? self : setUTCMilliseconds(self, getUTCMilliseconds(self) + millis)
)

/**
 * Add seconds to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addSeconds: {
  (seconds: number): (self: Date) => Date
  (self: Date, seconds: number): Date
} = dual(
  2,
  (self: Date, seconds: number): Date => seconds === 0 ? self : setSeconds(self, getSeconds(self) + seconds)
)

/**
 * Add seconds to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCSeconds: {
  (seconds: number): (self: Date) => Date
  (self: Date, seconds: number): Date
} = dual(
  2,
  (self: Date, seconds: number): Date => seconds === 0 ? self : setUTCSeconds(self, getUTCSeconds(self) + seconds)
)

/**
 * Add minutes to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addMinutes: {
  (minutes: number): (self: Date) => Date
  (self: Date, minutes: number): Date
} = dual(
  2,
  (self: Date, minutes: number): Date => minutes === 0 ? self : setMinutes(self, getMinutes(self) + minutes)
)

/**
 * Add minutes to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCMinutes: {
  (minutes: number): (self: Date) => Date
  (self: Date, minutes: number): Date
} = dual(
  2,
  (self: Date, minutes: number): Date => minutes === 0 ? self : setUTCMinutes(self, getUTCMinutes(self) + minutes)
)

/**
 * Add hours to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addHours: {
  (hours: number): (self: Date) => Date
  (self: Date, hours: number): Date
} = dual(2, (self: Date, hours: number): Date => hours === 0 ? self : setHours(self, getHours(self) + hours))

/**
 * Add hours to a date, using Univeral Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCHours: {
  (hours: number): (self: Date) => Date
  (self: Date, hours: number): Date
} = dual(2, (self: Date, hours: number): Date => hours === 0 ? self : setUTCHours(self, getUTCHours(self) + hours))

/**
 * Add days to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addDays: {
  (days: number): (self: Date) => Date
  (self: Date, days: number): Date
} = dual(2, (self: Date, days: number): Date => days === 0 ? self : setDate(self, getDate(self) + days))

/**
 * Add days to a date, using Univeral Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCDays: {
  (days: number): (self: Date) => Date
  (self: Date, days: number): Date
} = dual(2, (self: Date, days: number): Date => days === 0 ? self : setUTCDate(self, getUTCDate(self) + days))

/**
 * Add weeks to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addWeeks: {
  (weeks: number): (self: Date) => Date
  (self: Date, weeks: number): Date
} = dual(2, (self: Date, weeks: number): Date => weeks === 0 ? self : addDays(self, weeks * 7))

/**
 * Add weeks to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCWeeks: {
  (weeks: number): (self: Date) => Date
  (self: Date, weeks: number): Date
} = dual(2, (self: Date, weeks: number): Date => weeks === 0 ? self : addUTCDays(self, weeks * 7))

/**
 * Add months to a date, using local time.
 *
 * May adjust the month more or less than expected if the day is the last of the month and the target month is short. See also {@link addMonthsStrict}.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localAsUTC)
 * const result1 = pipe(baseDate1, Date.addUTCMonths(1), Date.toISODateString)
 * assert.deepStrictEqual(result1, "2024-03-02")
 *
 * const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localAsUTC)
 * const result2 = pipe(baseDate2, Date.addUTCMonths(-1), Date.toISODateString)
 * assert.deepStrictEqual(result2, "2024-03-02")
 *
 * @since 3.3.0
 * @category math
 */
export const addMonths: {
  (months: number): (self: Date) => Date
  (self: Date, months: number): Date
} = dual(2, (self: Date, months: number): Date => months === 0 ? self : setMonth(self, getMonth(self) + months))

/**
 * Add months to a date, using Universal Coordinated Time (UTC).
 *
 * May adjust the month more or less than expected if the day is the last of the month and the target month is short. See also {@link addUTCMonthsStrict}.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localAsUTC)
 * const result1 = pipe(baseDate1, Date.addUTCMonths(1), Date.toISODateString)
 * assert.deepStrictEqual(result1, "2024-03-02")
 *
 * const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localAsUTC)
 * const result2 = pipe(baseDate2, Date.addUTCMonths(-1), Date.toISODateString)
 * assert.deepStrictEqual(result2, "2024-03-02")
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCMonths: {
  (months: number): (self: Date) => Date
  (self: Date, months: number): Date
} = dual(2, (self: Date, months: number): Date => months === 0 ? self : setUTCMonth(self, getUTCMonth(self) + months))

/**
 * Add months to a date, using local time.
 *
 * If the day is the last of the month and the target month is short, the day will be set to zero to strictly add the desired number of months.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localAsUTC)
 * const result1 = pipe(baseDate1, Date.addUTCMonthsStrict(1), Date.toISODateString)
 * assert.deepStrictEqual(result1, "2024-02-29")
 *
 * const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localAsUTC)
 * const result2 = pipe(baseDate2, Date.addUTCMonthsStrict(-1), Date.toISODateString)
 * assert.deepStrictEqual(result2, "2024-02-29")
 *
 * @since 3.3.0
 * @category math
 */
export const addMonthsStrict: {
  (months: number): (self: Date) => Date
  (self: Date, months: number): Date
} = dual(2, (self: Date, months: number): Date => {
  const naiveResult = addMonths(self, months)

  return monthsValueDistance(self, naiveResult) === months ? naiveResult : setDate(naiveResult, 0)
})

/**
 * Add months to a date, using Universal Coordinated Time (UTC).
 *
 * If the day is the last of the month and the target month is short, the day will be set to zero to strictly add the desired number of months.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localAsUTC)
 * const result1 = pipe(baseDate1, Date.addUTCMonthsStrict(1), Date.toISODateString)
 * assert.deepStrictEqual(result1, "2024-02-29")
 *
 * const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localAsUTC)
 * const result2 = pipe(baseDate2, Date.addUTCMonthsStrict(-1), Date.toISODateString)
 * assert.deepStrictEqual(result2, "2024-02-29")
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCMonthsStrict: {
  (months: number): (self: Date) => Date
  (self: Date, months: number): Date
} = dual(2, (self: Date, months: number): Date => {
  const naiveResult = addUTCMonths(self, months)

  return utcMonthsValueDistance(self, naiveResult) === months ? naiveResult : setUTCDate(naiveResult, 0)
})

/**
 * Add years to a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const addYears: {
  (years: number): (self: Date) => Date
  (self: Date, years: number): Date
} = dual(2, (self: Date, years: number): Date => years === 0 ? self : setYear(self, getYear(self) + years))

/**
 * Add years to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const addUTCYears: {
  (years: number): (self: Date) => Date
  (self: Date, years: number): Date
} = dual(2, (self: Date, years: number): Date => years === 0 ? self : setUTCYear(self, getUTCYear(self) + years))

/**
 * Removes sub-second granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorSecond = setMilliseconds(0)

/**
 * Removes sub-second granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCSecond = setUTCMilliseconds(0)

/**
 * Removes sub-minute granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorMinute = flow(setSeconds(0), floorSecond)

/**
 * Removes sub-minute granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCMinute = flow(setUTCSeconds(0), floorUTCSecond)

/**
 * Removes sub-hour granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorHour = flow(setMinutes(0), floorMinute)

/**
 * Removes sub-hour granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCHour = flow(setUTCMinutes(0), floorUTCMinute)

/**
 * Removes sub-day granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorDay = flow(setHours(0), floorHour)

/**
 * Removes sub-day granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCDay = flow(setUTCHours(0), floorUTCHour)

/**
 * Sets a date to the start of the week, using local time.
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const floorWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(isDateFirstArg, (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date =>
  pipe(
    self,
    addDays(getDay(self) * -1 + dowOffset),
    floorDay
  ))

/**
 * Sets a date to the start of the week, using Universal Coordinated Time (UTC).
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(
  isDateFirstArg,
  (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date =>
    pipe(
      self,
      addUTCDays(getUTCDay(self) * -1 + dowOffset),
      floorUTCDay
    )
)

/**
 * Removes sub-month granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorMonth = flow(setDate(1), floorDay)

/**
 * Removes sub-month granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCMonth = flow(setUTCDate(1), floorUTCDay)

/**
 * Removes sub-year granularity from a date, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const floorYear = flow(setMonth(0), floorMonth)

/**
 * Removes sub-year granularity from a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const floorUTCYear = flow(setUTCMonth(0), floorUTCMonth)

/**
 * Rounds a date to the nearest second, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundSecond = (self: Date): Date =>
  addSeconds(
    floorSecond(self),
    Math.round(getMilliseconds(self) / MILLIS_PER_SECOND)
  )

/**
 * Rounds a date to the nearest second, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCSecond = (self: Date): Date =>
  addUTCSeconds(
    floorUTCSecond(self),
    Math.round(getUTCMilliseconds(self) / MILLIS_PER_SECOND)
  )

/**
 * Rounds a date to the nearest minute, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundMinute = (self: Date): Date => {
  const floor = floorMinute(self)

  return addMinutes(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_MINUTE)
  )
}

/**
 * Rounds a date to the nearest minute, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCMinute = (self: Date): Date => {
  const floor = floorUTCMinute(self)

  return addUTCMinutes(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_MINUTE)
  )
}

/**
 * Rounds a date to the nearest hour, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundHour = (self: Date): Date => {
  const floor = floorHour(self)

  return addHours(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_HOUR)
  )
}

/**
 * Rounds a date to the nearest hour, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCHour = (self: Date): Date => {
  const floor = floorUTCHour(self)

  return addUTCHours(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_HOUR)
  )
}

/**
 * Rounds a date to the nearest day, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundDay = (self: Date): Date => {
  const floor = floorDay(self)

  return addDays(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_DAY)
  )
}

/**
 * Rounds a date to the nearest day, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCDay = (self: Date): Date => {
  const floor = floorUTCDay(self)

  return addUTCDays(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_DAY)
  )
}

/**
 * Rounds a date to the nearest week, using local time.
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const roundWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(isDateFirstArg, (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date => {
  const floor = floorWeek(self, dowOffset)

  return addDays(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_WEEK) * 7
  )
})

/**
 * Rounds a date to the nearest week, using Universal Coordinated Time (UTC).
 *
 * Use the `dowOffset` argument to set the start of the week. Default is 0, for Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(isDateFirstArg, (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date => {
  const floor = floorUTCWeek(self, dowOffset)

  return addUTCDays(
    floor,
    Math.round(millisecondsDistance(floor, self) / MILLIS_PER_WEEK) * 7
  )
})

/**
 * Rounds a date to the nearest month, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundMonth = (self: Date): Date => {
  const startThis = floorMonth(self)
  const startNext = ceilMonth(self)

  return millisecondsDistance(startThis, self) < millisecondsDistance(self, startNext) ? startThis : startNext
}

/**
 * Rounds a date to the nearest month, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCMonth = (self: Date): Date => {
  const startThis = floorUTCMonth(self)
  const startNext = ceilUTCMonth(self)

  return millisecondsDistance(startThis, self) < millisecondsDistance(self, startNext) ? startThis : startNext
}

/**
 * Rounds a date to the nearest year, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const roundYear = (self: Date): Date => {
  const startThis = floorYear(self)
  const startNext = ceilYear(self)

  return millisecondsDistance(startThis, self) < millisecondsDistance(self, startNext) ? startThis : startNext
}

/**
 * Rounds a date to the nearest year, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const roundUTCYear = (self: Date): Date => {
  const startThis = floorUTCYear(self)
  const startNext = ceilUTCYear(self)

  return millisecondsDistance(startThis, self) < millisecondsDistance(self, startNext) ? startThis : startNext
}

/**
 * Removes sub-second granularity from a date, then adds one second, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilSecond = flow(floorSecond, addSeconds(1))

/**
 * Removes sub-second granularity from a date, then adds one second, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCSecond = flow(floorUTCSecond, addUTCSeconds(1))

/**
 * Removes sub-minute granularity from a date, then adds one minute, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilMinute = flow(floorMinute, addMinutes(1))

/**
 * Removes sub-minute granularity from a date, then adds one minute, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCMinute = flow(floorUTCMinute, addUTCMinutes(1))

/**
 * Removes sub-hour granularity from a date, then adds one hour, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilHour = flow(floorHour, addHours(1))

/**
 * Removes sub-hour granularity from a date, then adds one hour, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCHour = flow(floorUTCHour, addUTCHours(1))

/**
 * Removes sub-day granularity from a date, then adds one day, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilDay = flow(floorDay, addDays(1))

/**
 * Removes sub-day granularity from a date, then adds one day, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCDay = flow(floorUTCDay, addUTCDays(1))

/**
 * Removes sub-week granularity from a date, then adds one week, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(
  isDateFirstArg,
  (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date => pipe(self, floorWeek(dowOffset), addWeeks(1))
)

/**
 * Removes sub-week granularity from a date, then adds one week, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCWeek: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => Date
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date
} = dual(
  isDateFirstArg,
  (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): Date => pipe(self, floorUTCWeek(dowOffset), addUTCWeeks(1))
)

/**
 * Removes sub-month granularity from a date, then adds one month, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilMonth = flow(floorMonth, addMonths(1))

/**
 * Removes sub-month granularity from a date, then adds one month, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCMonth = flow(floorUTCMonth, addUTCMonths(1))

/**
 * Removes sub-year granularity from a date, then adds one year, using local time.
 *
 * @since 3.3.0
 * @category math
 */
export const ceilYear = flow(floorYear, addYears(1))

/**
 * Removes sub-year granularity from a date, then adds one year, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const ceilUTCYear = flow(floorUTCYear, addUTCYears(1))

/**
 * Converts a local time to Universal Coordinated Time (UTC), allowing you to start with a local date and then work with the `UTC` functions.
 *
 * This frees you from having to worry about manipulation of dates across daylight-savings-time boundaries resulting in unexpected date strings.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * const baseDate1 = pipe("2024-01-01T00:00:00.000", Date.unsafeParse, Date.localAsUTC)
 * const result1 = pipe(baseDate1, Date.addUTCMonths(6), Date.toISOString)
 * assert.deepStrictEqual(result1, "2024-07-01T00:00:00.000Z")
 *
 * const baseDate2 = pipe("2024-07-01T00:00:00.000", Date.unsafeParse, Date.localAsUTC)
 * const result2 = pipe(baseDate2, Date.addUTCMonths(6), Date.toISOString)
 * assert.deepStrictEqual(result2, "2025-01-01T00:00:00.000Z")
 *
 * @since 3.3.0
 * @category utils
 */
export const localAsUTC = (self: Date) => addUTCMinutes(self, getTimeZoneOffset(self) * -1)

/**
 * Gets the difference in milliseconds between `start` and `end`, returning a negative number if `end` is earlier than `start`.
 *
 * @since 3.3.0
 * @category math
 */
export const millisecondsDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => getTime(end) - getTime(start))

/**
 * Gets the difference in seconds between `start` and `end`, returning a negative number if `end` is earlier than `start`. Does not perform rounding.
 *
 * @since 3.3.0
 * @category math
 */
export const secondsDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => millisecondsDistance(start, end) / MILLIS_PER_SECOND)

/**
 * Gets the surface-level difference in seconds between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const secondsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => secondsDistance(floorSecond(start), floorSecond(end)))

/**
 * Gets the surface-level difference in seconds between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcSecondsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => secondsDistance(floorUTCSecond(start), floorUTCSecond(end)))

/**
 * Gets the difference in minutes between `start` and `end`, returning a negative number if `end` is earlier than `start`. Does not perform rounding.
 *
 * @since 3.3.0
 * @category math
 */
export const minutesDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => millisecondsDistance(start, end) / MILLIS_PER_MINUTE)

/**
 * Gets the surface-level difference in minutes between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const minutesValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => minutesDistance(floorMinute(start), floorMinute(end)))

/**
 * Gets the surface-level difference in minutes between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcMinutesValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => minutesDistance(floorUTCMinute(start), floorUTCMinute(end)))

/**
 * Gets the difference in hours between `start` and `end`, returning a negative number if `end` is earlier than `start`. Does not perform rounding.
 *
 * @since 3.3.0
 * @category math
 */
export const hoursDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => millisecondsDistance(start, end) / MILLIS_PER_HOUR)

/**
 * Gets the surface-level difference in hours between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const hoursValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => hoursDistance(floorHour(start), floorHour(end)))

/**
 * Gets the surface-level difference in hours between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcHoursValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => hoursDistance(floorUTCHour(start), floorUTCHour(end)))

/**
 * Gets the difference in days between `start` and `end`, returning a negative number if `end` is earlier than `start`. Does not perform rounding.
 *
 * @since 3.3.0
 * @category math
 */
export const daysDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => millisecondsDistance(start, end) / MILLIS_PER_DAY)

/**
 * Gets the surface-level difference in days between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const daysValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => daysDistance(floorDay(start), floorDay(end)))

/**
 * Gets the surface-level difference in days between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcDaysValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => daysDistance(floorUTCDay(start), floorUTCDay(end)))

/**
 * Gets the difference in weeks between `start` and `end`, returning a negative number if `end` is earlier than `start`. Does not perform rounding.
 *
 * @since 3.3.0
 * @category math
 */
export const weeksDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => millisecondsDistance(start, end) / MILLIS_PER_WEEK)

/**
 * Gets the surface-level difference in weeks between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * Use the `dowOffset` argument to change the start of the week, with 0 representing Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const weeksValueDistance: {
  (end: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (start: Date) => number
  (start: Date, end: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): number
} = dual(
  isDateFirstTwoArgs,
  (start: Date, end: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): number =>
    weeksDistance(floorWeek(start, dowOffset), floorWeek(end, dowOffset))
)

/**
 * Gets the surface-level difference in weeks between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * Use the `dowOffset` argument to change the start of the week, with 0 representing Sunday.
 *
 * @since 3.3.0
 * @category math
 */
export const utcWeeksValueDistance: {
  (end: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (start: Date) => number
  (start: Date, end: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): number
} = dual(
  isDateFirstTwoArgs,
  (start: Date, end: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): number =>
    weeksDistance(floorUTCWeek(start, dowOffset), floorUTCWeek(end, dowOffset))
)

/**
 * Gets the surface-level difference in months between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const monthsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(
  2,
  (start: Date, end: Date): number => (getYear(end) * 12 + getMonth(end)) - (getYear(start) * 12 + getMonth(start))
)

/**
 * Gets the surface-level difference in months between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcMonthsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(
  2,
  (start: Date, end: Date): number =>
    (getUTCYear(end) * 12 + getUTCMonth(end)) - (getUTCYear(start) * 12 + getUTCMonth(start))
)

/**
 * Gets the surface-level difference in years between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses local time.
 *
 * @since 3.3.0
 * @category math
 */
export const yearsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => getYear(end) - getYear(start))

/**
 * Gets the surface-level difference in years between `start` and `end`, returning a negative number if `end` is earlier than `start`. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category math
 */
export const utcYearsValueDistance: {
  (end: Date): (start: Date) => number
  (start: Date, end: Date): number
} = dual(2, (start: Date, end: Date): number => getUTCYear(end) - getUTCYear(start))

/**
 * @since 3.3.0
 * @category models
 */
export interface AddParams {
  readonly millis?: number
  readonly seconds?: number
  readonly minutes?: number
  readonly hours?: number
  readonly weeks?: number
  readonly months?: number
  readonly years?: number
}

/**
 * Add many kinds of unit at once based on an object input, using local time. Default for all values is 0.
 *
 * `AddParams` keys are `millis`, `seconds`, `minutes`, `hours`, `weeks`, `months`, and `years`.
 *
 * @since 3.3.0
 * @category math
 */
export const add: {
  (that: AddParams): (self: Date) => Date
  (self: Date, that: AddParams): Date
} = dual(
  2,
  (
    self: Date,
    { hours = 0, millis = 0, minutes = 0, months = 0, seconds = 0, weeks = 0, years = 0 }: AddParams
  ): Date =>
    pipe(
      self,
      addMilliseconds(millis),
      addSeconds(seconds),
      addMinutes(minutes),
      addHours(hours),
      addWeeks(weeks),
      addMonths(months),
      addYears(years)
    )
)

/**
 * Add many kinds of unit at once based on an object input, using Universal Coordinated Time (UTC). Default for all values is 0.
 *
 * `AddParams` keys are `millis`, `seconds`, `minutes`, `hours`, `weeks`, `months`, and `years`.
 *
 * @since 3.3.0
 * @category math
 */
export const addUTC: {
  (that: AddParams): (self: Date) => Date
  (self: Date, that: AddParams): Date
} = dual(
  2,
  (
    self: Date,
    { hours = 0, millis = 0, minutes = 0, months = 0, seconds = 0, weeks = 0, years = 0 }: AddParams
  ): Date =>
    pipe(
      self,
      addUTCMilliseconds(millis),
      addUTCSeconds(seconds),
      addUTCMinutes(minutes),
      addUTCHours(hours),
      addUTCWeeks(weeks),
      addUTCMonths(months),
      addUTCYears(years)
    )
)

/**
 * Add a `Duration` to a date, using local time.
 *
 * @since 3.3.0
 * @category Duration
 */
export const addDuration: {
  (that: Duration.Duration): (self: Date) => Date
  (self: Date, that: Duration.Duration): Date
} = dual(2, (self: Date, that: Duration.Duration): Date => addMilliseconds(self, Duration.toMillis(that)))

/**
 * Add a `Duration` to a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category Duration
 */
export const addUTCDuration: {
  (that: Duration.Duration): (self: Date) => Date
  (self: Date, that: Duration.Duration): Date
} = dual(2, (self: Date, that: Duration.Duration): Date => addUTCMilliseconds(self, Duration.toMillis(that)))

/**
 * Pass a positive `Duration` value to subtract it from a date. Uses local time.
 *
 * @since 3.3.0
 * @category Duration
 */
export const subtractDuration: {
  (that: Duration.Duration): (self: Date) => Date
  (self: Date, that: Duration.Duration): Date
} = dual(2, (self: Date, that: Duration.Duration): Date => addMilliseconds(self, Duration.toMillis(that) * -1))

/**
 * Pass a positive `Duration` value to subtract it from a date. Uses Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category Duration
 */
export const subtractUTCDuration: {
  (that: Duration.Duration): (self: Date) => Date
  (self: Date, that: Duration.Duration): Date
} = dual(2, (self: Date, that: Duration.Duration): Date => addUTCMilliseconds(self, Duration.toMillis(that) * -1))

/**
 * Get the number of days in the month, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getDaysInMonth = (self: Date): number =>
  daysDistance(
    floorMonth(self),
    ceilMonth(self)
  )

/**
 * Get the number of days in the month, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getDaysInUTCMonth = (self: Date): number =>
  daysDistance(
    floorUTCMonth(self),
    ceilUTCMonth(self)
  )

/**
 * Get the number of days in the year, using local time.
 *
 * @since 3.3.0
 * @category getters
 */
export const getDaysInYear = (self: Date): number =>
  daysDistance(
    floorYear(self),
    ceilYear(self)
  )

/**
 * Get the number of days in the year, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category getters
 */
export const getDaysInUTCYear = (self: Date): number =>
  daysDistance(
    floorUTCYear(self),
    ceilUTCYear(self)
  )

/**
 * Get a string representation of a date, using local time.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toDateString, console.log)
 * // Expected output: "Fri May 17 2024", varies by locale
 *
 * @since 3.3.0
 * @category getters
 */
export const toDateString = (self: Date): DateString => self.toDateString() as DateString

/**
 * Get a string representation of a date in ISO 8601 format, using Universal Coordinated Time (UTC).
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toISOString, console.log)
 * // Expected output: "2024-05-17T17:50:57.100Z"
 *
 * @since 3.3.0
 * @category getters
 */
export const toISOString = (self: Date): DateString => self.toISOString() as DateString

/**
 * Get the date portion of a string representation of a date in ISO 8601 format, using Universal Coordinated Time (UTC).
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toISODateString, console.log)
 * // Expected output: "2024-05-17"
 *
 * @since 3.3.0
 * @category getters
 */
export const toISODateString = (self: Date): DateString => String.takeLeft(self.toISOString(), 10) as DateString

/**
 * @since 3.3.0
 * @category models */
export type ToLocaleStringOptions = {
  readonly locale?: Intl.LocalesArgument
} & Readonly<Intl.LocaleOptions>

/**
 * Get a string representation of a date using the current or specified locale.
 *
 * The `options` argument reflects the optional arguments of `Date.prototype.toLocaleString`, just consolidated with a `locale` key to capture the `locales` argument.
 *
 * @since 3.3.0
 * @category getters
 */
export const toLocaleString: {
  (options?: ToLocaleStringOptions): (self: Date) => string
  (self: Date, options?: ToLocaleStringOptions): string
} = dual(
  isDateFirstArg,
  (self: Date, { locale, ...options }: ToLocaleStringOptions = {}): string => self.toLocaleString(locale, options)
)

/**
 * @since 3.3.0
 * @category models */
export type ToLocaleDateTimeStringOptions = {
  readonly locale?: Intl.LocalesArgument
} & Readonly<Intl.DateTimeFormatOptions>

/**
 * Get the date portion of a string representation of a date using the current or specified locale.
 *
 * The `options` argument reflects the optional arguments of `Date.prototype.toLocaleDateString`, just consolidated with a `locale` key to capture the `locales` argument.
 *
 * @since 3.3.0
 * @category getters
 */
export const toLocaleDateString: {
  (options?: ToLocaleDateTimeStringOptions): (self: Date) => string
  (self: Date, options?: ToLocaleDateTimeStringOptions): string
} = dual(
  isDateFirstArg,
  (self: Date, { locale, ...options }: ToLocaleDateTimeStringOptions = {}): string =>
    self.toLocaleDateString(locale, options)
)

/**
 * Get the time portion of a string representation of a date using the current or specified locale.
 *
 * The `options` argument reflects the optional arguments of `Date.prototype.toLocaleTimeString`, just consolidated with a `locale` key to capture the `locales` argument.
 *
 * @since 3.3.0
 * @category getters
 */
export const toLocaleTimeString: {
  (options?: ToLocaleDateTimeStringOptions): (self: Date) => string
  (self: Date, options?: ToLocaleDateTimeStringOptions): string
} = dual(
  isDateFirstArg,
  (self: Date, { locale, ...options }: ToLocaleDateTimeStringOptions = {}): string =>
    self.toLocaleDateString(locale, options)
)

/**
 * Get the string representation of a date, using local time.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toString, console.log)
 * // Expected output: "Sat May 18 2024 14:00:22 GMT+0100 (British Summer Time)", varies by locale
 *
 * @since 3.3.0
 * @category getters
 */
export const toString = (self: Date): DateString => self.toString() as DateString

/**
 * Get the string representation of the time portion of a date, using local time.
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toDateString, console.log)
 * // Expected output: "14:03:24 GMT+0100 (British Summer Time)", varies by locale
 *
 * @since 3.3.0
 * @category getters
 */
export const toTimeString = (self: Date): string => self.toTimeString()

/**
 * Get the string representation of a date, using Universal Coordinated Time (UTC).
 *
 * @example
 * import { Date, pipe } from "effect"
 *
 * pipe(Date.create(), Date.toUTCString, console.log)
 * // Expected output: "Sat, 18 May 2024 13:04:55 GMT"
 *
 * @since 3.3.0
 * @category getters
 */
export const toUTCString = (self: Date): DateString => self.toUTCString() as DateString

/**
 * @since 3.3.0
 * @category predicates
 */
export const isValid: Predicate.Predicate<Date> = (self) => toString(self) !== "Invalid Date"

/**
 * @since 3.3.0
 * @category predicates
 */
export const isValidOption = Option.liftPredicate(isValid)

/**
 * @since 3.3.0
 * @category constructors
 */
export const unsafeParse = (date: string | number | Date): Date => new Date(date)

/**
 * @since 3.3.0
 * @category constructors
 */
export const parse = (date: string | number): Option.Option<Date> => pipe(date, unsafeParse, isValidOption)

/**
 * @since 3.3.0
 * @category constructors
 */
export const parseEither = <T extends string | number>(date: T) => Either.fromOption(parse(date), constant(date))

/**
 * Like {@link parse}, but designed for non-standard `DateString`-like input that browsers may fail to parse.
 *
 * Operations this function attempts:
 * 1. Regular parsing
 * 2. Replacing spaces by `T` before parsing, which can help if the input in the form `2020-01-01 00:00:00.0`
 * 3. Adding `1 ` to a string in the form `Jan 2024`
 * 4. Adding `-01` to a string in the form `2024-01`
 * 5. Replacing dots used for time delimiters instead of colons
 *
 * @since 3.3.0
 * @category constructors
 */
export const parseDateString = (date: string) =>
  Option.firstSomeOf([
    parse(date),
    pipe(date, String.replace(" ", "T"), parse),
    pipe("1 ", String.concat(date), parse),
    pipe(date, String.concat("-01"), parse),
    pipe(date, String.replaceAll(".", ":"), parse)
  ])

/**
 * @since 3.3.0
 * @category getters
 */
export const parseDateStringEither = <T extends string>(date: T) =>
  Either.fromOption(parseDateString(date), constant(date))

/**
 * @since 3.3.0
 * @category constructors
 */
export const fromMilliseconds: (self: Milliseconds) => Date = unsafeParse

/**
 * @since 3.3.0
 * @category constructors */
export const fromDateString: (self: DateString) => Date = unsafeParse

/**
 * @since 3.3.0
 * @category utils
 */
export const clamp = eOrder.clamp(eOrder.Date)

/**
 * @since 3.3.0
 * @category utils
 */
export const max = eOrder.max(eOrder.Date)

/**
 * @since 3.3.0
 * @category utils
 */
export const min = eOrder.min(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const between = eOrder.between(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const greaterThan = eOrder.greaterThan(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const greaterThanOrEqualTo = eOrder.greaterThanOrEqualTo(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const lessThan = eOrder.lessThan(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const lessThanOrEqualTo = eOrder.lessThanOrEqualTo(eOrder.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const isFuture: Predicate.Predicate<Date> = (self) => greaterThan(self, create())

/**
 * @since 3.3.0
 * @category predicates
 */
export const isPast: Predicate.Predicate<Date> = (self) => lessThan(self, create())

/**
 * `Equivalence` for the millisecond component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceMillisecond = eEquivalence.mapInput(eEquivalence.number, getMilliseconds)

/**
 * `Equivalence` for the millisecond component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCMillisecond = eEquivalence.mapInput(eEquivalence.number, getUTCMilliseconds)

/**
 * `Equivalence` for the second component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceSecond = eEquivalence.mapInput(eEquivalence.number, getSeconds)

/**
 * `Equivalence` for the second component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCSecond = eEquivalence.mapInput(eEquivalence.number, getUTCSeconds)

/**
 * `Equivalence` for the hour component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceHour = eEquivalence.mapInput(eEquivalence.number, getHours)

/**
 * `Equivalence` for the hour component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCHour = eEquivalence.mapInput(eEquivalence.number, getUTCHours)

/**
 * `Equivalence` for the day-of-the-week component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceDay = eEquivalence.mapInput(eEquivalence.number, getDay)

/**
 * `Equivalence` for the day-of-the-week component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCDay = eEquivalence.mapInput(eEquivalence.number, getUTCDay)

/**
 * `Equivalence` for the day-of-the-month component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceDate = eEquivalence.mapInput(eEquivalence.number, getDate)

/**
 * `Equivalence` for the day-of-the-month component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCDate = eEquivalence.mapInput(eEquivalence.number, getUTCDate)

/**
 * `Equivalence` for the month component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceMonth = eEquivalence.mapInput(eEquivalence.number, getMonth)

/**
 * `Equivalence` for the month component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCMonth = eEquivalence.mapInput(eEquivalence.number, getUTCMonth)

/**
 * `Equivalence` for the month component of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceYear = eEquivalence.mapInput(eEquivalence.number, getYear)

/**
 * `Equivalence` for the month component of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCYear = eEquivalence.mapInput(eEquivalence.number, getUTCYear)

/**
 * `Equivalence` for the month and year components of a date, using local time.
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceMonthYear = eEquivalence.combine(EquivalenceMonth, EquivalenceYear)

/**
 * `Equivalence` for the month and year components of a date, using Universal Coordinated Time (UTC).
 *
 * @since 3.3.0
 * @category instances
 */
export const EquivalenceUTCMonthYear = eEquivalence.combine(EquivalenceUTCMonth, EquivalenceUTCYear)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equals: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, eEquivalence.Date)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsMillisecond: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceMillisecond)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCMillisecond: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCMillisecond)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsSecond: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceSecond)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCSecond: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCSecond)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsHour: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceHour)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCHour: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCHour)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsDay: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceDay)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCDay: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCDay)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsDate: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceDate)

/**
 * @since 3.3.0
 * @category predicates
 * /
export const equalsUTCDate: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCDate)

/**
 * @since 3.3.0
 * @category predicates
 * */
export const equalsMonth: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceMonth)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCMonth: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCMonth)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsYear: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceYear)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCYear: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCYear)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsMonthYear: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceMonthYear)

/**
 * @since 3.3.0
 * @category predicates
 */
export const equalsUTCMonthYear: {
  (that: Date): (self: Date) => boolean
  (self: Date, that: Date): boolean
} = dual(2, EquivalenceUTCMonthYear)

/**
 * Get the week number of a date (1-53), using local time.
 *
 * Use the `dowOffset` argument to change the start of the week, with 0 representing Sunday.
 *
 * To align with [ISO 8601 week numbers](https://en.wikipedia.org/wiki/ISO_week_date), the default is 1, for Monday.
 *
 * @since 3.3.0
 * @category getters
 */
export const toWeekNumber: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => number
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): number
} = dual(isDateFirstArg, (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): number =>
  Math.floor(
    daysDistance(
          getWeekNumBaseYear(self, dowOffset),
          self
        ) / 7 + 1
  ))

/**
 * Get the week number of a date (1-53), using Universal Coordinated Time (UTC).
 *
 * Use the `dowOffset` argument to change the start of the week, with 0 representing Sunday.
 *
 * To align with ISO 8601 week numbers, the default is 1, for Monday.
 *
 * @since 3.3.0
 * @category getters
 */
export const toUTCWeekNumber: {
  (dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): (self: Date) => number
  (self: Date, dowOffset?: 0 | 1 | 2 | 3 | 4 | 5 | 6): number
} = dual(isDateFirstArg, (self: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): number =>
  Math.floor(
    daysDistance(
          getUTCWeekNumBaseYear(self, dowOffset),
          self
        ) / 7 + 1
  ))
