import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Cache, Effect, TestClock } from "effect"

describe("Cache", () => {
  it.effect("should not increment cache hits on expired entries", () =>
    Effect.gen(function*() {
      const cache = yield* Cache.make({
        capacity: 100,
        timeToLive: "1 seconds",
        lookup: (n: number): Effect.Effect<number, 2> => Effect.succeed(n)
      })
      yield* cache.get(42)
      yield* TestClock.adjust("2 seconds")
      yield* cache.get(42)
      const { hits, misses } = yield* cache.cacheStats
      strictEqual(hits, 0)
      strictEqual(misses, 2)
    }))
})
