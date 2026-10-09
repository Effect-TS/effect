import type { ShardId } from "@effect/cluster"
import {
  EntityId,
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
import { Effect, Equal, Fiber, HashRing, Layer, Option, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"
import { TestEntity, TestEntityNoState, TestEntityState } from "./TestEntity.js"

const runnerA = RunnerAddress.make("localhost", 34531)

// a second address that wins shard 1 on the ring, so registering it moves shard 1 off A
const runnerB = (() => {
  const ring = HashRing.make<RunnerAddress.RunnerAddress>()
  HashRing.add(ring, runnerA)
  for (let port = 34532; port < 36000; port++) {
    const candidate = RunnerAddress.make("localhost", port)
    HashRing.add(ring, candidate)
    if (Equal.equals(HashRing.getShards(ring, 1)?.[0], candidate)) return candidate
    HashRing.remove(ring, candidate)
  }
  throw new Error("no winning address found")
})()

// memory storage with exclusive shard locks
const makeLockingStorage = Effect.gen(function*() {
  const base = yield* RunnerStorage.makeMemory
  const locks = new Map<string, RunnerAddress.RunnerAddress>()
  const holder = (shardId: ShardId.ShardId) => locks.get(shardId.toString())
  const storage = RunnerStorage.RunnerStorage.of({
    ...base,
    acquire: (address, shardIds) =>
      Effect.sync(() =>
        Array.from(shardIds).filter((shardId) => {
          const current = holder(shardId)
          if (current && !Equal.equals(current, address)) return false
          locks.set(shardId.toString(), address)
          return true
        })
      ),
    refresh: (address, shardIds) =>
      Effect.sync(() => Array.from(shardIds).filter((shardId) => Equal.equals(holder(shardId), address))),
    release: (address, shardId) =>
      Effect.sync(() => {
        if (Equal.equals(holder(shardId), address)) locks.delete(shardId.toString())
      }),
    releaseAll: (address) =>
      Effect.sync(() => {
        for (const [key, current] of locks) {
          if (Equal.equals(current, address)) locks.delete(key)
        }
      })
  })
  return { storage, holder } as const
})

const setup = Effect.gen(function*() {
  const { holder, storage } = yield* makeLockingStorage
  const sentTo: Array<RunnerAddress.RunnerAddress> = []
  // B has not acquired the shard yet, so it answers EntityNotAssignedToRunner (as Runners.makeNoop does)
  const RecordingRunners = Layer.scoped(
    Runners.Runners,
    Effect.map(Runners.makeNoop, (runners) => ({
      ...runners,
      send: (options) =>
        Effect.suspend(() => {
          sentTo.push(options.address)
          return runners.send(options)
        })
    }))
  ).pipe(Layer.provide(Snowflake.layerGenerator))

  const layer = TestEntityNoState.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provideMerge(TestEntityState.Default),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(RecordingRunners),
    Layer.provide(MessageStorage.layerMemory),
    Layer.provide(Layer.succeed(RunnerStorage.RunnerStorage, storage)),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(runnerA),
      shardsPerGroup: 1,
      entityTerminationTimeout: 1_000,
      entityMessagePollInterval: 50,
      refreshAssignmentsInterval: 50,
      shardLockRefreshInterval: 100,
      sendRetryInterval: 50
    }))
  )
  return { holder, layer, sentTo, storage } as const
})

// A acquires shard 1 and starts an in-flight request, which keeps A's
// teardown of the shard open (graceful termination); then the ring moves
// the shard to B
const handoff = <A, E, R>(
  body: (ctx: {
    readonly client: ReturnType<Effect.Effect.Success<typeof TestEntity.client>>
    readonly inFlight: Fiber.RuntimeFiber<void, unknown>
    readonly shardId: ShardId.ShardId
    readonly holder: (shardId: ShardId.ShardId) => RunnerAddress.RunnerAddress | undefined
    readonly sentTo: ReadonlyArray<RunnerAddress.RunnerAddress>
    readonly fibers: Array<Fiber.RuntimeFiber<unknown, unknown>>
  }) => Effect.Effect<A, E, R>
) =>
  Effect.gen(function*() {
    const { holder, layer, sentTo, storage } = yield* setup
    const fibers: Array<Fiber.RuntimeFiber<unknown, unknown>> = []
    return yield* Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      const state = yield* TestEntityState
      const client = (yield* TestEntity.client)("1")
      const shardId = sharding.getShardId(EntityId.make("1"), "default")
      while (!sharding.hasShardId(shardId)) yield* TestClock.adjust(50)

      const inFlight = yield* client.NeverVolatile().pipe(Effect.fork)
      fibers.push(inFlight)
      yield* TestClock.adjust(1)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))

      yield* storage.register(Runner.make({ address: runnerB, groups: ["default"], weight: 1 }), true)
      yield* TestClock.adjust(100)

      // A is alive and still holds the lock, so B cannot serve the shard yet
      assert.deepStrictEqual(holder(shardId), runnerA)

      return yield* body({ client, inFlight, shardId, holder, sentTo, fibers })
    }).pipe(
      Effect.ensuring(Effect.gen(function*() {
        for (const fiber of fibers) yield* Effect.fork(Fiber.interrupt(fiber))
        yield* TestClock.adjust(2_000)
      })),
      Effect.provide(layer),
      Effect.scoped
    )
  })

describe("Sharding shard handoff", () => {
  it.effect(
    "does not route requests away from the runner still holding the shard lock",
    () =>
      handoff(({ client, fibers, holder, sentTo, shardId }) =>
        Effect.gen(function*() {
          fibers.push(yield* client.GetUserVolatile({ id: 1 }).pipe(Effect.fork))
          yield* TestClock.adjust(100)

          assert.deepStrictEqual(holder(shardId), runnerA)
          assert.deepStrictEqual(sentTo, [], "requests were sent to a runner that does not hold the shard lock")
        })
      ),
    20_000
  )

  it.effect(
    "delivers a client interrupt to an in-flight request while the shard drains",
    () =>
      handoff(({ inFlight }) =>
        Effect.gen(function*() {
          const state = yield* TestEntityState
          // the caller gives up; the handler on A (still the lock holder) should observe it
          yield* Effect.fork(Fiber.interrupt(inFlight))
          yield* TestClock.adjust(100)

          assert.deepStrictEqual(
            state.interrupts.unsafeSize(),
            Option.some(1),
            "client interrupt did not reach the entity"
          )
        })
      ),
    20_000
  )
})
