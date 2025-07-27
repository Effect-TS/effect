import { describe, it } from "@effect/vitest"
import { assertNone, assertSome, strictEqual, throws } from "@effect/vitest/utils"
import { DateTime, Option } from "effect"

describe("DateTime DST Disambiguation", () => {
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
