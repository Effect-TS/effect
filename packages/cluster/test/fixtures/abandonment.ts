import { MessageStorage, ShardingConfig, Snowflake } from "@effect/cluster"
import type { Cause } from "effect"
import { Effect, Exit, Fiber, Layer } from "effect"
import { makeRequest } from "./message-storage.js"

export const MemoryLive = MessageStorage.layerMemory.pipe(
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(ShardingConfig.layerDefaults)
)

// Isolate reply handlers while using the public storage shutdown boundary.
// This also runs on the baseline, where shutdown incorrectly returns a routing error.
export const abandonmentCause = Effect.gen(function*() {
  const storage = yield* MessageStorage.make(yield* MessageStorage.MessageStorage)
  const request = yield* makeRequest()
  const waiter = yield* Effect.fork(storage.registerReplyHandler(request))
  yield* Effect.yieldNow()
  yield* storage.unregisterShardReplyHandlers(request.envelope.address.shardId, { interrupt: true })
  const exit = yield* Fiber.await(waiter)
  if (Exit.isSuccess(exit)) return yield* Effect.die("Expected reply waiter shutdown to fail")
  return exit.cause as Cause.Cause<never>
})
