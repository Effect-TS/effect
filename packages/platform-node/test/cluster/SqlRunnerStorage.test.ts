import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, expect, it } from "@effect/vitest"
import { Effect, Fiber, FileSystem, Layer } from "effect"
import { TestClock } from "effect/testing"
import {
  Runner,
  RunnerAddress,
  RunnerStorage,
  ShardId,
  ShardingConfig,
  SqlRunnerStorage
} from "effect/unstable/cluster"
import { SqlClient, type SqlConnection } from "effect/unstable/sql"
import { MysqlContainer } from "../fixtures/mysql2-utils.ts"
import { PgContainer } from "../fixtures/pg-utils.ts"

const StorageLive = SqlRunnerStorage.layer

describe("SqlRunnerStorage", () => {
  it.effect("refresh does not hang when the reserved connection stops responding", () => {
    const partitioned = { current: false }
    const layer = StorageLive.pipe(
      Layer.provideMerge(blackholeReservedConnection(partitioned)),
      Layer.provide(ShardingConfig.layer({
        shardLockDisableAdvisory: true,
        shardLockExpiration: 1000,
        shardLockRefreshInterval: 100
      }))
    )

    return Effect.gen(function*() {
      const storage = yield* RunnerStorage.RunnerStorage
      const runner = Runner.make({
        address: runnerAddress1,
        groups: ["default"],
        weight: 1
      })
      const shards = [ShardId.make("default", 1)]

      yield* storage.register(runner, true)
      yield* storage.acquire(runnerAddress1, shards)
      partitioned.current = true

      const fiber = yield* storage.refresh(runnerAddress1, shards).pipe(
        Effect.exit,
        Effect.forkChild({ startImmediately: true })
      )
      yield* TestClock.adjust(1001)
      const result = fiber.pollUnsafe()
      partitioned.current = false
      yield* Fiber.interrupt(fiber)

      assert.isDefined(result, "refresh should complete before the shard lock expires")
    }).pipe(Effect.provide(layer))
  }, 60_000)
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
})

const runnerAddress1 = RunnerAddress.make("localhost", 1234)

const blackholeReservedConnection = (partitioned: { readonly current: boolean }) =>
  Layer.effect(
    SqlClient.SqlClient,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const wrapConnection = (connection: SqlConnection.Connection): SqlConnection.Connection => {
        const execute = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.suspend(() => partitioned.current ? Effect.never : effect)
        return {
          ...connection,
          execute: (...args) => execute(connection.execute(...args)),
          executeRaw: (...args) => execute(connection.executeRaw(...args)),
          executeValues: (...args) => execute(connection.executeValues(...args)),
          executeValuesUnprepared: (...args) => execute(connection.executeValuesUnprepared(...args)),
          executeUnprepared: (...args) => execute(connection.executeUnprepared(...args))
        }
      }
      let client: SqlClient.SqlClient
      client = new Proxy(sql, {
        get(target, property, receiver) {
          if (property === "reserve") {
            return Effect.map(target.reserve, wrapConnection)
          }
          if (property === "withoutTransforms") {
            return () => client
          }
          return Reflect.get(target, property, receiver)
        }
      })
      return client
    })
  ).pipe(Layer.provide(PgContainer.layerClient))

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(Layer.unwrap, Layer.provide(NodeFileSystem.layer))
