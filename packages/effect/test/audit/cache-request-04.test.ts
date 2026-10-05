import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Option, ScopedCache } from "effect"
import { TestClock } from "effect/testing"

describe("ScopedCache", () => {
  // ScopedCache.ts:284-290: `get` stores the replacement entry before closing the expired entry's scope, so a
  // defect from that close skips forking the lookup. Per the `get` JSDoc (ScopedCache.ts:226-241), an expired key
  // must run the lookup; a later `get` must not wait forever on a lookup that was never started.
  it.effect("get after an expired entry's finalizer dies does not hang", () =>
    Effect.gen(function*() {
      const cache = yield* ScopedCache.make({
        capacity: 2,
        timeToLive: 0,
        lookup: () => Effect.acquireRelease(Effect.succeed(1), () => Effect.die("cleanup defect"))
      })
      yield* ScopedCache.get(cache, "k")
      yield* Effect.exit(ScopedCache.get(cache, "k"))
      const reader = yield* ScopedCache.get(cache, "k").pipe(
        Effect.exit,
        Effect.timeoutOption("1 second"),
        Effect.forkChild
      )
      yield* TestClock.adjust("1 second")
      const result = yield* Fiber.join(reader)
      assert.isTrue(Option.isSome(result), "third get never completed")
    }))
})
