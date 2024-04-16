import { Effect, Ref } from "effect"
import * as it from "effect-test/utils/extend"
import * as FiberHandle from "effect/FiberHandle"
import { assert, describe } from "vitest"

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

      assert.strictEqual(yield* _(Ref.get(ref)), 1)
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
          assert.strictEqual(yield* _(Ref.get(ref)), 2)
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* _(Ref.get(ref)), 3)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const handle = yield* _(FiberHandle.make())
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.unit))
      FiberHandle.unsafeSet(handle, Effect.runFork(Effect.fail("fail")))
      const result = yield* _(FiberHandle.join(handle), Effect.flip)
      assert.strictEqual(result, "fail")
    }))
})
