import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import { assert, describe } from "vitest"

describe.concurrent("Queue", () => {
  it.effect("applicative take and offer", () =>
    Effect.gen(function*($) {
      const queue = yield* $(Queue.bounded<string>(100))
      const fiber = yield* $(Queue.take(queue), Effect.ap(Queue.take(queue), (a, b) => a + b), Effect.fork)
      yield* $(Queue.offer(queue, "don't "), Effect.zipRight(Queue.offer(queue, "give up :D")))
      const result = yield* $(Fiber.join(fiber))
      assert.strictEqual(result, "don't give up :D")
    }))
})
