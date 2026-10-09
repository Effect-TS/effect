import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer } from "effect"
import { Runner, RunnerAddress, RunnerStorage, ShardId, ShardingConfig, SqlRunnerStorage } from "effect/cluster"
import { TestClock } from "effect/testing"
import { PgContainer } from "../fixtures/pg-utils.ts"

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({ filename: dir + "/test.db" })
}).pipe(Layer.unwrap, Layer.provide(NodeFileSystem.layer))

const shard = ShardId.make("default", 1)
const deadAddress = RunnerAddress.make("dead", 1)
const liveAddress = RunnerAddress.make("live", 2)

describe("SqlRunnerStorage dead lock holder", () => {
  ;([
    ["sqlite", Layer.orDie(SqliteLayer)],
    ["pg", Layer.orDie(PgContainer.layerClient)]
  ] as const).forEach(([label, client]) => {
    it.effect(
      `${label} (no advisory): a live runner reclaims a lock whose holder has no runner row`,
      () =>
        Effect.gen(function*() {
          const storage = yield* RunnerStorage.RunnerStorage

          // The holder acquires, then loses its runner row (unregistered or reaped
          // by another runner's stale-heartbeat cleanup) but keeps refreshing.
          yield* storage.register(Runner.make({ address: deadAddress, groups: ["default"], weight: 1 }), true)
          assert.deepStrictEqual(yield* storage.acquire(deadAddress, [shard]), [shard])
          yield* storage.unregister(deadAddress)
          assert.deepStrictEqual(yield* storage.refresh(deadAddress, [shard]), [shard])

          yield* storage.register(Runner.make({ address: liveAddress, groups: ["default"], weight: 1 }), true)
          assert.deepStrictEqual(
            (yield* storage.getRunners).map(([runner]) => runner.address),
            [liveAddress]
          )

          // The holder has no runner row, so a live runner should get the lock.
          assert.deepStrictEqual(yield* storage.acquire(liveAddress, [shard]), [shard])
        }).pipe(
          Effect.provide(
            SqlRunnerStorage.layerWith({ prefix: "dead_holder" }).pipe(
              Layer.provide(client),
              Layer.provide(ShardingConfig.layer({ shardLockDisableAdvisory: true }))
            )
          ),
          TestClock.withLive
        ),
      60_000
    )
  })
})
