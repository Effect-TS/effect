import { Clock, Deferred, Effect, Either, Fiber, pipe, ReadonlyArray, Ref, TestClock } from "effect"
import * as it from "effect-test/utils/extend"
import { none } from "effect/Option"
import * as RateLimiter from "effect/RateLimiter"
import { assert, describe } from "vitest"

describe("RateLimiterSpec", () => {
  it.effect("execute up to max calls immediately", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(10, 1000))
        const now = yield* _(Clock.currentTimeMillis)
        const times = yield* _(Effect.forEach(Array.from(Array(10)), () => rl(Clock.currentTimeMillis)))
        assert(times.every((t) => t === now))
      })
    )
  })

  it.effect("is not affected by stream chunk size", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
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
    )
  })

  it.effect("succeed with the result of the call", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(10, "1 seconds"))
        const result = yield* _(rl(Effect.succeed(3)))
        assert(result === 3)
      })
    )
  })

  it.effect("fail with the result of a failed call", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(10, "1 seconds"))
        const result = yield* _(rl(pipe(Effect.fail(none), Effect.either)))
        assert(Either.isLeft(result))
      })
    )
  })

  it.effect("continue after a failed call", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(10, "1 seconds"))
        yield* _(rl(pipe(Effect.fail(none), Effect.either)))
        yield* _(rl(Effect.succeed(3)))
      })
    )
  })

  it.effect("holds back up calls after the max", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
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
    )
  })

  it.effect("will interrupt the effect when a call is interrupted", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
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
    )
  })

  it.effect("will not start execution of an effect when it is interrupted before getting its turn to execute", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(1, "1 seconds"))
        const count = yield* _(Ref.make(0))
        yield* _(rl(Effect.unit))

        const fib = yield* _(rl(Ref.set(count, 1)).pipe(Effect.fork))
        const interruption = yield* _(Fiber.interrupt(fib).pipe(Effect.fork))

        yield* _(Fiber.join(interruption))
        const c = yield* _(Ref.get(count))

        assert(c === 0)
      })
    )
  })

  it.effect("will wait for interruption to complete of an effect that is already executing", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
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
    )
  })

  it.effect("will make effects wait for interrupted effects to pass through the rate limiter", () => {
    return Effect.scoped(
      Effect.gen(function*(_) {
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
    )
  })

  it.effect("will not include interrupted effects in the throttling", () => {
    const rate = 10

    return Effect.scoped(
      Effect.gen(function*(_) {
        const rl = yield* _(RateLimiter.make(rate, "1 seconds"))
        const latch = yield* _(Deferred.make<void>())
        const latched = yield* _(Ref.make(0))
        const continue_ = yield* _(Deferred.make<void>())

        yield* _(
          Deferred.succeed(latch, void 0),
          Effect.whenEffect(latched.pipe(
            Ref.updateAndGet((x) => x + 1),
            Effect.map((x) => x === rate)
          )),
          Effect.flatMap(() => Deferred.await(continue_)),
          rl,
          Effect.fork,
          Effect.replicateEffect(rate)
        )

        yield* _(Deferred.await(latch))

        const fibers = yield* _(Effect.replicateEffect(1000)(rl(Effect.unit).pipe(Effect.fork)))

        yield* _(Fiber.interruptAll(fibers))
        const f1 = yield* _(rl(Effect.unit).pipe(Effect.fork))

        yield* _(TestClock.adjust("1 seconds"))
        yield* _(Fiber.join(f1))
      })
    )
  }, { timeout: 10000 })

  it.effect("uses the token-bucket algorithm for token replenishment", () =>
    Effect.scoped(Effect.gen(function*(_) {
      // The limiter below should allow be to execute 10 requests immediately,
      // prevent further requests from being executed, and then after 100 ms
      // allow execution of another request.
      const limit = yield* _(RateLimiter.make(10, "1 seconds"))
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
