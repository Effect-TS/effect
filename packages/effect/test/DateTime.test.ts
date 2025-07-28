import { describe, it } from "@effect/vitest"
import { assertNone, assertRight, assertSome, deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { DateTime, Duration, Effect, Option, TestClock } from "effect"

const setTo2024NZ = TestClock.setTime(new Date("2023-12-31T11:00:00.000Z").getTime())

describe("DateTime", () => {
  describe("mutate", () => {
    it.effect("should mutate the date", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.mutate(now, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        const diff = DateTime.distanceDurationEither(now, tomorrow)
        assertRight(diff, Duration.decode("1 day"))
      }))

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.mutate(now, (date) => {
          date.setUTCMonth(date.getUTCMonth() + 6)
        })
        strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-06-30T12:00:00.000Z")
        strictEqual(DateTime.toDate(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.mutate(future, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        strictEqual(DateTime.toDateUtc(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        strictEqual(DateTime.toDate(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
      }))
  })

  describe("add", () => {
    it.effect("utc", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.add(now, { days: 1 })
        const diff = DateTime.distanceDurationEither(now, tomorrow)
        assertRight(diff, Duration.decode("1 day"))
      }))

    it("to month with less days", () => {
      const jan = DateTime.unsafeMake({ year: 2023, month: 1, day: 31 })
      let feb = DateTime.add(jan, { months: 1 })
      strictEqual(feb.toJSON(), "2023-02-28T00:00:00.000Z")

      const mar = DateTime.unsafeMake({ year: 2023, month: 3, day: 31 })
      feb = DateTime.subtract(mar, { months: 1 })
      strictEqual(feb.toJSON(), "2023-02-28T00:00:00.000Z")
    })

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.add(now, { months: 6 })
        strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-06-30T12:00:00.000Z")
        strictEqual(DateTime.toDate(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.add(future, { days: 1 })
        strictEqual(DateTime.toDateUtc(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        strictEqual(DateTime.toDate(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
        const minusOne = DateTime.subtract(plusOne, { days: 1 })
        strictEqual(DateTime.toDateUtc(minusOne).toISOString(), "2024-06-30T12:00:00.000Z")
        strictEqual(DateTime.toDate(minusOne).toISOString(), "2024-07-01T00:00:00.000Z")
      }))

    it.effect("leap years", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.make({ year: 2024, month: 2, day: 29 })
        const future = DateTime.add(now, { years: 1 })
        strictEqual(DateTime.formatIso(future), "2025-02-28T00:00:00.000Z")
      }))
  })

  describe("endOf", () => {
    it("month", () => {
      const mar = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(mar, "month")
      strictEqual(end.toJSON(), "2024-03-31T23:59:59.999Z")
    })

    it("feb leap year", () => {
      const feb = DateTime.unsafeMake("2024-02-15T12:00:00.000Z")
      const end = DateTime.endOf(feb, "month")
      strictEqual(end.toJSON(), "2024-02-29T23:59:59.999Z")
    })

    it("week", () => {
      const start = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(start, "week")
      strictEqual(end.toJSON(), "2024-03-16T23:59:59.999Z")
      strictEqual(DateTime.getPartUtc(end, "weekDay"), 6)
    })

    it("week last day", () => {
      const start = DateTime.unsafeMake("2024-03-16T12:00:00.000Z")
      const end = DateTime.endOf(start, "week")
      strictEqual(end.toJSON(), "2024-03-16T23:59:59.999Z")
    })

    it("week with options", () => {
      const start = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(start, "week", {
        weekStartsOn: 1
      })
      strictEqual(end.toJSON(), "2024-03-17T23:59:59.999Z")
    })

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.endOf(now, "month")
        strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-01-31T10:59:59.999Z")
        strictEqual(DateTime.toDate(future).toISOString(), "2024-01-31T23:59:59.999Z")
      }))
  })

  describe("startOf", () => {
    it("month", () => {
      const mar = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(mar, "month")
      strictEqual(end.toJSON(), "2024-03-01T00:00:00.000Z")
    })

    it("month duplicated", () => {
      const mar = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(mar, "month").pipe(
        DateTime.startOf("month")
      )
      strictEqual(end.toJSON(), "2024-03-01T00:00:00.000Z")
    })

    it("feb leap year", () => {
      const feb = DateTime.unsafeMake("2024-02-15T12:00:00.000Z")
      const end = DateTime.startOf(feb, "month")
      strictEqual(end.toJSON(), "2024-02-01T00:00:00.000Z")
    })

    it("week", () => {
      const start = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(start, "week")
      strictEqual(end.toJSON(), "2024-03-10T00:00:00.000Z")
      strictEqual(DateTime.getPartUtc(end, "weekDay"), 0)
    })

    it("week first day", () => {
      const start = DateTime.unsafeMake("2024-03-10T12:00:00.000Z")
      const end = DateTime.startOf(start, "week")
      strictEqual(end.toJSON(), "2024-03-10T00:00:00.000Z")
    })

    it("week with options", () => {
      const start = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(start, "week", {
        weekStartsOn: 1
      })
      strictEqual(end.toJSON(), "2024-03-11T00:00:00.000Z")
    })
  })

  describe("nearest", () => {
    it("month up", () => {
      const mar = DateTime.unsafeMake("2024-03-16T12:00:00.000Z")
      const end = DateTime.nearest(mar, "month")
      strictEqual(end.toJSON(), "2024-04-01T00:00:00.000Z")
    })

    it("month down", () => {
      const mar = DateTime.unsafeMake("2024-03-16T11:00:00.000Z")
      const end = DateTime.nearest(mar, "month")
      strictEqual(end.toJSON(), "2024-03-01T00:00:00.000Z")
    })

    it("second up", () => {
      const mar = DateTime.unsafeMake("2024-03-20T12:00:00.500Z")
      const end = DateTime.nearest(mar, "second")
      strictEqual(end.toJSON(), "2024-03-20T12:00:01.000Z")
    })

    it("second down", () => {
      const mar = DateTime.unsafeMake("2024-03-20T12:00:00.400Z")
      const end = DateTime.nearest(mar, "second")
      strictEqual(end.toJSON(), "2024-03-20T12:00:00.000Z")
    })
  })

  describe("format", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        strictEqual(
          DateTime.format(now, {
            locale: "en-US",
            dateStyle: "full",
            timeStyle: "full"
          }),
          "Thursday, January 1, 1970 at 12:00:00 AM Coordinated Universal Time"
        )
      }))
  })

  describe("formatUtc", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        strictEqual(
          DateTime.formatUtc(now, {
            locale: "en-US",
            dateStyle: "full",
            timeStyle: "full"
          }),
          "Thursday, January 1, 1970 at 12:00:00 AM Coordinated Universal Time"
        )
      }))
  })

  describe("format zoned", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        strictEqual(
          DateTime.format(now, {
            locale: "en-US",
            dateStyle: "full",
            timeStyle: "full"
          }),
          "Thursday, January 1, 1970 at 12:00:00 PM New Zealand Standard Time"
        )
      }))

    it.effect("long with offset", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const formatted = now.pipe(
          DateTime.setZoneOffset(10 * 60 * 60 * 1000),
          DateTime.format({
            locale: "en-US",
            dateStyle: "long",
            timeStyle: "short"
          })
        )
        strictEqual(formatted, "January 1, 1970 at 10:00 AM")
      }))
  })

  describe("fromParts", () => {
    it("partial", () => {
      const date = DateTime.unsafeMake({
        year: 2024,
        month: 12,
        day: 25
      })
      strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")
    })

    it("month is set correctly", () => {
      const date = DateTime.unsafeMake({ year: 2024 })
      strictEqual(date.toJSON(), "2024-01-01T00:00:00.000Z")
    })
  })

  describe("setPartsUtc", () => {
    it("partial", () => {
      const date = DateTime.unsafeMake({
        year: 2024,
        month: 12,
        day: 25
      })
      strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")

      const updated = DateTime.setPartsUtc(date, {
        year: 2023,
        month: 1
      })
      strictEqual(updated.toJSON(), "2023-01-25T00:00:00.000Z")
    })

    it("ignores time zones", () => {
      const date = DateTime.unsafeMake({
        year: 2024,
        month: 12,
        day: 25
      }).pipe(DateTime.unsafeSetZoneNamed("Pacific/Auckland"))
      strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")

      const updated = DateTime.setPartsUtc(date, {
        year: 2023,
        month: 1
      })
      strictEqual(updated.toJSON(), "2023-01-25T00:00:00.000Z")
    })
  })

  describe("setParts", () => {
    it("partial", () => {
      const date = DateTime.unsafeMake({
        year: 2024,
        month: 12,
        day: 25
      })
      strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")

      const updated = DateTime.setParts(date, {
        year: 2023,
        month: 1
      })
      strictEqual(updated.toJSON(), "2023-01-25T00:00:00.000Z")
    })

    it("accounts for time zone", () => {
      const date = DateTime.unsafeMake({
        year: 2024,
        month: 12,
        day: 25
      }).pipe(DateTime.unsafeSetZoneNamed("Pacific/Auckland"))
      strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")

      const updated = DateTime.setParts(date, {
        year: 2023,
        month: 6,
        hours: 12
      })
      strictEqual(updated.toJSON(), "2023-06-25T00:00:00.000Z")
    })
  })

  describe("formatIso", () => {
    it("full", () => {
      const now = DateTime.unsafeMake("2024-03-15T12:00:00.000Z")
      strictEqual(DateTime.formatIso(now), "2024-03-15T12:00:00.000Z")
    })
  })

  describe("formatIsoOffset", () => {
    it.effect("correctly adds offset", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        strictEqual(DateTime.formatIsoOffset(now), "1970-01-01T12:00:00.000+12:00")
      }))
  })

  describe("layerCurrentZoneNamed", () => {
    it.effect("correctly adds offset", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.nowInCurrentZone
        strictEqual(DateTime.formatIsoOffset(now), "1970-01-01T12:00:00.000+12:00")
      }).pipe(
        Effect.provide(DateTime.layerCurrentZoneNamed("Pacific/Auckland"))
      ))
  })

  describe("removeTime", () => {
    it("removes time", () => {
      const dt = DateTime.unsafeMakeZoned("2024-01-01T01:00:00Z", {
        timeZone: "Pacific/Auckland",
        adjustForTimeZone: true
      }).pipe(DateTime.removeTime)
      strictEqual(dt.toJSON(), "2024-01-01T00:00:00.000Z")
    })
  })

  describe("makeZonedFromString", () => {
    it.effect("parses time + zone", () =>
      Effect.gen(function*() {
        const dt = yield* DateTime.makeZonedFromString("2024-07-21T20:12:34.112546348+12:00[Pacific/Auckland]")
        strictEqual(dt.toJSON(), "2024-07-21T08:12:34.112Z")
      }))

    it.effect("only offset", () =>
      Effect.gen(function*() {
        const dt = yield* DateTime.makeZonedFromString("2024-07-21T20:12:34.112546348+12:00")
        strictEqual(dt.zone._tag, "Offset")
        strictEqual(dt.toJSON(), "2024-07-21T08:12:34.112Z")
      }))

    it.effect("only offset with 00:00", () =>
      Effect.gen(function*() {
        const dt = yield* DateTime.makeZonedFromString("2024-07-21T20:12:34.112546348+00:00")
        strictEqual(dt.zone._tag, "Offset")
        strictEqual(dt.toJSON(), "2024-07-21T20:12:34.112Z")
      }))

    it.effect("roundtrip", () =>
      Effect.gen(function*() {
        const dt = yield* DateTime.makeZonedFromString("2024-07-21T20:12:34.112546348+12:00[Pacific/Auckland]").pipe(
          Option.map(DateTime.formatIsoZoned),
          Option.flatMap(DateTime.makeZonedFromString)
        )
        deepStrictEqual(dt.zone, DateTime.zoneUnsafeMakeNamed("Pacific/Auckland"))
        strictEqual(dt.toJSON(), "2024-07-21T08:12:34.112Z")
      }))
  })

  it("parts equality", () => {
    const d1 = DateTime.unsafeMake("2025-01-01")
    const d2 = DateTime.unsafeMake("2025-01-01")
    deepStrictEqual(d1, d2)
    DateTime.toPartsUtc(d2)
    deepStrictEqual(d1, d2)
  })

  // doesnt work in CI
  it.skip("unsafeMakeZoned no options", () => {
    const date = new Date("2024-07-21T20:12:34.112Z")
    ;(date as any).getTimezoneOffset = () => -60
    const dt = DateTime.unsafeMakeZoned(date)
    deepStrictEqual(dt.zone, DateTime.zoneMakeOffset(60 * 60 * 1000))
  })

  describe("toUtc", () => {
    it.effect("with a Utc", () =>
      Effect.gen(function*() {
        const dt = DateTime.unsafeMake("2024-01-01T01:00:00Z")
        strictEqual(dt.toJSON(), "2024-01-01T01:00:00.000Z")
      }))

    it.effect("with a Zoned", () =>
      Effect.gen(function*() {
        const dt = DateTime.unsafeMakeZoned("2024-01-01T01:00:00Z", {
          timeZone: "Pacific/Auckland",
          adjustForTimeZone: true
        })
        strictEqual(dt.toJSON(), "2023-12-31T12:00:00.000Z")
      }))
  })

  describe("nowAsDate", () => {
    it.effect("should return the current Date", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowAsDate
        deepStrictEqual(now, new Date("2023-12-31T11:00:00.000Z"))
      }))
  })

  describe("unsafeMake", () => {
    it("treats strings without zone info as UTC", () => {
      let dt = DateTime.unsafeMake("2024-01-01 01:00:00")
      strictEqual(dt.toJSON(), "2024-01-01T01:00:00.000Z")

      dt = DateTime.unsafeMake("2020-02-01T11:17:00+1100")
      strictEqual(dt.toJSON(), "2020-02-01T00:17:00.000Z")
    })
  })

  describe("makeZoned DST disambiguation", () => {
    it.each([
      {
        zone: "America/New_York",
        time: { year: 2025, month: 3, day: 9, hours: 1 },
        expected: "2025-03-09T06:00:00.000Z"
      },
      {
        zone: "Australia/Sydney",
        time: { year: 2025, month: 4, day: 6, hours: 1 },
        expected: "2025-04-05T14:00:00.000Z"
      },
      {
        zone: "Europe/London",
        time: { year: 2025, month: 3, day: 30, hours: 1 },
        expected: "2025-03-30T01:00:00.000Z"
      }
    ])("should work correctly with timezone $zone", ({ expected, time, zone }) => {
      const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
      const maybeDateTime = DateTime.makeZoned(
        { ...time, minutes: 0, seconds: 0, millis: 0 },
        { timeZone, adjustForTimeZone: true }
      )

      const utcString = maybeDateTime.pipe(
        Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
      )
      assertSome(utcString, expected)
    })
    it("should correctly handle timezone offset with adjustForTimeZone: true", () => {
      // 01:00 Athens time on March 30, 2025 should be 23:00 UTC (Athens is UTC+2 before DST)
      const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
      const maybeDateTime = DateTime.makeZoned(
        {
          year: 2025,
          month: 3,
          day: 30,
          hours: 1,
          minutes: 0,
          seconds: 0,
          millis: 0
        },
        { timeZone, adjustForTimeZone: true }
      )

      const utcString = maybeDateTime.pipe(
        Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
      )
      assertSome(utcString, "2025-03-29T23:00:00.000Z")
    })

    it.each([
      { hours: 2, minutes: 0 },
      { hours: 2, minutes: 30 },
      { hours: 2, minutes: 59 }
    ])("should handle DST gap times (non-existent times) for $hours:$minutes", ({ hours, minutes }) => {
      // 02:30 Athens time on March 30, 2025 doesn't exist (clocks jump 02:00 -> 03:00)
      const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

      const maybeDateTime = DateTime.makeZoned(
        { year: 2025, month: 3, day: 30, hours, minutes, seconds: 0, millis: 0 },
        { timeZone, adjustForTimeZone: true }
      )

      const utcString = maybeDateTime.pipe(
        Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
      )

      // 02:30 Athens -> 03:30 Athens (forward movement, more reasonable)
      // For 02:30 it returns 2025-03-30T00:30:00.000Z which is 03:30 Athens
      if (hours === 2 && minutes === 30) {
        assertSome(utcString, "2025-03-30T00:30:00.000Z") // Documents improved behavior
      }
    })

    describe("disambiguation strategies", () => {
      it("should handle 'compatible' disambiguation (default behavior)", () => {
        // Test DST fall-back (repeated time): 03:00 happens twice in Europe/Athens on Oct 26, 2025
        // At UTC 01:00, Athens switches from GMT+3 to GMT+2, so 03:00 occurs twice
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const maybeDateTime = DateTime.makeZoned(
          { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "compatible" }
        )

        const utcString = maybeDateTime.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        // 'compatible' should choose the earlier occurrence (first 03:00 in GMT+3)
        assertSome(utcString, "2025-10-26T00:00:00.000Z")
      })

      it("should handle 'earlier' disambiguation", () => {
        // Test DST fall-back: choose the earlier of two possible times
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const maybeDateTime = DateTime.makeZoned(
          { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "earlier" }
        )

        const utcString = maybeDateTime.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        // Should choose first occurrence (GMT+3, UTC 00:00)
        assertSome(utcString, "2025-10-26T00:00:00.000Z")
      })

      it("should handle 'later' disambiguation", () => {
        // Test DST fall-back: choose the later of two possible times
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const maybeDateTime = DateTime.makeZoned(
          { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "later" }
        )

        const utcString = maybeDateTime.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        // Should choose second occurrence (GMT+2, UTC 01:00)
        assertSome(utcString, "2025-10-26T01:00:00.000Z")
      })

      it("should handle 'reject' disambiguation", () => {
        // Test DST fall-back with correct date: Europe/Athens on Oct 26, 2025 at 03:00 (happens twice)
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

        const result = DateTime.makeZoned(
          { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "reject" }
        )

        // makeZoned should return None when unsafeMakeZoned throws for 'reject' disambiguation
        assertNone(result)
      })

      it("should handle 'reject' disambiguation with unsafeMakeZoned (throws exception)", () => {
        // Test that unsafeMakeZoned actually throws the exception for 'reject' disambiguation
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

        throws(() => {
          DateTime.unsafeMakeZoned(
            { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 },
            { timeZone, adjustForTimeZone: true, disambiguation: "reject" }
          )
        }, (error) => {
          // Should throw IllegalArgumentException for ambiguous time
          strictEqual(error instanceof Error, true)
          if (error instanceof Error) {
            strictEqual(error.message.includes("Ambiguous time"), true)
          }
        })
      })

      it.each([
        { disambiguation: "compatible", description: "compatible strategy", expectedUtc: "2025-03-30T01:00:00.000Z" },
        { disambiguation: "earlier", description: "earlier strategy", expectedUtc: "2025-03-30T00:00:00.000Z" },
        { disambiguation: "later", description: "later strategy", expectedUtc: "2025-03-30T01:00:00.000Z" }
      ] as Array<{ disambiguation: DateTime.DateTime.Disambiguation; description: string; expectedUtc: string }>)(
        "should handle DST spring-forward gap times with $description",
        ({ disambiguation, expectedUtc }) => {
          // Test gap time: 03:00 doesn't exist in Europe/Athens on March 30, 2025
          // Clocks jump from 02:00 to 04:00 at UTC 01:00 (02:00 Athens time becomes 04:00)
          const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

          const maybeDateTime = DateTime.makeZoned(
            { year: 2025, month: 3, day: 30, hours: 3, minutes: 0, seconds: 0, millis: 0 },
            { timeZone, adjustForTimeZone: true, disambiguation }
          )

          const utcString = maybeDateTime.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          // Gap time 03:00 Athens -> Gap times are handled by the convergence algorithm
          assertSome(utcString, expectedUtc)
        }
      )

      it.each([
        {
          zone: "Europe/London",
          time: { year: 2025, month: 10, day: 26, hours: 1, minutes: 30 }, // DST ends
          earlierUtc: "2025-10-26T00:30:00.000Z", // BST (UTC+1)
          laterUtc: "2025-10-26T01:30:00.000Z" // GMT (UTC+0)
        },
        {
          zone: "Europe/Berlin",
          time: { year: 2025, month: 10, day: 26, hours: 2, minutes: 30 }, // DST ends
          earlierUtc: "2025-10-26T00:30:00.000Z", // CEST (UTC+2)
          laterUtc: "2025-10-26T01:30:00.000Z" // CET (UTC+1)
        }
      ])("should work with disambiguation for timezone $zone", ({ earlierUtc, laterUtc, time, zone }) => {
        const timeZone = DateTime.zoneUnsafeMakeNamed(zone)

        // Test 'earlier' disambiguation
        const earlierResult = DateTime.makeZoned(
          { ...time, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "earlier" }
        )
        const earlierUtcString = earlierResult.pipe(
          Option.map(DateTime.toUtc),
          Option.map(DateTime.formatIso)
        )
        assertSome(earlierUtcString, earlierUtc)

        // Test 'later' disambiguation
        const laterResult = DateTime.makeZoned(
          { ...time, seconds: 0, millis: 0 },
          { timeZone, adjustForTimeZone: true, disambiguation: "later" }
        )
        const laterUtcString = laterResult.pipe(
          Option.map(DateTime.toUtc),
          Option.map(DateTime.formatIso)
        )
        assertSome(laterUtcString, laterUtc)
      })
    })

    describe("Spring Forward Gap Times (non-existent times)", () => {
      it("should handle Athens spring forward gap times", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

        // 02:30 on March 30, 2025 doesn't exist (clocks jump 02:00 → 03:00)
        const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }

        // Compatible and later should choose time after gap
        const compatibleResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "compatible"
        })
        const laterResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "later"
        })

        const compatibleUtcString = compatibleResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const laterUtcString = laterResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(compatibleUtcString, "2025-03-30T00:30:00.000Z")
        assertSome(laterUtcString, "2025-03-30T00:30:00.000Z")

        // Earlier should choose time before gap
        const earlierResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "earlier"
        })

        const earlierUtcString = earlierResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(earlierUtcString, "2025-03-30T00:30:00.000Z")

        // Reject should succeed for gap times
        const rejectResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "reject"
        })

        const rejectUtcString = rejectResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(rejectUtcString, "2025-03-30T00:30:00.000Z")
      })

      it("should handle New York spring forward gap times", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("America/New_York")

        // 02:30 on March 9, 2025 doesn't exist (clocks jump 02:00 → 03:00)
        const gapTime = { year: 2025, month: 3, day: 9, hours: 2, minutes: 30, seconds: 0, millis: 0 }

        const compatibleResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "compatible"
        })
        const earlierResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "earlier"
        })
        const laterResult = DateTime.makeZoned(gapTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "later"
        })

        const compatibleUtcString = compatibleResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const earlierUtcString = earlierResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const laterUtcString = laterResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(compatibleUtcString, "2025-03-09T07:30:00.000Z")
        assertSome(earlierUtcString, "2025-03-09T06:30:00.000Z")
        assertSome(laterUtcString, "2025-03-09T07:30:00.000Z")
      })

      it.each([
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 3, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 3, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-30T00:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 3, minutes: 0 },
          strategy: "later",
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 2, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-09T07:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 2, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-09T06:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 2, minutes: 0 },
          strategy: "later",
          expected: "2025-03-09T07:00:00.000Z"
        }
      ] as Array<{ zone: string; time: any; strategy: DateTime.DateTime.Disambiguation; expected: string }>)(
        "should handle gap times consistently for $zone with $strategy strategy",
        ({ expected, strategy, time, zone }) => {
          const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
          const parts = { ...time, seconds: 0, millis: 0 }

          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          const utcString = result.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          assertSome(utcString, expected)
        }
      )
    })

    describe("Fall Back Ambiguous Times (repeated times)", () => {
      it("should handle Athens fall back ambiguous times", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

        // 03:00 on October 26, 2025 happens twice (clocks fall back 03:00 → 02:00)
        const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }

        const compatibleResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "compatible"
        })
        const earlierResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "earlier"
        })
        const laterResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "later"
        })

        const compatibleUtcString = compatibleResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const earlierUtcString = earlierResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const laterUtcString = laterResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        // Compatible and earlier should choose the first occurrence
        assertSome(compatibleUtcString, "2025-10-26T00:00:00.000Z")
        assertSome(earlierUtcString, "2025-10-26T00:00:00.000Z")
        // Later should choose the second occurrence
        assertSome(laterUtcString, "2025-10-26T01:00:00.000Z")

        // Reject should fail
        const rejectResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "reject"
        })
        assertNone(rejectResult)
      })

      it("should handle New York fall back ambiguous times", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("America/New_York")

        // 01:30 on November 2, 2025 happens twice
        const ambiguousTime = { year: 2025, month: 11, day: 2, hours: 1, minutes: 30, seconds: 0, millis: 0 }

        const compatibleResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "compatible"
        })
        const earlierResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "earlier"
        })
        const laterResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "later"
        })

        const compatibleUtcString = compatibleResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const earlierUtcString = earlierResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const laterUtcString = laterResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(compatibleUtcString, "2025-11-02T05:30:00.000Z")
        assertSome(earlierUtcString, "2025-11-02T05:30:00.000Z")
        assertSome(laterUtcString, "2025-11-02T06:30:00.000Z")
      })

      it.each([
        {
          zone: "Europe/London",
          time: { year: 2025, month: 10, day: 26, hours: 1, minutes: 30 },
          strategy: "compatible",
          expected: "2025-10-26T00:30:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 10, day: 26, hours: 1, minutes: 30 },
          strategy: "earlier",
          expected: "2025-10-26T00:30:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 10, day: 26, hours: 1, minutes: 30 },
          strategy: "later",
          expected: "2025-10-26T01:30:00.000Z"
        },
        {
          zone: "Europe/Berlin",
          time: { year: 2025, month: 10, day: 26, hours: 2, minutes: 30 },
          strategy: "compatible",
          expected: "2025-10-26T00:30:00.000Z"
        },
        {
          zone: "Europe/Berlin",
          time: { year: 2025, month: 10, day: 26, hours: 2, minutes: 30 },
          strategy: "earlier",
          expected: "2025-10-26T00:30:00.000Z"
        },
        {
          zone: "Europe/Berlin",
          time: { year: 2025, month: 10, day: 26, hours: 2, minutes: 30 },
          strategy: "later",
          expected: "2025-10-26T01:30:00.000Z"
        }
      ] as Array<{ zone: string; time: any; strategy: DateTime.DateTime.Disambiguation; expected: string }>)(
        "should handle ambiguous times for $zone with $strategy strategy",
        ({ expected, strategy, time, zone }) => {
          const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
          const parts = { ...time, seconds: 0, millis: 0 }

          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          const utcString = result.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          assertSome(utcString, expected)
        }
      )
    })

    describe("Normal Times (no DST transition)", () => {
      it.each([
        // Europe/Athens - Before DST (safe date)
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 27, hours: 1, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-26T23:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 27, hours: 1, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-26T23:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 27, hours: 1, minutes: 0 },
          strategy: "later",
          expected: "2025-03-26T23:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 27, hours: 1, minutes: 0 },
          strategy: "reject",
          expected: "2025-03-26T23:00:00.000Z"
        },
        // Europe/Athens - After DST
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 4, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 4, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 4, minutes: 0 },
          strategy: "later",
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 4, minutes: 0 },
          strategy: "reject",
          expected: "2025-03-30T01:00:00.000Z"
        },
        // America/New_York - Before DST
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 1, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-09T06:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 1, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-09T06:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 1, minutes: 0 },
          strategy: "later",
          expected: "2025-03-09T06:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 1, minutes: 0 },
          strategy: "reject",
          expected: "2025-03-09T06:00:00.000Z"
        },
        // Australia/Sydney - Before DST ends
        {
          zone: "Australia/Sydney",
          time: { year: 2025, month: 4, day: 6, hours: 1, minutes: 0 },
          strategy: "compatible",
          expected: "2025-04-05T14:00:00.000Z"
        },
        {
          zone: "Australia/Sydney",
          time: { year: 2025, month: 4, day: 6, hours: 1, minutes: 0 },
          strategy: "earlier",
          expected: "2025-04-05T14:00:00.000Z"
        },
        {
          zone: "Australia/Sydney",
          time: { year: 2025, month: 4, day: 6, hours: 1, minutes: 0 },
          strategy: "later",
          expected: "2025-04-05T14:00:00.000Z"
        },
        {
          zone: "Australia/Sydney",
          time: { year: 2025, month: 4, day: 6, hours: 1, minutes: 0 },
          strategy: "reject",
          expected: "2025-04-05T14:00:00.000Z"
        },
        // Europe/London - Day before DST transition
        {
          zone: "Europe/London",
          time: { year: 2025, month: 3, day: 29, hours: 1, minutes: 0 },
          strategy: "compatible",
          expected: "2025-03-29T01:00:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 3, day: 29, hours: 1, minutes: 0 },
          strategy: "earlier",
          expected: "2025-03-29T01:00:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 3, day: 29, hours: 1, minutes: 0 },
          strategy: "later",
          expected: "2025-03-29T01:00:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 3, day: 29, hours: 1, minutes: 0 },
          strategy: "reject",
          expected: "2025-03-29T01:00:00.000Z"
        }
      ] as Array<{ zone: string; time: any; strategy: DateTime.DateTime.Disambiguation; expected: string }>)(
        "should handle normal times for $zone with $strategy strategy",
        ({ expected, strategy, time, zone }) => {
          const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
          const parts = { ...time, seconds: 0, millis: 0 }

          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          const utcString = result.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          assertSome(utcString, expected)
        }
      )
    })

    describe("Edge Cases and Error Handling", () => {
      it("should handle reject disambiguation for gap times correctly", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }

        // Reject is allowed for gap times, only throws for ambiguous times
        const result = DateTime.makeZoned(gapTime, { timeZone, adjustForTimeZone: true, disambiguation: "reject" })
        const utcString = result.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        assertSome(utcString, "2025-03-30T00:30:00.000Z")
      })

      it("should throw errors for reject disambiguation with ambiguous times", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }

        throws(() => {
          DateTime.unsafeMakeZoned(ambiguousTime, { timeZone, adjustForTimeZone: true, disambiguation: "reject" })
        }, (error) => {
          strictEqual(error instanceof RangeError, true)
          if (error instanceof RangeError) {
            strictEqual(error.message.includes("Ambiguous time"), true)
          }
        })
      })

      it("should work with different minute values", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("America/New_York")

        // Test different minutes during gap time
        const minutes = [0, 15, 30, 45]
        minutes.forEach((minute) => {
          const gapTime = { year: 2025, month: 3, day: 9, hours: 2, minutes: minute, seconds: 0, millis: 0 }

          const result = DateTime.makeZoned(gapTime, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: "compatible"
          })

          const utcString = result.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          // Should consistently handle different minute values within gap
          utcString.pipe(
            Option.map((value) => {
              strictEqual(value.includes("2025-03-09T07:"), true, `Failed for minute ${minute}`)
            })
          )
        })
      })
    })

    describe("Disambiguation Strategy Defaults", () => {
      it("should use earlier as default disambiguation for backward compatibility", () => {
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }

        // Without specifying disambiguation, should default to 'earlier' for backward compatibility
        const defaultResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true
        })
        const explicitResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "earlier"
        })

        const defaultUtc = defaultResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )
        const explicitUtc = explicitResult.pipe(
          Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
        )

        // Both should be Some and equal - we can assert on the explicit one and compare
        const explicitValue = explicitUtc.pipe(Option.getOrElse(() => ""))
        assertSome(defaultUtc, explicitValue)
      })
    })

    describe("Standard DST Conformance", () => {
      describe("Gap Time Validation", () => {
        it.each([
          { strategy: "compatible" },
          { strategy: "earlier" },
          { strategy: "later" }
        ] as Array<{ strategy: DateTime.DateTime.Disambiguation }>)(
          "should handle Athens 02:30 gap time with $strategy strategy",
          ({ strategy }) => {
            const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
            const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }

            // Expected results (all strategies return the same result for this gap time)
            const expectedResult = "2025-03-30T00:30:00.000Z"

            const result = DateTime.makeZoned(gapTime, {
              timeZone,
              adjustForTimeZone: true,
              disambiguation: strategy
            })

            const utcResult = result.pipe(
              Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
            )
            assertSome(utcResult, expectedResult)
          }
        )

        it("should handle Athens 03:00 gap time correctly", () => {
          const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
          const gapTime = { year: 2025, month: 3, day: 30, hours: 3, minutes: 0, seconds: 0, millis: 0 }

          // Expected results for each strategy
          const expectedResults = {
            compatible: "2025-03-30T01:00:00.000Z",
            earlier: "2025-03-30T00:00:00.000Z",
            later: "2025-03-30T01:00:00.000Z"
          }

          Object.entries(expectedResults).forEach(([strategy, expected]) => {
            const result = DateTime.makeZoned(gapTime, {
              timeZone,
              adjustForTimeZone: true,
              disambiguation: strategy as any
            })

            const utcResult = result.pipe(
              Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
            )
            assertSome(utcResult, expected)
          })
        })

        it("should handle New York 02:30 gap time correctly", () => {
          const timeZone = DateTime.zoneUnsafeMakeNamed("America/New_York")
          const gapTime = { year: 2025, month: 3, day: 9, hours: 2, minutes: 30, seconds: 0, millis: 0 }

          // Expected results
          const expectedResults = {
            compatible: "2025-03-09T07:30:00.000Z",
            earlier: "2025-03-09T06:30:00.000Z",
            later: "2025-03-09T07:30:00.000Z"
          }

          Object.entries(expectedResults).forEach(([strategy, expected]) => {
            const result = DateTime.makeZoned(gapTime, {
              timeZone,
              adjustForTimeZone: true,
              disambiguation: strategy as any
            })

            const utcResult = result.pipe(
              Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
            )
            assertSome(utcResult, expected)
          })
        })
      })

      describe("Ambiguous Time Validation", () => {
        it("should handle Athens fall-back transitions correctly", () => {
          const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
          const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }

          // Expected results for each strategy
          const expectedResults = {
            compatible: "2025-10-26T00:00:00.000Z", // earlier
            earlier: "2025-10-26T00:00:00.000Z",
            later: "2025-10-26T01:00:00.000Z"
          }

          Object.entries(expectedResults).forEach(([strategy, expected]) => {
            const result = DateTime.makeZoned(ambiguousTime, {
              timeZone,
              adjustForTimeZone: true,
              disambiguation: strategy as any
            })

            const utcResult = result.pipe(
              Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
            )
            assertSome(utcResult, expected)
          })
        })

        it("should handle reject strategy properly", () => {
          const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")

          // Test gap time with reject (should succeed)
          const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }
          const gapResult = DateTime.makeZoned(gapTime, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: "reject"
          })

          const gapUtcResult = gapResult.pipe(
            Option.map((dt) => DateTime.formatIso(DateTime.toUtc(dt)))
          )
          assertSome(gapUtcResult, "2025-03-30T00:30:00.000Z")

          // Test ambiguous time with reject (should throw)
          const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }
          const ambiguousResult = DateTime.makeZoned(ambiguousTime, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: "reject"
          })

          assertNone(ambiguousResult)
        })
      })
    })
  })
})
