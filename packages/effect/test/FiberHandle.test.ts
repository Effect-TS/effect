import { Effect, Exit, pipe, Ref } from "effect"
import * as FiberHandle from "effect/FiberHandle"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("FiberHandle", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* Ref.make(0)
      yield* pipe(
        Effect.gen(function*(_) {
          const handle = yield* FiberHandle.make()
          yield* FiberHandle.run(handle, Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)))
          yield* Effect.yieldNow()
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* Ref.get(ref), 1)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* Ref.make(0)
      yield* pipe(
        Effect.gen(function*(_) {
          const handle = yield* FiberHandle.make()
          const run = yield* FiberHandle.runtime(handle)<never>()
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)))
          yield* Effect.yieldNow()
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)))
          yield* Effect.yieldNow()
          run(Effect.onInterrupt(Effect.never, () => Ref.update(ref, (n) => n + 1)), {
            onlyIfMissing: true
          })
          yield* Effect.yieldNow()
          assert.strictEqual(yield* Ref.get(ref), 1)
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* Ref.get(ref), 2)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const handle = yield* FiberHandle.make()
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.void))
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.fail("fail")))
      const result = yield* pipe(FiberHandle.join(handle), Effect.flip)
      assert.strictEqual(result, "fail")
    }))

  it.scoped("onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const handle = yield* FiberHandle.make()
      const fiberA = yield* FiberHandle.run(handle, Effect.never)
      const fiberB = yield* FiberHandle.run(handle, Effect.never, { onlyIfMissing: true })
      const fiberC = yield* FiberHandle.run(handle, Effect.never, { onlyIfMissing: true })
      yield* Effect.yieldNow()
      assert.isTrue(Exit.isInterrupted(yield* fiberB.await))
      assert.isTrue(Exit.isInterrupted(yield* fiberC.await))
      assert.strictEqual(fiberA.unsafePoll(), null)
    }))

  it.scoped("runtime onlyIfMissing", () =>
    Effect.gen(function*(_) {
      const run = yield* FiberHandle.makeRuntime<never>()
      const fiberA = run(Effect.never)
      const fiberB = run(Effect.never, { onlyIfMissing: true })
      const fiberC = run(Effect.never, { onlyIfMissing: true })
      yield* Effect.yieldNow()
      assert.isTrue(Exit.isInterrupted(yield* fiberB.await))
      assert.isTrue(Exit.isInterrupted(yield* fiberC.await))
      assert.strictEqual(fiberA.unsafePoll(), null)
    }))
})
