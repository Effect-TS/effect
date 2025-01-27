import { Array, Deferred, Effect, Exit, Fiber, Ref, Scope } from "effect"
import * as FiberMap from "effect/FiberMap"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("FiberMap", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const map = yield* _(FiberMap.make<number>())
          yield* _(
            Effect.forEach(Array.range(1, 10), (i) =>
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              ).pipe(
                FiberMap.run(map, i)
              ))
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
          const map = yield* _(FiberMap.make<number>())
          const run = yield* _(FiberMap.runtime(map)<never>())
          Array.range(1, 10).forEach((i) =>
            run(
              i,
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
      const map = yield* _(FiberMap.make<string>())
      FiberMap.unsafeSet(map, "a", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "b", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "c", Effect.runFork(Effect.fail("fail")))
      FiberMap.unsafeSet(map, "d", Effect.runFork(Effect.fail("ignored")))
      const result = yield* _(FiberMap.join(map), Effect.flip)
      strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*(_) {
      const scope = yield* _(Scope.make())
      const set = yield* _(FiberMap.make<string>(), Scope.extend(scope))
      FiberMap.unsafeSet(set, "a", Effect.runFork(Effect.never))
      FiberMap.unsafeSet(set, "b", Effect.runFork(Effect.never))
      strictEqual(yield* _(FiberMap.size(set)), 2)
      yield* _(Scope.close(scope, Exit.void))
      strictEqual(yield* _(FiberMap.size(set)), 0)
    }))

  it.scoped("onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const handle = yield* _(FiberMap.make<string>())
      const fiberA = yield* _(FiberMap.run(handle, "a", Effect.never))
      const fiberB = yield* _(FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true }))
      const fiberC = yield* _(FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true }))
      yield* _(Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* _(fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* _(fiberC.await)))
      strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("runtime onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const run = yield* _(FiberMap.makeRuntime<never, string>())
      const fiberA = run("a", Effect.never)
      const fiberB = run("a", Effect.never, { onlyIfMissing: true })
      const fiberC = run("a", Effect.never, { onlyIfMissing: true })
      yield* _(Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* _(fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* _(fiberC.await)))
      strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("propagateInterruption false", () =>
    Effect.gen(function*() {
      const map = yield* FiberMap.make<string>()
      const fiber = yield* FiberMap.run(map, "a", Effect.never, {
        propagateInterruption: false
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertFalse(yield* Deferred.isDone(map.deferred))
    }))

  it.scoped("propagateInterruption true", () =>
    Effect.gen(function*() {
      const map = yield* FiberMap.make<string>()
      const fiber = yield* FiberMap.run(map, "a", Effect.never, {
        propagateInterruption: true
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertTrue(Exit.isInterrupted(
        yield* FiberMap.join(map).pipe(
          Effect.exit
        )
      ))
    }))
})
