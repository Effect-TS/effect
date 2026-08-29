import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
  MessageStorage,
  type Reply,
  RunnerAddress,
  RunnerHealth,
  Runners,
  RunnerServer,
  RunnerStorage,
  ShardId,
  Sharding,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc, RpcClient, RpcTest } from "@effect/rpc"
import { RpcClientError } from "@effect/rpc/RpcClientError"
import type { FromClientEncoded, FromServerEncoded } from "@effect/rpc/RpcMessage"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Layer, Option, Schema, Stream, TestClock } from "effect"

const BadReplyEntity = Entity.make("BadReplyEntity", [
  Rpc.make("BadReply", {
    success: Schema.Int,
    payload: { id: Schema.Number }
  }),
  Rpc.make("BadStream", {
    success: Schema.Int,
    payload: { id: Schema.Number },
    stream: true
  })
]).annotateRpcs(ClusterSchema.Persisted, false)

const BadReplyEntityLayer = BadReplyEntity.toLayer({
  BadReply: () => Effect.succeed(1.5),
  BadStream: () => Stream.make(2.5)
})

const TestShardingConfig = ShardingConfig.layer({
  entityMailboxCapacity: 10,
  entityTerminationTimeout: 0,
  entityMessagePollInterval: 5000,
  sendRetryInterval: 100
})

const RunnerServerHandlers = RunnerServer.layerHandlers.pipe(
  Layer.provideMerge(BadReplyEntityLayer),
  Layer.provideMerge(Sharding.layer),
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(RunnerStorage.layerMemory),
  Layer.provide(RunnerHealth.layerNoop),
  Layer.provide(Runners.layerNoop),
  Layer.provideMerge(MessageStorage.layerMemory),
  Layer.provide(TestShardingConfig)
)

describe.concurrent("RunnerServer", () => {
  const makeRequest = (options: { readonly entityId: string; readonly tag: string }) =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding
      const snowflakeGen = yield* Snowflake.Generator
      const entityId = EntityId.make(options.entityId)
      return {
        _tag: "Request" as const,
        requestId: snowflakeGen.unsafeNext(),
        address: EntityAddress.make({
          shardId: sharding.getShardId(entityId, BadReplyEntity.getShardGroup(entityId)),
          entityType: EntityType.EntityType.make("BadReplyEntity"),
          entityId
        }),
        tag: options.tag,
        payload: { id: 1 },
        headers: Headers.empty
      }
    })

  it.scoped("a reply that fails to serialize fails only its own request", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const client = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* makeRequest({ entityId: "bad-1", tag: "BadReply" })

      const exit = yield* Effect.exit(client.Effect({ request, persisted: false }))
      if (!Exit.isSuccess(exit)) {
        return assert.fail("Effect rpc must not defect on a reply serialization failure")
      }
      const reply = exit.value
      if (reply._tag !== "WithExit" || reply.exit._tag !== "Failure") {
        return assert.fail("expected a WithExit reply with a failure exit")
      }
      assert.strictEqual(reply.requestId, String(request.requestId))
      assert.include(JSON.stringify(reply.exit), "MalformedMessage")
    }).pipe(Effect.provide(RunnerServerHandlers)))

  it.scoped("a stream reply that fails to serialize ends the stream with the defect", () =>
    Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const client = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* makeRequest({ entityId: "bad-2", tag: "BadStream" })
      const mailbox = yield* client.Stream({ request, persisted: false }, { asMailbox: true })
      const replies: Array<Reply.ReplyEncoded<any>> = []

      yield* mailbox.take.pipe(
        Effect.tap((reply) => Effect.sync(() => replies.push(reply))),
        Effect.forever,
        Effect.catchIf(Cause.isNoSuchElementException, () => Effect.void)
      )

      assert.strictEqual(replies.length, 1)
      const reply = replies[0]
      if (reply._tag !== "WithExit" || reply.exit._tag !== "Failure") {
        return assert.fail("expected a terminal WithExit reply with a failure exit")
      }
      assert.strictEqual(reply.requestId, String(request.requestId))
      assert.include(JSON.stringify(reply.exit), "MalformedMessage")
    }).pipe(Effect.provide(RunnerServerHandlers)))
})

