import { Array, Deferred, Effect, Exit, Fiber, Ref, Scope, TestClock } from "effect"
import * as FiberSet from "effect/FiberSet"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

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

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
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

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const set = yield* _(FiberSet.make())
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.fail("fail")))
      const result = yield* _(FiberSet.join(set), Effect.flip)
      assert.strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*(_) {
      const scope = yield* _(Scope.make())
      const set = yield* _(FiberSet.make(), Scope.extend(scope))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      assert.strictEqual(yield* _(FiberSet.size(set)), 2)
      yield* _(Scope.close(scope, Exit.void))
      assert.strictEqual(yield* _(FiberSet.size(set)), 0)
    }))

  it.scoped("propagateInterruption false", () =>
    Effect.gen(function*() {
      const set = yield* FiberSet.make()
      const fiber = yield* FiberSet.run(set, Effect.never, {
        propagateInterruption: false
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assert.isFalse(yield* Deferred.isDone(set.deferred))
    }))

  it.scoped("propagateInterruption true", () =>
    Effect.gen(function*() {
      const set = yield* FiberSet.make()
      const fiber = yield* FiberSet.run(set, Effect.never, {
        propagateInterruption: true
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assert.isTrue(Exit.isInterrupted(
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
})
