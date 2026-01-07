import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, throws } from "@effect/vitest/utils"
import { Cron, DateTime, Either, Equal, Option } from "effect"

const match = (input: Cron.Cron | string, date: DateTime.DateTime.Input) =>
  Cron.match(Cron.isCron(input) ? input : Cron.unsafeParse(input), date)

const next = (input: Cron.Cron | string, after?: DateTime.DateTime.Input) =>
  Cron.next(Cron.isCron(input) ? input : Cron.unsafeParse(input), after)

const prev = (input: Cron.Cron | string, after?: DateTime.DateTime.Input) =>
  Cron.prev(Cron.isCron(input) ? input : Cron.unsafeParse(input), after)

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

  it("unsafeParse", () => {
    throws(
      () => Cron.unsafeParse(""),
      new Cron.ParseError({ message: "Invalid number of segments in cron expression", input: "" })
    )
    throws(
      () => Cron.unsafeParse("0 0 4 8-14 * *", ""),
      new Cron.ParseError({ message: "Invalid time zone in cron expression", input: "" })
    )
  })

  it("match", () => {
    assertTrue(match("5 0 * 8 *", new Date("2024-08-01 00:05:00")))
    assertFalse(match("5 0 * 8 *", new Date("2024-09-01 00:05:00")))
    assertFalse(match("5 0 * 8 *", new Date("2024-08-01 01:05:00")))

    assertTrue(match("15 14 1 * *", new Date("2024-02-01 14:15:00")))
    assertFalse(match("15 14 1 * *", new Date("2024-02-01 15:15:00")))
    assertFalse(match("15 14 1 * *", new Date("2024-02-02 14:15:00")))

    assertTrue(match("23 0-20/2 * * 0", new Date("2024-01-07 00:23:00")))
    assertFalse(match("23 0-20/2 * * 0", new Date("2024-01-07 03:23:00")))
    assertFalse(match("23 0-20/2 * * 0", new Date("2024-01-08 00:23:00")))

    assertTrue(match("5 4 * * SUN", new Date("2024-01-07 04:05:00")))
    assertFalse(match("5 4 * * SUN", new Date("2024-01-08 04:05:00")))
    assertFalse(match("5 4 * * SUN", new Date("2025-01-07 04:05:00")))

    assertTrue(match("5 4 * DEC SUN", new Date("2024-12-01 04:05:00")))
    assertFalse(match("5 4 * DEC SUN", new Date("2024-12-01 04:06:00")))
    assertFalse(match("5 4 * DEC SUN", new Date("2024-12-02 04:05:00")))

    assertTrue(match("5 4 * * SUN", new Date("2024-01-07 04:05:00")))
    assertFalse(match("5 4 * * SUN", new Date("2024-01-08 04:05:00")))
    assertFalse(match("5 4 * * SUN", new Date("2025-01-07 04:05:00")))

    assertTrue(match("42 5 0 * 8 *", new Date("2024-08-01 00:05:42")))
    assertFalse(match("42 5 0 * 8 *", new Date("2024-09-01 00:05:42")))
    assertFalse(match("42 5 0 * 8 *", new Date("2024-08-01 01:05:42")))

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

    assertTrue(match(Cron.unsafeParse("15 14 1 * *", london), londonTime))
    assertTrue(match(Cron.unsafeParse("15 14 1 * *", london), amsterdamTime))
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

    deepStrictEqual(next(Cron.unsafeParse("5 0 8 2 *", london), after), DateTime.toDateUtc(londonTime))
    deepStrictEqual(next(Cron.unsafeParse("5 0 8 2 *", london), after), DateTime.toDateUtc(amsterdamTime))
  })

  it("prev", () => {
    const utc = DateTime.zoneUnsafeMakeNamed("UTC")
    const before = new Date("2024-01-04T16:21:00Z")
    deepStrictEqual(prev(Cron.unsafeParse("5 0 8 2 *", utc), before), new Date("2023-02-08T00:05:00.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("15 14 1 * *", utc), before), new Date("2024-01-01T14:15:00.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("23 0-20/2 * * * 0", utc), before), new Date("2023-12-31T23:20:23.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("5 4 * * SUN", utc), before), new Date("2023-12-31T04:05:00.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("5 4 * DEC SUN", utc), before), new Date("2023-12-31T04:05:00.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("30 5 0 8 2 *", utc), before), new Date("2023-02-08T00:05:30.000Z"))

    const wednesday = new Date("2025-10-22T01:00:00.000Z")
    deepStrictEqual(prev(Cron.unsafeParse("0 1 * * MON", utc), wednesday), new Date("2025-10-20T01:00:00.000Z"))
    deepStrictEqual(next(Cron.unsafeParse("0 1 * * MON", utc), wednesday), new Date("2025-10-27T01:00:00.000Z"))
    deepStrictEqual(prev(Cron.unsafeParse("0 1 * * TUE", utc), wednesday), new Date("2025-10-21T01:00:00.000Z"))
    deepStrictEqual(next(Cron.unsafeParse("0 1 * * TUE", utc), wednesday), new Date("2025-10-28T01:00:00.000Z"))
  })

  it("returns the latest second when rolling back a minute", () => {
    const utc = DateTime.zoneUnsafeMakeNamed("UTC")
    const expr = Cron.unsafeParse("10,30 * * * * *", utc)
    const before = new Date("2024-01-01T00:00:05.000Z")
    deepStrictEqual(prev(expr, before), new Date("2023-12-31T23:59:30.000Z"))
  })

  it("forward and reverse sequences stay aligned", () => {
    const cases = [
      ["5 2 * * 1", "2020-01-01T00:00:01Z", "2021-01-01T00:00:01Z"],
      ["0 12 1 * *", "2020-01-01T00:00:01Z", "2021-01-01T00:00:01Z"],
      ["10,30 * * * * *", "2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"]
    ] as const

    const gather = (
      generator: IterableIterator<Date>,
      lower: Date,
      upper: Date,
      direction: "forward" | "reverse"
    ) => {
      const res: Array<Date> = []
      for (const date of generator) {
        if (direction === "forward" ? date >= upper : date <= lower) {
          break
        }
        res.push(date)
      }
      return res
    }

    for (const [expr, lowerStr, upperStr] of cases) {
      const lower = new Date(lowerStr)
      const upper = new Date(upperStr)
      const cron = Cron.unsafeParse(expr, DateTime.zoneUnsafeMakeNamed("UTC"))

      const forward = gather(Cron.sequence(cron, lower), lower, upper, "forward")
      const reverse = gather(Cron.sequenceReverse(cron, upper), lower, upper, "reverse").reverse()

      deepStrictEqual(forward, reverse)
    }
  })

  it("prev prefers the latest matching day within the previous month", () => {
    const cron = Cron.unsafeParse("0 0 8 5,20 * *", DateTime.zoneUnsafeMakeNamed("UTC"))
    const before = new Date("2024-06-03T00:00:00.000Z")
    deepStrictEqual(prev(cron, before), new Date("2024-05-20T08:00:00.000Z"))
  })

  it("prev wraps weekday using the last allowed value", () => {
    const cron = Cron.unsafeParse("0 1 * * MON,FRI", DateTime.zoneUnsafeMakeNamed("UTC"))
    const sunday = new Date("2025-10-19T12:00:00.000Z") // Sunday
    deepStrictEqual(prev(cron, sunday), new Date("2025-10-17T01:00:00.000Z")) // Friday
  })

  it("prev chooses the later occurrence in DST fall-back", () => {
    const make = (s: string) => DateTime.makeZonedFromString(s).pipe(Option.getOrThrow)
    const tz = "Europe/Berlin"
    const cron = Cron.unsafeParse("0 30 2 * * *", tz)
    const before = make("2024-10-27T03:30:00.000+01:00[Europe/Berlin]")
    const result = DateTime.unsafeMakeZoned(prev(cron, before), { timeZone: tz })
    deepStrictEqual(result.pipe(DateTime.formatIsoZoned), "2024-10-27T02:30:00.000+02:00[Europe/Berlin]")
  })

  it("prev respects combined day-of-month and weekday constraints", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 0 9 1,15 * MON", tz)
    const before = new Date("2024-04-02T12:00:00.000Z") // Tue after a matching Monday the 1st
    deepStrictEqual(prev(cron, before), new Date("2024-04-01T09:00:00.000Z"))
  })

  it("prev handles step expressions across day boundary", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 */7 8-10 * * *", tz)
    const before = new Date("2024-01-01T08:01:00.000Z")
    deepStrictEqual(prev(cron, before), new Date("2024-01-01T08:00:00.000Z"))
  })

  it("prev works with fixed offset time zones", () => {
    const offset = DateTime.zoneMakeOffset(2 * 60 * 60 * 1000) // UTC+2
    const cron = Cron.unsafeParse("0 0 10 * * *", offset)
    const before = new Date("2024-05-01T07:00:00.000Z") // before 10:00 local (08:00Z)
    deepStrictEqual(prev(cron, before), new Date("2024-04-30T08:00:00.000Z"))
  })

  it("prev wraps across year boundary", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 0 1 1 *", tz)
    const from = new Date("2024-01-01T00:00:00.000Z")
    deepStrictEqual(prev(cron, from), new Date("2023-01-01T00:00:00.000Z"))
  })

  it("prev handles day 31 skipping months without it", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 0 31 * *", tz)
    const from = new Date("2024-03-01T00:00:00.000Z")
    // Should skip Feb (no day 31) and go to Jan 31
    deepStrictEqual(prev(cron, from), new Date("2024-01-31T00:00:00.000Z"))
  })

  it("prev clamps to the last valid day when rolling back a month with only month constraints", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 0 0 * FEB *", tz)
    const from = new Date("2024-03-31T12:00:00.000Z")
    deepStrictEqual(prev(cron, from), new Date("2024-02-29T00:00:00.000Z"))
  })

  it("prev with multiple months specified", () => {
    const tz = DateTime.zoneUnsafeMakeNamed("UTC")
    const cron = Cron.unsafeParse("0 0 15 1,4,7,10 *", tz) // Quarterly on 15th
    const from = new Date("2024-05-01T00:00:00.000Z")
    deepStrictEqual(prev(cron, from), new Date("2024-04-15T00:00:00.000Z"))
  })

  it("sequence", () => {
    const start = new Date("2024-01-01 00:00:00")
    const generator = Cron.sequence(Cron.unsafeParse("23 0-20/2 * * 0"), start)
    deepStrictEqual(generator.next().value, new Date("2024-01-07 00:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 02:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 04:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 06:23:00"))
    deepStrictEqual(generator.next().value, new Date("2024-01-07 08:23:00"))
  })

  it("sequenceReverse", () => {
    const start = new Date("2024-01-01 00:00:00Z")
    const utc = DateTime.zoneUnsafeMakeNamed("UTC")
    const generator = Cron.sequenceReverse(Cron.unsafeParse("23 0-20/2 * * 0", utc), start)
    deepStrictEqual(generator.next().value, new Date("2023-12-31 20:23:00Z"))
    deepStrictEqual(generator.next().value, new Date("2023-12-31 18:23:00Z"))
    deepStrictEqual(generator.next().value, new Date("2023-12-31 16:23:00Z"))
    deepStrictEqual(generator.next().value, new Date("2023-12-31 14:23:00Z"))
    deepStrictEqual(generator.next().value, new Date("2023-12-31 12:23:00Z"))
  })

  it("equal", () => {
    const cron = Cron.unsafeParse("23 0-20/2 * * 0")
    assertTrue(Equal.equals(cron, cron))
    assertTrue(Equal.equals(cron, Cron.unsafeParse("23 0-20/2 * * 0")))
    assertFalse(Equal.equals(cron, Cron.unsafeParse("23 0-20/2 * * 1")))
    assertFalse(Equal.equals(cron, Cron.unsafeParse("23 0-20/2 * * 0-6")))
    assertFalse(Equal.equals(cron, Cron.unsafeParse("23 0-20/2 1 * 0")))
  })

  it("handles leap years", () => {
    assertTrue(match("0 0 29 2 *", new Date("2024-02-29 00:00:00")))
    assertFalse(match("0 0 29 2 *", new Date("2025-02-29 00:00:00")))
    assertFalse(match("0 0 29 2 *", new Date("2026-02-29 00:00:00")))
    assertFalse(match("0 0 29 2 *", new Date("2027-02-29 00:00:00")))
    assertTrue(match("0 0 29 2 *", new Date("2028-02-29 00:00:00")))

    deepStrictEqual(next("0 0 29 2 *", new Date("2024-01-01 00:00:00")), new Date("2024-02-29 00:00:00"))
    deepStrictEqual(next("0 0 29 2 *", new Date("2025-01-01 00:00:00")), new Date("2028-02-29 00:00:00"))
  })

  it("handles transition into daylight savings time", () => {
    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(
      Cron.unsafeParse("30 * * * *", "Europe/Berlin"),
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
    // DST fall-back transition in Europe/Berlin on 2024-10-27:
    // At 3:00 AM +02:00, clocks "fall back" to 2:00 AM +01:00
    // This means times from 2:00-2:59 AM occur twice (ambiguous period)
    //
    // Correct "once" mode behavior for cron:
    // - Include all normal times (00:30, 01:30)
    // - Return first occurrence only of ambiguous times (02:30 +02:00)
    // - Skip second occurrence of ambiguous times (02:30 +01:00)
    // - Continue normally after transition (03:30 +01:00)

    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(
      Cron.unsafeParse("30 * * * *", "Europe/Berlin"),
      make("2024-10-27T00:00:00.000+02:00[Europe/Berlin]")
    )
    const next = (): DateTime.Zoned => DateTime.unsafeMakeZoned(sequence.next().value, { timeZone: "Europe/Berlin" })

    const a = make("2024-10-27T00:30:00.000+02:00[Europe/Berlin]") // Normal time
    const b = make("2024-10-27T01:30:00.000+02:00[Europe/Berlin]") // Normal time (not ambiguous)
    const c = make("2024-10-27T02:30:00.000+02:00[Europe/Berlin]") // First occurrence during DST
    const d = make("2024-10-27T03:30:00.000+01:00[Europe/Berlin]") // Standard time (skips 2nd 02:30)
    const e = make("2024-10-27T04:30:00.000+01:00[Europe/Berlin]") // Standard time

    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), a.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), b.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), c.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), d.pipe(DateTime.formatIsoZoned))
    deepStrictEqual(next().pipe(DateTime.formatIsoZoned), e.pipe(DateTime.formatIsoZoned))
  })

  it("handles utc timezone", () => {
    const utc = DateTime.zoneUnsafeMakeNamed("UTC")
    const make = (date: string) => DateTime.makeZonedFromString(date).pipe(Option.getOrThrow)
    const sequence = Cron.sequence(Cron.unsafeParse("30 * * * *", utc), make("2024-10-27T00:00:00.000+00:00[UTC]"))
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
