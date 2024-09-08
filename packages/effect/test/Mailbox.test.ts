import { Effect, Exit, Fiber, Mailbox } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

describe("Mailbox", () => {
  it.effect("offerAll with capacity", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.offerAll([1, 2, 3, 4]).pipe(
        Effect.fork
      )
      yield* Effect.yieldNow({ priority: 1 })
      assert.isNull(fiber.unsafePoll())

      let result = yield* mailbox.take
      assert.deepStrictEqual(result[0], [1, 2])
      assert.isFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      assert.isNull(fiber.unsafePoll())

      result = yield* mailbox.take
      assert.deepStrictEqual(result[0], [3, 4])
      assert.isFalse(result[1])

      yield* Effect.yieldNow({ priority: 1 })
      assert.deepStrictEqual(fiber.unsafePoll(), Exit.succeed(4))
    }))

  it.effect("offerAll can be interrupted", () =>
    Effect.gen(function*() {
      const mailbox = yield* Mailbox.make<number>(2)
      const fiber = yield* mailbox.offerAll([1, 2, 3, 4]).pipe(
        Effect.fork
      )

      yield* Effect.yieldNow({ priority: 1 })
      yield* Fiber.interrupt(fiber)

      let result = yield* mailbox.take
      assert.deepStrictEqual(result[0], [1, 2])
      assert.isFalse(result[1])

      yield* mailbox.offer(5)
      yield* Effect.yieldNow({ priority: 1 })

      result = yield* mailbox.take
      assert.deepStrictEqual(result[0], [5])
      assert.isFalse(result[1])
    }))
})
