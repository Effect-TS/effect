import { Deferred, Effect, Exit, Fiber, FiberHandle, Ref } from "effect"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("FiberHandle", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const handle = yield* _(FiberHandle.make())
          yield* _(FiberHandle.run(handle, Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1))))
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      strictEqual(yield* _(Ref.get(ref)), 1)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const handle = yield* _(FiberHandle.make())
          const run = yield* _(FiberHandle.runtime(handle)<never>())
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)))
          yield* _(Effect.yieldNow())
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)))
          yield* _(Effect.yieldNow())
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)), {
            onlyIfMissing: true
          })
          yield* _(Effect.yieldNow())
          strictEqual(yield* _(Ref.get(ref)), 1)
        }),
        Effect.scoped
      )

      strictEqual(yield* _(Ref.get(ref)), 2)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const handle = yield* _(FiberHandle.make())
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.void))
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.fail("fail")))
      const result = yield* _(FiberHandle.join(handle), Effect.flip)
      strictEqual(result, "fail")
    }))

  it.scoped("onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const handle = yield* _(FiberHandle.make())
      const fiberA = yield* _(FiberHandle.run(handle, Effect.never))
      const fiberB = yield* _(FiberHandle.run(handle, Effect.never, { onlyIfMissing: true }))
      const fiberC = yield* _(FiberHandle.run(handle, Effect.never, { onlyIfMissing: true }))
      yield* _(Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* _(fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* _(fiberC.await)))
      strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("runtime onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const run = yield* _(FiberHandle.makeRuntime<never>())
      const fiberA = run(Effect.never)
      const fiberB = run(Effect.never, { onlyIfMissing: true })
      const fiberC = run(Effect.never, { onlyIfMissing: true })
      yield* _(Effect.yieldNow())
      assertTrue(Exit.isInterrupted(yield* _(fiberB.await)))
      assertTrue(Exit.isInterrupted(yield* _(fiberC.await)))
      strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("propagateInterruption: false", () =>
    Effect.gen(function*() {
      const handle = yield* FiberHandle.make()
      const fiber = yield* FiberHandle.run(handle, Effect.never, {
        propagateInterruption: false
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertFalse(yield* Deferred.isDone(handle.deferred))
    }))

  it.scoped("propagateInterruption: true", () =>
    Effect.gen(function*() {
      const handle = yield* FiberHandle.make()
      const fiber = yield* FiberHandle.run(handle, Effect.never, {
        propagateInterruption: true
      })
      yield* Effect.yieldNow()
      yield* Fiber.interrupt(fiber)
      assertTrue(Exit.isInterrupted(
        yield* FiberHandle.join(handle).pipe(
          Effect.exit
        )
      ))
    }))
})