describe.concurrent("Runners.makeRpc", () => {
  const runnerAddress = RunnerAddress.make("localhost", 42_000)
  const TestRpc = Rpc.make("TestRpc", {
    success: Schema.Number,
    payload: { id: Schema.Number }
  }).annotate(ClusterSchema.Persisted, false)
  const TestRpcPersisted = Rpc.make("TestRpcPersisted", {
    success: Schema.Number,
    payload: { id: Schema.Number }
  }).annotate(ClusterSchema.Persisted, true)
  type SendRpc = typeof TestRpc | typeof TestRpcPersisted

  const makeOutgoingRequest = (
    rpc: SendRpc,
    requestId: Snowflake.Snowflake,
    respond: (reply: Reply.Reply<SendRpc>) => Effect.Effect<void>
  ): Message.OutgoingRequest<SendRpc> =>
    new Message.OutgoingRequest({
      envelope: Envelope.makeRequest<SendRpc>({
        requestId,
        address: EntityAddress.make({
          shardId: ShardId.make("default", 1),
          entityType: EntityType.EntityType.make("TestRpcEntity"),
          entityId: EntityId.make("1")
        }),
        tag: rpc._tag,
        payload: { id: 1 },
        headers: Headers.empty
      }),
      rpc,
      context: Context.empty(),
      lastReceivedReply: Option.none(),
      respond
    })

  const layerFakeProtocol = (
    onRequest: (
      request: FromClientEncoded,
      write: (data: FromServerEncoded) => Effect.Effect<void>
    ) => Effect.Effect<void, RpcClientError>
  ) =>
    Layer.succeed(Runners.RpcClientProtocol, () =>
      Effect.sync(() => {
        let write!: (data: FromServerEncoded) => Effect.Effect<void>
        return RpcClient.Protocol.of({
          run(f) {
            write = f
            return Effect.never
          },
          send(request) {
            return onRequest(request, write)
          },
          supportsAck: true,
          supportsTransferables: false
        })
      }))

  const layerRunners = (protocol: Layer.Layer<Runners.RpcClientProtocol>) =>
    Runners.layerRpc.pipe(
      Layer.provideMerge(Snowflake.layerGenerator),
      Layer.provide(protocol),
      Layer.provideMerge(MessageStorage.layerNoop),
      Layer.provide(TestShardingConfig)
    )

  const respondWithDefect = (
    request: FromClientEncoded,
    write: (data: FromServerEncoded) => Effect.Effect<void>
  ) => request._tag === "Request" ? write({ _tag: "Defect", defect: "boom" }) : Effect.void

  it.effect("a server-delivered defect resolves a volatile request", () =>
    Effect.gen(function*() {
      const runners = yield* Runners.Runners
      const snowflakeGen = yield* Snowflake.Generator
      const replies: Array<Reply.Reply<SendRpc>> = []
      const message = makeOutgoingRequest(TestRpc, snowflakeGen.unsafeNext(), (reply) =>
        Effect.sync(() =>
          replies.push(reply)
        ))

      const exit = yield* Effect.exit(runners.send({ address: runnerAddress, message }))
      assert.isTrue(Exit.isSuccess(exit))
      assert.strictEqual(replies.length, 1)
      const reply = replies[0]
      if (reply._tag !== "WithExit" || !Exit.isFailure(reply.exit)) {
        return assert.fail("expected a WithExit reply with a failure exit")
      }
      assert.include(String(Cause.squash(reply.exit.cause)), "boom")
    }).pipe(Effect.provide(layerRunners(layerFakeProtocol(respondWithDefect)))))

  it.effect("transport failures still map to RunnerUnavailable", () =>
    Effect.gen(function*() {
      const runners = yield* Runners.Runners
      const snowflakeGen = yield* Snowflake.Generator
      const message = makeOutgoingRequest(TestRpc, snowflakeGen.unsafeNext(), () => Effect.void)
      const exit = yield* Effect.exit(runners.send({ address: runnerAddress, message }))

      if (!Exit.isFailure(exit)) return assert.fail("send must fail for a transport failure")
      assert.instanceOf(Cause.squash(exit.cause), ClusterError.RunnerUnavailable)
    }).pipe(Effect.provide(layerRunners(layerFakeProtocol(() =>
      Effect.fail(new RpcClientError({ reason: "Protocol", message: "boom" }))
    )))))

  it.effect("a delivered defect for a persisted request maps to RunnerUnavailable", () =>
    Effect.gen(function*() {
      const runners = yield* Runners.Runners
      const snowflakeGen = yield* Snowflake.Generator
      const message = makeOutgoingRequest(TestRpcPersisted, snowflakeGen.unsafeNext(), () => Effect.void)
      const exit = yield* Effect.exit(runners.send({ address: runnerAddress, message }))

      if (!Exit.isFailure(exit)) return assert.fail("send must fail for a persisted request defect")
      assert.instanceOf(Cause.squash(exit.cause), ClusterError.RunnerUnavailable)
    }).pipe(Effect.provide(layerRunners(layerFakeProtocol(respondWithDefect)))))
})
