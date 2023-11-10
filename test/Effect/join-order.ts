import { Effect, Fiber, FiberRef, TestClock } from "effect"
import * as it from "effect-test/utils/extend"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("zip/all joins fibers in the correct order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(FiberRef.make(5))
      const fiber = yield* $(Effect.fork(Effect.zip(
        FiberRef.set(ref, 10).pipe(Effect.delay("2 seconds")),
        FiberRef.set(ref, 15),
        { concurrent: true }
      )))
      yield* $(TestClock.adjust("3 seconds"))
      yield* $(Fiber.join(fiber))
      assert.strictEqual(yield* $(FiberRef.get(ref)), 10)
    }).pipe(Effect.scoped))
})
