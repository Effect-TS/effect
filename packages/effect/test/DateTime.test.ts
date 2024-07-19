import { DateTime, Duration, Effect, Either, TestClock } from "effect"
import { assert, describe, it } from "./utils/extend.js"

const setTo2024NZ = TestClock.setTime(new Date("2023-12-31T11:00:00.000Z").getTime())

describe("DateTime", () => {
  describe("mutate", () => {
    it.effect("should mutate the date", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.mutate(now, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        const diff = DateTime.diffDurationEither(now, tomorrow)
        assert.deepStrictEqual(diff, Either.right(Duration.decode("1 day")))
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
        assert.strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toDateAdjusted(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.mutate(future, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        assert.strictEqual(DateTime.toDateUtc(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        assert.strictEqual(DateTime.toDateAdjusted(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
      }))
  })

  describe("add", () => {
    it.effect("utc", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.add(now, 1, "day")
        const diff = DateTime.diffDurationEither(now, tomorrow)
        assert.deepStrictEqual(diff, Either.right(Duration.decode("1 day")))
      }))

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.add(now, 6, "months")
        assert.strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toDateAdjusted(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.add(future, 1, "day")
        assert.strictEqual(DateTime.toDateUtc(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        assert.strictEqual(DateTime.toDateAdjusted(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
        const minusOne = DateTime.add(plusOne, -1, "day")
        assert.strictEqual(DateTime.toDateUtc(minusOne).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toDateAdjusted(minusOne).toISOString(), "2024-07-01T00:00:00.000Z")
      }))
  })

  describe("endOf", () => {
    it("month", () => {
      const mar = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(mar, "month")
      assert.strictEqual(end.toJSON(), "2024-03-31T23:59:59.999Z")
    })

    it("feb leap year", () => {
      const feb = DateTime.unsafeFromString("2024-02-15T12:00:00.000Z")
      const end = DateTime.endOf(feb, "month")
      assert.strictEqual(end.toJSON(), "2024-02-29T23:59:59.999Z")
    })

    it("week", () => {
      const start = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(start, "week")
      assert.strictEqual(end.toJSON(), "2024-03-16T23:59:59.999Z")
      assert.strictEqual(DateTime.getPartUtc(end, "weekDay"), 6)
    })

    it("week last day", () => {
      const start = DateTime.unsafeFromString("2024-03-16T12:00:00.000Z")
      const end = DateTime.endOf(start, "week")
      assert.strictEqual(end.toJSON(), "2024-03-16T23:59:59.999Z")
    })

    it("week with options", () => {
      const start = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.endOf(start, "week", {
        weekStartsOn: 1
      })
      assert.strictEqual(end.toJSON(), "2024-03-17T23:59:59.999Z")
    })

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* setTo2024NZ
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.endOf(now, "month")
        assert.strictEqual(DateTime.toDateUtc(future).toISOString(), "2024-01-31T10:59:59.999Z")
        assert.strictEqual(DateTime.toDateAdjusted(future).toISOString(), "2024-01-31T23:59:59.999Z")
      }))
  })

  describe("startOf", () => {
    it("month", () => {
      const mar = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(mar, "month")
      assert.strictEqual(end.toJSON(), "2024-03-01T00:00:00.000Z")
    })

    it("feb leap year", () => {
      const feb = DateTime.unsafeFromString("2024-02-15T12:00:00.000Z")
      const end = DateTime.startOf(feb, "month")
      assert.strictEqual(end.toJSON(), "2024-02-01T00:00:00.000Z")
    })

    it("week", () => {
      const start = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(start, "week")
      assert.strictEqual(end.toJSON(), "2024-03-10T00:00:00.000Z")
      assert.strictEqual(DateTime.getPartUtc(end, "weekDay"), 0)
    })

    it("week first day", () => {
      const start = DateTime.unsafeFromString("2024-03-10T12:00:00.000Z")
      const end = DateTime.startOf(start, "week")
      assert.strictEqual(end.toJSON(), "2024-03-10T00:00:00.000Z")
    })

    it("week with options", () => {
      const start = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      const end = DateTime.startOf(start, "week", {
        weekStartsOn: 1
      })
      assert.strictEqual(end.toJSON(), "2024-03-11T00:00:00.000Z")
    })
  })

  describe("format", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        assert.strictEqual(
          DateTime.format(now, {
            dateStyle: "full",
            timeStyle: "full",
            timeZone: "UTC"
          }),
          "Thursday, January 1, 1970 at 12:00:00 AM Coordinated Universal Time"
        )
      }))
  })

  describe("formatUtc", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        assert.strictEqual(
          DateTime.formatUtc(now, { dateStyle: "full", timeStyle: "full" }),
          "Thursday, January 1, 1970 at 12:00:00 AM Coordinated Universal Time"
        )
      }))
  })

  describe("formatWithZone", () => {
    it.effect("full", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        assert.strictEqual(
          DateTime.formatWithZone(now, { dateStyle: "full", timeStyle: "full" }),
          "Thursday, January 1, 1970 at 12:00:00 PM New Zealand Standard Time"
        )
      }))

    it.effect("long with offset", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const formatted = now.pipe(
          DateTime.setZoneOffset(10 * 60 * 60 * 1000),
          DateTime.formatWithZone({ dateStyle: "long", timeStyle: "short" })
        )
        assert.strictEqual(formatted, "January 1, 1970 at 10:00 AM")
      }))
  })

  describe("fromParts", () => {
    it("partial", () => {
      const date = DateTime.fromParts({
        year: 2024,
        month: 12,
        day: 25
      })
      assert.strictEqual(date.toJSON(), "2024-12-25T00:00:00.000Z")
    })

    it("month is set correctly", () => {
      const date = DateTime.fromParts({ year: 2024 })
      assert.strictEqual(date.toJSON(), "2024-01-01T00:00:00.000Z")
    })
  })

  describe("formatIso", () => {
    it("full", () => {
      const now = DateTime.unsafeFromString("2024-03-15T12:00:00.000Z")
      assert.strictEqual(DateTime.formatIso(now), "2024-03-15T12:00:00.000Z")
    })
  })

  describe("formatIsoOffset", () => {
    it.effect("correctly adds offset", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        assert.strictEqual(DateTime.formatIsoOffset(now), "1970-01-01T12:00:00+12:00")
      }))
  })
})
