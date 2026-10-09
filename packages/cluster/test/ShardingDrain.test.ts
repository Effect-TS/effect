import type { Runner } from "@effect/cluster"
import {
  ClusterSchema,
  Entity,
  EntityId,
  MachineId,
  MessageStorage,
  RunnerAddress,
  Runners,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Equal, Exit, Fiber, Layer, Option, Scope, TestClock } from "effect"
import * as RunnerHealth from "../src/RunnerHealth.js"

const PingEntity = Entity.make("PingEntity", [
  Rpc.make("Ping").annotate(ClusterSchema.Persisted, false)
])

const shardsPerGroup = 8
const allShards = Array.from({ length: shardsPerGroup }, (_, i) => ShardId.make("default", i + 1))
const runnerA = RunnerAddress.make("localhost", 34531)
const runnerB = RunnerAddress.make("localhost", 34532)

// a shared RunnerStorage with real lock ownership (no expiry): a lock is only
// handed to a new owner once the previous owner has released it
const makeLockStorage = Effect.sync(() => {
  const runners = new Map<string, Runner.Runner>()
  const locks = new Map<string, RunnerAddress.RunnerAddress>()
  const acquired: Array<readonly [RunnerAddress.RunnerAddress, ShardId.ShardId]> = []
  let id = 0
  let releaseAllGate: Effect.Effect<void> = Effect.void
  const owner = (shardId: ShardId.ShardId) => locks.get(shardId.toString())
  const storage = RunnerStorage.RunnerStorage.of({
    register: (runner) =>
      Effect.sync(() => {
        runners.set(runner.address.toString(), runner)
        return MachineId.make(id++)
      }),
    unregister: (address) => Effect.sync(() => runners.delete(address.toString())),
    getRunners: Effect.sync(() => Array.from(runners.values(), (runner) => [runner, true] as const)),
    setRunnerHealth: () => Effect.void,
    acquire: (address, shardIds) =>
      Effect.sync(() =>
        Array.from(shardIds).filter((shardId) => {
          const current = owner(shardId)
          if (current && !Equal.equals(current, address)) return false
          if (!current) acquired.push([address, shardId])
          locks.set(shardId.toString(), address)
          return true
        })
      ),
    refresh: (address, shardIds) =>
      Effect.sync(() => Array.from(shardIds).filter((shardId) => Equal.equals(owner(shardId), address))),
    release: (address, shardId) =>
      Effect.sync(() => {
        if (Equal.equals(owner(shardId), address)) locks.delete(shardId.toString())
      }),
    releaseAll: (address) =>
      Effect.suspend(() => releaseAllGate).pipe(Effect.andThen(Effect.sync(() => {
        for (const [shardId, holder] of locks) {
          if (Equal.equals(holder, address)) locks.delete(shardId)
        }
      })))
  })
  return {
    storage,
    acquired,
    ownedBy: (address: RunnerAddress.RunnerAddress) =>
      allShards.filter((shardId) => Equal.equals(owner(shardId), address)),
    holdReleaseAll: (gate: Effect.Effect<void>) => {
      releaseAllGate = gate
    }
  }
})

const startRunner = Effect.fnUntraced(function*(
  address: RunnerAddress.RunnerAddress,
  storage: RunnerStorage.RunnerStorage["Type"]
) {
  const scope = yield* Scope.make()
  const context = yield* Layer.build(
    PingEntity.toLayer(Effect.succeed({ Ping: () => Effect.void })).pipe(
      Layer.provideMerge(Sharding.layer),
      Layer.provide(RunnerHealth.layerNoop),
      Layer.provide(Runners.layerNoop),
      Layer.provide(MessageStorage.layerMemory),
      Layer.provide(Layer.succeed(RunnerStorage.RunnerStorage, storage)),
      Layer.provide(ShardingConfig.layer({
        runnerAddress: Option.some(address),
        shardsPerGroup,
        refreshAssignmentsInterval: 50,
        entityMessagePollInterval: 50,
        shardLockRefreshInterval: 100,
        entityTerminationTimeout: 0
      }))
    )
  ).pipe(Scope.extend(scope))
  const sharding = Context.get(context, Sharding.Sharding)
  const ping = (entityId: string) =>
    Effect.flatMap(PingEntity.client, (client) => client(entityId).Ping()).pipe(Effect.provide(context))
  // an entity id that lands on one of the given shards
  const entityOn = (shardIds: ReadonlyArray<ShardId.ShardId>) => {
    for (let i = 0;; i++) {
      const shardId = sharding.getShardId(EntityId.make(`e${i}`), "default")
      if (shardIds.some((id) => Equal.equals(id, shardId))) return `e${i}`
    }
  }
  return { sharding, ping, entityOn, close: Scope.close(scope, Exit.void) }
})

