import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Layer, Option, PubSub, Queue, Schema, Stream } from "effect"
import { TestClock } from "effect/testing"
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
} from "effect/unstable/cluster"
import { Headers } from "effect/unstable/http"
import { Rpc, RpcMessage, type RpcSerialization, RpcServer, RpcTest } from "effect/unstable/rpc"

const ReproEntity = Entity.make("ReproRunnerServer", [
  Rpc.make("ReproStream", { success: Schema.Int, payload: { id: Schema.Number }, stream: true })
]).annotateRpcs(ClusterSchema.Persisted, false)

const HoleCodecEntity = Entity.make("HoleCodecEntity", [
  Rpc.make("Double", { success: Schema.Int, payload: { id: Schema.Number } })
]).annotateRpcs(ClusterSchema.Persisted, false)

// A hole codec that is observably different from `Schema.toCodecJson`: the
// entity payload and the replies become JSON strings on the wire.
const codecForJsonString =
  (<S extends Schema.Top>(schema: S) =>
    Schema.fromJsonString(Schema.toCodecJson(schema as any))) as RpcSerialization.CodecFor

const layerProtocol = (codecFor: RpcSerialization.CodecFor) =>
  Layer.effect(RpcServer.Protocol)(
    Effect.map(Queue.unbounded<number>(), (disconnects) =>
      RpcServer.Protocol.of({
        run: () => Effect.never,
        disconnects,
        send: () => Effect.void,
        end: () => Effect.void,
        clientIds: Effect.succeed(new Set()),
        initialMessage: Effect.succeedNone,
        supportsAck: false,
        supportsTransferables: false,
        supportsSpanPropagation: false,
        supportsNotifications: false,
        codecFor
      }))
  )

