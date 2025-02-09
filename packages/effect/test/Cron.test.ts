import * as Cron from "effect/Cron"
import * as DateTime from "effect/DateTime"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import { assertFalse, assertTrue, deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

const parse = (input: string, tz?: DateTime.TimeZone | string) => Either.getOrThrowWith(Cron.parse(input, tz), identity)
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

    assertTrue(match("42 5 0 * 8 *", "2024-08-01 00:05:42"))
    assertFalse(match("42 5 0 * 8 *", "2024-09-01 00:05:42"))
    assertFalse(match("42 5 0 * 8 *", "2024-08-01 01:05:42"))

    const london = DateTime.zoneUnsafeMakeNamed("Europe/London")
    const londonTime = DateTime.unsafeMakeZoned("2024-06-01 14:15:00Z", {
      timeZone: london,
      adjustForTimeZone: true
    })

    const amsterdam = DateTime.zoneUnsafeMakeNamed("Europe/Amsterdam")
    const amsterdamTime = DateTime.unsafeMakeZoned("2024-06-01 15:15:00Z", {
      timeZone: amsterdam,
      adjustForTimeZone: true
    })

    assertTrue(match(parse("15 14 1 * *", london), londonTime))
    assertTrue(match(parse("15 14 1 * *", london), amsterdamTime))
  })

  it("next", () => {
    const after = new Date("2024-01-04 16:21:00")
    deepStrictEqual(next("5 0 8 2 *", after), new Date("2024-02-08 00:05:00"))
    deepStrictEqual(next("15 14 1 * *", after), new Date("2024-02-01 14:15:00"))
    deepStrictEqual(next("23 0-20/2 * * 0", after), new Date("2024-01-07 00:23:00"))
    deepStrictEqual(next("5 4 * * SUN", after), new Date("2024-01-07 04:05:00"))
    deepStrictEqual(next("5 4 * DEC SUN", after), new Date("2024-12-01 04:05:00"))
    deepStrictEqual(next("30 5 0 8 2 *", after), new Date("2024-02-08 00:05:30"))

    const london = DateTime.zoneUnsafeMakeNamed("Europe/London")
    const londonTime = DateTime.unsafeMakeZoned("2024-02-08 00:05:00Z", {
      timeZone: london,
      adjustForTimeZone: true
    })

    const amsterdam = DateTime.zoneUnsafeMakeNamed("Europe/Amsterdam")
    const amsterdamTime = DateTime.unsafeMakeZoned("2024-02-08 01:05:00Z", {
      timeZone: amsterdam,
      adjustForTimeZone: true
    })

    deepStrictEqual(next(parse("5 0 8 2 *", london), after), DateTime.toDateUtc(londonTime))
    deepStrictEqual(next(parse("5 0 8 2 *", london), after), DateTime.toDateUtc(amsterdamTime))
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

  it("handles leap years", () => {
    assertTrue(match("0 0 29 2 *", "2024-02-29 00:00:00"))
    assertFalse(match("0 0 29 2 *", "2025-02-29 00:00:00"))
    assertFalse(match("0 0 29 2 *", "2026-02-29 00:00:00"))
    assertFalse(match("0 0 29 2 *", "2027-02-29 00:00:00"))
    assertTrue(match("0 0 29 2 *", "2028-02-29 00:00:00"))

    deepStrictEqual(next("0 0 29 2 *", new Date("2024-01-01 00:00:00")), new Date("2024-02-29 00:00:00"))
    deepStrictEqual(next("0 0 29 2 *", new Date("2025-01-01 00:00:00")), new Date("2028-02-29 00:00:00"))
  })

  it("handles transition into daylight savings time", () => {
    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(
      parse("30 * * * *", "Europe/Berlin"),
      make("2024-03-31T00:00:00.000+01:00[Europe/Berlin]")
    )
    const next = (): DateTime.Zoned => DateTime.unsafeMakeZoned(sequence.next().value, { timeZone: "Europe/Berlin" })

    const a = make("2024-03-31T00:30:00.000+01:00[Europe/Berlin]")
    const b = make("2024-03-31T01:30:00.000+01:00[Europe/Berlin]")
    const c = make("2024-03-31T03:30:00.000+02:00[Europe/Berlin]")
    const d = make("2024-03-31T04:30:00.000+02:00[Europe/Berlin]")

    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), a.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), b.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), c.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), d.pipe(DateTime.formatIsoZoned))
  })

  it("handles transition out of daylight savings time", () => {
    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(
      parse("30 * * * *", "Europe/Berlin"),
      make("2024-10-27T00:00:00.000+02:00[Europe/Berlin]")
    )
    const next = (): DateTime.Zoned => DateTime.unsafeMakeZoned(sequence.next().value, { timeZone: "Europe/Berlin" })

    const a = make("2024-10-27T00:30:00.000+02:00[Europe/Berlin]")
    // const x = make("2024-10-27T01:30:00.000+02:00[Europe/Berlin]") // TODO: Our implementation skips this.
    const b = make("2024-10-27T02:30:00.000+02:00[Europe/Berlin]")
    const c = make("2024-10-27T03:30:00.000+01:00[Europe/Berlin]")
    const d = make("2024-10-27T04:30:00.000+01:00[Europe/Berlin]")

    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), a.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), b.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), c.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), d.pipe(DateTime.formatIsoZoned))
  })

  it("handles utc timezone", () => {
    const utc = DateTime.zoneUnsafeMakeNamed("UTC")
    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(parse("30 * * * *", utc), make("2024-10-27T00:00:00.000+00:00[UTC]"))
    const next = (): DateTime.Zoned => DateTime.unsafeMakeZoned(sequence.next().value, { timeZone: utc })

    const a = make("2024-10-27T00:30:00.000+00:00[UTC]")
    const b = make("2024-10-27T01:30:00.000+00:00[UTC]")
    const c = make("2024-10-27T02:30:00.000+00:00[UTC]")
    const d = make("2024-10-27T03:30:00.000+00:00[UTC]")

    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), a.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), b.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), c.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), d.pipe(DateTime.formatIsoZoned))
  })
})
