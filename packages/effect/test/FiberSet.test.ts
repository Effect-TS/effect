import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import { Array, Deferred, Effect, Exit, Fiber, FiberSet, pipe, Ref, Scope, TestClock } from "effect"

describe("FiberSet", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Effect.gen(function*() {
          const set = yield* (FiberSet.make())
          yield* pipe(
            Effect.onInterrupt(
              Effect.never,
              () => Ref.update(ref, (n) => n + 1)
            ).pipe(FiberSet.run(set)),
            Effect.replicateEffect(10)
          )
          yield* (Effect.yieldNow())
        }),
        Effect.scoped
      )

      strictEqual(yield* (Ref.get(ref)), 10)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Effect.gen(function*() {
          const set = yield* (FiberSet.make())
          const run = yield* (FiberSet.runtime(set)<never>())
          Array.range(1, 10).forEach(() =>
            run(
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              )
            )
          )
          yield* (Effect.yieldNow())
        }),
        Effect.scoped
      )

      strictEqual(yield* (Ref.get(ref)), 10)
    }))

  it.scoped("join", () =>
    Effect.gen(function*() {
      const set = yield* (FiberSet.make())
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.fail("fail")))
      const result = yield* pipe(FiberSet.join(set), Effect.flip)
      strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*() {
      const scope = yield* (Scope.make())
      const set = yield* pipe(FiberSet.make(), Scope.extend(scope))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      strictEqual(yield* (FiberSet.size(set)), 2)
      yield* (Scope.close(scope, Exit.void))
      strictEqual(yield* (FiberSet.size(set)), 0)
    }))

  it.scoped("propagateInterruption false", () =>
    Effect.gen(function*() {
      const set = yield* FiberSet.make()
      const fiber = yield* FiberSet.run(set, Effect.never, {
        propagateInterruption: false
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertFalse(yield* Deferred.isDone(set.deferred))
    }))

  it.scoped("propagateInterruption true", () =>
    Effect.gen(function*() {
      const set = yield* FiberSet.make()
      const fiber = yield* FiberSet.run(set, Effect.never, {
        propagateInterruption: true
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertTrue(Exit.isInterrupted(
        yield* FiberSet.join(set).pipe(
          Effect.exit
        )
      ))
    }))

  it.scoped("awaitEmpty", () =>
    Effect.gen(function*() {
      const set = yield* FiberSet.make()
      yield* FiberSet.run(set, Effect.sleep(1000))
      yield* FiberSet.run(set, Effect.sleep(1000))
      yield* FiberSet.run(set, Effect.sleep(1000))
      yield* FiberSet.run(set, Effect.sleep(1000))

      const fiber = yield* Effect.fork(FiberSet.awaitEmpty(set))
      yield* TestClock.adjust(500)
      assert.isNull(fiber.unsafePoll())
      yield* TestClock.adjust(500)
      assert.isDefined(fiber.unsafePoll())
    }))

  it.scoped("makeRuntimePromise", () =>
    Effect.gen(function*() {
      const run = yield* FiberSet.makeRuntimePromise()
      const result = yield* Effect.promise(() => run(Effect.succeed("done")))
      strictEqual(result, "done")
    }))
})
