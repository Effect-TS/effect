import { Pod, PodAddress, ShardId, ShardStorage, SqlShardStorage } from "@effect/cluster"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
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
      it.effect("savePods", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* storage.savePods([[
            podAddress1,
            Pod.make({
              address: podAddress1,
              version: 1
            })
          ]])
          expect(yield* storage.getPods).toEqual([[
            podAddress1,
            Pod.make({
              address: podAddress1,
              version: 1
            })
          ]])
        }).pipe(Effect.repeatN(2)))

      it.effect("saveAssignments", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          yield* storage.saveAssignments([
            [ShardId.make(1), Option.some(podAddress1)],
            [ShardId.make(2), Option.none()]
          ])
          expect(yield* storage.getAssignments).toEqual(
            new Map([
              [ShardId.make(1), Option.some(podAddress1)],
              [ShardId.make(2), Option.none()]
            ])
          )
        }).pipe(Effect.repeatN(2)))

      it.effect("acquireShards", () =>
        Effect.gen(function*() {
          const storage = yield* ShardStorage.ShardStorage

          let acquired = yield* storage.acquire(podAddress1, [1, 2, 3] as any)
          expect(acquired).toEqual([1, 2, 3])
          acquired = yield* storage.acquire(podAddress1, [1, 2, 3] as any)
          expect(acquired).toEqual([1, 2, 3])

          const refreshed = yield* storage.refresh(podAddress1, [1, 2, 3] as any)
          expect(refreshed).toEqual([1, 2, 3])

          acquired = yield* storage.acquire(podAddress2, [1, 2, 3] as any)
          expect(acquired).toEqual([])
        }))
    })
  })
})

const podAddress1 = PodAddress.make("localhost", 1234)
const podAddress2 = PodAddress.make("localhost", 1235)

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({
    filename: dir + "/test.db"
  })
}).pipe(Layer.unwrapScoped, Layer.provide(NodeFileSystem.layer))
