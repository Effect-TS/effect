import { describe, it } from "@effect/vitest"
import { assertFalse, assertLeft, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Array, Clock, Deferred, Effect, Fiber, Function, Option, pipe, RateLimiter, Ref, TestClock } from "effect"

describe("RateLimiter", () => {
  describe.concurrent("fixed-window", () => {
    RateLimiterTestSuite("fixed-window")

    it.scoped("will use the provided cost", () =>
      Effect.gen(function*() {
        const rl = yield* (RateLimiter.make({
          limit: 100,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))

        const now = yield* (Clock.currentTimeMillis)
        const fib = yield* (
          Effect.replicateEffect(rl(Clock.currentTimeMillis).pipe(RateLimiter.withCost(10)), 20).pipe(
            Effect.fork
          )
        )

        yield* (TestClock.adjust("1 seconds"))
        const nowAfter1Second = yield* (Clock.currentTimeMillis)

        const times = yield* (Fiber.join(fib))
        assertTrue(times.slice(0, 10).every((t) => t === now))
        assertTrue(times.slice(10).every((t) => t === nowAfter1Second))
      }))

    it.scoped("will respect different costs per effect and interleave them.", () =>
      Effect.gen(function*() {
        const rl = yield* (RateLimiter.make({
          limit: 10,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))
        const rl1 = Function.compose(rl, RateLimiter.withCost(7))
        const rl2 = Function.compose(rl, RateLimiter.withCost(3))

        const start = yield* (Clock.currentTimeMillis)

        const tasks = [
          rl1(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl1", x] as const)),
          rl1(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl1", x] as const)),
          rl2(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl2", x] as const)),
          rl2(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl2", x] as const))
        ]

        const fib = yield* (
          Effect.all(tasks, { concurrency: "unbounded" }).pipe(Effect.fork)
        )

        yield* (TestClock.adjust("1 seconds"))
        const after1Second = yield* (Clock.currentTimeMillis)

        const times = yield* (Fiber.join(fib))

        deepStrictEqual(
          times,
          [
            ["rl1", start],
            ["rl1", after1Second],
            ["rl2", start],
            ["rl2", after1Second]
          ]
        )
      }))

    it.scoped("will be composable with other `RateLimiters`", () =>
      Effect.gen(function*() {
        // Max 30 calls per minute
        const rl1 = yield* (RateLimiter.make({
          limit: 30,
          interval: "1 minutes",
          algorithm: "fixed-window"
        }))
        // Max 2 calls per second
        const rl2 = yield* (RateLimiter.make({
          limit: 2,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))
        // This rate limiter respects both the 30 calls per minute
        // and the 2 calls per second constraints.
        const rl = Function.compose(rl1, rl2)

        const now = yield* (Clock.currentTimeMillis)

        // 32 calls should take 1 minute to complete based on the constraints
        // of the rate limiter defined above.
        // First 30 calls should trigger in the first 15 seconds
        // and the next 2 calls should trigger at the 1 minute mark.
        const fib = yield* (
          Effect.replicateEffect(rl(Clock.currentTimeMillis), 32).pipe(Effect.fork)
        )

        const timestamps = yield* (
          Effect.replicateEffect(
            Effect.zipRight(TestClock.adjust("1 seconds"), Clock.currentTimeMillis),
            60
          )
        )

        const times = yield* (Fiber.join(fib))

        assertTrue(timestamps.length === 60)
        assertTrue(times.length === 32)

        const resultTimes = [
          now,
          now,
          ...timestamps.slice(0, 14).flatMap((x) => [x, x]),
          ...timestamps.slice(59).flatMap((x) => [x, x])
        ]

        deepStrictEqual(times, resultTimes)
      }), 10_000)
  })

  describe.concurrent("token-bucket", () => {
    RateLimiterTestSuite("token-bucket")

    it.scoped("uses the token-bucket algorithm for token replenishment", () =>
      Effect.scoped(Effect.gen(function*() {
        // The limiter below should allow be to execute 10 requests immediately,
        // prevent further requests from being executed, and then after 100 ms
        // allow execution of another request.
        const limit = yield* (RateLimiter.make({
          limit: 10,
          interval: "1 seconds",
          algorithm: "token-bucket"
        }))
        const deferred = yield* (Deferred.make<void>())

        // Use up all of the available tokens
        yield* (Effect.forEach(Array.range(1, 10), () => limit(Effect.void)))

        // Make an additional request when there are no tokens available
        yield* pipe(
          limit(Effect.void),
          Effect.zipRight(Deferred.succeed(deferred, void 0)),
          Effect.fork
        )
        assertFalse(yield* (Deferred.isDone(deferred)))

        // Ensure that the request is successful once a token is replenished
        yield* (TestClock.adjust("100 millis"))
        yield* (Effect.yieldNow())

        assertTrue(yield* (Deferred.isDone(deferred)))
      })))
  })
})

const RateLimiterTestSuite = (algorithm: "fixed-window" | "token-bucket") => {
  it.scoped(`${algorithm} - execute up to max calls immediately`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const now = yield* (Clock.currentTimeMillis)
      const times = yield* (Effect.forEach(
        Array.range(1, 10),
        () => limit(Clock.currentTimeMillis)
      ))
      const result = Array.every(times, (time) => time === now)
      assertTrue(result)
    }))

  it.scoped(`${algorithm} - is not affected by stream chunk size`, () =>
    Effect.gen(function*() {
      const limiter = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const now = yield* (Clock.currentTimeMillis)
      const times1 = yield* (Effect.forEach(
        Array.range(1, 5),
        () => limiter(Clock.currentTimeMillis),
        { concurrency: "unbounded" }
      ))
      const fibers = yield* (Effect.forEach(
        Array.range(1, 15),
        () => Effect.fork(limiter(Clock.currentTimeMillis)),
        { concurrency: "unbounded" }
      ))
      yield* (TestClock.adjust("1 seconds"))
      const times2 = yield* (Effect.forEach(fibers, Fiber.join, { concurrency: "unbounded" }))
      const times = Array.appendAll(times1, times2)
      const result = Array.filter(times, (time) => time === now)
      strictEqual(result.length, 10)
    }))

  it.scoped(`${algorithm} - succeed with the result of the call`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const result = yield* (limit(Effect.succeed(3)))
      strictEqual(result, 3)
    }))

  it.scoped(`${algorithm} - fail with the result of a failed call`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const result = yield* (limit(Effect.either(Effect.fail(Option.none()))))
      assertLeft(result, Option.none())
    }))

  it.scoped(`${algorithm} - continue after a failed call`, () =>
    Effect.gen(function*() {
      const limit = yield* RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      })
      yield* limit(Effect.either(Effect.fail(Option.none())))
      yield* limit(Effect.succeed(3))
    }))

  it.scoped(`${algorithm} - holds back up calls after the max`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))

      const now = yield* (Clock.currentTimeMillis)

      const fiber = yield* pipe(
        Effect.replicateEffect(
          limit(Clock.currentTimeMillis),
          20
        ),
        Effect.fork
      )

      yield* (TestClock.adjust("1 seconds"))

      const times = yield* (Fiber.join(fiber))
      const later = yield* (Clock.currentTimeMillis)

      assertTrue(times.slice(0, 10).every((x) => x === now))
      assertTrue(times.slice(10).every((x) => x > now && x <= later))
    }))

  it.scoped(`${algorithm} - will interrupt the effect when a call is interrupted`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const latch = yield* (Deferred.make<void>())
      const interrupted = yield* (Deferred.make<void>())
      const fib = yield* pipe(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0)),
        limit,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fib))
      yield* (Deferred.await(interrupted))
    }))

  it.scoped(`${algorithm} - will not start execution of an effect when it is interrupted before getting its turn to execute`, () =>
    Effect.gen(function*() {
      const count = yield* (Ref.make(0))
      const limit = yield* (RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      yield* (limit(Effect.void))
      const fiber = yield* (Effect.fork(limit(Ref.set(count, 1))))
      const interruption = yield* (Effect.fork(Fiber.interrupt(fiber)))
      yield* (Fiber.join(interruption))
      strictEqual(yield* (Ref.get(count)), 0)
    }))

  it.scoped(`${algorithm} - will wait for interruption to complete of an effect that is already executing`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      const latch = yield* (Deferred.make<void>())
      const effectInterrupted = yield* (Ref.make(0))
      const fiber = yield* pipe(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Ref.set(effectInterrupted, 1)),
        limit,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const interruptions = yield* (Ref.get(effectInterrupted))
      strictEqual(interruptions, 1)
    }))

  it.scoped(`${algorithm} - will make effects wait for interrupted effects to pass through the rate limiter`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      yield* (limit(Effect.void))
      const fiber1 = yield* (Effect.fork(limit(Effect.void)))
      yield* (TestClock.adjust("1 seconds"))
      yield* (Fiber.interrupt(fiber1))
      const fiber2 = yield* (Effect.fork(limit(Clock.currentTimeMillis)))
      yield* (TestClock.adjust("1 seconds"))
      const lastExecutionTime = yield* (Fiber.join(fiber2))
      strictEqual(lastExecutionTime, 2000)
    }))

  it.scoped("will not include interrupted effects in the throttling", () =>
    Effect.gen(function*() {
      const rate = 10
      const limit = yield* (RateLimiter.make({ limit: rate, interval: "1 seconds", algorithm }))
      const latch = yield* (Deferred.make<void>())
      const latched = yield* (Ref.make(0))
      const wait = yield* (Deferred.make<void>())
      yield* pipe(
        Deferred.succeed(latch, void 0),
        Effect.whenEffect(latched.pipe(
          Ref.updateAndGet((x) => x + 1),
          Effect.map((x) => x === rate)
        )),
        Effect.zipRight(Deferred.await(wait)),
        limit,
        Effect.fork,
        Effect.replicateEffect(rate)
      )
      yield* (Deferred.await(latch))
      const fibers = yield* pipe(
        Effect.fork(limit(Effect.void)),
        Effect.replicateEffect(1000)
      )
      yield* (Fiber.interruptAll(fibers))
      const fiber = yield* (Effect.fork(limit(Effect.void)))
      yield* (TestClock.adjust("1 seconds"))
      yield* (Fiber.join(fiber))
    }), 10_000)

  it.scoped(`${algorithm} - will not drop tokens if interrupted`, () =>
    Effect.gen(function*() {
      const limit = yield* (RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))

      yield* (limit(Effect.void))
      const fiber = yield* pipe(limit(Effect.void), RateLimiter.withCost(10), Effect.fork)
      yield* (Effect.yieldNow())
      yield* (Fiber.interrupt(fiber))
      yield* pipe(limit(Effect.void), RateLimiter.withCost(9))
    }))
}
