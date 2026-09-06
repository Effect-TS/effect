import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { RateLimiter } from "effect/unstable/persistence"

describe(`RateLimiter`, () => {
  it.effect("supports partially applied sleep", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const sleep = RateLimiter.sleep(limiter)
      const result = yield* sleep({
        algorithm: "fixed-window",
        window: "1 minute",
        limit: 5,
        key: "partial"
      })

      assert.strictEqual(result.remaining, 4)
    }).pipe(
      Effect.provide(RateLimiter.layerStoreMemory)
    ))

  it.effect("supports uncurried sleep", () =>
    Effect.gen(function*() {
      const limiter = yield* RateLimiter.make
      const result = yield* RateLimiter.sleep(limiter, {
        algorithm: "fixed-window",
        window: "1 minute",
        limit: 5,
        key: "direct"
      })

      assert.strictEqual(result.remaining, 4)
    }).pipe(
      Effect.provide(RateLimiter.layerStoreMemory)
    ))

  describe("fixed-window", () => {
    it.effect("reports a full-window reset for an exact reservation", () =>
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

    it.effect("reports a fresh partial reset lifetime without rounding", () =>
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

    it.effect("subtracts elapsed time from reset metadata", () =>
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

    it.effect("reports the exact reserved lifetime without changing overflow delay", () =>
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

    it.effect("returns accumulated delays after the fixed window is exceeded", () =>
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
        yield* Effect.repeat(consume, { times: 3 }) // 1 + 3
        let result = yield* consume // 5
        assert.deepStrictEqual(result.delay, Duration.zero)
        result = yield* consume // 6
        assert.deepStrictEqual(result.delay, Duration.minutes(1))

        yield* Effect.repeat(consume, { times: 2 }) // 7,8,9
        result = yield* consume // 10
        assert.deepStrictEqual(result.delay, Duration.minutes(1))
        result = yield* consume // 11
        assert.deepStrictEqual(result.delay, Duration.minutes(2))

        yield* TestClock.adjust(Duration.seconds(30))

        result = yield* consume // 12
        assert.deepStrictEqual(result.delay, Duration.seconds(90))

        yield* TestClock.adjust(Duration.seconds(45))

        result = yield* consume // 13
        assert.deepStrictEqual(result.delay, Duration.seconds(45))
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("fails with retryAfter until the fixed window resets", () =>
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
        yield* Effect.repeat(consume, { times: 3 })
        let result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        let error = yield* Effect.flip(consume)
        if (error.reason._tag !== "RateLimitExceeded") {
          throw new Error("Expected RateLimitExceeded")
        }
        assert.deepStrictEqual(error.reason.retryAfter, Duration.minutes(1))
        assert.strictEqual(error.reason.remaining, 0)

        yield* TestClock.adjust(Duration.seconds(30))

        error = yield* Effect.flip(consume)
        if (error.reason._tag !== "RateLimitExceeded") {
          throw new Error("Expected RateLimitExceeded")
        }
        assert.deepStrictEqual(error.reason.retryAfter, Duration.seconds(30))
        assert.strictEqual(error.reason.remaining, 0)

        yield* TestClock.adjust(Duration.seconds(30))

        result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.remaining, 4)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })

  describe("token-bucket", () => {
    const options = {
      algorithm: "token-bucket",
      onExceeded: "fail",
      window: Duration.minutes(5),
      limit: 5,
      key: "timing"
    } as const

    const assertRetryAfter = (error: RateLimiter.RateLimiterError, millis: number) => {
      if (error.reason._tag !== "RateLimitExceeded") {
        throw new Error("Expected RateLimitExceeded")
      }
      assert.strictEqual(Duration.toMillis(error.reason.retryAfter), millis)
      assert.strictEqual(error.reason.remaining, 0)
    }

    it.effect.each(["fail", "delay"] as const)(
      "subtracts elapsed time from resetAfter in %s mode",
      (onExceeded) =>
        Effect.gen(function*() {
          const limiter = yield* RateLimiter.make
          yield* limiter.consume({ ...options, tokens: 5 })
          yield* TestClock.adjust("119 seconds")
          const result = yield* limiter.consume({ ...options, onExceeded })
          assert.strictEqual(result.remaining, 0)
          assert.strictEqual(Duration.toMillis(result.resetAfter), 241_000)
        }).pipe(Effect.provide(RateLimiter.layerStoreMemory))
    )

    it.effect.each([0, 1_700_000_000_000])(
      "preserves fractional refill boundaries at timestamp %s",
      (epoch) =>
        Effect.gen(function*() {
          const limiter = yield* RateLimiter.make
          for (const limit of [3, 7, 11]) {
            yield* TestClock.setTime(epoch)
            const config = { ...options, key: `fractional-${limit}`, window: 1_000, limit }
            yield* limiter.consume({ ...config, tokens: limit })
            assertRetryAfter(yield* Effect.flip(limiter.consume({ ...config, tokens: limit })), 1_000)
            yield* TestClock.adjust(1_000)
            assert.strictEqual((yield* limiter.consume({ ...config, tokens: limit })).remaining, 0)

            for (let token = 1; token <= limit * 2; token++) {
              const boundary = 1_000 + Math.ceil(token * 1_000 / limit)
              yield* TestClock.setTime(epoch + boundary - 1)
              assertRetryAfter(yield* Effect.flip(limiter.consume(config)), 1)
              yield* TestClock.adjust(1)
              assert.strictEqual((yield* limiter.consume(config)).remaining, 0)
            }
          }
        }).pipe(Effect.provide(RateLimiter.layerStoreMemory))
    )

    it.effect("retries at the refill boundary without consuming rejected attempts", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const consume = limiter.consume(options)
        yield* Effect.repeat(consume, { times: 4 })

        assertRetryAfter(yield* Effect.flip(consume), 60_000)
        yield* TestClock.adjust("59 seconds")
        assertRetryAfter(yield* Effect.flip(consume), 1_000)
        assertRetryAfter(yield* Effect.flip(consume), 1_000)

        yield* TestClock.adjust("1 second")
        const result = yield* consume
        assert.strictEqual(result.remaining, 0)
        assert.deepStrictEqual(result.delay, Duration.zero)
        assertRetryAfter(yield* Effect.flip(consume), 60_000)
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect.each([0, 60_000])(
      "does not add backward clock skew to waits after %s ms",
      (elapsed) =>
        Effect.gen(function*() {
          const limiter = yield* RateLimiter.make
          yield* TestClock.setTime(120_000)
          yield* limiter.consume({ ...options, tokens: 5 })
          if (elapsed > 0) {
            yield* TestClock.adjust(elapsed)
            yield* limiter.consume(options)
          }
          yield* TestClock.setTime(115_000 + elapsed)
          assertRetryAfter(yield* Effect.flip(limiter.consume(options)), 60_000)
          const reserved = yield* limiter.consume({ ...options, onExceeded: "delay" })
          assert.strictEqual(Duration.toMillis(reserved.delay), 60_000)
          assert.strictEqual(Duration.toMillis(reserved.resetAfter), 360_000)

          yield* TestClock.setTime(120_000 + elapsed)
          assertRetryAfter(yield* Effect.flip(limiter.consume(options)), 120_000)
          yield* TestClock.adjust("2 minutes")
          assert.strictEqual((yield* limiter.consume(options)).remaining, 0)
        }).pipe(Effect.provide(RateLimiter.layerStoreMemory))
    )

    it.effect("preserves available tokens and the refill schedule after a rejected batch", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        yield* limiter.consume({ ...options, tokens: 5 })
        yield* TestClock.adjust("59 seconds")
        const consume = limiter.consume({ ...options, tokens: 3 })
        assertRetryAfter(yield* Effect.flip(consume), 121_000)

        yield* TestClock.adjust("1 second")
        assertRetryAfter(yield* Effect.flip(consume), 120_000)
        yield* TestClock.adjust("2 minutes")
        const result = yield* consume
        assert.strictEqual(result.remaining, 0)
        assert.deepStrictEqual(result.delay, Duration.zero)
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect("subtracts elapsed time from delays including existing token debt", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        yield* limiter.consume({ ...options, tokens: 5 })
        yield* TestClock.adjust("59 seconds")

        const first = yield* limiter.consume({ ...options, onExceeded: "delay" })
        assert.strictEqual(first.remaining, -1)
        assert.deepStrictEqual(first.delay, Duration.seconds(1))
        assert.strictEqual(Duration.toMillis(first.resetAfter), 301_000)

        const second = yield* limiter.consume({ ...options, tokens: 2, onExceeded: "delay" })
        assert.strictEqual(second.remaining, -3)
        assert.deepStrictEqual(second.delay, Duration.seconds(121))
        assert.strictEqual(Duration.toMillis(second.resetAfter), 421_000)

        assertRetryAfter(yield* Effect.flip(limiter.consume(options)), 181_000)
        assertRetryAfter(yield* Effect.flip(limiter.consume(options)), 181_000)
        yield* TestClock.adjust("61 seconds")
        assertRetryAfter(yield* Effect.flip(limiter.consume(options)), 120_000)
        yield* TestClock.adjust("2 minutes")
        assert.strictEqual((yield* limiter.consume(options)).remaining, 0)
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect("reserves distinct refill boundaries across concurrent limiters", () =>
      Effect.gen(function*() {
        const first = yield* RateLimiter.make
        const second = yield* RateLimiter.make
        yield* first.consume({ ...options, tokens: 5 })
        yield* TestClock.adjust("59 seconds")

        const results = yield* Effect.all(
          [first, second, first].map((limiter) => limiter.consume({ ...options, onExceeded: "delay" })),
          { concurrency: "unbounded" }
        )
        assert.deepStrictEqual(results.map((result) => Duration.toMillis(result.delay)).sort((a, b) => a - b), [
          1_000,
          61_000,
          121_000
        ])
        yield* TestClock.adjust("121 seconds")
        assertRetryAfter(yield* Effect.flip(second.consume(options)), 60_000)
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect("sleeps only until the next refill boundary", () =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        yield* limiter.consume({ ...options, tokens: 5 })
        yield* TestClock.adjust("59 seconds")

        const fiber = yield* RateLimiter.sleep(limiter, options).pipe(Effect.forkChild)
        yield* TestClock.adjust(999)
        assert.isUndefined(fiber.pollUnsafe())
        yield* TestClock.adjust(1)
        assert.isDefined(fiber.pollUnsafe())
        assert.deepStrictEqual((yield* Fiber.join(fiber)).delay, Duration.seconds(1))
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect.each([
      { limit: 3, window: 1_000, elapsed: 999, tokens: 1, retryAfter: 1 },
      { limit: 3, window: 1_000, elapsed: 1, tokens: 2, retryAfter: 666 },
      { limit: 3, window: 1_000, elapsed: 1, tokens: 3, retryAfter: 999 },
      { limit: 4, window: 1, elapsed: 0, tokens: 3, retryAfter: 1 }
    ])("rounds the total delay up for fractional refill intervals %#", (test) =>
      Effect.gen(function*() {
        const limiter = yield* RateLimiter.make
        const config = { ...options, limit: test.limit, window: test.window }
        const delayConfig = { ...config, key: "delay", onExceeded: "delay" } as const
        yield* limiter.consume({ ...config, tokens: test.limit })
        yield* limiter.consume({ ...delayConfig, tokens: test.limit })
        yield* TestClock.adjust(test.elapsed)
        // Consume any whole tokens refilled before this attempt.
        const refilled = Math.floor(test.elapsed / (test.window / test.limit))
        if (refilled > 0) {
          yield* limiter.consume({ ...config, tokens: refilled })
          yield* limiter.consume({ ...delayConfig, tokens: refilled })
        }

        const consume = limiter.consume({ ...config, tokens: test.tokens })
        assertRetryAfter(yield* Effect.flip(consume), test.retryAfter)
        const delayed = yield* limiter.consume({ ...delayConfig, tokens: test.tokens })
        assert.strictEqual(Duration.toMillis(delayed.delay), test.retryAfter)
        yield* TestClock.adjust(test.retryAfter)
        assert.deepStrictEqual((yield* consume).delay, Duration.zero)
      }).pipe(Effect.provide(RateLimiter.layerStoreMemory)))

    it.effect("returns delay based on the token refill rate", () =>
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
        const refillRate = Duration.divideUnsafe(Duration.minutes(1), 5)
        yield* Effect.repeat(consume, { times: 3 }) // 1 + 3
        let result = yield* consume // 5
        assert.deepStrictEqual(result.delay, Duration.zero)
        result = yield* consume // 6
        assert.deepStrictEqual(result.delay, refillRate)
        result = yield* consume // 7
        assert.deepStrictEqual(result.delay, Duration.times(refillRate, 2))

        yield* TestClock.adjust(Duration.minutes(1)) // 2

        result = yield* consume // 3
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.remaining, 2)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("fails until enough tokens are refilled", () =>
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
        const refillRate = Duration.divideUnsafe(Duration.minutes(1), 5)
        yield* Effect.repeat(consume, { times: 3 }) // 1 + 3
        let result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        const error = yield* Effect.flip(consume)
        if (error.reason._tag !== "RateLimitExceeded") {
          throw new Error("Expected RateLimitExceeded")
        }
        assert.deepStrictEqual(error.reason.retryAfter, Duration.seconds(12))
        assert.strictEqual(error.reason.remaining, 0)

        yield* TestClock.adjust(Duration.times(refillRate, 3))

        result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.remaining, 2)
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })

  describe("adaptive", () => {
    it.effect("uses the inactive store path until 429 Retry-After feedback", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const consume = store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        let result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "inactive")

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: result.epoch,
          tokens: 1,
          status: 200,
          retryAfter: Duration.seconds(1)
        })

        result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "inactive")

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: result.epoch,
          tokens: 1,
          status: 429,
          retryAfter: undefined
        })

        result = yield* consume
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "inactive")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("starts cooldown on the first 429 Retry-After feedback", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(5)
        })

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.seconds(5))
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "cooldown")

        const otherKey = yield* store.adaptiveConsume({
          key: "b",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(otherKey.delay, Duration.zero)
        assert.strictEqual(otherKey.epoch, 0)
        assert.strictEqual(otherKey.phase, "inactive")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("clamps zero Retry-After feedback to the minimum cooldown", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.zero
        })

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.millis(1))
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "cooldown")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("bounds excessive adaptive Retry-After cooldowns", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.hours(2)
        })

        let result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.hours(1))
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "cooldown")

        yield* TestClock.adjust(Duration.hours(1))

        result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 1)
        assert.strictEqual(result.phase, "learning")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("returns the remaining cooldown delay", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(10)
        })
        yield* TestClock.adjust(Duration.seconds(4))

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.seconds(6))
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "cooldown")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("starts learning on the first admitted post-cooldown request", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(10)
        })
        yield* TestClock.adjust(Duration.seconds(10))

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 2,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 1)
        assert.strictEqual(result.phase, "learning")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("keeps learning requests at zero delay while observing token counts", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        const learning = yield* store.adaptiveConsume({
          key: "a",
          tokens: 2,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.strictEqual(learning.phase, "learning")

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 3,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, learning.epoch)
        assert.strictEqual(result.phase, "learning")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("learns the accepted token count and inferred window from learning feedback", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        const learning = yield* store.adaptiveConsume({
          key: "a",
          tokens: 2,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        yield* TestClock.adjust(Duration.seconds(4))
        const rejected = yield* store.adaptiveConsume({
          key: "a",
          tokens: 3,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 3,
          status: 429,
          retryAfter: Duration.seconds(6)
        })
        yield* TestClock.adjust(Duration.seconds(6))

        assert.strictEqual(learning.epoch, rejected.epoch)

        let result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.phase, "learned")

        result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.phase, "learned")

        result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.seconds(10))
        assert.strictEqual(result.phase, "learned")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("ignores stale epoch feedback", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        const learning = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(10)
        })

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, learning.epoch)
        assert.strictEqual(result.phase, "learning")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("prevents repeated learning 429 feedback from corrupting learned state", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        const rejected = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(5)
        })
        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(30)
        })

        const learned = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(learned.delay, Duration.seconds(5))
        assert.strictEqual(learned.epoch, rejected.epoch + 1)
        assert.strictEqual(learned.phase, "learned")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("same-epoch learned 429 feedback enters cooldown and can only extend it", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        const rejected = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(5)
        })

        const learned = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        yield* store.adaptiveFeedback({
          key: "a",
          epoch: learned.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(5)
        })
        yield* store.adaptiveFeedback({
          key: "a",
          epoch: learned.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(10)
        })

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.seconds(10))
        assert.strictEqual(result.epoch, learned.epoch)
        assert.strictEqual(result.phase, "cooldown")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("stores only cooldown when no tokens were accepted during learning", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        const learning = yield* store.adaptiveConsume({
          key: "a",
          tokens: 2,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        yield* store.adaptiveFeedback({
          key: "a",
          epoch: learning.epoch,
          tokens: 2,
          status: 429,
          retryAfter: Duration.seconds(5)
        })

        let result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.seconds(5))
        assert.strictEqual(result.epoch, learning.epoch)
        assert.strictEqual(result.phase, "cooldown")

        yield* TestClock.adjust(Duration.seconds(5))

        result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, learning.epoch + 1)
        assert.strictEqual(result.phase, "learning")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("expires learned adaptive state", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })
        yield* TestClock.adjust(Duration.seconds(1))

        yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        const rejected = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.seconds(1)
        })

        yield* TestClock.adjust(Duration.seconds(61))

        const result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "inactive")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))

    it.effect("bounds learned adaptive windows and expires the bounded state", () =>
      Effect.gen(function*() {
        const store = yield* RateLimiter.RateLimiterStore
        const first = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: first.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.millis(1)
        })
        yield* TestClock.adjust(Duration.millis(1))

        yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        const rejected = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })

        yield* store.adaptiveFeedback({
          key: "a",
          epoch: rejected.epoch,
          tokens: 1,
          status: 429,
          retryAfter: Duration.hours(2)
        })

        let result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.hours(1))
        assert.strictEqual(result.phase, "learned")

        yield* TestClock.adjust(Duration.minutes(61))

        result = yield* store.adaptiveConsume({
          key: "a",
          tokens: 1,
          fallbackLimit: 5,
          fallbackWindow: Duration.minutes(1)
        })
        assert.deepStrictEqual(result.delay, Duration.zero)
        assert.strictEqual(result.epoch, 0)
        assert.strictEqual(result.phase, "inactive")
      }).pipe(
        Effect.provide(RateLimiter.layerStoreMemory)
      ))
  })
})
