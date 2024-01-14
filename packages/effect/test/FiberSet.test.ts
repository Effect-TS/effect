import { Effect, Ref } from "effect"
import * as it from "effect-test/utils/extend"
import * as FiberSet from "effect/FiberSet"
import { assert, describe } from "vitest"

describe("FiberSet", () => {
  it.effect("interrupts fibers", () =>
    Effect.gen(function*(_) {
      const ref = yield* _(Ref.make(0))
      yield* _(
        Effect.gen(function*(_) {
          const set = yield* _(FiberSet.make())
          yield* _(
            FiberSet.run(
              set,
              Effect.onInterrupt(
                Effect.never,
                () => Ref.update(ref, (n) => n + 1)
              )
            ),
            Effect.replicateEffect(10)
          )
          yield* _(Effect.yieldNow())
        }),
        Effect.scoped
      )

      assert.strictEqual(yield* _(Ref.get(ref)), 10)
    }))
})
