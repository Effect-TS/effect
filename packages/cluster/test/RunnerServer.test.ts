import {
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
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
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Layer, Option, Schema, Stream, TestClock, TestServices } from "effect"

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

describe("terminal stream replies", () => {
  for (const [persisted, failure] of [[true, false], [true, true], [false, true]] as const) {
    it.effect(`runner stream closes after terminal reply (persisted=${persisted}, failure=${failure})`, () =>
      Effect.gen(function*() {
        const rpc = Rpc.make("Values", { success: Schema.Int, error: Schema.String, stream: true }).annotate(
          ClusterSchema.Persisted,
          persisted
        )
        const entity = Entity.make("StreamFollowup", [rpc])
        const handlers = RunnerServer.layerHandlers.pipe(
          Layer.provideMerge(
            entity.toLayer({ Values: () => failure ? Stream.fail("terminal failure") : Stream.make(1) })
          ),
          Layer.provideMerge(Sharding.layer),
          Layer.provideMerge(Snowflake.layerGenerator),
          Layer.provide(RunnerStorage.layerMemory),
          Layer.provide(RunnerHealth.layerNoop),
          Layer.provide(Runners.layerNoop),
          Layer.provideMerge(MessageStorage.layerMemory),
          Layer.provide(
            ShardingConfig.layer({
              shardsPerGroup: 1,
              entityTerminationTimeout: 0,
              entityMessagePollInterval: 100,
              sendRetryInterval: 10
            })
          )
        )
        yield* Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const sharding = yield* Sharding.Sharding
          const snowflake = yield* Snowflake.Generator
          const request = Envelope.makeRequest<typeof rpc>({
            requestId: snowflake.unsafeNext(),
            tag: "Values",
            payload: undefined,
            headers: Headers.empty,
            address: EntityAddress.make({
              entityId: EntityId.make("one"),
              entityType: EntityType.EntityType.make(entity.type),
              shardId: sharding.getShardId(EntityId.make("one"), "default")
            })
          })
          if (persisted) {
            yield* (yield* MessageStorage.MessageStorage).saveRequest(
              new Message.OutgoingRequest({
                rpc,
                envelope: request,
                context: Context.empty(),
                lastReceivedReply: Option.none(),
                respond: () => Effect.void
              })
            )
          }
          const client = yield* RpcTest.makeClient(Runners.Rpcs)
          const mailbox = yield* client.Stream({ request, persisted }, { asMailbox: true })
          if (!failure) {
            const chunk = yield* mailbox.take.pipe(Effect.timeout("1 second"), TestServices.provideLive)
            assert(chunk._tag === "Chunk")
            assert.deepStrictEqual(chunk.values, [1])
            yield* client.Envelope({
              persisted,
              envelope: new Envelope.AckChunk({
                id: snowflake.unsafeNext(),
                requestId: request.requestId,
                address: request.address,
                replyId: Snowflake.Snowflake(chunk.id)
              })
            })
          }
          const terminal = yield* mailbox.take.pipe(Effect.timeout("1 second"), TestServices.provideLive)
          assert(terminal._tag === "WithExit")
          assert.strictEqual(terminal.exit._tag, failure ? "Failure" : "Success")
          const done = yield* mailbox.take.pipe(Effect.flip, Effect.timeoutOption("1 second"), TestServices.provideLive)
          assert(Option.isSome(done), "terminal WithExit did not close the stream")
          assert(Cause.isNoSuchElementException(done.value))
        }).pipe(Effect.provide(handlers))
      }).pipe(Effect.scoped))
  }
})
