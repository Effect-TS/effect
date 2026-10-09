import type { Runner as RunnerType, ShardId } from "@effect/cluster"
import {
  EntityId,
  MachineId,
  MessageStorage,
  Runner,
  RunnerAddress,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Layer, Mailbox, Option, TestClock } from "effect"
import { ResourceMap } from "../src/internal/resourceMap.js"
import * as RunnerHealth from "../src/RunnerHealth.js"
import { TestEntity, TestEntityNoState, TestEntityState } from "./TestEntity.js"

describe("Entity lifecycle around shard release", () => {
  it.effect("does not register an entity built after its shard was released", () =>
    Effect.gen(function*() {
      const storage = makeStorageState()
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const entityState = yield* TestEntityState
        const client = (yield* TestEntity.client)("1")
        const shardId = sharding.getShardId(EntityId.make("1"), "default")
        while (!sharding.hasShardId(shardId)) {
          yield* TestClock.adjust(10)
        }

        entityState.buildLatch.unsafeClose()
        const entityFiber = yield* Effect.fork(client.GetUserVolatile({ id: 1 }))
        while (entityState.layerBuilds.current === 0) {
          yield* TestClock.adjust(1)
        }

        storage.assignSelf = false
        while (storage.releaseCalls.length === 0) {
          yield* TestClock.adjust(10)
        }
        assert.isFalse(sharding.hasShardId(shardId))

        entityState.buildLatch.unsafeOpen()
        yield* TestClock.adjust(10)

        assert.strictEqual(yield* sharding.activeEntityCount, 0)
        assert.strictEqual(entityState.envelopes.unsafeSize(), Option.some(0))
        assert.isNull(entityFiber.unsafePoll())
      }).pipe(Effect.provide(makeLayer(storage)), Effect.scoped)
    }))
})

describe("ResourceMap", () => {
  it.effect("closes the scope of a failed lookup", () =>
    Effect.gen(function*() {
      let finalized = 0
      const map = yield* ResourceMap.make((_key: string) =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() => Effect.sync(() => finalized++))
          return yield* Effect.fail("failed")
        })
      )
      const exit = yield* Effect.exit(map.get("key"))
      assert.isTrue(Exit.isFailure(exit))
      assert.strictEqual(finalized, 1)
    }).pipe(Effect.scoped))

  it.effect("closes the scope of an interrupted lookup", () =>
    Effect.gen(function*() {
      let finalized = 0
      const started = yield* Mailbox.make<void>()
      const map = yield* ResourceMap.make((_key: string) =>
        Effect.gen(function*() {
          yield* Effect.addFinalizer(() => Effect.sync(() => finalized++))
          yield* started.offer(void 0)
          return yield* Effect.never
        })
      )
      const fiber = yield* Effect.fork(map.get("key"))
      yield* started.take
      yield* Fiber.interrupt(fiber)
      assert.strictEqual(finalized, 1)
    }).pipe(Effect.scoped))
})

interface StorageState {
  assignSelf: boolean
  runner: RunnerType.Runner | undefined
  readonly releaseCalls: Array<ShardId.ShardId>
}

const makeStorageState = (): StorageState => ({
  assignSelf: true,
  runner: undefined,
  releaseCalls: []
})

const otherRunner = Runner.make({
  address: RunnerAddress.make("localhost", 5678),
  groups: ["default"],
  weight: 1
})

const makeStorage = (state: StorageState) =>
  RunnerStorage.RunnerStorage.of({
    getRunners: Effect.sync(() => {
      if (!state.runner) return []
      return state.assignSelf ? [[state.runner, true]] : [[state.runner, false], [otherRunner, true]]
    }),
    register: (runner) =>
      Effect.sync(() => {
        state.runner = runner
        return MachineId.make(1)
      }),
    unregister: () => Effect.void,
    setRunnerHealth: () => Effect.void,
    acquire: (_address, shardIds) => Effect.succeed(Array.from(shardIds)),
    refresh: (_address, shardIds) => Effect.succeed(Array.from(shardIds)),
    release: (_address, shardId) =>
      Effect.sync(() => {
        state.releaseCalls.push(shardId)
      }),
    releaseAll: () => Effect.void
  })

const makeLayer = (state: StorageState) =>
  TestEntityNoState.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(Layer.sync(RunnerStorage.RunnerStorage, () => makeStorage(state))),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provideMerge(TestEntityState.Default),
    Layer.provide(Runners.layerNoop),
    Layer.provide([MessageStorage.layerMemory, Snowflake.layerGenerator]),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
      shardsPerGroup: 1,
      shardLockExpiration: 3000,
      shardLockRefreshInterval: 100,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 10,
      refreshAssignmentsInterval: 10,
      sendRetryInterval: 10
    }))
  )
