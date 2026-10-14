import { assert, describe, it } from "@effect/vitest"
import * as Clock from "effect/Clock"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Logger from "effect/Logger"
import * as TestClock from "effect/testing/TestClock"

describe("TestClock", () => {
  it.effect("sleep - does not require passage of wall time", () =>
    Effect.gen(function*() {
      let elapsed = false
      yield* Effect.sync(() => {
        elapsed = true
      }).pipe(Effect.delay("10 hours"), Effect.forkChild)
      yield* TestClock.adjust("11 hours")
      assert.isTrue(elapsed)
    }))

  it.effect("sleep - delays effects until time is adjusted", () =>
    Effect.gen(function*() {
      let elapsed = false
      const fiber = yield* Effect.sync(() => {
        elapsed = true
      }).pipe(Effect.delay("10 hours"), Effect.forkChild)
      yield* TestClock.adjust("9 hours")
      assert.isUndefined(fiber.pollUnsafe())
      yield* TestClock.adjust("11 hours")
      assert.deepStrictEqual(fiber.pollUnsafe(), Exit.void)
      assert.isTrue(elapsed)
    }))

  it.effect("sleep - handles multiple sleeps", () =>
    Effect.gen(function*() {
      let message = ""
      yield* Effect.sync(() => {
        message += "World!"
      }).pipe(Effect.delay("3 hours"), Effect.forkScoped)
      yield* Effect.sync(() => {
        message += "Hello, "
      }).pipe(Effect.delay("1 hour"), Effect.forkScoped)
      yield* TestClock.adjust("1 hour")
      assert.strictEqual(message, "Hello, ")
      yield* TestClock.adjust("4 hours")
      assert.strictEqual(message, "Hello, World!")
    }))

  it.effect("setTime - sleep correctly handles new set time", () =>
    Effect.gen(function*() {
      let elapsed = false
      yield* Effect.sync(() => {
        elapsed = true
      }).pipe(Effect.delay("10 hours"), Effect.forkChild)
      assert.isFalse(elapsed)
      yield* TestClock.setTime(Duration.toMillis(Duration.hours(11)))
      assert.isTrue(elapsed)
    }))

  it.effect("setTime - floors nanoseconds for fractional millisecond instants", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      yield* testClock.setTime(199023438.0000004)
      assert.strictEqual(testClock.currentTimeNanosUnsafe(), 199023438000000n)
    }))

  it.effect("setTime - preserves wall-clock nanoseconds for large timestamps", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      const timestamp = 1_000_000_000_001
      yield* testClock.setTime(timestamp)
      assert.strictEqual(testClock.currentTimeNanosUnsafe(), BigInt(timestamp) * 1_000_000n)
    }))

  it.effect("adjust - advances wall and monotonic time", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      yield* testClock.adjust("1 second")
      assert.strictEqual(testClock.currentTimeMillisUnsafe(), 1_000)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), 1_000_000_000n)
      assert.strictEqual(yield* testClock.monotonicTimeNanos, 1_000_000_000n)
    }))

  it.effect("adjust - preserves precision for nanosecond durations beyond Number.MAX_SAFE_INTEGER", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      const nanos = 999_999_999_999_999_000n
      yield* testClock.adjust(Duration.nanos(nanos))
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), nanos)
      assert.strictEqual(testClock.currentTimeNanosUnsafe(), nanos)
    }))

  it.effect("adjust - keeps nanosecond access total after infinite durations", () =>
    Effect.gen(function*() {
      for (const duration of [Duration.infinity, Duration.negativeInfinity]) {
        const testClock = yield* TestClock.make()
        yield* testClock.adjust(duration)
        assert.strictEqual(typeof (yield* testClock.currentTimeNanos), "bigint")
      }
    }))

  it.effect("setTime - advances monotonic time only when moving forward", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      yield* testClock.setTime(2_000)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), 2_000_000_000n)
      yield* testClock.setTime(500)
      assert.strictEqual(testClock.currentTimeMillisUnsafe(), 500)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), 2_000_000_000n)
      yield* testClock.setTime(1_000)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), 2_500_000_000n)
    }))

  it.effect("setTime - preserves nanosecond precision for far-future timestamps", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      const farFuture = 1_000_000_000_000
      yield* testClock.setTime(farFuture)
      const before = testClock.monotonicTimeNanosUnsafe()
      yield* testClock.setTime(farFuture + 1)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe() - before, 1_000_000n)
    }))

  it.effect("adjust - advances monotonic time to intermediate sleep deadlines", () =>
    Effect.gen(function*() {
      const testClock = yield* TestClock.make()
      let observed = 0n
      yield* Effect.gen(function*() {
        yield* testClock.sleep(Duration.seconds(1))
        observed = yield* testClock.monotonicTimeNanos
      }).pipe(Effect.forkChild)
      yield* testClock.adjust("2 seconds")
      assert.strictEqual(observed, 1_000_000_000n)
      assert.strictEqual(testClock.monotonicTimeNanosUnsafe(), 2_000_000_000n)
    }))

  describe("sleeps registered after multiple scheduler hops", () => {
    const afterTicks = [
      Effect.yieldNow,
      Effect.forkChild(Effect.void).pipe(Effect.flatMap(Fiber.join))
    ]
    const countTicks = (advance: Effect.Effect<void>) =>
      Effect.forEach(afterTicks, (afterTick) =>
        Effect.gen(function*() {
          let ticks = 0
          const fiber = yield* Effect.sleep("1 second").pipe(
            Effect.andThen(Effect.sync(() => {
              ticks++
            })),
            Effect.andThen(afterTick),
            Effect.forever,
            Effect.forkChild
          )
          yield* advance
          yield* Fiber.interrupt(fiber)
          return ticks
        }).pipe(Effect.provide(TestClock.layer())))

    it.effect("adjust - runs every sleep due by the target time", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* countTicks(TestClock.adjust("5 seconds")), [5, 5])
      }))

    it.effect("setTime - runs every sleep due by the target time", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(yield* countTicks(TestClock.setTime(5_000)), [5, 5])
      }))

    it.effect("adjust - runs sleeps in order across fibers", () =>
      Effect.gen(function*() {
        const log: Array<string> = []
        const record = (label: string) =>
          Effect.flatMap(Clock.currentTimeMillis, (now) => Effect.sync(() => log.push(`${label}@${now}`)))
        yield* Effect.sleep("1 second").pipe(
          Effect.andThen(record("a")),
          Effect.andThen(Effect.forkChild(Effect.yieldNow).pipe(Effect.flatMap(Fiber.join))),
          Effect.andThen(Effect.sleep("1 second")),
          Effect.andThen(record("a")),
          Effect.forkChild
        )
        yield* Effect.sleep("1500 millis").pipe(Effect.andThen(record("b")), Effect.forkChild)
        yield* TestClock.adjust("5 seconds")
        assert.deepStrictEqual(log, ["a@1000", "b@1500", "a@2000"])
      }))

    const busyFiberFallback = () =>
      Effect.gen(function*() {
        const warnings: Array<unknown> = []
        const logger = Logger.make((options) => {
          if (options.logLevel === "Warn") warnings.push(options.message)
        })
        let later = false
        yield* Effect.gen(function*() {
          yield* Effect.sleep("1 second").pipe(Effect.andThen(Effect.forever(Effect.yieldNow)), Effect.forkChild)
          yield* Effect.sleep("2 seconds").pipe(
            Effect.andThen(Effect.sync(() => {
              later = true
            })),
            Effect.forkChild
          )
          yield* TestClock.adjust("5 seconds")
          assert.strictEqual(yield* Clock.currentTimeMillis, 5_000)
        }).pipe(
          Effect.provide(TestClock.layer({ warningDelay: "10 millis" })),
          Effect.provide(Logger.layer([logger]))
        )
        assert.isTrue(later)
        assert.match(String(warnings), /fiber woken by the test clock is still running/)
      })

    it.live("adjust - warns and keeps advancing when a woken fiber never suspends", busyFiberFallback)

    it.effect("adjust - warns and keeps advancing when nested in another TestClock", busyFiberFallback)

    it.effect("adjust - runs every sleep after an interrupted adjustment", () =>
      Effect.gen(function*() {
        const woken = yield* Deferred.make<void>()
        yield* Effect.sleep("1 second").pipe(
          Effect.andThen(Deferred.succeed(woken, undefined)),
          Effect.andThen(Effect.forever(Effect.yieldNow)),
          Effect.forkChild
        )
        const adjustment = yield* Effect.forkChild(TestClock.adjust("5 seconds"))
        yield* Deferred.await(woken)
        yield* Fiber.interrupt(adjustment)
        let ticks = 0
        yield* Effect.sleep("1 second").pipe(
          Effect.andThen(Effect.sync(() => {
            ticks++
          })),
          Effect.andThen(Effect.yieldNow),
          Effect.forever,
          Effect.forkChild
        )
        yield* TestClock.adjust("3 seconds")
        assert.strictEqual(ticks, 3)
      }))
  })

  // `it.effect` and `it.live` provide an ambient Scope, defeating the #2244 regression guard.
  it("layer - can adjust when provided without an ambient Scope", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust("1 second")
    }).pipe(
      Effect.provide(TestClock.layer({})),
      Effect.runPromise
    ))
})
