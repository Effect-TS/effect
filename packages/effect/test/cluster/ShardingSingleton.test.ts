import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Option, Queue } from "effect"
import {
  EntityAddress,
  EntityId,
  EntityType,
  MachineId,
  MessageStorage,
  Runner,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/cluster"
import * as ActiveTeardown from "effect/cluster/internal/interruptors"
import { TestClock } from "effect/testing"
import { TestEntity, TestEntityNoState, TestEntityState } from "./TestEntity.ts"

interface SingletonStorageState {
  assignSelf: boolean
  runner: Runner.Runner | undefined
}

const makeSingletonStorageState = (): SingletonStorageState => ({ assignSelf: true, runner: undefined })

const otherRunner = Runner.make({
  address: RunnerAddress.make("localhost", 5678),
  groups: ["singleton"],
  // With these fixed addresses, the weighted ring moves singleton:1 to this
  // runner. The ownership assertions below guard that fixture assumption.
  weight: 1000
})

const journalInterrupts = (driver: MessageStorage.MemoryDriver["Service"]) =>
  driver.journal.filter((envelope) => envelope._tag === "Interrupt").length

// Keep the destination shard local while only the singleton shard moves away.
const SingletonReassignmentSharding = (state: SingletonStorageState) => {
  const runnerStorage = Layer.effect(
    RunnerStorage.RunnerStorage,
    Effect.succeed(RunnerStorage.RunnerStorage.of({
      getRunners: Effect.sync(() => {
        if (!state.runner) return []
        if (state.assignSelf) return [[state.runner, true]] as const
        return [
          [state.runner, true],
          [otherRunner, true]
        ] as const
      }),
      register: (runner) =>
        Effect.sync(() => {
          state.runner = runner
          return MachineId.make(1)
        }),
      unregister: () => Effect.void,
      setRunnerHealth: () => Effect.void,
      acquire: (_address, shards) => Effect.succeed(globalThis.Array.from(shards)),
      refresh: (_address, shards) => Effect.succeed(globalThis.Array.from(shards)),
      release: () => Effect.void,
      releaseAll: () => Effect.void
    }))
  )
  return TestEntityNoState.pipe(
    Layer.provideMerge(Sharding.layer),
    Layer.provide(runnerStorage),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provideMerge(TestEntityState.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(Snowflake.layerGenerator),
    Layer.provide(ShardingConfig.layer({
      runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
      availableShardGroups: ["default", "singleton"],
      assignedShardGroups: ["default", "singleton"],
      shardsPerGroup: 1,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 10,
      refreshAssignmentsInterval: 10,
      sendRetryInterval: 10
    }))
  )
}

const singletonShard = ShardId.make("singleton", 1)
const destinationShard = ShardId.make("default", 1)

const waitForSingletonOwnership = Effect.fnUntraced(function*(
  sharding: Sharding.Sharding["Service"],
  owned: boolean
) {
  for (let i = 0; i < 100; i++) {
    if (sharding.hasShardId(singletonShard) === owned) return
    yield* TestClock.adjust(10)
  }
  assert.strictEqual(sharding.hasShardId(singletonShard), owned)
})

// These tests share the internal teardown registry, so do not run concurrently.
describe("Sharding singleton cancellation", { concurrent: false }, () => {
  for (const child of [false, true]) {
    it.effect(
      child
        ? "abandons a singleton child RPC from a pre-acquired client on reassignment"
        : "abandons a singleton RPC on reassignment",
      () =>
        Effect.gen(function*() {
          const storageState = makeSingletonStorageState()
          yield* Effect.gen(function*() {
            const sharding = yield* Sharding.Sharding
            const driver = yield* MessageStorage.MemoryDriver
            const state = yield* TestEntityState
            // Deliberately acquire the client outside the singleton's context.
            const client = (yield* TestEntity.client)("singleton-target")
            const stopped = yield* Deferred.make<void>()
            yield* waitForSingletonOwnership(sharding, true)
            yield* sharding.registerSingleton(
              "rpc-caller",
              Effect.gen(function*() {
                if (child) {
                  yield* client.Never().pipe(Effect.forkChild({ startImmediately: true }))
                  return yield* Effect.never
                } else {
                  yield* client.Never()
                }
              }).pipe(Effect.ensuring(Deferred.succeed(stopped, void 0))),
              { shardGroup: "singleton" }
            )
            yield* Queue.take(state.envelopes)
            assert.strictEqual(journalInterrupts(driver), 0)

            storageState.assignSelf = false
            yield* waitForSingletonOwnership(sharding, false)
            yield* Deferred.await(stopped)
            yield* TestClock.adjust(1)
            assert.isTrue(sharding.hasShardId(destinationShard), "Sharding and the destination stay alive")
            assert.strictEqual(journalInterrupts(driver), 0, "reassignment must not durably cancel the RPC")
            assert.strictEqual(Queue.sizeUnsafe(state.interrupts), 0)
          }).pipe(Effect.provide(SingletonReassignmentSharding(storageState)), Effect.scoped)
        })
    )
  }

  it.effect("persists explicit singleton-child cancellation outside teardown", () =>
    Effect.gen(function*() {
      const storageState = makeSingletonStorageState()
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const driver = yield* MessageStorage.MemoryDriver
        const state = yield* TestEntityState
        const client = (yield* TestEntity.client)("explicit-singleton-target")
        const childReady = yield* Deferred.make<Fiber.Fiber<void, unknown>>()
        yield* waitForSingletonOwnership(sharding, true)
        yield* sharding.registerSingleton(
          "explicit-caller",
          Effect.gen(function*() {
            const child = yield* client.Never().pipe(Effect.forkChild({ startImmediately: true }))
            yield* Deferred.succeed(childReady, child)
            return yield* Effect.never
          }),
          { shardGroup: "singleton" }
        )
        yield* Queue.take(state.envelopes)
        yield* Fiber.interrupt(yield* Deferred.await(childReady))
        yield* TestClock.adjust(1)
        assert.isTrue(sharding.hasShardId(singletonShard))
        assert.strictEqual(journalInterrupts(driver), 1)
        assert.strictEqual(Queue.sizeUnsafe(state.interrupts), 1)
      }).pipe(Effect.provide(SingletonReassignmentSharding(storageState)), Effect.scoped)
    }))

  it.effect("bounds singleton teardown to interruption finalization, not inherited context", () =>
    Effect.gen(function*() {
      const storageState = makeSingletonStorageState()
      yield* Effect.gen(function*() {
        const sharding = yield* Sharding.Sharding
        const driver = yield* MessageStorage.MemoryDriver
        const state = yield* TestEntityState
        const client = (yield* TestEntity.client)("finalizer-target")
        const outerScope = yield* Effect.scope
        const runLater = yield* Deferred.make<void>()
        const survivorReady = yield* Deferred.make<Fiber.Fiber<void, unknown>>()
        const finalizing = yield* Deferred.make<void>()
        const finish = yield* Deferred.make<void>()
        const stopped = yield* Deferred.make<void>()
        yield* waitForSingletonOwnership(sharding, true)
        yield* sharding.registerSingleton(
          "finalizer-caller",
          Effect.gen(function*() {
            // This fiber inherits singleton identity but outlives its local run.
            const survivor = yield* Deferred.await(runLater).pipe(
              Effect.andThen(client.Never()),
              Effect.forkIn(outerScope, { startImmediately: true })
            )
            yield* Deferred.succeed(survivorReady, survivor)
            return yield* Effect.never
          }).pipe(
            Effect.ensuring(Effect.gen(function*() {
              // Cancellation during finalization is still shard teardown.
              const child = yield* client.Never().pipe(
                Effect.interruptible,
                Effect.forkChild({ startImmediately: true })
              )
              yield* Queue.take(state.envelopes)
              yield* Fiber.interrupt(child)
              yield* Deferred.succeed(finalizing, void 0)
              yield* Deferred.await(finish)
            })),
            Effect.ensuring(Deferred.succeed(stopped, void 0))
          ),
          { shardGroup: "singleton" }
        )
        const survivor = yield* Deferred.await(survivorReady)
        // Release the finalizer barrier even if a setup assertion fails.
        yield* Effect.addFinalizer(() => Deferred.succeed(finish, void 0))
        storageState.assignSelf = false
        yield* waitForSingletonOwnership(sharding, false)
        yield* Deferred.await(finalizing)
        const duringFinalization = journalInterrupts(driver)
        const probe = EntityAddress.make({
          shardId: singletonShard,
          entityType: EntityType.make("singleton-teardown-probe"),
          entityId: EntityId.make("probe")
        })
        assert.isTrue(ActiveTeardown.isActive(probe), "tracking must remain active through finalization")
        yield* Deferred.succeed(finish, void 0)
        yield* Deferred.await(stopped)
        yield* TestClock.adjust(10)
        assert.isFalse(ActiveTeardown.isActive(probe), "teardown must release its shard tracking")

        // Do not let inherited identity suppress a later explicit cancellation.
        yield* Deferred.succeed(runLater, void 0)
        yield* Queue.take(state.envelopes)
        yield* Fiber.interrupt(survivor)
        yield* TestClock.adjust(1)
        assert.strictEqual(journalInterrupts(driver) - duringFinalization, 1)
        assert.isTrue(sharding.hasShardId(destinationShard))
        assert.strictEqual(duringFinalization, 0, "teardown must include singleton finalizers")
      }).pipe(Effect.provide(SingletonReassignmentSharding(storageState)), Effect.scoped)
    }))
})
