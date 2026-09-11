import {
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, it } from "@effect/vitest"
import { Effect, ExecutionStrategy, Exit, Layer, Option, Scope, TestClock } from "effect"
import { TestEntity, TestEntityNoState, TestEntityState } from "./TestEntity.js"

const layer = TestEntityNoState.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provideMerge(TestEntityState.Default),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(
    ShardingConfig.layer({
      shardsPerGroup: 1,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 100,
      refreshAssignmentsInterval: 100,
      sendRetryInterval: 10,
      preemptiveShutdown: false
    })
  )
)

for (const reason of ["idle reap", "registration scope close"]) {
  it.effect(`nested persisted call survives caller ${reason}`, () =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState
      const scope = yield* Scope.fork(yield* Effect.scope, ExecutionStrategy.sequential)
      const caller = Entity.make("NestedTeardownCaller", [Rpc.make("Arm").annotate(ClusterSchema.Persisted, false)])
      yield* sharding.registerEntity(
        caller,
        Effect.gen(function*() {
          yield* (yield* TestEntity.client)("nested-target").Never().pipe(Effect.forkScoped)
          return { Arm: () => Effect.void }
        }),
        { maxIdleTime: 1 }
      ).pipe(Scope.extend(scope))
      yield* TestClock.adjust(1)
      yield* (yield* caller.client)("one").Arm()
      yield* TestClock.adjust(1)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))
      if (reason === "registration scope close") {
        yield* Scope.close(scope, Exit.void)
      } else {
        for (let i = 0; i < 12 && (yield* sharding.activeEntityCount) > 1; i++) yield* TestClock.adjust(5000)
      }
      assert.strictEqual(yield* sharding.activeEntityCount, 1)
      assert.isFalse(yield* sharding.isShutdown)
      assert.strictEqual(driver.journal.filter((e) => e._tag === "Interrupt").length, 0)
      assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(0))
    }).pipe(Effect.scoped, Effect.provide(layer)))
}
