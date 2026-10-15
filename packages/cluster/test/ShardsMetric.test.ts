import {
  ClusterMetrics,
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"
import { Array, Context, Effect, Layer, Metric, Option, TestClock } from "effect"

const shardsPerGroup = 8
const shardIds = Array.makeBy(shardsPerGroup, (i) => ShardId.make("default", i + 1))

const shardsGauge = Effect.map(Metric.value(ClusterMetrics.shards), (state) => state.value)

describe("ShardsMetric", () => {
  it.scoped("updates the shards gauge when shards are released", () =>
    Effect.gen(function*() {
      const storage = yield* RunnerStorage.makeMemory
      const sharding = yield* Layer.build(
        Sharding.layer.pipe(
          Layer.provide(Layer.succeed(RunnerStorage.RunnerStorage, storage)),
          Layer.provide([RunnerHealth.layerNoop, Runners.layerNoop]),
          Layer.provide(MessageStorage.layerMemory),
          Layer.provide(ShardingConfig.layer({
            runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
            shardsPerGroup,
            refreshAssignmentsInterval: 10
          }))
        )
      ).pipe(Effect.map(Context.get(Sharding.Sharding)))
      const held = () => shardIds.filter((shardId) => sharding.hasShardId(shardId)).length

      for (let i = 0; i < 100 && held() < shardsPerGroup; i++) {
        yield* TestClock.adjust(10)
      }
      assert.strictEqual(held(), shardsPerGroup)
      assert.strictEqual(yield* shardsGauge, BigInt(shardsPerGroup))

      yield* storage.register(
        Runner.make({ address: RunnerAddress.make("localhost", 5678), groups: ["default"], weight: 1 }),
        true
      )
      for (let i = 0; i < 100 && held() === shardsPerGroup; i++) {
        yield* TestClock.adjust(10)
      }
      yield* TestClock.adjust(100)
      assert.isTrue(held() < shardsPerGroup)
      assert.strictEqual(yield* shardsGauge, BigInt(held()))
    }))
})
