import * as Cron from "effect/Cron"
import * as DateTime from "effect/DateTime"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import { identity } from "effect/Function"
import { assertFalse, assertTrue, deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

const parse = (input: string, tz?: DateTime.TimeZone) => Either.getOrThrowWith(Cron.parse(input, tz), identity)
const match = (input: Cron.Cron | string, date: DateTime.DateTime.Input) =>
  Cron.match(Cron.isCron(input) ? input : parse(input), date)
const next = (input: Cron.Cron | string, after?: DateTime.DateTime.Input) =>
  Cron.next(Cron.isCron(input) ? input : parse(input), after)

describe("Cron", () => {
  it("parse", () => {
    // At 04:00 on every day-of-month from 8 through 14.
    deepStrictEqual(
      Cron.parse("0 4 8-14 * 0-6"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [4],
        days: [8, 9, 10, 11, 12, 13, 14],
        months: [],
        weekdays: []
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("0 0 1,15 * 3"),
      Either.right(Cron.make({
        minutes: [0],
        hours: [0],
        days: [1, 15],
        months: [],
        weekdays: [3]
      }))
    )
    // At 00:00 on day-of-month 1 and 15 and on Wednesday.
    deepStrictEqual(
      Cron.parse("23 0-20/2 * * *"),
      Either.right(Cron.make({
        minutes: [23],
        hours: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
        days: [],
        months: [],
        weekdays: []
      }))
    )
  })

  it("match", () => {
    assertTrue(match("5 0 * 8 *", "2024-08-01 00:05:00"))
    assertFalse(match("5 0 * 8 *", "2024-09-01 00:05:00"))
    assertFalse(match("5 0 * 8 *", "2024-08-01 01:05:00"))

    assertTrue(match("15 14 1 * *", "2024-02-01 14:15:00"))
    assertFalse(match("15 14 1 * *", "2024-02-01 15:15:00"))
    assertFalse(match("15 14 1 * *", "2024-02-02 14:15:00"))

    assertTrue(match("23 0-20/2 * * 0", "2024-01-07 00:23:00"))
    assertFalse(match("23 0-20/2 * * 0", "2024-01-07 03:23:00"))
    assertFalse(match("23 0-20/2 * * 0", "2024-01-08 00:23:00"))

    assertTrue(match("5 4 * * SUN", "2024-01-07 04:05:00"))
    assertFalse(match("5 4 * * SUN", "2024-01-08 04:05:00"))
    assertFalse(match("5 4 * * SUN", "2025-01-07 04:05:00"))

    assertTrue(match("5 4 * DEC SUN", "2024-12-01 04:05:00"))
    assertFalse(match("5 4 * DEC SUN", "2024-12-01 04:06:00"))
    assertFalse(match("5 4 * DEC SUN", "2024-12-02 04:05:00"))

    assertTrue(match("5 4 * * SUN", "2024-01-07 04:05:00"))
    assertFalse(match("5 4 * * SUN", "2024-01-08 04:05:00"))
    assertFalse(match("5 4 * * SUN", "2025-01-07 04:05:00"))

    const zone = DateTime.zoneUnsafeMakeNamed("Europe/Vienna")
    // With time zone adjusted cron (comparing to UTC).
    assertTrue(match(parse("15 14 1 * *", zone), "2024-06-01 12:15:00Z"))
    // With time zone adjusted cron and time zone adjusted date.
    const adjusted = DateTime.unsafeMakeZoned("2024-06-01 14:15:00", { timeZone: zone })
    assertTrue(match(parse("15 14 1 * *", zone), adjusted))
  })

  it("next", () => {
    const after = new Date("2024-01-04 16:21:00")
    deepStrictEqual(next("5 0 8 2 *", after), new Date("2024-02-08 00:05:00"))
    deepStrictEqual(next("15 14 1 * *", after), new Date("2024-02-01 14:15:00"))
    deepStrictEqual(next("23 0-20/2 * * 0", after), new Date("2024-01-07 00:23:00"))
    deepStrictEqual(next("5 4 * * SUN", after), new Date("2024-01-07 04:05:00"))
    deepStrictEqual(next("5 4 * DEC SUN", after), new Date("2024-12-01 04:05:00"))

    const zone = DateTime.zoneUnsafeMakeNamed("Europe/Vienna")
    // With time zone adjusted cron (comparing to UTC).
    deepStrictEqual(next(parse("5 0 8 2 *", zone), after), new Date("2024-02-07 23:05:00Z"))
    // With time zone adjusted cron and time zone adjusted date.
    const adjusted = DateTime.unsafeMakeZoned("2024-02-08 00:05:00", { timeZone: zone })
    deepStrictEqual(next(parse("5 0 8 2 *", zone), after), adjusted.pipe(DateTime.toDateUtc))
  })

  it("sequence", () => {
    const start = new Date("2024-01-01 00:00:00")
    const generator = Cron.sequence(parse("23 0-20/2 * * 0"), start)
    deepStrictEqual(generator.next().value, new Date("2024-01-07 00:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 02:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 04:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 06:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 08:23:00"))
  })

  it("equal", () => {
    const cron = parse("23 0-20/2 * * 0")
    assertTrue(Equal.equals(cron, cron))
    assertTrue(Equal.equals(cron, parse("23 0-20/2 * * 0")))
    assertFalse(Equal.equals(cron, parse("23 0-20/2 * * 1")))
    assertFalse(Equal.equals(cron, parse("23 0-20/2 * * 0-6")))
    assertFalse(Equal.equals(cron, parse("23 0-20/2 1 * 0")))
  })
})
