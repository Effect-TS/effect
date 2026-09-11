import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerServer,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc, RpcTest } from "@effect/rpc"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Layer, Option, Schema, Stream, TestClock, TestServices } from "effect"

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
    refreshAssignmentsInterval: 100
  }))
)

it.scoped("completes a successful runner stream", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1)
    const sharding = yield* Sharding.Sharding
    const snowflake = yield* Snowflake.Generator
    const entityId = EntityId.make("one")
    const request = {
      _tag: "Request",
      requestId: snowflake.unsafeNext(),
      address: EntityAddress.EntityAddress.make({
        shardId: sharding.getShardId(entityId, ReproEntity.getShardGroup(entityId)),
        entityType: EntityType.EntityType.make("ReproRunnerServer"),
        entityId
      }),
      tag: "ReproStream",
      payload: { id: 1 },
      headers: Headers.empty
    } as Envelope.Request.PartialEncoded
    const client = yield* RpcTest.makeClient(Runners.Rpcs)
    const mailbox = yield* client.Stream({ request, persisted: false }, { asMailbox: true })
    const first = yield* mailbox.take.pipe(
      Effect.timeout("1 second"),
      TestServices.provideLive
    )
    if (first._tag !== "Chunk") {
      return assert.fail("expected the stream value before the terminal reply")
    }
    assert.deepStrictEqual(first.values, [1])

    yield* client.Envelope({
      envelope: new Envelope.AckChunk({
        id: snowflake.unsafeNext(),
        address: request.address,
        requestId: request.requestId,
        replyId: Snowflake.Snowflake(first.id)
      }),
      persisted: false
    })

    const completion = yield* Effect.gen(function*() {
      const last = yield* mailbox.take
      yield* mailbox.take.pipe(Effect.catchIf(Cause.isNoSuchElementException, () => Effect.void))
      return last
    }).pipe(
      Effect.timeoutOption("1 second"),
      TestServices.provideLive
    )
    if (Option.isNone(completion)) {
      return assert.fail("expected the runner stream to complete")
    }
    assert.strictEqual(completion.value._tag, "WithExit")
  }).pipe(Effect.provide(handlers)))
