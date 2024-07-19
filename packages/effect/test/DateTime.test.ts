import { DateTime, Duration, Effect, Either, TestClock } from "effect"
import { assert, describe, it } from "./utils/extend.js"

describe("DateTime", () => {
  describe("mutate", () => {
    it.effect("should mutate the date", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.mutate(now, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        const diff = DateTime.diff(now, tomorrow)
        assert.deepStrictEqual(diff, Either.right(Duration.decode("1 day")))
      }))

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(new Date("2023-12-31T11:00:00.000Z").getTime())
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.mutate(now, (date) => {
          date.setUTCMonth(date.getUTCMonth() + 6)
        })
        assert.strictEqual(DateTime.toUtcDate(future).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toPlainDate(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.mutate(future, (date) => {
          date.setUTCDate(date.getUTCDate() + 1)
        })
        assert.strictEqual(DateTime.toUtcDate(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        assert.strictEqual(DateTime.toPlainDate(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
      }))
  })

  describe("add", () => {
    it.effect("utc", () =>
      Effect.gen(function*() {
        const now = yield* DateTime.now
        const tomorrow = DateTime.add(now, 1, "day")
        const diff = DateTime.diff(now, tomorrow)
        assert.deepStrictEqual(diff, Either.right(Duration.decode("1 day")))
      }))

    it.effect("correctly preserves the time zone", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(new Date("2023-12-31T11:00:00.000Z").getTime())
        const now = yield* DateTime.nowInCurrentZone.pipe(
          DateTime.withCurrentZoneNamed("Pacific/Auckland")
        )
        const future = DateTime.add(now, 6, "months")
        assert.strictEqual(DateTime.toUtcDate(future).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toPlainDate(future).toISOString(), "2024-07-01T00:00:00.000Z")
        const plusOne = DateTime.add(future, 1, "day")
        assert.strictEqual(DateTime.toUtcDate(plusOne).toISOString(), "2024-07-01T12:00:00.000Z")
        assert.strictEqual(DateTime.toPlainDate(plusOne).toISOString(), "2024-07-02T00:00:00.000Z")
        const minusOne = DateTime.add(plusOne, -1, "day")
        assert.strictEqual(DateTime.toUtcDate(minusOne).toISOString(), "2024-06-30T12:00:00.000Z")
        assert.strictEqual(DateTime.toPlainDate(minusOne).toISOString(), "2024-07-01T00:00:00.000Z")
      }))
  })
})
