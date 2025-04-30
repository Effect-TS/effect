import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Array, Duration, Effect, Fiber, KeyedPool, pipe, Random, Ref } from "effect"
import * as TestClock from "effect/TestClock"

describe("KeyedPool", () => {
  it.scoped("acquire release many successfully while other key is blocked", () =>
    Effect.gen(function*() {
      const N = 10
      const pool = yield* KeyedPool.make({
        acquire: (key: string) => Effect.succeed(key),
        size: 4
      })
      yield* pool.pipe(
        KeyedPool.get("key1"),
        Effect.repeatN(3),
        Effect.asVoid
      )
      const fiber = yield* Effect.fork(
        Effect.forEach(
          Array.range(1, N),
          () =>
            Effect.scoped(
              Effect.zipRight(
                KeyedPool.get(pool, "key2"),
                Effect.sleep(Duration.millis(10))
              )
            ),
          { concurrency: "unbounded", discard: true }
        )
      )
      yield* TestClock.adjust(Duration.millis(10 * N))
      const result = yield* Fiber.join(fiber)
      strictEqual(result, undefined)
    }))

  it.scoped("acquire release many with invalidates", () =>
    Effect.gen(function*() {
      const N = 10
      const counter = yield* Ref.make(0)
      const pool = yield* KeyedPool.make({
        acquire: (key) => Ref.modify(counter, (n) => [`${key}-${n}`, n + 1] as const),
        size: 4
      })
      const fiber = yield* Effect.fork(
        Effect.forEach(
          Array.range(1, N),
          () =>
            Effect.scoped(pipe(
              KeyedPool.get(pool, "key1"),
              Effect.flatMap((value) =>
                Effect.zipRight(
                  Effect.whenEffect(
                    KeyedPool.invalidate(pool, value),
                    Random.nextBoolean
                  ),
                  Effect.flatMap(
                    Random.nextIntBetween(0, 15 + 1),
                    (n) => Effect.sleep(Duration.millis(n))
                  )
                )
              )
            )),
          { concurrency: "unbounded", discard: true }
        )
      )
      yield* TestClock.adjust(Duration.millis(15 * N))
      const result = yield* Fiber.join(fiber)
      strictEqual(result, undefined)
    }))
})
