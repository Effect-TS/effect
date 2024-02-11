import { Clock, Deferred, Effect, Either, Fiber, pipe, Ref, TestClock } from "effect"
import * as it from "effect-test/utils/extend"
import { compose } from "effect/Function"
import { none } from "effect/Option"
import * as RateLimiter from "effect/RateLimiter"
import { assert, describe } from "vitest"

describe("RateLimiterSpec", () => {
  it.scoped("execute up to max calls immediately", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, 1000))
      const now = yield* _(Clock.currentTimeMillis)
      const times = yield* _(Effect.forEach(Array.from(Array(10)), () => rl(Clock.currentTimeMillis)))
      assert(times.every((t) => t === now))
    })
  })

  it.scoped("is not affected by stream chunk size", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const now = yield* _(Clock.currentTimeMillis)
      const times1 = yield* _(
        Effect.forEach(Array.from(Array(5)), () => rl(Clock.currentTimeMillis), { concurrency: "unbounded" })
      )

      const secondCallFib = yield* _(
        Effect.forEach(Array.from(Array(15)), () => Effect.fork(rl(Clock.currentTimeMillis)), {
          concurrency: "unbounded"
        })
      )

      yield* _(TestClock.adjust("1 seconds"))
      const times2 = yield* _(Effect.forEach(secondCallFib, Fiber.join, { concurrency: "unbounded" }))
      const times = times1.concat(times2)
      assert(times.filter((x) => x === now).length === 10)
    })
  })

  it.scoped("succeed with the result of the call", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const result = yield* _(rl(Effect.succeed(3)))
      assert(result === 3)
    })
  })

  it.scoped("fail with the result of a failed call", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const result = yield* _(rl(pipe(Effect.fail(none), Effect.either)))
      assert(Either.isLeft(result))
    })
  })

  it.scoped("continue after a failed call", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      yield* _(rl(pipe(Effect.fail(none), Effect.either)))
      yield* _(rl(Effect.succeed(3)))
    })
  })

  it.scoped("holds back up calls after the max", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const now = yield* _(Clock.currentTimeMillis)

      const fib = yield* _(
        pipe(
          Effect.forEach(Array.from(Array(20)), () => rl(Clock.currentTimeMillis), {
            concurrency: "unbounded"
          }),
          Effect.fork
        )
      )

      yield* _(TestClock.adjust("1 seconds"))

      const times = yield* _(Fiber.join(fib))
      const later = yield* _(Clock.currentTimeMillis)

      assert(times.slice(0, 10).every((x) => x === now))
      assert(times.slice(10).every((x) => x > now && x <= later))
    })
  })

  it.scoped("will interrupt the effect when a call is interrupted", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const latch = yield* _(Deferred.make<void>())
      const interrupted = yield* _(Deferred.make<void>())
      const fib = yield* _(pipe(
        Deferred.succeed(latch, void 0),
        Effect.flatMap(() => Effect.never),
        Effect.onInterrupt(() => Deferred.succeed(interrupted, void 0)),
        rl,
        Effect.fork
      ))

      yield* _(Deferred.await(latch))
      yield* _(Fiber.interrupt(fib))
      yield* _(Deferred.await(interrupted))
    })
  })

  it.scoped("will not start execution of an effect when it is interrupted before getting its turn to execute", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(1, "1 seconds"))
      const count = yield* _(Ref.make(0))
      yield* _(rl(Effect.unit))

      const fib = yield* _(rl(Ref.set(count, 1)).pipe(Effect.fork))
      const interruption = yield* _(Fiber.interrupt(fib).pipe(Effect.fork))

      yield* _(Fiber.join(interruption))
      const c = yield* _(Ref.get(count))

      assert(c === 0)
    })
  })

  it.scoped("will wait for interruption to complete of an effect that is already executing", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(1, "1 seconds"))
      const latch = yield* _(Deferred.make<void>())
      const effectInterrupted = yield* _(Ref.make(0))

      const fib = yield* _(pipe(
        Deferred.succeed(latch, void 0),
        Effect.flatMap(() => Effect.never),
        Effect.onInterrupt(() => Ref.set(effectInterrupted, 1)),
        rl,
        Effect.fork
      ))

      yield* _(Deferred.await(latch))
      yield* _(Fiber.interrupt(fib))

      const interruptions = yield* _(Ref.get(effectInterrupted))

      assert(interruptions === 1)
    })
  })

  it.scoped("will make effects wait for interrupted effects to pass through the rate limiter", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(1, "1 seconds"))

      yield* _(rl(Effect.unit))

      const f1 = yield* _(rl(Effect.unit).pipe(Effect.fork))
      yield* _(TestClock.adjust("1 seconds"))
      yield* _(Fiber.interrupt(f1))

      const fib = yield* _(pipe(
        Clock.currentTimeMillis,
        rl,
        Effect.fork
      ))

      yield* _(TestClock.adjust("1 seconds"))

      const lastExecutionTime = yield* _(Fiber.join(fib))

      assert(lastExecutionTime === 2000)
    })
  })

  it.scoped("will not include interrupted effects in the throttling", () => {
    const rate = 10

    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(rate, "1 seconds"))
      const latch = yield* _(Deferred.make<void>())
      const latched = yield* _(Ref.make(0))
      const continue_ = yield* _(Deferred.make<void>())

      yield* _(
        Effect.whenEffect(pipe(
          latched,
          Ref.updateAndGet((x) => x + 1),
          Effect.map((x) => x === rate)
        ))(Deferred.succeed(latch, void 0)).pipe(
          Effect.flatMap(() => Deferred.await(continue_)),
          rl,
          Effect.fork,
          Effect.replicateEffect(rate)
        )
      )

      yield* _(Deferred.await(latch))

      const fibers = yield* _(Effect.replicateEffect(1000)(rl(Effect.unit).pipe(Effect.fork)))

      yield* _(Fiber.interruptAll(fibers))
      const f1 = yield* _(rl(Effect.unit).pipe(Effect.fork))

      yield* _(TestClock.adjust("1 seconds"))
      yield* _(Fiber.join(f1))
    })
  }, 10_000)

  it.scoped("will use the provided cost", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(100, "1 seconds"))

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
    })
  })

  it.scoped("will respect different costs per effect and interleave them.", () => {
    return Effect.gen(function*(_) {
      const rl = yield* _(RateLimiter.make(10, "1 seconds"))
      const rl1 = compose(rl, RateLimiter.withCost(7))
      const rl2 = compose(rl, RateLimiter.withCost(3))

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
      const rl1 = yield* _(RateLimiter.make(30, "1 minutes"))
      // Max 2 calls per second
      const rl2 = yield* _(RateLimiter.make(2, "1 seconds"))
      // This rate limiter respects both the 30 calls per minute
      // and the 2 calls per second constraints.
      const rl = compose(rl1, rl2)

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
