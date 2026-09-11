import {
  ClusterSchema,
  Entity,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake,
  SqlMessageStorage
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it } from "@effect/vitest"
import { Cause, Clock, Effect, Exit, Fiber, Layer, Schema, TestClock } from "effect"
import { EntityReaper } from "../src/internal/entityReaper.js"
import { makeRequest } from "./fixtures/message-storage.js"

const config = ShardingConfig.layer({
  shardsPerGroup: 1,
  entityRegistrationTimeout: 6000,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 100,
  refreshAssignmentsInterval: 100,
  sendRetryInterval: 10
})
const sharding = Sharding.layer.pipe(
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(Runners.layerNoop),
  Layer.provide(config)
)
const rpc = Rpc.make("Ping", { payload: { id: Schema.Number }, success: Schema.String }).annotate(
  ClusterSchema.Persisted,
  true
)
const entity = Entity.make("test", [rpc])

for (const backend of ["memory", "sqlite"] as const) {
  const storage = (backend === "memory" ? MessageStorage.layerMemory : SqlMessageStorage.layer.pipe(
    Layer.provide(SqliteClient.layer({ filename: ":memory:" }))
  )).pipe(Layer.provideMerge(Snowflake.layerGenerator), Layer.provide(config))

  it.effect(`${backend} holds persisted rows through slow registration`, () =>
    Effect.gen(function*() {
      const store = yield* MessageStorage.MessageStorage
      const request = yield* makeRequest({ rpc })
      yield* store.saveRequest(request)
      const delayed = entity.toLayer({ Ping: () => Effect.succeed("done") }).pipe(
        Layer.provide(Layer.effectDiscard(Effect.sleep(10_000))),
        Layer.provideMerge(sharding)
      )
      const owner = yield* Effect.never.pipe(Effect.provide(delayed), Effect.fork)
      yield* TestClock.adjust(7500)
      assert.deepStrictEqual(yield* store.repliesFor([request]), [])
      yield* TestClock.adjust(3000)
      const replies = yield* store.repliesFor([request])
      assert.strictEqual(replies.length, 1)
      assert(replies[0]._tag === "WithExit")
      assert.deepStrictEqual(replies[0].exit, Exit.succeed("done"))
      yield* Fiber.interrupt(owner)
    }).pipe(Effect.scoped, Effect.provide(storage)))

  it.effect(`${backend} eventually fails a request whose entity never registers`, () =>
    Effect.gen(function*() {
      const store = yield* MessageStorage.MessageStorage
      const request = yield* makeRequest({ rpc })
      yield* store.saveRequest(request)
      const owner = yield* Effect.never.pipe(Effect.provide(sharding), Effect.fork)
      yield* TestClock.adjust(7500)
      assert.deepStrictEqual(yield* store.repliesFor([request]), [], "allow the two-interval fallback")
      yield* TestClock.adjust(6000)
      const replies = yield* store.repliesFor([request])
      assert.strictEqual(replies.length, 1)
      assert(replies[0]._tag === "WithExit" && Exit.isFailure(replies[0].exit))
      assert.include(Cause.pretty(replies[0].exit.cause), "not registered")
      yield* Fiber.interrupt(owner)
    }).pipe(Effect.scoped, Effect.provide(storage)))
}

it.effect("registration cannot replace the runner's clock, config, reaper or snowflake generator", () =>
  Effect.gen(function*() {
    const service = yield* Sharding.Sharding
    const actualClock = yield* Effect.clock
    const foreignClock = { ...actualClock, unsafeCurrentTimeMillis: () => -1 }
    const foreignConfig = { ...(yield* ShardingConfig.ShardingConfig), entityMailboxCapacity: 999 }
    const foreignReaper = new EntityReaper({ register: () => Effect.die("foreign reaper") })
    const foreignGenerator = {
      ...(yield* Snowflake.Generator),
      unsafeNext: () => {
        throw new Error("foreign generator")
      }
    }
    const protectedEntity = Entity.make("ProtectedRegistration", [
      Rpc.make("Read", { success: Schema.Boolean }).annotate(ClusterSchema.Persisted, false)
    ])
    yield* service.registerEntity(
      protectedEntity,
      Effect.gen(function*() {
        const ownConfig = yield* ShardingConfig.ShardingConfig
        const ownClock = yield* Effect.clock
        const reaper = yield* EntityReaper
        const generator = yield* Snowflake.Generator
        return {
          Read: () =>
            Effect.succeed(
              ownConfig !== foreignConfig && ownClock !== foreignClock && reaper !== foreignReaper &&
                generator !== foreignGenerator
            )
        }
      })
    ).pipe(
      Effect.provideService(Clock.Clock, foreignClock),
      Effect.provideService(ShardingConfig.ShardingConfig, foreignConfig),
      Effect.provideService(EntityReaper, foreignReaper),
      Effect.provideService(Snowflake.Generator, foreignGenerator)
    )
    yield* TestClock.adjust(1)
    assert.isTrue(yield* (yield* protectedEntity.client)("one").Read())
  }).pipe(
    Effect.scoped,
    Effect.provide(sharding),
    Effect.provide(MessageStorage.layerMemory.pipe(
      Layer.provideMerge(Snowflake.layerGenerator),
      Layer.provideMerge(config)
    ))
  ))
