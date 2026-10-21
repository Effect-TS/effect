import {
  ClusterCron,
  ClusterSchema,
  DeliverAt,
  Entity,
  MessageStorage,
  Runners,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Clock, Cron, DateTime, Effect, Layer, PrimaryKey, Schema, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import * as RunnerStorage from "../src/RunnerStorage.js"

describe("ClusterCron", () => {
  it.effect("runs each tick once across restarts (calculateNextRunFromPrevious: true)", () =>
    Effect.gen(function*() {
      const runs: Array<number> = []
      const cron = makeCron(runs)

      yield* deploy(Layer.merge(cron, OtherLayer))
      // the pending run survives the restart
      yield* deploy(Layer.merge(cron, OtherLayer))
      // the pending run fails once the cron entity misses its registration timeout
      yield* deploy(OtherLayer)
      yield* deploy(Layer.merge(cron, OtherLayer))
      assert.deepStrictEqual(runs, [1000, 2000, 3000, 4000, 5000, 6000, 7000, 11000, 12000, 13000, 14000])
    }).pipe(Effect.provide(MessageStorage.MemoryDriver.Default), Effect.provide(TestShardingConfig)))

  it.effect("runs a pending legacy initial tick once after upgrading (calculateNextRunFromPrevious: true)", () =>
    Effect.gen(function*() {
      const runs: Array<number> = []

      // a previous version seeded the first run at the fixed entity id "initial"
      yield* deploy(
        OtherLayer,
        Effect.gen(function*() {
          const client = (yield* LegacyCronEntity.client)("initial")
          yield* Effect.orDie(client.run({ dateTime: DateTime.unsafeMake(1000) }, { discard: true }))
          yield* TestClock.adjust(500)
        })
      )
      yield* deploy(Layer.merge(makeCron(runs), OtherLayer))
      assert.deepStrictEqual(runs, [1000, 2000, 3000, 4000])
    }).pipe(Effect.provide(MessageStorage.MemoryDriver.Default), Effect.provide(TestShardingConfig)))
})

const TestShardingConfig = ShardingConfig.layer({
  entityRegistrationTimeout: 1000,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 100,
  refreshAssignmentsInterval: 100
})

const makeCron = (runs: Array<number>) =>
  ClusterCron.make({
    name: "report",
    cron: Cron.unsafeParse("* * * * * *", "UTC"),
    calculateNextRunFromPrevious: true,
    execute: Effect.andThen(Clock.currentTimeMillis, (now) => {
      runs.push(now)
    })
  })

// one runner process over message storage that outlives it
const deploy = (
  entities: Layer.Layer<never, never, Sharding.Sharding>,
  use: Effect.Effect<void, never, Sharding.Sharding> = TestClock.adjust(3500)
) =>
  Effect.flatMap(MessageStorage.MemoryDriver, (driver) =>
    Effect.provide(
      use,
      entities.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(Runners.layerNoop),
        Layer.provide(Layer.succeed(MessageStorage.MessageStorage, driver.storage)),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(TestShardingConfig)
      )
    ))

// stands in for the rest of the application in a deploy without the cron
const Other = Entity.make("Other", [Rpc.make("Ping")])
const OtherLayer = Other.toLayer({ Ping: () => Effect.void })

// the "report" cron entity as persisted by a previous version
class LegacyCronPayload extends Schema.Class<LegacyCronPayload>("@effect/cluster/ClusterCron/CronPayload")({
  dateTime: Schema.DateTimeUtc
}) {
  [PrimaryKey.symbol]() {
    return ""
  }
  [DeliverAt.symbol]() {
    return this.dateTime
  }
}

const LegacyCronEntity = Entity.make("ClusterCron/report", [
  Rpc.make("run", { payload: LegacyCronPayload }).annotate(ClusterSchema.Persisted, true)
])
