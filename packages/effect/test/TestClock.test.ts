import { describe, it } from "@effect/vitest"
import { DateTime, Effect, TestClock } from "effect"
import { deepStrictEqual } from "effect/test/util"

describe("TestClock", () => {
  describe("setTime", () => {
    const arbitraryDate = new Date("2023-12-31T11:00:00.000Z")
    it.effect("should set the current Date using an Instant", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(arbitraryDate.getTime())
        const now = yield* DateTime.nowAsDate
        deepStrictEqual(now, arbitraryDate)
      }))
    it.effect("should set the current Date using a Date", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(arbitraryDate)
        const now = yield* DateTime.nowAsDate
        deepStrictEqual(now, arbitraryDate)
      }))
  })
})
