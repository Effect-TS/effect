import {
  Clock,
  Deferred,
  Effect,
  Either,
  Fiber,
  Function,
  Option,
  RateLimiter,
  ReadonlyArray,
  Ref,
  TestClock
} from "effect"
import * as it from "effect-test/utils/extend"
import { assert, describe } from "vitest"

describe("RateLimiter", () => {
  describe("fixed-window", () => {
    RateLimiterTestSuite("fixed-window")

    it.scoped("will use the provided cost", () =>
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make({
          limit: 100,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))

        const now = yield* _(Clock.currentTimeMillis)
        const fib = yield* _(
          Effect.forEach(Array.from(Array(20)), () => rl(Clock.currentTimeMillis).pipe(RateLimiter.withCost(10))).pipe(
            Effect.fork
          )
        )

        yield* _(TestClock.adjust("1 seconds"))
        const nowAfter1Second = yield* _(Clock.currentTimeMillis)

        const times = yield* _(Fiber.join(fib))
        assert(times.slice(0, 10).every((t) => t === now))
        assert(times.slice(10).every((t) => t === nowAfter1Second))
      }))

    it.scoped("will respect different costs per effect and interleave them.", () => {
      return Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make({
          limit: 10,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))
        const rl1 = Function.compose(rl, RateLimiter.withCost(7))
        const rl2 = Function.compose(rl, RateLimiter.withCost(3))

        const start = yield* _(Clock.currentTimeMillis)

        const tasks = [
          rl1(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl1", x] as const)),
          rl1(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl1", x] as const)),
          rl2(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl2", x] as const)),
          rl2(Clock.currentTimeMillis).pipe(Effect.map((x) => ["rl2", x] as const))
        ]

        const fib = yield* _(
          Effect.all(tasks, { concurrency: "unbounded" }).pipe(Effect.fork)
        )

        yield* _(TestClock.adjust("1 seconds"))
        const after1Second = yield* _(Clock.currentTimeMillis)

        const times = yield* _(Fiber.join(fib))

        assert.deepEqual(
          times,
          [
            ["rl1", start],
            ["rl1", after1Second],
            ["rl2", start],
            ["rl2", after1Second]
          ]
        )
      })
    })

    it.scoped("will be composable with other `RateLimiters`", () => {
      return Effect.gen(function*(_) {
        // Max 30 calls per minute
        const rl1 = yield* _(RateLimiter.make({
          limit: 30,
          interval: "1 minutes",
          algorithm: "fixed-window"
        }))
        // Max 2 calls per second
        const rl2 = yield* _(RateLimiter.make({
          limit: 2,
          interval: "1 seconds",
          algorithm: "fixed-window"
        }))
        // This rate limiter respects both the 30 calls per minute
        // and the 2 calls per second constraints.
        const rl = Function.compose(rl1, rl2)

        const now = yield* _(Clock.currentTimeMillis)

        // 32 calls should take 1 minute to complete based on the constraints
        // of the rate limiter defined above.
        // First 30 calls should trigger in the first 15 seconds
        // and the next 2 calls should trigger at the 1 minute mark.
        const fib = yield* _(
          Effect.forEach(Array.from(Array(32)), () => rl(Clock.currentTimeMillis)).pipe(Effect.fork)
        )

        const timestamps = yield* _(
          Effect.all(
            Array.from(Array(60)).map(() => Effect.zipRight(TestClock.adjust("1 seconds"), Clock.currentTimeMillis))
          )
        )

        const times = yield* _(Fiber.join(fib))

        assert(timestamps.length === 60)
        assert(times.length === 32)

        const resultTimes = [
          now,
          now,
          ...timestamps.slice(0, 14).flatMap((x) => [x, x]),
          ...timestamps.slice(59).flatMap((x) => [x, x])
        ]

        assert.deepEqual(times, resultTimes)
      })
    }, 10_000)
  })

  describe("token-bucket", () => {
    RateLimiterTestSuite("token-bucket")

    it.scoped("uses the token-bucket algorithm for token replenishment", () =>
      Effect.scoped(Effect.gen(function*(_) {
        // The limiter below should allow be to execute 10 requests immediately,
        // prevent further requests from being executed, and then after 100 ms
        // allow execution of another request.
        const limit = yield* _(RateLimiter.make({
          limit: 10,
          interval: "1 seconds",
          algorithm: "token-bucket"
        }))
        const deferred = yield* _(Deferred.make<void>())

        // Use up all of the available tokens
        yield* _(Effect.forEach(ReadonlyArray.range(1, 10), () => limit(Effect.unit)))

        // Make an additional request when there are no tokens available
        yield* _(
          limit(Effect.unit),
          Effect.zipRight(Deferred.succeed(deferred, void 0)),
          Effect.fork
        )
        assert.isFalse(yield* _(Deferred.isDone(deferred)))

        // Ensure that the request is successful once a token is replenished
        yield* _(TestClock.adjust("100 millis"))
        assert.isTrue(yield* _(Deferred.isDone(deferred)))
      })))
  })
})

