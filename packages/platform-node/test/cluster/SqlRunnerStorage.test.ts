import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Exit, FileSystem, Layer, Schedule } from "effect"
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
  it.effect("bounds shard lock operations and rebuilds an unresponsive reserved connection", () => {
    const partitioned: PartitionState = {
      current: false,
      activeQueries: 0,
      maxActiveQueries: 0,
      interruptedQueries: 0
    }
    const layer = StorageLive.pipe(
      Layer.provideMerge(blackholeReservedConnection(partitioned, true)),
      Layer.provide(ShardingConfig.layer({
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

      const expectDeadline = Effect.fnUntraced(function*(operation: Effect.Effect<unknown, unknown>) {
        const [elapsed, exit] = yield* operation.pipe(
          Effect.exit,
          Effect.timed,
          TestClock.withLive
        )
        assert(Exit.isFailure(exit))
        assert.isAtLeast(Duration.toMillis(elapsed), 90)
        assert.isBelow(Duration.toMillis(elapsed), 1000)
        yield* Effect.sleep(20).pipe(TestClock.withLive)
      })

      yield* expectDeadline(storage.refresh(runnerAddress1, shards))
      yield* expectDeadline(storage.refresh(runnerAddress1, shards))
      yield* expectDeadline(storage.refresh(runnerAddress1, shards))

      assert.isAtLeast(partitioned.interruptedQueries, 1)
      assert.isAtMost(partitioned.maxActiveQueries, 1)

      partitioned.current = false
      expect(yield* storage.refresh(runnerAddress1, shards).pipe(TestClock.withLive)).toEqual(shards)

      partitioned.current = true
      yield* expectDeadline(storage.acquire(runnerAddress1, [ShardId.make("default", 2)]))
      partitioned.current = false
      yield* storage.refresh(runnerAddress1, shards).pipe(TestClock.withLive)

      partitioned.current = true
      yield* expectDeadline(storage.release(runnerAddress1, shards[0]))
      partitioned.current = false
      yield* storage.refresh(runnerAddress1, shards).pipe(TestClock.withLive)
      yield* storage.release(runnerAddress1, shards[0]).pipe(TestClock.withLive)

      assert.strictEqual(partitioned.activeQueries, 0)
    }).pipe(Effect.provide(layer))
  }, 60_000)

  it.effect("recovers when a blackholed query cannot resume after the partition clears", () => {
    const partitioned: PartitionState = {
      current: false,
      activeQueries: 0,
      maxActiveQueries: 0,
      interruptedQueries: 0
    }
    const layer = StorageLive.pipe(
      Layer.provideMerge(blackholeReservedConnection(partitioned, false)),
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
      yield* storage.refresh(runnerAddress1, shards).pipe(Effect.exit, TestClock.withLive)
      yield* Effect.sleep(150).pipe(TestClock.withLive)

      partitioned.current = false
      expect(
        yield* storage.refresh(runnerAddress1, shards).pipe(
          Effect.retry({ times: 5, schedule: Schedule.spaced(20) }),
          TestClock.withLive
        )
      ).toEqual(shards)
      assert.isAtLeast(partitioned.interruptedQueries, 1)
      assert.isAtMost(partitioned.maxActiveQueries, 1)
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

interface PartitionState {
  current: boolean
  activeQueries: number
  maxActiveQueries: number
  interruptedQueries: number
}

const blackholeReservedConnection = (partitioned: PartitionState, resumePending: boolean) =>
  Layer.effect(
    SqlClient.SqlClient,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const wrapConnection = (connection: SqlConnection.Connection): SqlConnection.Connection => {
        const execute = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.suspend(() => {
            partitioned.activeQueries++
            partitioned.maxActiveQueries = Math.max(partitioned.maxActiveQueries, partitioned.activeQueries)
            return Effect.suspend(function waitForConnection(): Effect.Effect<A, E, R> {
              if (!partitioned.current) return effect
              return resumePending
                ? Effect.andThen(Effect.sleep(5), waitForConnection)
                : Effect.never
            }).pipe(
              Effect.onExit((exit) =>
                Effect.sync(() => {
                  partitioned.activeQueries--
                  if (Exit.hasInterrupts(exit)) {
                    partitioned.interruptedQueries++
                  }
                })
              )
            )
          })
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
