import { assert, it } from "@effect/vitest"
import { Duration, Effect, type Layer } from "effect"
import { TestClock } from "effect/testing"
import { RateLimiter } from "effect/unstable/persistence"

export const suite = (
  name: string,
  layer: Layer.Layer<RateLimiter.RateLimiterStore, unknown>
) => {
  it.layer(layer, { timeout: "30 seconds" })(`RateLimiter token-bucket timing (${name})`, (it) => {
    for (const onExceeded of ["fail", "delay"] as const) {
      for (
        const [elapsed, tokens, expected, resetAfter] of [
          [59_000, 1, 1_000, 301_000],
          [59_500, 1, 500, 300_500],
          [59_000, 2, 61_000, 361_000],
          [119_000, 2, 1_000, 301_000]
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
              assert.strictEqual(Duration.toMillis(result.resetAfter), resetAfter)
            }
          }))
      }

      it.effect(`${onExceeded}: resetAfter accounts for elapsed time on an allowed request`, () =>
        Effect.gen(function*() {
          const limiter = yield* RateLimiter.make
          const options = {
            algorithm: "token-bucket",
            onExceeded,
            window: "5 minutes",
            limit: 5,
            key: `timing-allowed-${onExceeded}`
          } as const
          const initial = yield* limiter.consume({ ...options, tokens: 4 })
          assert.strictEqual(Duration.toMillis(initial.resetAfter), 240_000)
          yield* TestClock.adjust("59 seconds")
          const result = yield* limiter.consume(options)

          assert.deepStrictEqual(result.delay, Duration.zero)
          assert.strictEqual(result.remaining, 0)
          assert.strictEqual(Duration.toMillis(result.resetAfter), 241_000)

          yield* TestClock.adjust("241 seconds")
          const full = yield* limiter.consume({ ...options, tokens: 0 })
          assert.strictEqual(full.remaining, 5)
          assert.deepStrictEqual(full.resetAfter, Duration.zero)
        }))

      for (const [tokens, elapsed, resetAfter] of [[1, 61_000, 60_000], [5, 359_000, 300_000]] as const) {
        it.effect(`${onExceeded}: restarts the refill interval after ${elapsed}ms idle`, () =>
          Effect.gen(function*() {
            const limiter = yield* RateLimiter.make
            const options = {
              algorithm: "token-bucket",
              onExceeded,
              window: "5 minutes",
              limit: 5,
              key: `timing-idle-${onExceeded}-${tokens}`
            } as const
            yield* limiter.consume({ ...options, tokens })
            yield* TestClock.adjust(elapsed)
            const result = yield* limiter.consume({ ...options, tokens })

            assert.strictEqual(result.remaining, 5 - tokens)
            assert.deepStrictEqual(result.delay, Duration.zero)
            assert.strictEqual(Duration.toMillis(result.resetAfter), resetAfter)

            const excess = limiter.consume({ ...options, tokens: 6 - tokens })
            if (onExceeded === "fail") {
              const error = yield* Effect.flip(excess)
              if (error.reason._tag !== "RateLimitExceeded") {
                throw new Error("Expected RateLimitExceeded")
              }
              assert.strictEqual(Duration.toMillis(error.reason.retryAfter), 60_000)
            } else {
              const delayed = yield* excess
              assert.strictEqual(delayed.remaining, -1)
              assert.strictEqual(Duration.toMillis(delayed.delay), 60_000)
              assert.strictEqual(Duration.toMillis(delayed.resetAfter), 360_000)
            }
          }))
      }
    }

    it.effect("restarts the interval after a zero-token call without a whole-token refill", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const options = {
          algorithm: "token-bucket",
          window: "5 minutes",
          limit: 5,
          key: "timing-zero-tokens"
        } as const
        const initial = yield* limiter.consume({ ...options, tokens: 0 })
        assert.strictEqual(initial.remaining, 5)
        assert.deepStrictEqual(initial.resetAfter, Duration.zero)

        yield* TestClock.adjust("30 seconds")
        const result = yield* limiter.consume(options)

        assert.strictEqual(result.remaining, 4)
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(Duration.toMillis(result.resetAfter), 60_000)
      }))

    it.effect("preserves fractional elapsed milliseconds in the store tuple and timing metadata", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const options = {
          key: "timing-fractional",
          limit: 3,
          refillRate: Duration.millis(1_000 / 3),
          allowOverflow: true
        }
        const initial = yield* store.tokenBucket({ ...options, tokens: 3 })
        assert.deepStrictEqual(initial, [0, 0])
        yield* TestClock.adjust(500)
        const [remaining, elapsedMillis] = yield* store.tokenBucket({ ...options, tokens: 1 })

        assert.strictEqual(remaining, 0)
        assert.closeTo(elapsedMillis, 1_000 / 6, 0.000_001)

        const limiter = yield* RateLimiter.make
        const result = yield* limiter.consume({
          algorithm: "token-bucket",
          onExceeded: "delay",
          window: "1 second",
          limit: 3,
          key: options.key
        })
        assert.strictEqual(result.remaining, -1)
        assert.closeTo(Duration.toMillis(result.delay), 1_000 / 6, 0.000_01)
        assert.closeTo(Duration.toMillis(result.resetAfter), 7_000 / 6, 0.000_01)
      }))

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
        assert.strictEqual(Duration.toMillis(result.resetAfter), 300_000)
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
        assert.strictEqual(Duration.toMillis(result.resetAfter), 361_000)
      }))
  })
}
