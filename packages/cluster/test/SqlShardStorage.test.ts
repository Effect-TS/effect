import { Runner, RunnerAddress, ShardId, ShardStorage, SqlShardStorage } from "@effect/cluster"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Equal, Layer, MutableHashSet, Option } from "effect"
import { MysqlContainer } from "./fixtures/utils-mysql.js"
import { PgContainer } from "./fixtures/utils-pg.js"

const StorageLive = SqlShardStorage.layer

describe("SqlMessageStorage", () => {
  ;([
    ["pg", Layer.orDie(PgContainer.ClientLive)],
    ["mysql", Layer.orDie(MysqlContainer.ClientLive)],
    ["sqlite", Layer.orDie(SqliteLayer)]
  ] as const).forEach(([label, layer]) => {
    it.layer(StorageLive.pipe(Layer.provideMerge(layer)), {
      timeout: 30000
    })(label, (it) => {
      it.effect("saveRunners", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* storage.saveRunners([[
            runnerAddress1,
            Runner.make({
              address: runnerAddress1,
              groups: ["default"],
              version: 1
            })
          ]])
          expect(yield* storage.getRunners).toEqual([[
            runnerAddress1,
            Runner.make({
              address: runnerAddress1,
              groups: ["default"],
              version: 1
            })
          ]])
        }).pipe(Effect.repeatN(2)))

      it.effect("saveAssignments", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* storage.saveAssignments([
            [ShardId.make("default", 1), Option.some(runnerAddress1)],
            [ShardId.make("default", 2), Option.none()]
          ])
          expect(Equal.equals(
            yield* storage.getAssignments,
            MutableHashSet.fromIterable([
              [ShardId.make("default", 1), Option.some(runnerAddress1)],
              [ShardId.make("default", 2), Option.none()]
            ])
          ))
        }).pipe(Effect.repeatN(2)))

      it.effect("acquireShards", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

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

          acquired = yield* storage.acquire(runnerAddress2, [
            ShardId.make("default", 1),
            ShardId.make("default", 2),
            ShardId.make("default", 3)
          ])
          expect(acquired).toEqual([])
        }))
    })
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
}).pipe(Layer.unwrapScoped, Layer.provide(NodeFileSystem.layer))
