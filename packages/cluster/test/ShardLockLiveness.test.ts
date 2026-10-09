import {
  ClusterSchema,
  Entity,
  MessageStorage,
  Runner,
  RunnerAddress,
  Runners,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig,
  SqlRunnerStorage
} from "@effect/cluster"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Option, TestClock, TestServices } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import { PgContainer } from "./fixtures/utils-pg.js"

const SqliteLayer = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return SqliteClient.layer({ filename: dir + "/test.db" })
}).pipe(Layer.unwrapScoped, Layer.provide(NodeFileSystem.layer))

const shard = ShardId.make("default", 1)
const deadAddress = RunnerAddress.make("dead", 1)
const liveAddress = RunnerAddress.make("live", 2)

const PingEntity = Entity.make("PingEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false)
])

describe("Shard lock liveness", () => {
  ;([
    ["sqlite", Layer.orDie(SqliteLayer)],
    ["pg", Layer.orDie(PgContainer.ClientLive)]
  ] as const).forEach(([label, client]) => {
    it.effect(
      `${label} (no advisory): a live runner reclaims a lock whose holder has no runner row`,
      () =>
        Effect.gen(function*() {
          const storage = yield* RunnerStorage.RunnerStorage

          // The holder acquires, then loses its runner row (unregistered or reaped
          // by another runner's stale-heartbeat cleanup) but keeps refreshing.
          yield* storage.register(Runner.make({ address: deadAddress, groups: ["default"], weight: 1 }), true)
          assert.deepStrictEqual(yield* storage.acquire(deadAddress, [shard]), [shard])
          yield* storage.unregister(deadAddress)
          assert.deepStrictEqual(yield* storage.refresh(deadAddress, [shard]), [shard])

          yield* storage.register(Runner.make({ address: liveAddress, groups: ["default"], weight: 1 }), true)
          assert.deepStrictEqual(
            (yield* storage.getRunners).map(([runner]) => runner.address),
            [liveAddress]
          )

          // The holder has no runner row, so a live runner should get the lock.
          assert.deepStrictEqual(yield* storage.acquire(liveAddress, [shard]), [shard])
        }).pipe(
          Effect.provide(
            SqlRunnerStorage.layerWith({ prefix: "dead_holder" }).pipe(
              Layer.provide(client),
              Layer.provide(ShardingConfig.layer({ shardLockDisableAdvisory: true }))
            )
          ),
          TestServices.provideLive
        ),
      60_000
    )
  })

  it.scoped("a volatile request to a shard that never gets an owner eventually fails", () =>
    Effect.gen(function*() {
      const makeClient = yield* PingEntity.client
      const fiber = yield* Effect.fork(makeClient("1").Ping())

      // No runner ever registers, so the shard never gets an owner.
      yield* TestClock.adjust("2 minutes")

      const done = fiber.unsafePoll() !== null
      // The client's Interrupt envelope also retries on the TestClock.
      yield* Effect.fork(Fiber.interrupt(fiber))
      yield* TestClock.adjust("10 seconds")
      assert.isTrue(done, "request is still retrying after 2 minutes")
    }).pipe(
      Effect.provide(
        PingEntity.toLayer(Effect.succeed({ Ping: () => Effect.void })).pipe(
          Layer.provideMerge(Sharding.layer),
          Layer.provide([RunnerHealth.layerNoop, RunnerStorage.layerMemory]),
          Layer.provide(Runners.layerNoop),
          Layer.provide(MessageStorage.layerMemory),
          Layer.provide(ShardingConfig.layer({
            runnerAddress: Option.none(),
            entityTerminationTimeout: 0,
            sendRetryInterval: 1000
          }))
        )
      )
    ))
})
