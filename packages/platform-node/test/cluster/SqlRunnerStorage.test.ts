import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, FileSystem, Layer } from "effect"
import {
  Runner,
  RunnerAddress,
  RunnerStorage,
  ShardId,
  ShardingConfig,
  SqlRunnerStorage
} from "effect/unstable/cluster"
import { MysqlContainer } from "../fixtures/mysql2-utils.ts"
import { PgContainer } from "../fixtures/pg-utils.ts"

const StorageLive = SqlRunnerStorage.layer

describe("SqlRunnerStorage", () => {
  ;([
    ["pg", Layer.orDie(PgContainer.layerClient)],
    ["mysql", Layer.orDie(MysqlContainer.layerClient)],
    ["vitess", Layer.orDie(MysqlContainer.layerClientVitess)],
    ["sqlite", Layer.orDie(SqliteLayer)]
  ] as const).flatMap(([label, layer]) =>
    [
      [label, StorageLive.pipe(Layer.provideMerge(layer), Layer.provide(ShardingConfig.layer()))],
      [
        label + " (no advisory)",
        StorageLive.pipe(
          Layer.provideMerge(layer),
          Layer.provide(ShardingConfig.layer({
            shardLockDisableAdvisory: true
          }))
        )
      ]
    ] as const
  ).forEach(([label, layer]) => {
    it.layer(layer, {
      timeout: 60000
    })(label, (it) => {
      it.effect("getRunners", () =>
        Effect.gen(function*() {
          const storage = yield* RunnerStorage.RunnerStorage

          const runner = Runner.make({
            address: runnerAddress1,
            groups: ["default"],
            weight: 1
          })
          const machineId = yield* storage.register(runner, true)
          yield* storage.register(runner, true)
          expect(machineId).toEqual(1)
          expect(yield* storage.getRunners).toEqual([[runner, true]])

          yield* storage.setRunnerHealth(runnerAddress1, false)
          expect(yield* storage.getRunners).toEqual([[runner, false]])

          yield* storage.unregister(runnerAddress1)
          expect(yield* storage.getRunners).toEqual([])
        }), 30_000)

      it.effect("acquireShards", () =>
        Effect.gen(function*() {
          const storage = yield* RunnerStorage.RunnerStorage

          let acquired = yield* storage.acquire(runnerAddress1, [
            ShardId.make("default", 1),
            ShardId.make("default", 2),
            ShardId.make("default", 3)
          ])
          expect(acquired.map((_) => _.id)).toEqual([1, 2, 3])
          acquired = yield* storage.acquire(runnerAddress1, [
            ShardId.make("default", 1),
            ShardId.make("default", 2),
            ShardId.make("default", 3)
          ])
          expect(acquired.map((_) => _.id)).toEqual([1, 2, 3])

          const refreshed = yield* storage.refresh(runnerAddress1, [
            ShardId.make("default", 1),
            ShardId.make("default", 2),
            ShardId.make("default", 3)
          ])
          expect(refreshed.map((_) => _.id)).toEqual([1, 2, 3])

          // smoke test release
          yield* storage.release(runnerAddress1, ShardId.make("default", 2))
        }))
    })
  })

  it.layer(
    Layer.merge(
      Layer.orDie(PgContainer.layerClient),
      ShardingConfig.layer()
    ),
    { timeout: 60000 }
  )("pg namespaced advisory locks", (it) => {
    const shards = [
      ShardId.make("default", 1),
      ShardId.make("default", 2),
      ShardId.make("default", 3)
    ]

    it.effect("isolates shard locks across prefixes when enabled", () =>
      Effect.gen(function*() {
        const storageA = yield* SqlRunnerStorage.make({
          prefix: "cluster_a",
          namespaceAdvisoryLocks: true
        })
        const storageB = yield* SqlRunnerStorage.make({
          prefix: "cluster_b",
          namespaceAdvisoryLocks: true
        })

        const acquiredA = yield* storageA.acquire(runnerAddress1, shards)
        const acquiredB = yield* storageB.acquire(runnerAddress2, shards)
        assert.deepStrictEqual(acquiredA.map((shard) => shard.id), [1, 2, 3])
        assert.deepStrictEqual(acquiredB.map((shard) => shard.id), [1, 2, 3])
      }).pipe(Effect.scoped))

    it.effect("keeps locks exclusive for the same prefix when enabled", () =>
      Effect.gen(function*() {
        const storageA = yield* SqlRunnerStorage.make({
          prefix: "shared",
          namespaceAdvisoryLocks: true
        })
        const storageB = yield* SqlRunnerStorage.make({
          prefix: "shared",
          namespaceAdvisoryLocks: true
        })

        const acquiredA = yield* storageA.acquire(runnerAddress1, shards)
        const acquiredB = yield* storageB.acquire(runnerAddress2, shards)
        assert.deepStrictEqual(acquiredA.map((shard) => shard.id), [1, 2, 3])
        assert.deepStrictEqual(acquiredB, [])
      }).pipe(Effect.scoped))

    it.effect("releases namespaced locks so another runner can acquire", () =>
      Effect.gen(function*() {
        const storageA = yield* SqlRunnerStorage.make({
          prefix: "release_ns",
          namespaceAdvisoryLocks: true
        })
        const storageB = yield* SqlRunnerStorage.make({
          prefix: "release_ns",
          namespaceAdvisoryLocks: true
        })

        assert.deepStrictEqual(
          (yield* storageA.acquire(runnerAddress1, shards)).map((shard) => shard.id),
          [1, 2, 3]
        )
        yield* storageA.release(runnerAddress1, ShardId.make("default", 2))

        const reacquired = yield* storageB.acquire(runnerAddress2, [ShardId.make("default", 2)])
        assert.deepStrictEqual(reacquired.map((shard) => shard.id), [2])
      }).pipe(Effect.scoped))

    it.effect("without the flag, different prefixes still share advisory locks", () =>
      Effect.gen(function*() {
        const storageA = yield* SqlRunnerStorage.make({ prefix: "legacy_a" })
        const storageB = yield* SqlRunnerStorage.make({ prefix: "legacy_b" })

        const acquiredA = yield* storageA.acquire(runnerAddress1, shards)
        const acquiredB = yield* storageB.acquire(runnerAddress2, shards)
        assert.deepStrictEqual(acquiredA.map((shard) => shard.id), [1, 2, 3])
        // Documents the pre-fix collision: prefix-only isolation does not
        // apply to PostgreSQL advisory lock keys unless namespacing is enabled.
        assert.deepStrictEqual(acquiredB, [])
      }).pipe(Effect.scoped))
  })
})

const runnerAddress1 = RunnerAddress.make("localhost", 1234)
const runnerAddress2 = RunnerAddress.make("localhost", 1235)

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(Layer.unwrap, Layer.provide(NodeFileSystem.layer))
