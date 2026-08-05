import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Option, Queue, Schema, Stream } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  type Envelope,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerServer,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/unstable/cluster"
import { Headers } from "effect/unstable/http"
import { Rpc, RpcTest } from "effect/unstable/rpc"

const ReproEntity = Entity.make("ReproRunnerServer", [
  Rpc.make("ReproStream", { success: Schema.Int, payload: { id: Schema.Number }, stream: true })
]).annotateRpcs(ClusterSchema.Persisted, false)

const handlers = RunnerServer.layerHandlers.pipe(
  Layer.provideMerge(ReproEntity.toLayer({ ReproStream: () => Stream.make(1) })),
  Layer.provideMerge(Sharding.layer),
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(ShardingConfig.layer({
    entityMailboxCapacity: 10,
    entityTerminationTimeout: 0,
    entityMessagePollInterval: 5000,
    sendRetryInterval: 100,
    refreshAssignmentsInterval: 0
  }))
)

it.effect("completes a successful runner stream", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1)
    const sharding = yield* Sharding.Sharding
    const snowflake = yield* Snowflake.Generator
    const entityId = EntityId.make("one")
    const request = {
      _tag: "Request",
      requestId: snowflake.nextUnsafe(),
      address: EntityAddress.make({
        shardId: sharding.getShardId(entityId, ReproEntity.getShardGroup(entityId)),
        entityType: EntityType.make("ReproRunnerServer"),
        entityId
      }),
      tag: "ReproStream",
      payload: { id: 1 },
      headers: Headers.empty
    } as Envelope.PartialRequest
    const client = yield* RpcTest.makeClient(Runners.Rpcs)
    const queue = yield* client.Stream({ request, persisted: false }, { asQueue: true })
    const completion = yield* Queue.take(queue).pipe(
      Effect.forever,
      Effect.catchTag("Done", () => Effect.void),
      Effect.timeoutOption(10),
      Effect.forkChild
    )
    yield* TestClock.adjust(10)
    assert.deepStrictEqual(yield* Fiber.join(completion), Option.some(undefined))
  }).pipe(Effect.provide(handlers)))
