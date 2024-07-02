import * as Predicate from "../Predicate.js"

/** @internal */
export const isDateFirstArg: Predicate.Predicate<IArguments> = (args) => Predicate.isDate(args[0])

/** @internal */
export const isDateFirstTwoArgs: Predicate.Predicate<IArguments> = (args) =>
  Predicate.isDate(args[0]) && Predicate.isDate(args[1])

/** @internal */
const getWeekOneDayOne = (year: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  // The first week always has 4 January in it
  const weekOne = new Date(year, 0, 4)

  // Set to the start of the week, according to dowOffset
  weekOne.setDate(weekOne.getDate() - weekOne.getDay() + dowOffset)

  return weekOne
}
/** @internal */
const getUTCWeekOneDayOne = (year: number, dowOffset: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date => {
  // The first week always has 4 January in it
  const weekOne = new Date(Date.UTC(year, 0, 4))

  // Set to the start of the week, according to dowOffset
  weekOne.setUTCDate(weekOne.getUTCDate() - weekOne.getUTCDay() + dowOffset)

  return weekOne
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
