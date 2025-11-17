import { RateLimiter } from "@effect/experimental"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Duration from "effect/Duration"
import * as TestClock from "effect/TestClock"

describe("RateLimiter", () => {
  describe("fixed-window", () => {
    it.effect("onExceeded delay", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const consume = limiter.consume({
          algorithm: "fixed-window",
          onExceeded: "delay",
          window: "1 minute",
          limit: 5,
          tokens: 1,
          key: "a"
        })
        yield* Effect.repeatN(consume, 3) // 1 + 3
        let result = yield* consume // 5
        expect(result.delay).toEqual(Duration.zero)
        result = yield* consume // 6
        expect(result.delay).toEqual(Duration.minutes(1))

        yield* Effect.repeatN(consume, 2) // 7,8,9
        result = yield* consume // 10
        expect(result.delay).toEqual(Duration.minutes(1))
        result = yield* consume // 11
        expect(result.delay).toEqual(Duration.minutes(2))

        yield* TestClock.adjust(Duration.seconds(30))

        result = yield* consume // 12
        expect(result.delay).toEqual(Duration.seconds(90))

        yield* TestClock.adjust(Duration.seconds(45))

        result = yield* consume // 13
        expect(result.delay).toEqual(Duration.seconds(45))
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("onExceeded fail", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const consume = limiter.consume({
          algorithm: "fixed-window",
          onExceeded: "fail",
          window: "1 minute",
          limit: 5,
          tokens: 1,
          key: "a"
        })
        yield* Effect.repeatN(consume, 3)
        let result = yield* consume
        expect(result.delay).toEqual(Duration.zero)
        let error = yield* Effect.flip(consume)
        assert(error.reason === "Exceeded")
        expect(error.retryAfter).toEqual(Duration.minutes(1))
        expect(error.remaining).toEqual(0)

        yield* TestClock.adjust(Duration.seconds(30))

        error = yield* Effect.flip(consume)
        assert(error.reason === "Exceeded")
        expect(error.retryAfter).toEqual(Duration.seconds(30))
        expect(error.remaining).toEqual(0)

        yield* TestClock.adjust(Duration.seconds(30))

        result = yield* consume
        expect(result.delay).toEqual(Duration.zero)
        expect(result.remaining).toEqual(4)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })

  describe("token-bucket", () => {
    it.effect("onExceeded delay", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const consume = limiter.consume({
          algorithm: "token-bucket",
          onExceeded: "delay",
          window: "1 minute",
          limit: 5,
          tokens: 1,
          key: "a"
        })
        const refillRate = Duration.unsafeDivide(Duration.minutes(1), 5)
        yield* Effect.repeatN(consume, 3) // 1 + 3
        let result = yield* consume // 5
        expect(result.delay).toEqual(Duration.zero)
        result = yield* consume // 6
        expect(result.delay).toEqual(refillRate)
        result = yield* consume // 7
        expect(result.delay).toEqual(Duration.times(refillRate, 2))

        yield* TestClock.adjust(Duration.minutes(1)) // 2

        result = yield* consume // 3
        expect(result.delay).toEqual(Duration.zero)
        expect(result.remaining).toEqual(2)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("onExceeded fail", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const consume = limiter.consume({
          algorithm: "token-bucket",
          onExceeded: "fail",
          window: "1 minute",
          limit: 5,
          tokens: 1,
          key: "a"
        })
        const refillRate = Duration.unsafeDivide(Duration.minutes(1), 5)
        yield* Effect.repeatN(consume, 3)
        let result = yield* consume
        expect(result.delay).toEqual(Duration.zero)
        const error = yield* Effect.flip(consume)
        assert(error.reason === "Exceeded")
        expect(error.retryAfter).toEqual(Duration.seconds(12))
        expect(error.remaining).toEqual(0)

        yield* TestClock.adjust(Duration.times(refillRate, 3))

        result = yield* consume
        expect(result.delay).toEqual(Duration.zero)
        expect(result.remaining).toEqual(2)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })
})
