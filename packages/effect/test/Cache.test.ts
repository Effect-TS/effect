import * as Cache from "effect/Cache"
import * as Effect from "effect/Effect"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { describe, expect } from "vitest"

describe("Cache", () => {
  it.effect("should not increment cache hits on expired entries", () =>
    Effect.gen(function*(_) {
      const cache = yield* Cache.make({
        capacity: 100,
        timeToLive: "1 seconds",
        lookup: (n: number): Effect.Effect<number, 2> => Effect.succeed(n)
      })
      yield* cache.get(42)
      yield* TestClock.adjust("2 seconds")
      yield* cache.get(42)
      const { hits, misses } = yield* cache.cacheStats
      expect(hits).toBe(0)
      expect(misses).toBe(2)
    }))
})
