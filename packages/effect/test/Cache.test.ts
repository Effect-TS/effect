import * as it from "@effect/vitest"
import * as Cache from "effect/Cache"
import * as Effect from "effect/Effect"
import * as TestClock from "effect/TestClock"
import { describe, expect } from "vitest"

describe("Cache", () => {
  it.effect("should not increment cache hits on expired entries", () =>
    Effect.gen(function*(_) {
      const cache = yield* _(Cache.make({
        capacity: 100,
        timeToLive: "1 seconds",
        lookup: (n: number) => Effect.succeed(n)
      }))
      yield* _(cache.get(42))
      yield* _(TestClock.adjust("2 seconds"))
      yield* _(cache.get(42))
      const { hits, misses } = yield* _(cache.cacheStats)
      expect(hits).toBe(0)
      expect(misses).toBe(2)
    }))
})
