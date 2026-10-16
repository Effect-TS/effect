import { assert, describe, it } from "@effect/vitest"
import { Cron, Effect, Layer } from "effect"
import {
  ClusterCron,
  ClusterError,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/cluster"
import { TestClock } from "effect/testing"

describe("ClusterCron", () => {
  it.effect("recovers from a transient failure to schedule the initial run", () => {
    let failed = false
    let runs = 0
    const ShardingLayer = Sharding.layer.pipe(
      Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop, Runners.layerNoop]),
      Layer.updateService(MessageStorage.MessageStorage, (storage) => ({
        ...storage,
        saveRequest: (message) =>
          Effect.suspend(() => {
            if (!failed && message.envelope.address.entityType === "ClusterCron/test") {
              failed = true
              return Effect.fail(new ClusterError.PersistenceError({ cause: new Error("connection reset") }))
            }
            return storage.saveRequest(message)
          })
      })),
      Layer.provide(MessageStorage.layerMemory),
      Layer.provide(ShardingConfig.layer({ entityMessagePollInterval: 100, refreshAssignmentsInterval: 0 }))
    )
    const layer = ClusterCron.make({
      name: "test",
      cron: Cron.parseUnsafe("* * * * * *", "UTC"),
      execute: Effect.sync(() => {
        runs++
      })
    }).pipe(Layer.provide(ShardingLayer))

    return Effect.gen(function*() {
      for (let i = 0; i < 50; i++) {
        yield* TestClock.adjust(100)
      }
      assert.isTrue(failed)
      assert.strictEqual(runs, 5)
    }).pipe(Effect.provide(layer))
  })
})
