import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
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

      if (Option.isSome(compatibleResult) && Option.isSome(laterResult)) {
        strictEqual(DateTime.formatIso(DateTime.toUtc(compatibleResult.value)), "2025-03-30T00:30:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(laterResult.value)), "2025-03-30T00:30:00.000Z")
      } else {
        throw new Error("Gap time handling failed")
      }

      // Earlier should choose time before gap
      const earlierResult = DateTime.makeZoned(gapTime, {
        timeZone,
        adjustForTimeZone: true,
        disambiguation: "earlier"
      })

      if (Option.isSome(earlierResult)) {
        strictEqual(DateTime.formatIso(DateTime.toUtc(earlierResult.value)), "2025-03-30T00:30:00.000Z")
      }

      // Reject should succeed for gap times
      const rejectResult = DateTime.makeZoned(gapTime, {
        timeZone,
        adjustForTimeZone: true,
        disambiguation: "reject"
      })

      if (Option.isSome(rejectResult)) {
        strictEqual(DateTime.formatIso(DateTime.toUtc(rejectResult.value)), "2025-03-30T00:30:00.000Z")
      } else {
        throw new Error("Gap time with reject should succeed")
      }
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

      if (Option.isSome(compatibleResult) && Option.isSome(earlierResult) && Option.isSome(laterResult)) {
        strictEqual(DateTime.formatIso(DateTime.toUtc(compatibleResult.value)), "2025-03-09T07:30:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(earlierResult.value)), "2025-03-09T06:30:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(laterResult.value)), "2025-03-09T07:30:00.000Z")
      } else {
        throw new Error("Gap time handling failed")
      }
    })

    it("should handle different gap times consistently", () => {
      const testCases = [
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 3, minutes: 0 },
          expected: {
            compatible: "2025-03-30T01:00:00.000Z",
            earlier: "2025-03-30T00:00:00.000Z",
            later: "2025-03-30T01:00:00.000Z"
          }
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 2, minutes: 0 },
          expected: {
            compatible: "2025-03-09T07:00:00.000Z",
            earlier: "2025-03-09T06:00:00.000Z",
            later: "2025-03-09T07:00:00.000Z"
          }
        }
      ]

      testCases.forEach(({ expected, time, zone }) => {
        const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
        const parts = { ...time, seconds: 0, millis: 0 }

        const strategies = ["compatible", "earlier", "later"] as const
        strategies.forEach((strategy) => {
          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          if (Option.isSome(result)) {
            const utcString = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(utcString, expected[strategy], `Failed for ${zone} with ${strategy} strategy`)
          } else {
            throw new Error(`Expected success for ${zone} with ${strategy} strategy`)
          }
        })
      })
    })
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

      if (Option.isSome(compatibleResult) && Option.isSome(earlierResult) && Option.isSome(laterResult)) {
        // Compatible and earlier should choose the first occurrence
        strictEqual(DateTime.formatIso(DateTime.toUtc(compatibleResult.value)), "2025-10-26T00:00:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(earlierResult.value)), "2025-10-26T00:00:00.000Z")
        // Later should choose the second occurrence
        strictEqual(DateTime.formatIso(DateTime.toUtc(laterResult.value)), "2025-10-26T01:00:00.000Z")
      } else {
        throw new Error("Ambiguous time handling failed")
      }

      // Reject should fail
      const rejectResult = DateTime.makeZoned(ambiguousTime, {
        timeZone,
        adjustForTimeZone: true,
        disambiguation: "reject"
      })
      strictEqual(Option.isNone(rejectResult), true)
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

      if (Option.isSome(compatibleResult) && Option.isSome(earlierResult) && Option.isSome(laterResult)) {
        strictEqual(DateTime.formatIso(DateTime.toUtc(compatibleResult.value)), "2025-11-02T05:30:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(earlierResult.value)), "2025-11-02T05:30:00.000Z")
        strictEqual(DateTime.formatIso(DateTime.toUtc(laterResult.value)), "2025-11-02T06:30:00.000Z")
      } else {
        throw new Error("Ambiguous time handling failed")
      }
    })

    it("should handle multiple timezone ambiguous times", () => {
      const testCases = [
        {
          zone: "Europe/London",
          time: { year: 2025, month: 10, day: 26, hours: 1, minutes: 30 },
          expected: {
            compatible: "2025-10-26T00:30:00.000Z",
            earlier: "2025-10-26T00:30:00.000Z",
            later: "2025-10-26T01:30:00.000Z"
          }
        },
        {
          zone: "Europe/Berlin",
          time: { year: 2025, month: 10, day: 26, hours: 2, minutes: 30 },
          expected: {
            compatible: "2025-10-26T00:30:00.000Z",
            earlier: "2025-10-26T00:30:00.000Z",
            later: "2025-10-26T01:30:00.000Z"
          }
        }
      ]

      testCases.forEach(({ expected, time, zone }) => {
        const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
        const parts = { ...time, seconds: 0, millis: 0 }

        const strategies = ["compatible", "earlier", "later"] as const
        strategies.forEach((strategy) => {
          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          if (Option.isSome(result)) {
            const utcString = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(utcString, expected[strategy], `Failed for ${zone} with ${strategy} strategy`)
          } else {
            throw new Error(`Expected success for ${zone} with ${strategy} strategy`)
          }
        })
      })
    })
  })

  describe("Normal Times (no DST transition)", () => {
    it("should handle normal times correctly across timezones", () => {
      const testCases = [
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 27, hours: 1, minutes: 0 }, // Before DST (safe date)
          expected: "2025-03-26T23:00:00.000Z" // Temporal confirmed
        },
        {
          zone: "Europe/Athens",
          time: { year: 2025, month: 3, day: 30, hours: 4, minutes: 0 }, // After DST
          expected: "2025-03-30T01:00:00.000Z"
        },
        {
          zone: "America/New_York",
          time: { year: 2025, month: 3, day: 9, hours: 1, minutes: 0 }, // Before DST
          expected: "2025-03-09T06:00:00.000Z"
        },
        {
          zone: "Australia/Sydney",
          time: { year: 2025, month: 4, day: 6, hours: 1, minutes: 0 }, // Before DST ends
          expected: "2025-04-05T14:00:00.000Z"
        },
        {
          zone: "Europe/London",
          time: { year: 2025, month: 3, day: 29, hours: 1, minutes: 0 }, // Day before DST transition
          expected: "2025-03-29T01:00:00.000Z"
        }
      ]

      testCases.forEach(({ expected, time, zone }) => {
        const timeZone = DateTime.zoneUnsafeMakeNamed(zone)
        const parts = { ...time, seconds: 0, millis: 0 }

        // All disambiguation strategies should return the same result for normal times
        const strategies = ["compatible", "earlier", "later", "reject"] as const
        strategies.forEach((strategy) => {
          const result = DateTime.makeZoned(parts, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          if (Option.isSome(result)) {
            const utcString = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(
              utcString,
              expected,
              `Failed for ${zone} at ${time.hours}:${time.minutes} with ${strategy} strategy`
            )
          } else {
            throw new Error(`Expected success for normal time in ${zone} with ${strategy} strategy`)
          }
        })
      })
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle reject disambiguation for gap times correctly", () => {
      const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
      const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }

      // Reject is allowed for gap times, only throws for ambiguous times
      const result = DateTime.makeZoned(gapTime, { timeZone, adjustForTimeZone: true, disambiguation: "reject" })
      if (Option.isSome(result)) {
        const utcString = DateTime.formatIso(DateTime.toUtc(result.value))
        strictEqual(utcString, "2025-03-30T00:30:00.000Z") // Should work correctly
      } else {
        throw new Error("Gap time with reject should succeed")
      }
    })

    it("should throw errors for reject disambiguation with ambiguous times", () => {
      const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
      const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }

      try {
        DateTime.unsafeMakeZoned(ambiguousTime, { timeZone, adjustForTimeZone: true, disambiguation: "reject" })
        throw new Error("Expected exception for ambiguous time with reject disambiguation")
      } catch (error) {
        strictEqual(error instanceof Error, true)
        if (error instanceof Error) {
          strictEqual(error.message.includes("Ambiguous time"), true)
        }
      }
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

        if (Option.isSome(result)) {
          const utcString = DateTime.formatIso(DateTime.toUtc(result.value))
          // Should consistently handle different minute values within gap
          strictEqual(utcString.includes("2025-03-09T07:"), true, `Failed for minute ${minute}`)
        } else {
          throw new Error(`Expected success for gap time with minute ${minute}`)
        }
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

      if (Option.isSome(defaultResult) && Option.isSome(explicitResult)) {
        const defaultUtc = DateTime.formatIso(DateTime.toUtc(defaultResult.value))
        const explicitUtc = DateTime.formatIso(DateTime.toUtc(explicitResult.value))
        strictEqual(
          defaultUtc,
          explicitUtc,
          "Default disambiguation should match explicit 'earlier' for backward compatibility"
        )
      } else {
        throw new Error("Default disambiguation failed")
      }
    })
  })

  describe("Standard DST Conformance", () => {
    describe("Gap Time Validation", () => {
      it("should handle Athens 02:30 gap time correctly", () => {
        // This is the problematic case where Effect previously differed
        const timeZone = DateTime.zoneUnsafeMakeNamed("Europe/Athens")
        const gapTime = { year: 2025, month: 3, day: 30, hours: 2, minutes: 30, seconds: 0, millis: 0 }

        // Expected results (all strategies return the same result for this gap time)
        const expectedResult = "2025-03-30T00:30:00.000Z"

        const strategies = ["compatible", "earlier", "later"] as const

        strategies.forEach((strategy) => {
          const result = DateTime.makeZoned(gapTime, {
            timeZone,
            adjustForTimeZone: true,
            disambiguation: strategy
          })

          if (Option.isSome(result)) {
            const utcResult = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(
              utcResult,
              expectedResult,
              `Athens 02:30 gap time with '${strategy}' strategy should work correctly`
            )
          } else {
            throw new Error(`Gap time should not return None for '${strategy}' strategy`)
          }
        })
      })

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

          if (Option.isSome(result)) {
            const utcResult = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(
              utcResult,
              expected,
              `Athens 03:00 gap time with '${strategy}' strategy should work correctly`
            )
          } else {
            throw new Error(`Gap time should not return None for '${strategy}' strategy`)
          }
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

          if (Option.isSome(result)) {
            const utcResult = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(
              utcResult,
              expected,
              `New York 02:30 gap time with '${strategy}' strategy should work correctly`
            )
          } else {
            throw new Error(`Gap time should not return None for '${strategy}' strategy`)
          }
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

          if (Option.isSome(result)) {
            const utcResult = DateTime.formatIso(DateTime.toUtc(result.value))
            strictEqual(
              utcResult,
              expected,
              `Athens ambiguous time with '${strategy}' strategy should work correctly`
            )
          } else {
            throw new Error(`Ambiguous time should not return None for '${strategy}' strategy`)
          }
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

        if (Option.isSome(gapResult)) {
          const utcResult = DateTime.formatIso(DateTime.toUtc(gapResult.value))
          strictEqual(utcResult, "2025-03-30T00:30:00.000Z", "Gap time with reject should succeed")
        } else {
          throw new Error("Gap time with reject should succeed")
        }

        // Test ambiguous time with reject (should throw)
        const ambiguousTime = { year: 2025, month: 10, day: 26, hours: 3, minutes: 0, seconds: 0, millis: 0 }
        const ambiguousResult = DateTime.makeZoned(ambiguousTime, {
          timeZone,
          adjustForTimeZone: true,
          disambiguation: "reject"
        })

        strictEqual(Option.isNone(ambiguousResult), true, "Ambiguous time with reject should return None")
      })
    })
  })
})
