import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
import * as PersistedQueueTest from "./PersistedQueueTest.ts"

PersistedQueueTest.suite("memory", PersistedQueue.layerStoreMemory)

const Item = Schema.Struct({
  n: Schema.BigInt
})

it.layer(
  PersistedQueue.layer.pipe(Layer.provideMerge(PersistedQueue.layerStoreMemory))
)("PersistedQueue.layerCleanup", (it) => {
  it.effect("prunes completed elements on the configured interval", () =>
    Effect.gen(function*() {
      const queue = yield* PersistedQueue.make({ name: "cleanup-layer", schema: Item })
      yield* queue.offer({ n: 1n }, { id: "cleanup-layer-id" })
      yield* queue.take(Effect.succeed)

      yield* Layer.build(PersistedQueue.layerCleanup({
        interval: "1 minute",
        timeToLive: "1 hour"
      }))

      // within the ttl the id stays deduplicated
      yield* TestClock.adjust("2 minutes")
      yield* queue.offer({ n: 2n }, { id: "cleanup-layer-id" })
      const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
      yield* TestClock.adjust(1000)
      assert.isUndefined(fiber.pollUnsafe())

      // after the ttl a cleanup run prunes the entry and the id can be reused
      yield* TestClock.adjust("2 hours")
      yield* queue.offer({ n: 3n }, { id: "cleanup-layer-id" })
      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(yield* Fiber.join(fiber), { n: 3n })
    }))
})
