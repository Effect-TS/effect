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
              FiberMap.run(
                map,
                i,
                Effect.onInterrupt(
                  Effect.never,
                  () => Ref.update(ref, (n) => n + 1)
                )
              ))
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))
})
