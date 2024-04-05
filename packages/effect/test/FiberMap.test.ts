import { Effect, ReadonlyArray, Ref } from "effect"
import * as it from "effect-test/utils/extend"
import * as FiberMap from "effect/FiberMap"
import { assert, describe } from "vitest"

describe("FiberMap", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const map = yield* _(FiberMap.make<number>())
          yield* _(
            Effect.forEach(ReadonlyArray.range(1, 10), (i) =>
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

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.effect("runtime", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const map = yield* _(FiberMap.make<number>())
          const run = yield* _(FiberMap.runtime(map)<never>())
          ReadonlyArray.range(1, 10).forEach((i) =>
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

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))

  it.scoped("join", () =>
    Effect.gen(function*(_) {
      const map = yield* _(FiberMap.make<string>())
      FiberMap.unsafeSet(map, "a", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "b", Effect.runFork(Effect.void))
      FiberMap.unsafeSet(map, "c", Effect.runFork(Effect.fail("fail")))
      FiberMap.unsafeSet(map, "d", Effect.runFork(Effect.fail("ignored")))
      const result = yield* _(FiberMap.join(map), Effect.flip)
      assert.strictEqual(result, "fail")
    }))
})
