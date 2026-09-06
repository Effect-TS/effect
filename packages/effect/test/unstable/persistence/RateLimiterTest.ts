import { assert, it } from "@effect/vitest"
import { Duration, Effect, type Layer } from "effect"
import { TestClock } from "effect/testing"
import { RateLimiter } from "effect/unstable/persistence"

type OnExceeded = "fail" | "delay"

const options = (key: string, onExceeded?: OnExceeded) =>
  ({ algorithm: "token-bucket", window: "5 minutes", limit: 5, key, onExceeded }) as const

const exceeded = (error: RateLimiter.RateLimiterError) =>
  error.reason._tag === "RateLimitExceeded" ? error.reason : assert.fail("Expected RateLimitExceeded")

/**
 * Consumes `tokens`, runs `idle`, and asserts the bucket is back at capacity
 * with a fresh refill interval.
 */
export const restartsInterval = <E, R>(
  key: string,
  onExceeded: OnExceeded,
  tokens: number,
  idle: Effect.Effect<void, E, R>
) =>
  Effect.gen(function*() {
    const limiter = yield* RateLimiter.make
    const opts = options(key, onExceeded)
    yield* limiter.consume({ ...opts, tokens })
    yield* idle
    const result = yield* limiter.consume({ ...opts, tokens })

    assert.strictEqual(result.remaining, 5 - tokens)
    assert.deepStrictEqual(result.delay, Duration.zero)
    assert.strictEqual(Duration.toMillis(result.resetAfter), tokens * 60_000)

    const excess = limiter.consume({ ...opts, tokens: 6 - tokens })
    if (onExceeded === "fail") {
      const error = exceeded(yield* Effect.flip(excess))
      assert.strictEqual(Duration.toMillis(error.retryAfter), 60_000)
    } else {
      const delayed = yield* excess
      assert.strictEqual(delayed.remaining, -1)
      assert.strictEqual(Duration.toMillis(delayed.delay), 60_000)
      assert.strictEqual(Duration.toMillis(delayed.resetAfter), 360_000)
    }
  })

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
            const opts = options(`timing-${onExceeded}-${elapsed}-${tokens}`, onExceeded)
            yield* limiter.consume({ ...opts, tokens: 5 })
            yield* TestClock.adjust(elapsed)

            if (onExceeded === "fail") {
              const error = exceeded(yield* Effect.flip(limiter.consume({ ...opts, tokens })))
              assert.strictEqual(Duration.toMillis(error.retryAfter), expected)
              assert.strictEqual(error.remaining, 0)
            } else {
              const result = yield* limiter.consume({ ...opts, tokens })
              assert.strictEqual(Duration.toMillis(result.delay), expected)
              assert.strictEqual(result.remaining, Math.floor(elapsed / 60_000) - tokens)
              assert.strictEqual(Duration.toMillis(result.resetAfter), resetAfter)
            }
          }))
      }

      it.effect(`${onExceeded}: resetAfter accounts for elapsed time on an allowed request`, () =>
        Effect.gen(function*() {
          const limiter = yield* RateLimiter.make
          const opts = options(`timing-allowed-${onExceeded}`, onExceeded)
          const initial = yield* limiter.consume({ ...opts, tokens: 4 })
          assert.strictEqual(Duration.toMillis(initial.resetAfter), 240_000)
          yield* TestClock.adjust("59 seconds")
          const result = yield* limiter.consume(opts)

          assert.deepStrictEqual(result.delay, Duration.zero)
          assert.strictEqual(result.remaining, 0)
          assert.strictEqual(Duration.toMillis(result.resetAfter), 241_000)

          yield* TestClock.adjust("241 seconds")
          const full = yield* limiter.consume({ ...opts, tokens: 0 })
          assert.strictEqual(full.remaining, 5)
          assert.deepStrictEqual(full.resetAfter, Duration.zero)
        }))

      for (const [tokens, idle] of [[1, "61 seconds"], [5, "359 seconds"]] as const) {
        it.effect(`${onExceeded}: restarts the refill interval after ${idle} idle`, () =>
          restartsInterval(`timing-idle-${onExceeded}-${tokens}`, onExceeded, tokens, TestClock.adjust(idle)))
      }
    }

    it.effect("restarts the interval after a zero-token call without a whole-token refill", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const opts = options("timing-zero-tokens")
        const initial = yield* limiter.consume({ ...opts, tokens: 0 })
        assert.strictEqual(initial.remaining, 5)
        assert.deepStrictEqual(initial.resetAfter, Duration.zero)

        yield* TestClock.adjust("30 seconds")
        const result = yield* limiter.consume(opts)

        assert.strictEqual(result.remaining, 4)
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(Duration.toMillis(result.resetAfter), 60_000)
      }))

    it.effect("preserves fractional elapsed milliseconds in the store tuple and timing metadata", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const opts = {
          key: "timing-fractional",
          limit: 3,
          refillRate: Duration.millis(1_000 / 3),
          allowOverflow: true
        }
        const initial = yield* store.tokenBucket({ ...opts, tokens: 3 })
        assert.deepStrictEqual(initial, [0, 0])
        yield* TestClock.adjust(500)
        const [remaining, elapsedMillis] = yield* store.tokenBucket({ ...opts, tokens: 1 })

        assert.strictEqual(remaining, 0)
        assert.closeTo(elapsedMillis, 1_000 / 6, 0.000_001)

        const limiter = yield* RateLimiter.make
        const result = yield* limiter.consume({
          algorithm: "token-bucket",
          onExceeded: "delay",
          window: "1 second",
          limit: 3,
          key: opts.key
        })
        assert.strictEqual(result.remaining, -1)
        assert.closeTo(Duration.toMillis(result.delay), 1_000 / 6, 0.000_01)
        assert.closeTo(Duration.toMillis(result.resetAfter), 7_000 / 6, 0.000_01)
      }))

    it.effect("failed retries do not reserve tokens or move the refill boundary", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const opts = options("timing-fail-boundary", "fail")
        yield* limiter.consume({ ...opts, tokens: 5 })
        yield* Effect.flip(limiter.consume(opts))
        yield* TestClock.adjust("59 seconds")
        yield* Effect.flip(limiter.consume(opts))
        yield* Effect.flip(limiter.consume(opts))
        yield* TestClock.adjust("1 second")

        const result = yield* limiter.consume(opts)
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.remaining, 0)
        assert.strictEqual(Duration.toMillis(result.resetAfter), 300_000)
      }))

    it.effect("accumulated delay reservations retain the partial refill interval", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const opts = options("timing-delay-reservations", "delay")
        yield* limiter.consume({ ...opts, tokens: 5 })
        yield* TestClock.adjust("59 seconds")
        yield* limiter.consume(opts)
        const result = yield* limiter.consume(opts)

        assert.strictEqual(Duration.toMillis(result.delay), 61_000)
        assert.strictEqual(result.remaining, -2)
        assert.strictEqual(Duration.toMillis(result.resetAfter), 361_000)
      }))
  })
}
