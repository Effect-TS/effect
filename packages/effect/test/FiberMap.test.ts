import { Array, Effect, Exit, pipe, Ref, Scope } from "effect"
import * as FiberMap from "effect/FiberMap"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("FiberMap", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* Ref.make(0)
      yield* pipe(
        Effect.gen(function*(_) {
          const map = yield* FiberMap.make<number>()
          yield* pipe(
            Effect.forEach(Array.range(1, 10), (i) =>
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              ).pipe(
                FiberMap.run(map, i)
              ))
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
          const map = yield* FiberMap.make<number>()
          const run = yield* FiberMap.runtime(map)<never>()
          Array.range(1, 10).forEach((i) =>
            run(
              i,
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
      const map = yield* FiberMap.make<string>()
      FiberMap.unsafeSet(map, "a", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "b", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "c", Effect.runFork(Effect.fail("fail")))
      FiberMap.unsafeSet(map, "d", Effect.runFork(Effect.fail("ignored")))
      const result = yield* pipe(FiberMap.join(map), Effect.flip)
      assert.strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*(_) {
      const scope = yield* Scope.make()
      const set = yield* pipe(FiberMap.make<string>(), Scope.extend(scope))
      FiberMap.unsafeSet(set, "a", Effect.runFork(Effect.never))
      FiberMap.unsafeSet(set, "b", Effect.runFork(Effect.never))
      assert.strictEqual(yield* FiberMap.size(set), 2)
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(yield* FiberMap.size(set), 0)
    }))

  it.scoped("onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const handle = yield* FiberMap.make<string>()
      const fiberA = yield* FiberMap.run(handle, "a", Effect.never)
      const fiberB = yield* FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true })
      const fiberC = yield* FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true })
      yield* Effect.yieldNow()
      assert.isTrue(Exit.isInterrupted(yield* fiberB.await))
      assert.isTrue(Exit.isInterrupted(yield* fiberC.await))
      assert.strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("runtime onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const run = yield* FiberMap.makeRuntime<never, string>()
      const fiberA = run("a", Effect.never)
      const fiberB = run("a", Effect.never, { onlyIfMissing: true })
      const fiberC = run("a", Effect.never, { onlyIfMissing: true })
      yield* Effect.yieldNow()
      assert.isTrue(Exit.isInterrupted(yield* fiberB.await))
      assert.isTrue(Exit.isInterrupted(yield* fiberC.await))
      assert.strictEqual(fiberA.unsafePoll(), null)
    }))
})
