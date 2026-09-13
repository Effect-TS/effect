import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Layer, Option, PubSub, Queue, Schema, Stream } from "effect"
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
import { Rpc, RpcClient, type RpcSerialization, RpcServer, RpcTest } from "effect/unstable/rpc"

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
  shardingLayer: Layer.Layer<Sharding.Sharding, never, any> = Sharding.layer
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

const handlers = makeHandlers(
  ReproEntity.toLayer({ ReproStream: () => Stream.make(1) }),
  Schema.toCodecJson as RpcSerialization.CodecFor
)

const holeCodecHandlers = makeHandlers(
  HoleCodecEntity.toLayer({ Double: ({ payload }) => Effect.succeed(payload.id * 2) }),
  codecForJsonString
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
    assert.strictEqual(completion.value._tag, "WithExit")
  }).pipe(Effect.provide(handlers)))

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

const runStreamLifecycle = (
  started: Deferred.Deferred<void>,
  stopped: Deferred.Deferred<void>,
  persisted: boolean,
  mode: "disconnect" | "envelope",
  expectStopped: boolean
) =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1)
    const sharding = yield* Sharding.Sharding
    const snowflake = yield* Snowflake.Generator
    const entityId = EntityId.make("interrupted")
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
    let writeClient: (message: any) => Effect.Effect<void>
    const server = yield* RpcServer.makeNoSerialization(Runners.Rpcs, {
      onFromServer: (message) => writeClient(message)
    })
    const clientResult = yield* RpcClient.makeNoSerialization(Runners.Rpcs, {
      supportsAck: true,
      onFromClient: ({ message }) => server.write(0, message)
    })
    writeClient = clientResult.write
    const caller = yield* clientResult.client.Stream({ request, persisted }).pipe(
      Stream.runDrain,
      Effect.forkChild({ startImmediately: true })
    )
    yield* Deferred.await(started)
    if (mode === "disconnect") {
      yield* server.disconnect(0)
    } else {
      yield* clientResult.client.Envelope({
        envelope: new Envelope.Interrupt({
          id: snowflake.nextUnsafe(),
          address: request.address,
          requestId: request.requestId
        }),
        persisted
      })
    }
    if (expectStopped) {
      yield* Deferred.await(stopped).pipe(Effect.timeout("1 second"), TestClock.withLive)
    } else {
      assert.isTrue(
        Option.isNone(yield* Deferred.await(stopped).pipe(Effect.timeoutOption("100 millis"), TestClock.withLive))
      )
    }
    yield* Fiber.interrupt(caller)
  })

it.effect("interrupts a non-persisted runner stream caller", () =>
  Effect.gen(function*() {
    const pubsub = yield* PubSub.unbounded<number>()
    const started = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    const streamHandlers = makeHandlers(
      ReproEntity.toLayer({
        ReproStream: () =>
          Rpc.fork(
            Stream.fromPubSub(pubsub).pipe(
              Stream.onStart(Deferred.succeed(started, void 0)),
              Stream.ensuring(Deferred.succeed(stopped, void 0))
            )
          )
      }),
      Schema.toCodecJson as RpcSerialization.CodecFor
    )
    yield* runStreamLifecycle(started, stopped, false, "disconnect", true).pipe(Effect.provide(streamHandlers))
  }))

it.effect("gracefully interrupts a non-persisted runner stream caller", () =>
  Effect.gen(function*() {
    const pubsub = yield* PubSub.unbounded<number>()
    const started = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    const streamHandlers = makeHandlers(
      ReproEntity.toLayer({
        ReproStream: () =>
          Rpc.fork(
            Stream.fromPubSub(pubsub).pipe(
              Stream.onStart(Deferred.succeed(started, void 0)),
              Stream.ensuring(Deferred.succeed(stopped, void 0))
            )
          )
      }),
      Schema.toCodecJson as RpcSerialization.CodecFor
    )
    yield* runStreamLifecycle(started, stopped, false, "envelope", true).pipe(Effect.provide(streamHandlers))
  }))

it.effect("disconnects an admitted stream while the real send return is held", () =>
  Effect.gen(function*() {
    const pubsub = yield* PubSub.unbounded<number>()
    const started = yield* Deferred.make<void>()
    const stopped = yield* Deferred.make<void>()
    const sendStarted = yield* Deferred.make<void>()
    const admitted = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const gatedSharding = Layer.effect(Sharding.Sharding)(
      Effect.gen(function*() {
        const actual = yield* Sharding.Sharding
        return {
          ...actual,
          send: (message) =>
            Effect.flatMap(
              Deferred.succeed(sendStarted, void 0),
              () => actual.send(message)
            ).pipe(
              Effect.tap(() => Deferred.succeed(admitted, void 0)),
              Effect.andThen(Deferred.await(release))
            )
        }
      })
    ).pipe(Layer.provideMerge(Sharding.layer))
    yield* TestClock.adjust(1)
    const streamHandlers = makeHandlers(
      ReproEntity.toLayer({
        ReproStream: () =>
          Rpc.fork(
            Stream.make(1).pipe(
              Stream.concat(Stream.fromPubSub(pubsub)),
              Stream.onStart(Deferred.succeed(started, void 0)),
              Stream.ensuring(Deferred.succeed(stopped, void 0))
            )
          )
      }),
      Schema.toCodecJson as RpcSerialization.CodecFor,
      gatedSharding
    )
    yield* Effect.gen(function*() {
      let writeClient: (message: any) => Effect.Effect<void>
      const server = yield* RpcServer.makeNoSerialization(Runners.Rpcs, {
        onFromServer: (message) => writeClient(message)
      })
      const clientResult = yield* RpcClient.makeNoSerialization(Runners.Rpcs, {
        supportsAck: true,
        onFromClient: ({ message }) => server.write(0, message)
      })
      writeClient = clientResult.write
      yield* TestClock.adjust(1)
      const snowflake = yield* Snowflake.Generator
      const sharding = yield* Sharding.Sharding
      const entityId = EntityId.make("admitted")
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
      const caller = yield* clientResult.client.Stream({ request, persisted: false }).pipe(
        Stream.runDrain,
        Effect.forkChild({ startImmediately: true })
      )
      const sendStartedResult = yield* Deferred.await(sendStarted).pipe(
        Effect.timeoutOption("1 second"),
        TestClock.withLive
      )
      assert.isTrue(Option.isSome(sendStartedResult), "send wrapper was not entered")
      const startedResult = yield* Deferred.await(started).pipe(
        Effect.timeoutOption("1 second"),
        TestClock.withLive
      )
      assert.isTrue(Option.isSome(startedResult), "entity stream did not start")
      const admittedResult = yield* Deferred.await(admitted).pipe(
        Effect.timeoutOption("1 second"),
        TestClock.withLive
      )
      assert.isTrue(Option.isSome(admittedResult), "original send did not return")
      yield* server.disconnect(0).pipe(Effect.timeout("1 second"), TestClock.withLive)
      yield* Deferred.await(stopped).pipe(Effect.timeout("1 second"), TestClock.withLive)
      yield* Deferred.succeed(release, void 0)
      yield* Fiber.interrupt(caller)
    }).pipe(Effect.provide(streamHandlers))
  }))
