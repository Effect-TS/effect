import {
  ClusterError,
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, Layer, Option, Schema, Scope, TestClock, TestServices } from "effect"
import { ResourceRef } from "../src/internal/resourceRef.js"
import { makeRequest } from "./fixtures/message-storage.js"
import { TestEntity, TestEntityNoState, TestEntityState } from "./TestEntity.js"

const TestShardingConfig = ShardingConfig.layer({
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})
const TestSharding = TestEntityNoState.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provideMerge(TestEntityState.Default),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(TestShardingConfig)
)

it.effect("uses services provided when registering an entity", () =>
  Effect.gen(function*() {
    const sharding = yield* Sharding.Sharding
    yield* sharding.registerEntity(RegistrationContextEntity, RegistrationContextHandlers).pipe(
      Effect.provideService(RegistrationContext, "registration")
    )
    yield* TestClock.adjust(1)

    const client = (yield* RegistrationContextEntity.client)("1")
    assert.strictEqual(yield* client.Read(), "registration")
  }).pipe(
    Effect.provide(TestSharding),
    Effect.provideService(RegistrationContext, "construction"),
    Effect.scoped
  ))

class RegistrationContext
  extends Context.Tag("effect/test/cluster/RegistrationContext")<RegistrationContext, string>()
{}

const RegistrationContextEntity = Entity.make("RegistrationContextEntity", [
  Rpc.make("Read", { success: Schema.String }).annotate(ClusterSchema.Persisted, false)
])

const RegistrationContextHandlers = Effect.map(
  RegistrationContext,
  (value) => RegistrationContextEntity.of({ Read: () => Effect.succeed(value) })
)

describe("v3 sharding backports", () => {
  it.effect("holds durable messages while entity layers are still building", () =>
    Effect.gen(function*() {
      const config = ShardingConfig.layer({
        entityMailboxCapacity: 10,
        entityRegistrationTimeout: 6000,
        entityTerminationTimeout: 0,
        entityMessagePollInterval: 100,
        sendRetryInterval: 100,
        refreshAssignmentsInterval: 100
      })
      const env = TestEntityNoState.pipe(
        Layer.provideMerge(Sharding.layer),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(Runners.layerNoop),
        Layer.provide(config)
      )
      const delayedEnv = TestEntityNoState.pipe(
        Layer.provide(Layer.effectDiscard(Effect.sleep(10_000))),
        Layer.provideMerge(Sharding.layer),
        Layer.provide(RunnerStorage.layerMemory),
        Layer.provide(RunnerHealth.layerNoop),
        Layer.provide(Runners.layerNoop),
        Layer.provide(config)
      )
      const driver = yield* MessageStorage.MemoryDriver
      const state = yield* TestEntityState

      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const makeClient = yield* TestEntity.client
        const client = makeClient("1")
        yield* client.RequestWithKey({ key: "slow-registration" }).pipe(Effect.fork)
        yield* TestClock.adjust(1)
      }).pipe(
        Effect.provide(env),
        Effect.scoped
      )

      assert.strictEqual(driver.journal.length, 1)
      assert.strictEqual(driver.replyIds.size, 0)
      assert.strictEqual(driver.unprocessed.size, 1)

      const fiber = yield* Effect.never.pipe(
        Effect.provide(delayedEnv),
        Effect.scoped,
        Effect.fork
      )

      yield* TestClock.adjust(7500)
      assert.strictEqual(driver.replyIds.size, 0)
      assert.strictEqual(driver.unprocessed.size, 1)

      yield* TestClock.adjust(2500)
      yield* state.messages.offer(void 0)
      yield* TestClock.adjust(100)

      assert.strictEqual(driver.replyIds.size, 1)
      assert.strictEqual(driver.unprocessed.size, 0)
      yield* Fiber.interrupt(fiber)
    }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
      Layer.provide(ShardingConfig.layer({})),
      Layer.merge(TestEntityState.Default)
    ))))

  it.effect("volatile discard returns while the handler is still processing", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const state = yield* TestEntityState
      const client = (yield* TestEntity.client)("discard")
      const result = yield* client.NeverVolatile(void 0, { discard: true }).pipe(
        Effect.timeoutOption(100),
        TestServices.provideLive
      )
      assert(Option.isSome(result), "volatile discard waited for the handler reply")
      assert.isUndefined(result.value)
      assert.deepStrictEqual(state.envelopes.unsafeSize(), Option.some(1))
    }).pipe(Effect.provide(TestSharding)))
  for (const persisted of [false, true]) {
    for (const discard of [false, true]) {
      for (const preemptiveShutdown of [false, true]) {
        it.effect(`settles outgoing sends after shutdown (persisted=${persisted}, discard=${discard}, preemptive=${preemptiveShutdown})`, () =>
          Effect.gen(function*() {
            const storage = yield* MessageStorage.MessageStorage
            const rpc = Rpc.make("ShutdownPing").annotate(ClusterSchema.Persisted, persisted)
            const request = yield* makeRequest({ rpc, payload: undefined })
            const scope = yield* Scope.make()
            const context = yield* Layer.build(Sharding.layer.pipe(
              Layer.provide(RunnerStorage.layerMemory),
              Layer.provide(RunnerHealth.layerNoop),
              Layer.provide(Runners.layerNoop),
              Layer.provide(ShardingConfig.layer({
                runnerAddress: Option.some(RunnerAddress.make("localhost", 1234)),
                shardsPerGroup: 1,
                entityTerminationTimeout: 0,
                sendRetryInterval: 10,
                preemptiveShutdown
              }))
            )).pipe(Scope.extend(scope))
            const sharding = Context.get(context, Sharding.Sharding)
            yield* TestClock.adjust(1)
            yield* Scope.close(scope, Exit.void)
            assert.isTrue(yield* sharding.isShutdown)
            const result = yield* sharding.sendOutgoing(request, discard).pipe(
              Effect.fork,
              Effect.flatMap(Fiber.await),
              Effect.timeoutOption(100),
              TestServices.provideLive
            )
            assert(Option.isSome(result), "outgoing send did not settle after shutdown")
            if (discard) {
              assert(Exit.isSuccess(result.value))
            } else {
              assert(Exit.isFailure(result.value))
              if (persisted) {
                assert(Cause.isInterruptedOnly(result.value.cause))
              } else {
                assert.instanceOf(Cause.squash(result.value.cause), ClusterError.EntityNotAssignedToRunner)
              }
            }
            assert.strictEqual(
              (yield* storage.unprocessedMessages([request.envelope.address.shardId])).length,
              persisted ? 1 : 0
            )
          }).pipe(Effect.provide(MessageStorage.layerMemory.pipe(
            Layer.provideMerge(Snowflake.layerGenerator),
            Layer.provide(ShardingConfig.layerDefaults)
          ))))
      }
    }
  }
})

it.scoped("forwards user interrupts from a fiber that previously rebuilt a resource", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1)
    const driver = yield* MessageStorage.MemoryDriver
    const state = yield* TestEntityState
    const ref = yield* ResourceRef.from(yield* Effect.scope, () => Effect.succeed(1))
    yield* ref.unsafeRebuild()
    const client = (yield* TestEntity.client)("after-rebuild")
    const request = yield* Effect.fork(client.Never())
    yield* TestClock.adjust(1)
    yield* Fiber.interrupt(request)
    yield* TestClock.adjust(1)
    assert.strictEqual(driver.journal.filter((envelope) => envelope._tag === "Interrupt").length, 1)
    assert.deepStrictEqual(state.interrupts.unsafeSize(), Option.some(1))
  }).pipe(Effect.provide(TestSharding)))
