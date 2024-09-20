import { Effect, Exit } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

describe("Latch", () => {
  it.effect("open works", () =>
    Effect.gen(function*() {
      const latch = yield* Effect.makeLatch()
      let fiber = yield* latch.await.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      assert.isNull(fiber.unsafePoll())
      yield* latch.open
      assert.deepStrictEqual(yield* fiber.await, Exit.void)

      fiber = yield* latch.await.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      assert.deepStrictEqual(fiber.unsafePoll(), Exit.void)

      yield* latch.close
      fiber = yield* Effect.void.pipe(
        latch.whenOpen,
        Effect.fork
      )
      yield* Effect.yieldNow()
      assert.isNull(fiber.unsafePoll())

      yield* latch.release
      assert.deepStrictEqual(yield* fiber.await, Exit.void)
    }))

  it.effect("subtype of Effect", () =>
    Effect.gen(function*() {
      const latch = yield* Effect.makeLatch()
      const fiber = yield* Effect.fork(latch)

      yield* latch.open

      assert.deepStrictEqual(yield* fiber.await, Exit.void)
    }))
})