const waitUntil = (predicate: () => boolean, message: string, maxMillis = 10_000) =>
  Effect.gen(function*() {
    for (let elapsed = 0; elapsed <= maxMillis; elapsed += 100) {
      if (predicate()) return
      yield* TestClock.adjust(100)
    }
    assert.fail(`timed out waiting until ${message}`)
  })

const runnerC = RunnerAddress.make("localhost", 34533)

describe("Sharding graceful drain", () => {
  it.effect(
    "graceful shutdown hands every shard to a live peer before the final releaseAll",
    () => {
      const allowReleaseAll = Effect.unsafeMakeLatch()
      return Effect.gen(function*() {
        const locks = yield* makeLockStorage
        const a = yield* startRunner(runnerA, locks.storage)
        const b = yield* startRunner(runnerB, locks.storage)
        yield* waitUntil(
          () => locks.ownedBy(runnerA).length > 0 && locks.ownedBy(runnerB).length > 0,
          "A and B split the shards"
        )
        const aShards = locks.ownedBy(runnerA)

        // SIGTERM: A shuts down, but its last step (releaseAll) does not finish,
        // as when the process is killed before the scope has closed
        locks.holdReleaseAll(allowReleaseAll.await)
        const closingA = yield* Effect.fork(a.close)

        // the per-shard handoff already gave B every shard, no lock expiry needed
        yield* waitUntil(() => locks.ownedBy(runnerB).length === shardsPerGroup, "B owns every shard", 5_000)
        assert.isNull(closingA.unsafePoll())
        yield* b.ping(b.entityOn(aShards))

        yield* allowReleaseAll.open
        yield* Fiber.join(closingA)
        yield* b.close
      }).pipe(Effect.ensuring(allowReleaseAll.open))
    },
    30_000
  )

  it.effect(
    "a runner can drain before its scope closes and does not adopt shards freed by a peer",
    () =>
      Effect.gen(function*() {
        const locks = yield* makeLockStorage
        const a = yield* startRunner(runnerA, locks.storage)
        const b = yield* startRunner(runnerB, locks.storage)
        yield* waitUntil(
          () => locks.ownedBy(runnerA).length > 0 && locks.ownedBy(runnerB).length > 0,
          "A and B split the shards"
        )

        // preStop: the process is healthy and its Sharding scope is still open
        const drain = (a.sharding as { readonly drain?: Effect.Effect<void> }).drain
        assert.isDefined(drain, "Sharding has no way to hand shards off before its scope closes")
        yield* drain!
        const acquiredAfterDrain = locks.acquired.length
        yield* waitUntil(() => locks.ownedBy(runnerB).length === shardsPerGroup, "B owns every shard", 5_000)

        // rollout: a new pod joins, then B exits; the draining A must not adopt
        const c = yield* startRunner(runnerC, locks.storage)
        yield* waitUntil(() => locks.ownedBy(runnerC).length > 0, "C joins")
        yield* b.close
        yield* waitUntil(() => locks.ownedBy(runnerC).length === shardsPerGroup, "C owns every shard", 5_000)
        assert.deepStrictEqual(
          locks.acquired.slice(acquiredAfterDrain).filter(([address]) => Equal.equals(address, runnerA)),
          []
        )

        yield* a.close
        yield* c.close
      }),
    30_000
  )
})
