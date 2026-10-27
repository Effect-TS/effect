import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer } from "effect"
import { RunnerAddress, RunnerStorage, ShardId, ShardingConfig, SqlRunnerStorage } from "effect/cluster"
import { TestClock } from "effect/testing"

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({ filename: dir + "/test.db" })
}).pipe(Layer.unwrap, Layer.provide(NodeFileSystem.layer))

describe("SqlRunnerStorage", () => {
  it.effect("owns a lease until its expiration passes without a refresh", () =>
    Effect.gen(function*() {
      const storage = yield* RunnerStorage.RunnerStorage
      const address = RunnerAddress.make("localhost", 1234)
      const shards = [ShardId.make("default", 1)]

      assert.deepStrictEqual(yield* storage.acquire(address, shards), shards)
      assert.deepStrictEqual(yield* storage.owned(address, shards), shards)

      yield* TestClock.adjust(6_000)
      assert.deepStrictEqual(yield* storage.refresh(address, shards), shards)

      // Past the acquisition's expiration, inside the refresh's.
      yield* TestClock.adjust(6_000)
      assert.deepStrictEqual(yield* storage.owned(address, shards), shards)

      // Past the refresh's expiration.
      yield* TestClock.adjust(5_000)
      assert.deepStrictEqual(yield* storage.owned(address, shards), [])
    }).pipe(
      Effect.provide(SqlRunnerStorage.layer.pipe(
        Layer.provideMerge(SqliteLayer),
        Layer.provide(ShardingConfig.layer({ shardLockExpiration: 10_000 }))
      ))
    ))
})
