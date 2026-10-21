import { assert, describe, it } from "@effect/vitest"
import { Context, Cron, Effect, Layer } from "effect"
import {
  ClusterCron,
  ClusterError,
  Entity,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/cluster"
import { Rpc } from "effect/rpc"
import { TestClock } from "effect/testing"

// Each deploy is a fresh Sharding instance over the same message storage
const deploy = (entities: Layer.Layer<never, never, Sharding.Sharding>, millis: number) =>
  Effect.gen(function*() {
    const driver = yield* MessageStorage.MemoryDriver
    yield* Layer.build(entities.pipe(
      Layer.provideMerge(Sharding.layer),
      Layer.provide([RunnerStorage.layerMemory, RunnerHealth.layerNoop, Runners.layerNoop]),
      Layer.provide(Layer.succeed(MessageStorage.MessageStorage, driver.storage)),
      Layer.provide(ShardingConfig.layer({
        entityRegistrationTimeout: 1000,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 100,
        refreshAssignmentsInterval: 0
      }))
    ))
    for (let i = 0; i < millis / 100; i++) {
      yield* TestClock.adjust(100)
    }
  }).pipe(Effect.scoped)

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
      for (let i = 0; i < 20; i++) {
        yield* TestClock.adjust(100)
      }
      assert.isTrue(failed)
      assert.strictEqual(runs, 2)
    }).pipe(Effect.provide(layer))
  })

  it.effect("resumes with calculateNextRunFromPrevious after its pending run fails", () =>
    Effect.gen(function*() {
      let runs = 0
      const cron = ClusterCron.make({
        name: "test",
        cron: Cron.parseUnsafe("* * * * * *", "UTC"),
        calculateNextRunFromPrevious: true,
        execute: Effect.sync(() => {
          runs++
        })
      })
      const Other = Entity.make("Other", [Rpc.make("Ping")])
      const OtherLayer = Other.toLayer({ Ping: () => Effect.void })

      yield* deploy(Layer.merge(cron, OtherLayer), 3500)
      const beforeRemoval = runs
      assert.isAbove(beforeRemoval, 0)

      // the pending run fails once the cron entity misses its registration timeout
      yield* deploy(OtherLayer, 3000)
      assert.strictEqual(runs, beforeRemoval)

      yield* deploy(Layer.merge(cron, OtherLayer), 3500)
      assert.isAbove(runs, beforeRemoval)
    }).pipe(Effect.provide(MessageStorage.MemoryDriver.layer)))

  it.effect("catches up in order with calculateNextRunFromPrevious after a restart", () =>
    Effect.gen(function*() {
      const scheduled: Array<string> = []
      let running = 0
      let overlapped = false
      let slow = false
      const cron = ClusterCron.make({
        name: "test",
        cron: Cron.parseUnsafe("* * * * * *", "UTC"),
        calculateNextRunFromPrevious: true,
        execute: Effect.contextWith((context: Context.Context<never>) =>
          Effect.gen(function*() {
            scheduled.push(Context.getUnsafe(context, Entity.CurrentAddress).entityId)
            if (++running > 1) overlapped = true
            if (slow) yield* Effect.sleep(2000)
            running--
          })
        )
      })

      yield* deploy(cron, 1500)
      // the pending run falls behind while no runner is up
      yield* TestClock.adjust(3000)
      slow = true
      scheduled.length = 0
      yield* deploy(cron, 6000)

      assert.isFalse(overlapped)
      assert.deepStrictEqual(scheduled, scheduled.toSorted())
    }).pipe(Effect.provide(MessageStorage.MemoryDriver.layer)))
})