const RateLimiterTestSuite = (algorithm: "fixed-window" | "token-bucket") => {
  it.scoped(`${algorithm} - execute up to max calls immediately`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const now = yield* _(Clock.currentTimeMillis)
      const times = yield* _(Effect.forEach(
        ReadonlyArray.range(1, 10),
        () => limit(Clock.currentTimeMillis)
      ))
      const result = ReadonlyArray.every(times, (time) => time === now)
      assert.isTrue(result)
    }))

  it.scoped(`${algorithm} - is not affected by stream chunk size`, () =>
    Effect.gen(function*(_) {
      const limiter = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const now = yield* _(Clock.currentTimeMillis)
      const times1 = yield* _(Effect.forEach(
        ReadonlyArray.range(1, 5),
        () => limiter(Clock.currentTimeMillis),
        { concurrency: "unbounded" }
      ))
      const fibers = yield* _(Effect.forEach(
        ReadonlyArray.range(1, 15),
        () => Effect.fork(limiter(Clock.currentTimeMillis)),
        { concurrency: "unbounded" }
      ))
      yield* _(TestClock.adjust("1 seconds"))
      const times2 = yield* _(Effect.forEach(fibers, Fiber.join, { concurrency: "unbounded" }))
      const times = ReadonlyArray.appendAll(times1, times2)
      const result = ReadonlyArray.filter(times, (time) => time === now)
      assert.strictEqual(result.length, 10)
    }))

  it.scoped(`${algorithm} - succeed with the result of the call`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const result = yield* _(limit(Effect.succeed(3)))
      assert.strictEqual(result, 3)
    }))

  it.scoped(`${algorithm} - fail with the result of a failed call`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const result = yield* _(limit(Effect.either(Effect.fail(Option.none()))))
      assert.deepStrictEqual(result, Either.left(Option.none()))
    }))

  it.scoped(`${algorithm} - continue after a failed call`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      yield* _(limit(Effect.either(Effect.fail(Option.none()))))
      yield* _(limit(Effect.succeed(3)))
    }))

  it.scoped(`${algorithm} - holds back up calls after the max`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))

      const now = yield* _(Clock.currentTimeMillis)

      const fiber = yield* _(
        Effect.forEach(Array.from(Array(20)), () => limit(Clock.currentTimeMillis), {
          concurrency: "unbounded"
        }),
        Effect.fork
      )

      yield* _(TestClock.adjust("1 seconds"))

      const times = yield* _(Fiber.join(fiber))
      const later = yield* _(Clock.currentTimeMillis)

      assert.isTrue(times.slice(0, 10).every((x) => x === now))
      assert.isTrue(times.slice(10).every((x) => x > now && x <= later))
    }))

  it.scoped(`${algorithm} - will interrupt the effect when a call is interrupted`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 10,
        interval: "1 seconds",
        algorithm
      }))
      const latch = yield* _(Deferred.make<void>())
      const interrupted = yield* _(Deferred.make<void>())
      const fib = yield* _(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0)),
        limit,
        Effect.fork
      )
      yield* _(Deferred.await(latch))
      yield* _(Fiber.interrupt(fib))
      yield* _(Deferred.await(interrupted))
    }))

  it.scoped(`${algorithm} - will not start execution of an effect when it is interrupted before getting its turn to execute`, () =>
    Effect.gen(function*(_) {
      const count = yield* _(Ref.make(0))
      const limit = yield* _(RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      yield* _(limit(Effect.unit))
      const fiber = yield* _(Effect.fork(limit(Ref.set(count, 1))))
      const interruption = yield* _(Effect.fork(Fiber.interrupt(fiber)))
      yield* _(Fiber.join(interruption))
      assert.strictEqual(yield* _(Ref.get(count)), 0)
    }))

  it.scoped(`${algorithm} - will wait for interruption to complete of an effect that is already executing`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      const latch = yield* _(Deferred.make<void>())
      const effectInterrupted = yield* _(Ref.make(0))
      const fiber = yield* _(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Ref.set(effectInterrupted, 1)),
        limit,
        Effect.fork
      )
      yield* _(Deferred.await(latch))
      yield* _(Fiber.interrupt(fiber))
      const interruptions = yield* _(Ref.get(effectInterrupted))
      assert.strictEqual(interruptions, 1)
    }))

  it.scoped(`${algorithm} - will make effects wait for interrupted effects to pass through the rate limiter`, () =>
    Effect.gen(function*(_) {
      const limit = yield* _(RateLimiter.make({
        limit: 1,
        interval: "1 seconds",
        algorithm
      }))
      yield* _(limit(Effect.unit))
      const fiber1 = yield* _(Effect.fork(limit(Effect.unit)))
      yield* _(TestClock.adjust("1 seconds"))
      yield* _(Fiber.interrupt(fiber1))
      const fiber2 = yield* _(Effect.fork(limit(Clock.currentTimeMillis)))
      yield* _(TestClock.adjust("1 seconds"))
      const lastExecutionTime = yield* _(Fiber.join(fiber2))
      assert(lastExecutionTime === 2000)
    }))

  it.scoped("will not include interrupted effects in the throttling", () =>
    Effect.gen(function*(_) {
      const rate = 10
      const limit = yield* _(RateLimiter.make({ limit: rate, interval: "1 seconds", algorithm }))
      const latch = yield* _(Deferred.make<void>())
      const latched = yield* _(Ref.make(0))
      const wait = yield* _(Deferred.make<void>())
      yield* _(
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
      yield* _(Deferred.await(latch))
      const fibers = yield* _(
        Effect.fork(limit(Effect.unit)),
        Effect.replicateEffect(1000)
      )
      yield* _(Fiber.interruptAll(fibers))
      const fiber = yield* _(Effect.fork(limit(Effect.unit)))
      yield* _(TestClock.adjust("1 seconds"))
      yield* _(Fiber.join(fiber))
    }), 10_000)
}
