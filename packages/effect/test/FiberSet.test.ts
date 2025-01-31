import { Array, Deferred, Effect, Exit, Fiber, FiberSet, pipe, Ref, Scope } from "effect"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

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
})
