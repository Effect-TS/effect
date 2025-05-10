import { describe, it } from "@effect/vitest"
import { assertFalse, assertLeft, assertRight, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import { adjust } from "effect/TestClock"
import { withLatch } from "../utils/latch.js"

export const ExampleError = new Error("Oh noes!")

const fib = (n: number): number => {
  if (n <= 1) {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}

const concurrentFib = (n: number): Effect.Effect<number> => {
  if (n <= 1) {
    return Effect.succeed(n)
  }
  return Effect.gen(function*() {
    const fiber1 = yield* (Effect.fork(concurrentFib(n - 1)))
    const fiber2 = yield* (Effect.fork(concurrentFib(n - 2)))
    const v1 = yield* (Fiber.join(fiber1))
    const v2 = yield* (Fiber.join(fiber2))
    return v1 + v2
  })
}

describe("Effect", () => {
  it.effect("shallow fork/join identity", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed(42), Effect.fork, Effect.flatMap(Fiber.join))
      strictEqual(result, 42)
    }))
  it.effect("deep fork/join identity", () =>
    Effect.gen(function*() {
      const result = yield* (concurrentFib(20))
      strictEqual(result, fib(20))
    }))
  it.effect("asyncEffect creation is interruptible", () =>
    Effect.gen(function*() {
      const release = yield* (Deferred.make<number>())
      const acquire = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Effect.asyncEffect<void, never, never, never, never, never>((_) =>
          // This will never complete because the callback is never invoked
          Effect.acquireUseRelease(
            Deferred.succeed(acquire, void 0),
            () => Effect.never,
            () => Effect.asVoid(Deferred.succeed(release, 42))
          )
        ),
        Effect.fork
      )
      yield* (Deferred.await(acquire))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Deferred.await(release))
      strictEqual(result, 42)
    }))
  it.effect("daemon fiber is unsupervised", () =>
    Effect.gen(function*() {
      const child = (ref: Ref.Ref<boolean>) => {
        return withLatch((release) =>
          pipe(
            release,
            Effect.zipRight(Effect.never),
            Effect.ensuring(Ref.set(ref, true))
          )
        )
      }
      const ref = yield* (Ref.make(false))
      const fiber1 = yield* pipe(child(ref), Effect.forkDaemon, Effect.fork)
      const fiber2 = yield* (Fiber.join(fiber1))
      const result = yield* (Ref.get(ref))
      yield* (Fiber.interrupt(fiber2))
      assertFalse(result)
    }))
  it.effect("daemon fiber race interruption", () =>
    Effect.gen(function*() {
      const plus1 = <X>(latch: Deferred.Deferred<void, never>, finalizer: Effect.Effect<X>) => {
        return pipe(
          Deferred.succeed(latch, void 0),
          Effect.zipRight(Effect.sleep(Duration.hours(1))),
          Effect.onInterrupt(() => pipe(finalizer, Effect.map((x) => x)))
        )
      }
      const interruptionRef = yield* (Ref.make(0))
      const latch1Start = yield* (Deferred.make<void>())
      const latch2Start = yield* (Deferred.make<void>())
      const inc = Ref.updateAndGet(interruptionRef, (n) => n + 1)
      const left = plus1(latch1Start, inc)
      const right = plus1(latch2Start, inc)
      const fiber = yield* pipe(left, Effect.race(right), Effect.fork)
      yield* (
        pipe(
          Deferred.await(latch1Start),
          Effect.zipRight(Deferred.await(latch2Start)),
          Effect.zipRight(Fiber.interrupt(fiber))
        )
      )
      const result = yield* (Ref.get(interruptionRef))
      strictEqual(result, 2)
    }))
  it.effect("race in daemon is executed", () =>
    Effect.gen(function*() {
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const loser1 = Effect.acquireUseRelease(
        Deferred.succeed(latch1, void 0),
        () => Effect.never,
        () => Deferred.succeed(deferred1, void 0)
      )
      const loser2 = Effect.acquireUseRelease(
        Deferred.succeed(latch2, void 0),
        () => Effect.never,
        () => Deferred.succeed(deferred2, void 0)
      )
      const fiber = yield* pipe(loser1, Effect.race(loser2), Effect.forkDaemon)
      yield* (Deferred.await(latch1))
      yield* (Deferred.await(latch2))
      yield* (Fiber.interrupt(fiber))
      const res1 = yield* (Deferred.await(deferred1))
      const res2 = yield* (Deferred.await(deferred2))
      strictEqual(res1, undefined)
      strictEqual(res2, undefined)
    }))
  it.live("supervise fibers", () =>
    Effect.gen(function*() {
      const makeChild = (n: number): Effect.Effect<Fiber.Fiber<void>> => {
        return pipe(Effect.sleep(Duration.millis(20 * n)), Effect.zipRight(Effect.never), Effect.fork)
      }
      const ref = yield* (Ref.make(0))
      yield* pipe(
        makeChild(1),
        Effect.zipRight(makeChild(2)),
        Effect.ensuringChildren((fs) =>
          Array.from(fs).reduce(
            (acc, fiber) =>
              pipe(
                acc,
                Effect.zipRight(Fiber.interrupt(fiber)),
                Effect.zipRight(Ref.update(ref, (n) => n + 1))
              ),
            Effect.void
          )
        )
      )
      const result = yield* (Ref.get(ref))
      strictEqual(result, 2)
    }))
  it.effect("race of fail with success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail(42), Effect.race(Effect.succeed(24)), Effect.either)
      assertRight(result, 24)
    }))
  it.effect("race of terminate with success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.dieSync(() => new Error()), Effect.race(Effect.succeed(24)))
      strictEqual(result, 24)
    }))
  it.effect("race of fail with fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail(42), Effect.race(Effect.fail(24)), Effect.either)
      assertLeft(result, 42)
    }))
  it.effect("race of value and never", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed(42), Effect.race(Effect.never))
      strictEqual(result, 42)
    }))
  it.effect("race in uninterruptible region", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<boolean>())
      const fiber = yield* pipe(
        Effect.void,
        Effect.race(Effect.zip(Deferred.succeed(latch, true), Effect.sleep("45 seconds"))),
        Effect.uninterruptible,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (adjust("30 seconds"))
      strictEqual(fiber.unsafePoll(), null)
      yield* (adjust("60 seconds"))
      assertTrue(fiber.unsafePoll() !== null)
    }), 20_000)
  it.effect("race of two forks does not interrupt winner", () =>
    Effect.gen(function*() {
      const forkWaiter = (
        interrupted: Ref.Ref<number>,
        latch: Deferred.Deferred<void, never>,
        done: Deferred.Deferred<void, never>
      ) => {
        return Effect.uninterruptibleMask((restore) =>
          pipe(
            restore(Deferred.await(latch)),
            Effect.onInterrupt(() =>
              pipe(Ref.update(interrupted, (_) => _ + 1), Effect.zipRight(Deferred.succeed(done, void 0)))
            ),
            Effect.fork
          )
        )
      }
      const interrupted = yield* (Ref.make(0))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const done1 = yield* (Deferred.make<void>())
      const done2 = yield* (Deferred.make<void>())
      const forkWaiter1 = forkWaiter(interrupted, latch1, done1)
      const forkWaiter2 = forkWaiter(interrupted, latch2, done2)
      yield* pipe(forkWaiter1, Effect.race(forkWaiter2))
      const count = yield* (
        pipe(
          Deferred.succeed(latch1, void 0),
          Effect.zipRight(Deferred.await(done1)),
          Effect.zipRight(Deferred.await(done2)),
          Effect.zipRight(Ref.get(interrupted))
        )
      )
      strictEqual(count, 2)
    }))
  it.effect("firstSuccessOf of values", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.firstSuccessOf([
          Effect.fail(0),
          Effect.succeed(100)
        ]),
        Effect.either
      )
      assertRight(result, 100)
    }))
  it.live("firstSuccessOf of failures", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.firstSuccessOf([
          pipe(Effect.fail(0), Effect.delay(Duration.millis(10))),
          Effect.fail(101)
        ]),
        Effect.either
      )

      assertLeft(result, 101)
    }))
  it.live("firstSuccessOf of failures & 1 success", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.firstSuccessOf([
          Effect.fail(0),
          pipe(Effect.succeed(102), Effect.delay(Duration.millis(1)))
        ]),
        Effect.either
      )
      assertRight(result, 102)
    }))
  it.effect("raceFirst interrupts loser on success", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const effect = yield* (Deferred.make<number>())
      const winner = Either.right(void 0)
      const loser = Effect.acquireUseRelease(
        Deferred.succeed(deferred, void 0),
        () => Effect.never,
        () => Deferred.succeed(effect, 42)
      )
      yield* pipe(winner, Effect.raceFirst(loser))
      const result = yield* (Deferred.await(effect))
      strictEqual(result, 42)
    }))
  it.effect("raceFirst interrupts loser on failure", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const effect = yield* (Deferred.make<number>())
      const winner = pipe(Deferred.await(deferred), Effect.zipRight(Either.left(new Error())))
      const loser = Effect.acquireUseRelease(
        Deferred.succeed(deferred, void 0),
        () => Effect.never,
        () => Deferred.succeed(effect, 42)
      )
      yield* pipe(winner, Effect.raceFirst(loser), Effect.either)
      const result = yield* (Deferred.await(effect))
      strictEqual(result, 42)
    }))
  it.effect("mergeAll", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(["a", "aa", "aaa", "aaaa"].map((a) => Effect.succeed(a)), Effect.mergeAll(0, (b, a) => b + a.length))
      )
      strictEqual(result, 10)
    }))
  it.effect("mergeAll - empty", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe([] as ReadonlyArray<Effect.Effect<number>>, Effect.mergeAll(0, (b, a) => b + a))
      )
      strictEqual(result, 0)
    }))
  it.effect("reduceEffect", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe([2, 3, 4].map((n) => Effect.succeed(n)), Effect.reduceEffect(Effect.succeed(1), (acc, a) => acc + a))
      )
      strictEqual(result, 10)
    }))
  it.effect("reduceEffect - empty list", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          [] as ReadonlyArray<Effect.Effect<number>>,
          Effect.reduceEffect(Effect.succeed(1), (acc, a) => acc + a)
        )
      )
      strictEqual(result, 1)
    }))
  it.effect("timeout of failure", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.fail("uh oh"), Effect.timeout(Duration.hours(1)), Effect.exit)
      deepStrictEqual(result, Exit.fail("uh oh"))
    }))
  it.effect("timeout of terminate", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.die(ExampleError), Effect.timeout(Duration.hours(1)), Effect.exit)
      deepStrictEqual(result, Exit.die(ExampleError))
    }))
})
