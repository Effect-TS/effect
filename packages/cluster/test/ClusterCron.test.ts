import { ClusterCron, Entity, MessageStorage, Runners, Sharding, ShardingConfig } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Clock, Cron, Effect, Layer, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"

describe("ClusterCron", () => {
  it.effect("runs each tick once across restarts (calculateNextRunFromPrevious: true)", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      const runs: Array<number> = []
      const cron = ClusterCron.make({
        name: "report",
        cron: Cron.unsafeParse("* * * * * *", "UTC"),
        calculateNextRunFromPrevious: true,
        execute: Effect.andThen(Clock.currentTimeMillis, (now) => {
          runs.push(now)
        })
      })

      // one runner process over message storage that outlives it
      const deploy = (entities: Layer.Layer<never, never, Sharding.Sharding>) =>
        Effect.scoped(Effect.andThen(
          Layer.build(entities.pipe(
            Layer.provideMerge(Sharding.layer),
            Layer.provide(Runners.layerNoop),
            Layer.provide(Layer.succeed(MessageStorage.MessageStorage, driver.storage)),
            Layer.provide(RunnerStorage.layerMemory),
            Layer.provide(RunnerHealth.layerNoop),
            Layer.provide(TestShardingConfig)
          )),
          TestClock.adjust(3500)
        ))

      yield* deploy(Layer.merge(cron, OtherLayer))
      // the pending run survives the restart
      yield* deploy(Layer.merge(cron, OtherLayer))
      // the pending run fails once the cron entity misses its registration timeout
      yield* deploy(OtherLayer)
      yield* deploy(Layer.merge(cron, OtherLayer))
      assert.deepStrictEqual(runs, [1000, 2000, 3000, 4000, 5000, 6000, 7000, 11000, 12000, 13000, 14000])
    }).pipe(Effect.provide(MessageStorage.MemoryDriver.Default), Effect.provide(TestShardingConfig)))
})

const TestShardingConfig = ShardingConfig.layer({
  entityRegistrationTimeout: 1000,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 100,
  refreshAssignmentsInterval: 100
})

// stands in for the rest of the application in a deploy without the cron
const Other = Entity.make("Other", [Rpc.make("Ping")])
const OtherLayer = Other.toLayer({ Ping: () => Effect.void })
