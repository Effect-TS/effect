import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { RunnerAddress, RunnerStorage, ShardId } from "effect/unstable/cluster"

describe("RunnerStorage", () => {
  it.effect("does not grant an owned shard to a second runner", () =>
    Effect.gen(function*() {
      const storage = yield* RunnerStorage.makeMemory
      const first = RunnerAddress.make("localhost", 41001)
      const second = RunnerAddress.make("localhost", 41002)
      const shard = ShardId.make("default", 1)
      assert.deepStrictEqual(yield* storage.acquire(first, [shard]), [shard])
      assert.deepStrictEqual(yield* storage.acquire(second, [shard]), [])
    }))

  it.effect("memory acquire accepts a one-shot iterable", () =>
    Effect.gen(function*() {
      const storage = yield* RunnerStorage.makeMemory
      const address = RunnerAddress.make("localhost", 1234)
      const shards = [ShardId.make("default", 1), ShardId.make("default", 2)]
      const acquired = yield* storage.acquire(
        address,
        (function*() {
          yield* shards
        })()
      )

      assert.deepStrictEqual(acquired, shards)
      assert.deepStrictEqual(yield* storage.refresh(address, []), shards)
    }))
})
