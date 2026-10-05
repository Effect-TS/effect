import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, PubSub, Scheduler } from "effect"

describe("PubSub", () => {
  // PubSub.end JSDoc (packages/effect/src/PubSub.ts:805): publishers waiting for
  // capacity when `end` is called return `false`, and each subscriber receives
  // its buffered messages and then the final message. `publish`
  // (PubSub.ts:1056) checks `ended` before yielding, and the surplus callback
  // (PubSub.ts:2528) only checks `shutdownFlag`, so a publisher that yields in
  // between still enqueues after `end`.
  it.effect("end rejects a publisher that yields before registering its surplus", () =>
    Effect.gen(function*() {
      const pubsub = yield* PubSub.bounded<number>(1)
      const subscription = yield* PubSub.subscribe(pubsub)
      yield* PubSub.publish(pubsub, 1)
      const publisher = yield* Effect.forkChild(
        PubSub.publish(pubsub, 2).pipe(Effect.provideService(Scheduler.MaxOpsBeforeYield, 3)),
        { startImmediately: true }
      )

      PubSub.endUnsafe(pubsub, 0)
      for (let i = 0; i < 30; i++) yield* Effect.yieldNow

      assert.strictEqual(yield* PubSub.take(subscription), 1)
      assert.strictEqual(yield* PubSub.take(subscription), 0)
      assert.isFalse(yield* Fiber.join(publisher))
    }))
})
