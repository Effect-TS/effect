import * as Date from "effect/Date"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import { describe, expect, it, test } from "vitest"

describe("Date", () => {
  /**
   * `localToUTC` is the foundation upon which this test suite rests.
   *
   * With it, users can start by creating a base date in their local time, then
   * use `UTC`-based functions to manipulate it, without worrying about time
   * zone boundaries affecting the result in unexpected ways.
   *
   * This is particularly important for making sure the tests pass wherever in
   * the world the developer is based.
   *
   * To write precise dates to be inferred as local, we use
   * `pipe("2024-01-01T00:00:00.000", Date.unsafeParse, Date.localToUTC)`
   * WITHOUT any timezone (or "Z") at the end.
   */
  describe("localToUTC", () => {
    it("produces the same formats", () => {
      const formatLocal = (self: Date) =>
        [
          [
            [Date.getYear, Date.getMonth, Date.getDate].map((f) => f(self)).join("-"),
            [Date.getHours, Date.getMinutes, Date.getSeconds].map((f) => f(self)).join(":")
          ].join(" "),
          Date.getMilliseconds(self)
        ].join(".")

      const formatUTC = (self: Date) =>
        [
          [
            [Date.getUTCYear, Date.getUTCMonth, Date.getUTCDate].map((f) => f(self)).join("-"),
            [Date.getUTCHours, Date.getUTCMinutes, Date.getUTCSeconds].map((f) => f(self)).join(":")
          ].join(" "),
          Date.getUTCMilliseconds(self)
        ].join(".")

      const baseDate = Date.create()
      const result = pipe(baseDate, Date.localToUTC, formatUTC)

      expect(result).toEqual(formatLocal(baseDate))
    })

    it("frees the developer from thinking about daylight savings time boundaries", () => {
      const baseDate1 = pipe("2024-01-01T00:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.addUTCMonths(6), Date.toISOString)
      expect(result1).toEqual("2024-07-01T00:00:00.000Z")

      const baseDate2 = pipe("2024-07-01T00:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.addUTCMonths(6), Date.toISOString)
      expect(result2).toEqual("2025-01-01T00:00:00.000Z")

      /** In the UK, naively adding 6 months to `baseDate` would result in `2024-06-30T23:00:00.000Z`. */
    })
  })

  test("setDay", () => {
    /** 1 Jan 2024 is a Monday. */
    const baseDate = pipe("2024-01-01", Date.unsafeParse, Date.localToUTC)
    const setSunday = pipe(baseDate, Date.setUTCDay(0), Date.toISODateString)
    const setFridayBaseMonday = pipe(baseDate, Date.setUTCDay(4, 1), Date.toISODateString)

    expect(setSunday).toEqual("2023-12-31")
    expect(setFridayBaseMonday).toEqual("2024-01-05")
  })

  test("addMonths", () => {
    const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localToUTC)
    const result1 = pipe(baseDate1, Date.addUTCMonths(1), Date.toISODateString)
    expect(result1).toEqual("2024-03-02")

    const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localToUTC)
    const result2 = pipe(baseDate2, Date.addUTCMonths(-1), Date.toISODateString)
    expect(result2).toEqual("2024-03-02")
  })

  test("addMonthsStrict", () => {
    const baseDate1 = pipe("2024-01-31", Date.unsafeParse, Date.localToUTC)
    const result1 = pipe(baseDate1, Date.addUTCMonthsStrict(1), Date.toISODateString)
    expect(result1).toEqual("2024-02-29")

    const baseDate2 = pipe("2024-03-31", Date.unsafeParse, Date.localToUTC)
    const result2 = pipe(baseDate2, Date.addUTCMonthsStrict(-1), Date.toISODateString)
    expect(result2).toEqual("2024-02-29")
  })

  describe("round", () => {
    test("second", () => {
      const baseDate1 = pipe("2024-01-01T00:00:02.499", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCSecond, Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:00:02.000Z")

      const baseDate2 = pipe("2024-01-01T00:00:02.500", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCSecond, Date.toISOString)
      expect(result2).toEqual("2024-01-01T00:00:03.000Z")
    })

    test("minute", () => {
      const baseDate1 = pipe("2024-01-01T00:02:29.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCMinute, Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:02:00.000Z")

      const baseDate2 = pipe("2024-01-01T00:02:30.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCMinute, Date.toISOString)
      expect(result2).toEqual("2024-01-01T00:03:00.000Z")
    })

    test("hour", () => {
      const baseDate1 = pipe("2024-01-01T02:29:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCHour, Date.toISOString)
      expect(result1).toEqual("2024-01-01T02:00:00.000Z")

      const baseDate2 = pipe("2024-01-01T02:30:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCHour, Date.toISOString)
      expect(result2).toEqual("2024-01-01T03:00:00.000Z")
    })

    test("day", () => {
      const baseDate1 = pipe("2024-01-01T11:59:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCDay, Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:00:00.000Z")

      const baseDate2 = pipe("2024-01-01T12:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCDay, Date.toISOString)
      expect(result2).toEqual("2024-01-02T00:00:00.000Z")
    })

    test("week", () => {
      const baseDate1 = pipe("2024-01-04T11:59:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCWeek(1), Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:00:00.000Z")

      const baseDate2 = pipe("2024-01-04T12:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCWeek(1), Date.toISOString)
      expect(result2).toEqual("2024-01-08T00:00:00.000Z")
    })

    test("month", () => {
      const baseDate1 = pipe("2024-01-16T11:59:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCMonth, Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:00:00.000Z")

      const baseDate2 = pipe("2024-01-16T12:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCMonth, Date.toISOString)
      expect(result2).toEqual("2024-02-01T00:00:00.000Z")
    })

    test("year", () => {
      const baseDate1 = pipe("2024-07-01T23:59:00.000", Date.unsafeParse, Date.localToUTC)
      const result1 = pipe(baseDate1, Date.roundUTCYear, Date.toISOString)
      expect(result1).toEqual("2024-01-01T00:00:00.000Z")

      const baseDate2 = pipe("2024-07-02T00:00:00.000", Date.unsafeParse, Date.localToUTC)
      const result2 = pipe(baseDate2, Date.roundUTCYear, Date.toISOString)
      expect(result2).toEqual("2025-01-01T00:00:00.000Z")
    })
  })

  test("ceilWeek", () => {
    const baseDate = pipe("2024-01-01T00:00:00.000", Date.unsafeParse, Date.localToUTC)
    const result = pipe(baseDate, Date.ceilUTCWeek(1), Date.toISOString)
    expect(result).toEqual("2024-01-08T00:00:00.000Z")
  })

  test("monthsValueDistance", () => {
    const date1 = pipe("2024-02-27", Date.unsafeParse, Date.localToUTC)
    const date2 = pipe("2024-08-03", Date.unsafeParse, Date.localToUTC)
    expect(Date.utcMonthsValueDistance(date1, date2)).toEqual(6)

    const date3 = pipe("2022-05-14", Date.unsafeParse, Date.localToUTC)
    const date4 = pipe("2025-10-22", Date.unsafeParse, Date.localToUTC)
    expect(Date.utcMonthsValueDistance(date3, date4)).toEqual(41)
  })

  test("getDaysInMonth", () => {
    const result = pipe("2024-02-01", Date.unsafeParse, Date.localToUTC, Date.getDaysInUTCMonth)

    expect(result).toEqual(29)
  })

  test("getDaysInYear", () => {
    const result = pipe("2024-01-01", Date.unsafeParse, Date.localToUTC, Date.getDaysInUTCYear)

    expect(result).toEqual(366)
  })

  test("parseDateString", () => {
    expect(pipe("2024-01-01 00:00:00.000", Date.parseDateString, Option.isSome)).true
    expect(pipe("Jan 2024", Date.parseDateString, Option.isSome)).true
    expect(pipe("2024-01", Date.parseDateString, Option.isSome)).true
    expect(pipe("2024-01-01 00.00.00.000", Date.parseDateString, Option.isSome)).true
  })

  test("fromDateString", () => {
    expect(pipe(Date.create(), Date.toDateString, Date.fromDateString, Date.isValid)).true
    expect(pipe(Date.create(), Date.toISOString, Date.fromDateString, Date.isValid)).true
    expect(pipe(Date.create(), Date.toISODateString, Date.fromDateString, Date.isValid)).true
    expect(pipe(Date.create(), Date.toString, Date.fromDateString, Date.isValid)).true
    expect(pipe(Date.create(), Date.toUTCString, Date.fromDateString, Date.isValid)).true
  })

  test("toWeekNumber", () => {
    const result1 = pipe("2023-12-31", Date.unsafeParse, Date.localToUTC, Date.toUTCWeekNumber)
    expect(result1).toEqual(52)

    const result2 = pipe("2023-01-01", Date.unsafeParse, Date.localToUTC, Date.toUTCWeekNumber)
    expect(result2).toEqual(52)

    const result3 = pipe("2024-12-31", Date.unsafeParse, Date.localToUTC, Date.toUTCWeekNumber)
    expect(result3).toEqual(1)

    const result4 = pipe("2021-01-01", Date.unsafeParse, Date.localToUTC, Date.toUTCWeekNumber)
    expect(result4).toEqual(53)
  })
})