const makeHandlers = (
  entities: Layer.Layer<never, never, any>,
  codecFor: RpcSerialization.CodecFor,
  shardingLayer: typeof Sharding.layer = Sharding.layer
) =>
  RunnerServer.layerHandlers.pipe(
    Layer.provide(layerProtocol(codecFor)),
    Layer.provideMerge(entities),
    Layer.provideMerge(shardingLayer),
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

const holeCodecHandlers = makeHandlers(
  HoleCodecEntity.toLayer({ Double: ({ payload }) => Effect.succeed(payload.id * 2) }),
  codecForJsonString
)

it.effect("releases the subscription when a runner stream completes naturally", () =>
  Effect.gen(function*() {
    const pubsub = yield* Effect.acquireRelease(PubSub.unbounded<number>(), PubSub.shutdown)
    let finalizations = 0
    yield* Effect.gen(function*() {
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
      yield* TestClock.adjust(1)
      assert.strictEqual(pubsub.subscribers.size, 1)
      yield* PubSub.publish(pubsub, 1)
      const first = yield* Queue.take(queue).pipe(
        Effect.timeout("1 second"),
        TestClock.withLive
      )
      if (first._tag !== "Chunk") {
        return assert.fail("expected the stream value before the terminal reply")
      }
      assert.deepStrictEqual(first.values, [1])

      yield* client.Envelope({
        envelope: new Envelope.AckChunk({
          id: snowflake.nextUnsafe(),
          address: request.address,
          requestId: request.requestId,
          replyId: Snowflake.Snowflake(first.id)
        }),
        persisted: false
      })

      const completion = yield* Effect.gen(function*() {
        const last = yield* Queue.take(queue)
        yield* Queue.take(queue).pipe(Effect.catchTag("Done", () => Effect.void))
        return last
      }).pipe(
        Effect.timeoutOption("1 second"),
        TestClock.withLive
      )
      if (Option.isNone(completion)) {
        return assert.fail("expected the runner stream to complete")
      }
      if (completion.value._tag !== "WithExit") {
        return assert.fail("expected a terminal reply")
      }
      assert.strictEqual(completion.value.exit._tag, "Success")
      yield* TestClock.adjust(1)
      assert.strictEqual(pubsub.subscribers.size, 0)
      assert.strictEqual(finalizations, 1)
    }).pipe(Effect.provide(makeHandlers(
      ReproEntity.toLayer({
        ReproStream: () =>
          Rpc.fork(
            Stream.fromPubSub(pubsub).pipe(
              Stream.take(1),
              Stream.ensuring(Effect.sync(() => {
                finalizations++
              }))
            )
          )
      }),
      Schema.toCodecJson as RpcSerialization.CodecFor
    )))
  }))

it.effect("disconnects an admitted stream while the real send return is held", () =>
  Effect.gen(function*() {
    const pubsub = yield* Effect.acquireRelease(PubSub.unbounded<number>(), PubSub.shutdown)
    const admitted = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    // Hold only the request's send return, after the real Sharding has admitted
    // it. Control envelopes must still be deliverable during cleanup.
    const gatedSharding = Layer.effect(Sharding.Sharding)(
      Effect.map(Sharding.Sharding, (actual) => ({
        ...actual,
        send: (message) =>
          message._tag === "IncomingRequest"
            ? actual.send(message).pipe(
              Effect.andThen(Deferred.succeed(admitted, undefined)),
              Effect.andThen(Deferred.await(release))
            )
            : actual.send(message)
      }))
    ).pipe(Layer.provide(Sharding.layer))
    yield* Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const sharding = yield* Sharding.Sharding
      const snowflake = yield* Snowflake.Generator
      const entityId = EntityId.make("held-send")
      const request: Envelope.PartialRequest = {
        _tag: "Request",
        requestId: snowflake.nextUnsafe(),
        address: EntityAddress.make({
          shardId: sharding.getShardId(entityId, ReproEntity.getShardGroup(entityId)),
          entityType: EntityType.make(ReproEntity.type),
          entityId
        }),
        tag: "ReproStream",
        payload: { id: 1 },
        headers: Headers.empty
      }
      const server = yield* RpcServer.makeNoSerialization(Runners.Rpcs, {
        onFromServer: () => Effect.void
      })
      yield* server.write(0, {
        _tag: "Request",
        id: RpcMessage.RequestId("stream"),
        tag: "Stream",
        payload: { request, persisted: false },
        headers: Headers.empty
      })
      yield* TestClock.adjust(1)
      assert.isTrue(yield* Deferred.isDone(admitted))
      assert.strictEqual(pubsub.subscribers.size, 1)
      assert.isFalse(yield* Deferred.isDone(stopped))

      yield* server.disconnect(0)
      yield* TestClock.adjust(1)
      assert.isFalse(yield* Deferred.isDone(release))
      assert.strictEqual(pubsub.subscribers.size, 0)
      assert.isTrue(yield* Deferred.isDone(stopped))
    }).pipe(Effect.provide(makeHandlers(
      ReproEntity.toLayer({
        ReproStream: () =>
          Rpc.fork(
            Stream.fromPubSub(pubsub).pipe(
              Stream.ensuring(Deferred.succeed(stopped, undefined))
            )
          )
      }),
      Schema.toCodecJson as RpcSerialization.CodecFor,
      gatedSharding
    )))
  }))

