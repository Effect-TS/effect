import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { DateTime, Effect, TestClock } from "effect"

describe("TestClock", () => {
  describe("setTime", () => {
    const arbitraryDateTime = DateTime.unsafeMake("2023-12-31T11:00:00.000Z")
    it.effect("should set the current Date using an Instant", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(arbitraryDateTime.epochMillis)
        const now = yield* DateTime.now
        deepStrictEqual(now, arbitraryDateTime)
      }))
    it.effect("should set the current time using a DateTime", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(arbitraryDateTime)
        const now = yield* DateTime.now
        deepStrictEqual(now, arbitraryDateTime)
      }))
    it.effect("should set the current time using a Date", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(DateTime.toDate(arbitraryDateTime))
        const now = yield* DateTime.now
        deepStrictEqual(now, arbitraryDateTime)
      }))
  })
})
