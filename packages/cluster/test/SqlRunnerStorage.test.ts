import { Runner, RunnerAddress, RunnerStorage, ShardId, SqlRunnerStorage } from "@effect/cluster"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import type * as SqlConnection from "@effect/sql/SqlConnection"
import { assert, describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Exit, Layer, Schedule, TestServices } from "effect"
import * as ShardingConfig from "../src/ShardingConfig.js"
import { MysqlContainer } from "./fixtures/utils-mysql.js"
import { PgContainer } from "./fixtures/utils-pg.js"

const StorageLive = SqlRunnerStorage.layer

describe("SqlRunnerStorage", () => {
  it.effect("bounds lock operations and rebuilds an unresponsive reserved connection", () => {
    const partition = makePartitionState()
    const layer = StorageLive.pipe(
      Layer.provideMerge(blackholeReservedConnection(partition)),
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
      partition.current = true

      const [elapsed, exit] = yield* storage.refresh(runnerAddress1, shards).pipe(
        Effect.exit,
        Effect.timed,
        TestServices.provideLive
      )
      assert(Exit.isFailure(exit))
      assert.isAtLeast(Duration.toMillis(elapsed), 90)
      assert.isBelow(Duration.toMillis(elapsed), 1000)

      partition.current = false
      expect(
        yield* storage.refresh(runnerAddress1, shards).pipe(
          Effect.retry({ times: 10, schedule: Schedule.spaced(20) }),
          TestServices.provideLive
        )
      ).toEqual(shards)
      assert.isAtLeast(partition.interruptedQueries, 1)
      assert.isAtLeast(partition.reservedConnections, 2)
    }).pipe(Effect.provide(layer))
  }, 60_000)
  ;([
    ["pg", Layer.orDie(PgContainer.ClientLive)],
    ["mysql", Layer.orDie(MysqlContainer.ClientLive)]
  ] as const).forEach(([label, client]) => {
    const prefix = `advisory_table_gate_${label}`
    const layer = SqlRunnerStorage.layerWith({ prefix }).pipe(
      Layer.provideMerge(client),
      Layer.provide(ShardingConfig.layer())
    )

    it.layer(layer, { timeout: 60_000 })(`${label} advisory locks`, (it) => {
      it.effect("does not create the locks table", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const rows = yield* sql.onDialectOrElse({
            pg: () => sql`SELECT COUNT(*) FROM pg_catalog.pg_tables WHERE tablename = ${prefix + "_locks"}`.values,
            mysql: () =>
              sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ${
                prefix + "_locks"
              }`.values,
            orElse: () => Effect.succeed([])
          })
          expect(Number(rows[0][0])).toEqual(0)
        }))
    })
  })
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

interface PartitionState {
  current: boolean
  activeQueries: number
  interruptedQueries: number
  reservedConnections: number
}

const makePartitionState = (): PartitionState => ({
  current: false,
  activeQueries: 0,
  interruptedQueries: 0,
  reservedConnections: 0
})

const blackholeReservedConnection = (partition: PartitionState) =>
  Layer.effect(
    SqlClient.SqlClient,
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const wrapConnection = (connection: SqlConnection.Connection): SqlConnection.Connection => {
        const execute = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.suspend(() => {
            partition.activeQueries++
            return Effect.suspend(function waitForConnection(): Effect.Effect<A, E, R> {
              return partition.current
                ? Effect.andThen(Effect.sleep(5), waitForConnection)
                : effect
            }).pipe(
              Effect.onExit((exit) =>
                Effect.sync(() => {
                  partition.activeQueries--
                  if (Exit.isFailure(exit) && Exit.isInterrupted(exit)) {
                    partition.interruptedQueries++
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
          executeUnprepared: (...args) => execute(connection.executeUnprepared(...args))
        }
      }
      const client: SqlClient.SqlClient = new Proxy(sql, {
        get(target, property, receiver) {
          if (property === "reserve") {
            return Effect.map(target.reserve, (connection) => {
              partition.reservedConnections++
              return wrapConnection(connection)
            })
          }
          if (property === "withoutTransforms") {
            return () => client
          }
          return Reflect.get(target, property, receiver)
        }
      })
      return client
    })
  ).pipe(Layer.provide(PgContainer.ClientLive))

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(Layer.unwrapScoped, Layer.provide(NodeFileSystem.layer))
