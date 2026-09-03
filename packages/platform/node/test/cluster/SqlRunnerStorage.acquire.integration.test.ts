import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { RunnerAddress, ShardId, ShardingConfig, SqlRunnerStorage } from "effect/unstable/cluster"
import { PgContainer } from "../fixtures/pg-utils.ts"

describe("SqlRunnerStorage.acquire", () => {
  it.layer(PgContainer.layerClient, { timeout: "30 seconds", excludeTestServices: true })((it) => {
    it.effect("returns only the requested shards", () =>
      Effect.gen(function*() {
        const storage = yield* SqlRunnerStorage.make({ prefix: "acquire_requested_shards" })
        const address = RunnerAddress.make("localhost", 41001)
        const one = ShardId.make("default", 1)
        const two = ShardId.make("default", 2)

        yield* storage.acquire(address, [one])

        expect(yield* storage.acquire(address, [two])).toEqual([two])
      }).pipe(Effect.provide(ShardingConfig.layer({ shardsPerGroup: 2 }))))
  })
})
