import { Runner, RunnerAddress, RunnerStorage, ShardId, SqlRunnerStorage } from "@effect/cluster"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as ShardingConfig from "../src/ShardingConfig.js"
import { MysqlContainer } from "./fixtures/utils-mysql.js"
import { PgContainer } from "./fixtures/utils-pg.js"

const StorageLive = SqlRunnerStorage.layer

describe("SqlRunnerStorage", () => {
  ;([
    ["pg", Layer.orDie(PgContainer.ClientLive)],
    ["mysql", Layer.orDie(MysqlContainer.ClientLive)],
    ["vitess", Layer.orDie(MysqlContainer.ClientLiveVitess)],
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
})

const runnerAddress1 = RunnerAddress.make("localhost", 1234)

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(Layer.unwrapScoped, Layer.provide(NodeFileSystem.layer))
