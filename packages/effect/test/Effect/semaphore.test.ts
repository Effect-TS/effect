import { assert, describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as D from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FiberId from "effect/FiberId"
import * as Option from "effect/Option"
import * as Scheduler from "effect/Scheduler"
import * as TestClock from "effect/TestClock"

describe("Effect", () => {
  it.effect("semaphore works", () =>
    Effect.gen(function*() {
      const sem = yield* Effect.makeSemaphore(4)
      const messages: Array<string> = []
      yield* Effect.fork(Effect.all(
        [0, 1, 2, 3].map((n) =>
          sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
        ),
        { concurrency: "unbounded", discard: true }
      ))
      yield* (TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 2)
      yield* (TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 4)
      yield* (
        Effect.fork(Effect.all(
          [0, 1, 2, 3].map((n) =>
            sem.withPermits(2)(Effect.delay(D.seconds(2))(Effect.sync(() => messages.push(`process: ${n}`))))
          ),
          { concurrency: "unbounded", discard: true }
        ))
      )
      yield* (TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 6)
      yield* (TestClock.adjust(D.seconds(3)))
      strictEqual(messages.length, 8)
    }))

  it.effect("releaseAll", () =>
    Effect.gen(function*() {
      const sem = yield* Effect.makeSemaphore(4)
      yield* sem.take(4)
      yield* sem.releaseAll
      yield* sem.take(1)
    }))

  it.effect("resize", () =>
    Effect.gen(function*() {
      const sem = yield* Effect.makeSemaphore(4)
      yield* sem.take(4)
      yield* sem.resize(2)
      const fiber = yield* Effect.fork(sem.take(1))
      yield* TestClock.adjust(1)
      assert.isNull(fiber.unsafePoll())
      yield* sem.release(2)
      yield* TestClock.adjust(1)
      assert.isNull(fiber.unsafePoll())
      yield* sem.release(1)
      yield* TestClock.adjust(1)
      assert.isTrue(fiber.unsafePoll() !== null)
    }))

  it.effect("take interruption does not leak permits", () =>
    Effect.gen(function*() {
      const scheduler = new Scheduler.ControlledScheduler()
      const sem = yield* Effect.makeSemaphore(0)
      const waiter = yield* sem.take(1).pipe(
        Effect.withScheduler(scheduler),
        Effect.fork
      )

      yield* Effect.yieldNow()
      yield* sem.release(1).pipe(Effect.withScheduler(scheduler))
      assert.isNull(waiter.unsafePoll())

      scheduler.step()
      assert.isNull(waiter.unsafePoll())

      waiter.unsafeInterruptAsFork(FiberId.none)
      scheduler.step()

      const result = yield* sem.withPermitsIfAvailable(1)(Effect.void)
      assert.isTrue(Option.isSome(result))
    }))
})
