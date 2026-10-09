import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import {
  ClusterSchema,
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

const PingEntity = Entity.make("PingEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false)
])

const makeShardingLayer = (
  storage: Layer.Layer<RunnerStorage.RunnerStorage>,
  config: Partial<ShardingConfig.ShardingConfig["Service"]>
) => {
  const configLayer = ShardingConfig.layer({ entityTerminationTimeout: 0, ...config })
  return PingEntity.toLayer(Effect.succeed({ Ping: () => Effect.void })).pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide([RunnerHealth.layerNoop, storage]),
    Layer.provide(Runners.layerNoop),
    Layer.provide(MessageStorage.layerMemory),
    Layer.provide(configLayer)
  )
}

describe("Shard lock liveness", () => {
  it.effect("a volatile request to a shard that never gets an owner eventually fails", () =>
    Effect.gen(function*() {
      const makeClient = yield* PingEntity.client
      const fiber = yield* makeClient("1").Ping().pipe(Effect.forkChild({ startImmediately: true }))

      // No runner ever registers, so the shard never gets an owner.
      yield* TestClock.adjust("2 minutes")

      assert.isDefined(fiber.pollUnsafe(), "request is still retrying after 2 minutes")
    }).pipe(
      Effect.provide(makeShardingLayer(RunnerStorage.layerMemory, {
        runnerAddress: Option.none(),
        sendRetryInterval: 1000
      }))
    ))
})
