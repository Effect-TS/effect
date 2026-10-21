import { ClusterCron, Entity, MessageStorage, Runners, Sharding, ShardingConfig } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cron, Effect, Layer, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"

describe("ClusterCron", () => {
  it.effect("resumes after a deploy without the cron (calculateNextRunFromPrevious: true)", () =>
    Effect.gen(function*() {
      const driver = yield* MessageStorage.MemoryDriver
      let runs = 0
      const cron = ClusterCron.make({
        name: "report",
        cron: Cron.unsafeParse("* * * * * *", "UTC"),
        calculateNextRunFromPrevious: true,
        execute: Effect.sync(() => {
          runs++
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
      const beforeRemoval = runs
      assert.isAbove(beforeRemoval, 0)

      // the pending run fails once the cron entity misses its registration timeout
      yield* deploy(OtherLayer)
      assert.strictEqual(runs, beforeRemoval)

      yield* deploy(Layer.merge(cron, OtherLayer))
      assert.isAbove(runs, beforeRemoval)
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
