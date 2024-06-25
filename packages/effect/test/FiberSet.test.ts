import { Array, Effect, Exit, pipe, Ref, Scope } from "effect"
import * as FiberSet from "effect/FiberSet"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("FiberSet", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* Ref.make(0)
      yield* pipe(
        Effect.gen(function*(_) {
          const set = yield* FiberSet.make()
          yield* pipe(
            Effect.onInterrupt(
              Effect.never,
              () => Ref.update(ref, (n) => n + 1)
            ).pipe(
              FiberSet.run(set)
            ),
            Effect.replicateEffect(10)
          )
          yield* Effect.yieldNow()
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* Ref.get(ref), 10)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* Ref.make(0)
      yield* pipe(
        Effect.gen(function*(_) {
          const set = yield* FiberSet.make()
          const run = yield* FiberSet.runtime(set)<never>()
          Array.range(1, 10).forEach(() =>
            run(
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              )
            )
          )
          yield* Effect.yieldNow()
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* Ref.get(ref), 10)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const set = yield* FiberSet.make()
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.void))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.fail("fail")))
      const result = yield* pipe(FiberSet.join(set), Effect.flip)
      assert.strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*(_) {
      const scope = yield* Scope.make()
      const set = yield* pipe(FiberSet.make(), Scope.extend(scope))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      FiberSet.unsafeAdd(set, Effect.runFork(Effect.never))
      assert.strictEqual(yield* FiberSet.size(set), 2)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(yield* FiberSet.size(set), 0)
    }))
})
