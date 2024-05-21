import * as Predicate from "../Predicate.js"

/** @internal */
export const isDateFirstArg: Predicate.Predicate<IArguments> = (args) => Predicate.isDate(args[0])

/** @internal */
export const isDateFirstTwoArgs: Predicate.Predicate<IArguments> = (args) =>
  Predicate.isDate(args[0]) && Predicate.isDate(args[1])

/** @internal */
const getWeekOneDayOne = (year: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  /** The week with the year's January 4 in it is w01, if weeks start on Monday (dowOffset 1). */
  const weekOne = new Date(year, 0, 4)
  const daysToShift = weekOne.getDay() - dowOffset
  return new Date(weekOne.getTime() - daysToShift * 86_400_000)
}

/** @internal */
const getUTCWeekOneDayOne = (year: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  /** The week with the year's January 4 in it is w01, if weeks start on Monday (dowOffset 1). */
  const weekOne = new Date(year, 0, 4)
  const daysToShift = weekOne.getUTCDay() - dowOffset
  return new Date(weekOne.getTime() - daysToShift * 86_400_000)
}

/** @internal */
export const getWeekNumBaseYear = (date: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  const thisYearStart = getWeekOneDayOne(date.getFullYear(), dowOffset)
  if (date.getTime() < thisYearStart.getTime()) {
    // return lastYearStart
    return getWeekOneDayOne(date.getFullYear() - 1, dowOffset)
  }

  const nextYearStart = getWeekOneDayOne(date.getFullYear() + 1, dowOffset)
  if (date.getTime() > nextYearStart.getTime()) {
    return nextYearStart
  }

  return thisYearStart
}

/** @internal */
export const getUTCWeekNumBaseYear = (date: Date, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  const thisYearStart = getUTCWeekOneDayOne(date.getUTCFullYear(), dowOffset)
  if (date.getTime() < thisYearStart.getTime()) {
    // return lastYearStart
    return getUTCWeekOneDayOne(date.getUTCFullYear() - 1, dowOffset)
  }

  const nextYearStart = getUTCWeekOneDayOne(date.getUTCFullYear() + 1, dowOffset)
  if (date.getTime() > nextYearStart.getTime()) {
    return nextYearStart
  }

  return thisYearStart
}
