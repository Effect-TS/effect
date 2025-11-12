import { RateLimiter } from "@effect/experimental"
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Duration from "effect/Duration"

describe("RateLimiter", () => {
  describe("fixed-window", () => {
    it.effect("should allow requests within the limit", () =>
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
        yield* Effect.repeatN(consume, 5)
        const result = yield* consume
        expect(result.delay).toEqual(Duration.minutes(1))
        // yield* Effect.repeatN(consume, 5)
        // result = yield* consume
        // expect(result.delay).toEqual(Duration.minutes(2))
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })
})