for (
  const { disconnect, entity, expectedSubscribers, name, persisted } of [
    {
      name: "releases a non-persisted entity stream subscription when the runner caller disconnects",
      entity: ReproEntity,
      disconnect: true,
      persisted: false,
      expectedSubscribers: 0
    },
    {
      name: "preserves a volatile stream annotated Uninterruptible: true when the runner caller disconnects",
      entity: ReproEntity.annotateRpcs(ClusterSchema.Uninterruptible, true),
      disconnect: true,
      persisted: false,
      expectedSubscribers: 1
    },
    {
      name: "preserves a volatile stream annotated Uninterruptible: client when the runner caller disconnects",
      entity: ReproEntity.annotateRpcs(ClusterSchema.Uninterruptible, "client"),
      disconnect: true,
      persisted: false,
      expectedSubscribers: 1
    },
    {
      name: "preserves a volatile stream annotated Uninterruptible: server when the runner caller disconnects",
      entity: ReproEntity.annotateRpcs(ClusterSchema.Uninterruptible, "server"),
      disconnect: true,
      persisted: false,
      expectedSubscribers: 1
    },
    {
      name: "preserves a persisted entity stream subscription when the runner caller disconnects",
      entity: ReproEntity.annotateRpcs(ClusterSchema.Persisted, true),
      disconnect: true,
      persisted: true,
      expectedSubscribers: 1
    },
    ...([true, "client", "server"] as const).map((annotation) => ({
      name:
        `delivers an explicit interrupt to a volatile stream annotated Uninterruptible: ${annotation} while connected`,
      entity: ReproEntity.annotateRpcs(ClusterSchema.Uninterruptible, annotation),
      disconnect: false,
      persisted: false,
      expectedSubscribers: 0
    }))
  ]
) {
  it.effect(name, () =>
    Effect.gen(function*() {
      const pubsub = yield* Effect.acquireRelease(PubSub.unbounded<number>(), PubSub.shutdown)
      yield* Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const sharding = yield* Sharding.Sharding
        const snowflake = yield* Snowflake.Generator
        const entityId = EntityId.make("stream-caller")
        const request: Envelope.PartialRequest = {
          _tag: "Request",
          requestId: snowflake.nextUnsafe(),
          address: EntityAddress.make({
            shardId: sharding.getShardId(entityId, entity.getShardGroup(entityId)),
            entityType: EntityType.make(entity.type),
            entityId
          }),
          tag: "ReproStream",
          payload: { id: 1 },
          headers: Headers.empty
        }
        if (persisted) {
          // The sending runner stores durable requests before notifying the host.
          const driver = yield* MessageStorage.MemoryDriver
          yield* driver.encoded.saveEnvelope({
            envelope: yield* Schema.encodeEffect(Envelope.PartialJson)(request),
            primaryKey: null,
            deliverAt: null
          })
        }
        const server = yield* RpcServer.makeNoSerialization(Runners.Rpcs, {
          onFromServer: () => Effect.void
        })
        yield* server.write(0, {
          _tag: "Request",
          id: RpcMessage.RequestId("stream"),
          tag: "Stream",
          payload: { request, persisted },
          headers: Headers.empty
        })
        yield* TestClock.adjust(1)
        assert.strictEqual(pubsub.subscribers.size, 1)

        if (disconnect) {
          // A transport disconnect interrupts the runner RPC without sending the
          // entity an Envelope.Interrupt, unlike a clean Entity.client close.
          yield* server.disconnect(0)
        } else {
          // Send an explicit interruption over the same connected runner client.
          yield* server.write(0, {
            _tag: "Request",
            id: RpcMessage.RequestId("interrupt"),
            tag: "Envelope",
            payload: {
              envelope: new Envelope.Interrupt({
                id: snowflake.nextUnsafe(),
                address: request.address,
                requestId: request.requestId
              }),
              persisted: false
            },
            headers: Headers.empty
          })
        }
        yield* TestClock.adjust(1)
        assert.strictEqual(pubsub.subscribers.size, expectedSubscribers)
      }).pipe(Effect.provide(makeHandlers(
        entity.toLayer({ ReproStream: () => Rpc.fork(Stream.fromPubSub(pubsub)) }),
        Schema.toCodecJson as RpcSerialization.CodecFor
      )))
    }))
}

it.effect("fills the entity payload and reply holes with the serialization's codec", () =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1)
    const sharding = yield* Sharding.Sharding
    const snowflake = yield* Snowflake.Generator
    const entityId = EntityId.make("hole")
    const request = {
      _tag: "Request",
      requestId: snowflake.nextUnsafe(),
      address: EntityAddress.make({
        shardId: sharding.getShardId(entityId, HoleCodecEntity.getShardGroup(entityId)),
        entityType: EntityType.make("HoleCodecEntity"),
        entityId
      }),
      tag: "Double",
      // already encoded by the sender with the same hole codec
      payload: JSON.stringify({ id: 21 }),
      headers: Headers.empty
    } as any as Envelope.PartialRequest

    const client = yield* RpcTest.makeClient(Runners.Rpcs)
    const reply = yield* client.Effect({ request, persisted: false }).pipe(
      Effect.timeout("1 second"),
      TestClock.withLive
    )

    assert.strictEqual(typeof reply, "string", "the reply hole must carry the codec's output")
    const decoded = JSON.parse(reply as any)
    assert.strictEqual(decoded._tag, "WithExit")
    assert.deepStrictEqual(decoded.exit, { _tag: "Success", value: 42 })
  }).pipe(Effect.provide(holeCodecHandlers)))
