import { describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import { deepStrictEqual, strictEqual } from "effect/test/util"

describe("Latch", () => {
  it.effect("open works", () =>
    Effect.gen(function*() {
      const latch = yield* Effect.makeLatch()
      let fiber = yield* latch.await.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      strictEqual(fiber.unsafePoll(), null)
      yield* latch.open
      deepStrictEqual(yield* fiber.await, Exit.void)

      fiber = yield* latch.await.pipe(
        Effect.fork
      )
      yield* Effect.yieldNow()
      deepStrictEqual(fiber.unsafePoll(), Exit.void)

      yield* latch.close
      fiber = yield* Effect.void.pipe(
        latch.whenOpen,
        Effect.fork
      )
      yield* Effect.yieldNow()
      strictEqual(fiber.unsafePoll(), null)

      yield* latch.release
      deepStrictEqual(yield* fiber.await, Exit.void)
    }))

  it.effect("subtype of Effect", () =>
    Effect.gen(function*() {
      const latch = yield* Effect.makeLatch()
      const fiber = yield* Effect.fork(latch)

      yield* latch.open

      deepStrictEqual(yield* fiber.await, Exit.void)
    }))
})
