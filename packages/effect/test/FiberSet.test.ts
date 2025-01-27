import { Array, Deferred, Effect, Exit, Fiber, FiberSet, Ref, Scope } from "effect"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("FiberSet", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const set = yield* _(FiberSet.make())
          yield* _(
            Effect.onInterrupt(
              Effect.never,
              () => Ref.update(ref, (n) => n + 1)
            ).pipe(FiberSet.run(set)),
            Effect.replicateEffect(10)
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const set = yield* _(FiberSet.make())
          const run = yield* _(FiberSet.runtime(set)<never>())
          Array.range(1, 10).forEach(() =>
            run(
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              )
            )
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const set = yield* _(FiberSet.make())
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.fail("fail")))
      const result = yield* _(FiberSet.join(set), Effect.flip)
      strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*(_) {
      const scope = yield* _(Scope.make())
      const set = yield* _(FiberSet.make(), Scope.extend(scope))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      strictEqual(yield* _(FiberSet.size(set)), 2)
      yield* _(Scope.close(scope, Exit.void))
      strictEqual(yield* _(FiberSet.size(set)), 0)
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
