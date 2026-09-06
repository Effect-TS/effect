import { assert, it } from "@effect/vitest"
import { Duration, Effect, type Layer } from "effect"
import { TestClock } from "effect/testing"
import { RateLimiter } from "effect/unstable/persistence"

export const tokenBucketTimingSuite = (
  name: string,
  layer: Layer.Layer<RateLimiter.RateLimiterStore, unknown>
) => {
  it.layer(layer, { timeout: "30 seconds" })(`RateLimiter token-bucket timing (${name})`, (it) => {
    for (const onExceeded of ["fail", "delay"] as const) {
      for (
        const [elapsed, tokens, expected] of [
          [59_000, 1, 1_000],
          [59_500, 1, 500],
          [59_000, 2, 61_000],
          [119_000, 2, 1_000]
        ] as const
      ) {
        it.effect(`${onExceeded}: ${tokens} tokens after ${elapsed}ms waits ${expected}ms`, () =>
          Effect.gen(function*() {
            const limiter = yield* RateLimiter.make
            const options = {
              algorithm: "token-bucket",
              onExceeded,
              window: "5 minutes",
              limit: 5,
              key: `timing-${onExceeded}-${elapsed}-${tokens}`
            } as const
            yield* limiter.consume({ ...options, tokens: 5 })
            yield* TestClock.adjust(elapsed)

            if (onExceeded === "fail") {
              const error = yield* Effect.flip(limiter.consume({ ...options, tokens }))
              if (error.reason._tag !== "RateLimitExceeded") {
                throw new Error("Expected RateLimitExceeded")
              }
              assert.strictEqual(Duration.toMillis(error.reason.retryAfter), expected)
              assert.strictEqual(error.reason.remaining, 0)
            } else {
              const result = yield* limiter.consume({ ...options, tokens })
              assert.strictEqual(Duration.toMillis(result.delay), expected)
              assert.strictEqual(result.remaining, Math.floor(elapsed / 60_000) - tokens)
            }
          }))
      }
    }

    it.effect("failed retries do not reserve tokens or move the refill boundary", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const options = {
          algorithm: "token-bucket",
          onExceeded: "fail",
          window: "5 minutes",
          limit: 5,
          key: "timing-fail-boundary"
        } as const
        yield* limiter.consume({ ...options, tokens: 5 })
        yield* Effect.flip(limiter.consume(options))
        yield* TestClock.adjust("59 seconds")
        yield* Effect.flip(limiter.consume(options))
        yield* Effect.flip(limiter.consume(options))
        yield* TestClock.adjust("1 second")

        const result = yield* limiter.consume(options)
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.remaining, 0)
      }))

    it.effect("accumulated delay reservations retain the partial refill interval", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const options = {
          algorithm: "token-bucket",
          onExceeded: "delay",
          window: "5 minutes",
          limit: 5,
          key: "timing-delay-reservations"
        } as const
        yield* limiter.consume({ ...options, tokens: 5 })
        yield* TestClock.adjust("59 seconds")
        yield* limiter.consume(options)
        const result = yield* limiter.consume(options)

        assert.strictEqual(Duration.toMillis(result.delay), 61_000)
        assert.strictEqual(result.remaining, -2)
      }))
  })
}
