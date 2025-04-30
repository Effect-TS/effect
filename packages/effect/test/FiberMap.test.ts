import { assert, describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import { Array, Deferred, Effect, Exit, Fiber, FiberMap, pipe, Ref, Scope, TestClock } from "effect"

describe("FiberMap", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      yield* pipe(
        Effect.gen(function*() {
          const map = yield* (FiberMap.make<number>())
          yield* (
            Effect.forEach(Array.range(1, 10), (i) =>
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              ).pipe(
                FiberMap.run(map, i)
              ))
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
          const map = yield* (FiberMap.make<number>())
          const run = yield* (FiberMap.runtime(map)<never>())
          Array.range(1, 10).forEach((i) =>
            run(
              i,
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
      const map = yield* (FiberMap.make<string>())
      FiberMap.unsafeSet(map, "a", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "b", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "c", Effect.runFork(Effect.fail("fail")))
      FiberMap.unsafeSet(map, "d", Effect.runFork(Effect.fail("ignored")))
      const result = yield* pipe(FiberMap.join(map), Effect.flip)
      strictEqual(result, "fail")
    }))

  it.effect("size", () =>
    Effect.gen(function*() {
      const scope = yield* (Scope.make())
      const set = yield* pipe(FiberMap.make<string>(), Scope.extend(scope))
      FiberMap.unsafeSet(set, "a", Effect.runFork(Effect.never))
      FiberMap.unsafeSet(set, "b", Effect.runFork(Effect.never))
      strictEqual(yield* (FiberMap.size(set)), 2)
      yield* (Scope.close(scope, Exit.void))
      strictEqual(yield* (FiberMap.size(set)), 0)
    }))

  it.scoped("onlyIfMissing", () =>
    Effect.gen(function*() {
      const handle = yield* (FiberMap.make<string>())
      const fiberA = yield* (FiberMap.run(handle, "a", Effect.never))
      const fiberB = yield* (FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true }))
      const fiberC = yield* (FiberMap.run(handle, "a", Effect.never, { onlyIfMissing: true }))
      yield* (Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* (fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* (fiberC.await)))
      strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("runtime onlyIfMissing", () =>
    Effect.gen(function*() {
      const run = yield* (FiberMap.makeRuntime<never, string>())
      const fiberA = run("a", Effect.never)
      const fiberB = run("a", Effect.never, { onlyIfMissing: true })
      const fiberC = run("a", Effect.never, { onlyIfMissing: true })
      yield* (Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* (fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* (fiberC.await)))
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

  it.scoped("awaitEmpty", () =>
    Effect.gen(function*() {
      const map = yield* FiberMap.make<string>()
      yield* FiberMap.run(map, "a", Effect.sleep(1000))
      yield* FiberMap.run(map, "b", Effect.sleep(1000))
      yield* FiberMap.run(map, "c", Effect.sleep(1000))
      yield* FiberMap.run(map, "d", Effect.sleep(1000))

      const fiber = yield* Effect.fork(FiberMap.awaitEmpty(map))
      yield* TestClock.adjust(500)
      assert.isNull(fiber.unsafePoll())
      yield* TestClock.adjust(500)
      assert.isDefined(fiber.unsafePoll())
    }))

  it.scoped("makeRuntimePromise", () =>
    Effect.gen(function*() {
      const run = yield* FiberMap.makeRuntimePromise<never, string>()
      const result = yield* Effect.promise(() => run("a", Effect.succeed("done")))
      strictEqual(result, "done")
    }))
})
