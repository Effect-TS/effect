import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, PubSub, Scheduler } from "effect"

describe("PubSub", () => {
  // packages/effect/src/PubSub.ts:1296 (take) / :1355 (pollForItem): after `take` sees an empty
  // subscription it can yield before `pollForItem` runs; `pollForItem`'s ended fast path then returns
  // the final message without rechecking the buffer.
  // Contract (PubSub.end JSDoc, PubSub.ts:811-812): "Each subscriber receives the messages already
  // buffered for it, then the final message."
  it.effect("take delivers data published during waiter registration before the final message", () =>
    Effect.gen(function*() {
      const pubsub = yield* PubSub.unbounded<number>()
      const subscription = yield* PubSub.subscribe(pubsub)
      const fiber = yield* Effect.forkChild(
        PubSub.take(subscription).pipe(Effect.provideService(Scheduler.MaxOpsBeforeYield, 3)),
        { startImmediately: true }
      )
      PubSub.publishUnsafe(pubsub, 1)
      PubSub.endUnsafe(pubsub, 0)

      assert.strictEqual(yield* Fiber.join(fiber), 1)
    }))
})
