import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect } from "effect"
import { TestClock } from "effect/testing"
import { RateLimiter } from "effect/unstable/persistence"

describe("RateLimiter fixed-window resetAfter", () => {
  it.effect("control: fail mode reports the partial key lifetime", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const result = yield* limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "fail",
        key: "fail",
        limit: 5,
        window: "1 minute",
        tokens: 1
      })

      assert.strictEqual(result.limit, 5)
      assert.strictEqual(result.remaining, 4)
      assert.deepStrictEqual(result.delay, Duration.zero)
      assert.strictEqual(Duration.toMillis(result.resetAfter), 12_000)
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("control: delay mode preserves an exact full-window reset", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const result = yield* limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "delay",
        key: "exact",
        limit: 5,
        window: "1 minute",
        tokens: 5
      })

      assert.strictEqual(result.limit, 5)
      assert.strictEqual(result.remaining, 0)
      assert.deepStrictEqual(result.delay, Duration.zero)
      assert.strictEqual(Duration.toMillis(result.resetAfter), 60_000)
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("regression: delay mode reports a fresh partial lifetime without rounding", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const result = yield* limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "delay",
        key: "partial",
        limit: 5,
        window: "1 minute",
        tokens: 1
      })

      assert.strictEqual(result.limit, 5)
      assert.strictEqual(result.remaining, 4)
      assert.deepStrictEqual(result.delay, Duration.zero)
      assert.strictEqual(Duration.toMillis(result.resetAfter), 12_000)
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("regression: delay mode subtracts elapsed time from reset metadata", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      yield* limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "delay",
        key: "elapsed",
        limit: 5,
        window: "1 minute",
        tokens: 4
      })
      yield* TestClock.adjust("10 seconds")
      const result = yield* limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "delay",
        key: "elapsed",
        limit: 5,
        window: "1 minute",
        tokens: 1
      })

      assert.strictEqual(result.limit, 5)
      assert.strictEqual(result.remaining, 0)
      assert.deepStrictEqual(result.delay, Duration.zero)
      assert.strictEqual(Duration.toMillis(result.resetAfter), 50_000)
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("regression: overflow reports exact reserved lifetime without changing delay", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const consume = limiter.consume({
        algorithm: "fixed-window",
        onExceeded: "delay",
        key: "overflow",
        limit: 5,
        window: "1 minute",
        tokens: 1
      })
      for (let i = 0; i < 5; i++) yield* consume
      const result = yield* consume

      assert.strictEqual(result.limit, 5)
      assert.strictEqual(result.remaining, -1)
      assert.deepStrictEqual(result.delay, Duration.minutes(1))
      assert.strictEqual(Duration.toMillis(result.resetAfter), 72_000)
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("control: partial counters naturally expire at twelve seconds, not sixty", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const consume = (key: string) =>
        limiter.consume({
          algorithm: "fixed-window",
          onExceeded: "delay",
          key,
          limit: 5,
          window: "1 minute",
          tokens: 1
        })
      const before = yield* consume("before-expiry")
      const boundary = yield* consume("at-expiry")
      assert.deepStrictEqual([before.remaining, Duration.toMillis(before.delay)], [4, 0])
      assert.deepStrictEqual([boundary.remaining, Duration.toMillis(boundary.delay)], [4, 0])

      yield* TestClock.adjust(11_999)
      const stillReserved = yield* consume("before-expiry")
      assert.deepStrictEqual([stillReserved.remaining, Duration.toMillis(stillReserved.delay)], [3, 0])

      yield* TestClock.adjust(1)
      const fresh = yield* consume("at-expiry")
      assert.deepStrictEqual([fresh.remaining, Duration.toMillis(fresh.delay)], [4, 0])
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("control: public store TTL agrees with natural memory-key expiry", () =>
    Effect.gen(function*() {
      const store = yield* RateLimiter.RateLimiterStore
      const consume = (key: string) =>
        store.fixedWindow({ key, tokens: 1, refillRate: Duration.seconds(12), limit: undefined })
      assert.deepStrictEqual(yield* consume("before-expiry"), [1, 12_000])
      assert.deepStrictEqual(yield* consume("at-expiry"), [1, 12_000])

      yield* TestClock.adjust(11_999)
      assert.deepStrictEqual(yield* consume("before-expiry"), [2, 12_001])

      yield* TestClock.adjust(1)
      assert.deepStrictEqual(yield* consume("at-expiry"), [1, 12_000])
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

  it.effect("control: overflow reservations naturally expire at seventy-two seconds", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const consume = (key: string) =>
        limiter.consume({
          algorithm: "fixed-window",
          onExceeded: "delay",
          key,
          limit: 5,
          window: "1 minute",
          tokens: 1
        })
      const first = []
      const sixth = []
      for (const key of ["before-expiry", "at-expiry"]) {
        const initial = yield* consume(key)
        first.push([initial.remaining, Duration.toMillis(initial.delay)])
        for (let i = 0; i < 4; i++) yield* consume(key)
        const reserved = yield* consume(key)
        sixth.push([reserved.remaining, Duration.toMillis(reserved.delay)])
      }
      assert.deepStrictEqual(first, [[4, 0], [4, 0]])
      assert.deepStrictEqual(sixth, [[-1, 60_000], [-1, 60_000]])

      yield* TestClock.adjust(71_999)
      const stillReserved = yield* consume("before-expiry")
      assert.deepStrictEqual([stillReserved.remaining, Duration.toMillis(stillReserved.delay)], [-2, 0])

      yield* TestClock.adjust(1)
      const fresh = yield* consume("at-expiry")
      assert.deepStrictEqual([fresh.remaining, Duration.toMillis(fresh.delay)], [4, 0])
    }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))
})
