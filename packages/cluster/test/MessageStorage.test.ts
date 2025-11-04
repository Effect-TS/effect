import {
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
  MessageStorage,
  Reply,
  ShardId,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Headers } from "@effect/platform"
import { Rpc, RpcSchema } from "@effect/rpc"
import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, PrimaryKey, Schema } from "effect"
import * as TestClock from "effect/TestClock"

const MemoryLive = MessageStorage.layerMemory.pipe(
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(ShardingConfig.layerDefaults)
)

describe("MessageStorage", () => {
  describe("memory", () => {
    it.effect("saves a request", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        const result = yield* storage.saveRequest(request)
        expect(result._tag).toEqual("Success")
        const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
        expect(messages).toHaveLength(1)
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("detects duplicates", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: Rpc.fromTaggedRequest(PrimaryKeyTest),
            payload: new PrimaryKeyTest({ id: 123 })
          })
        )
        const result = yield* storage.saveRequest(
          yield* makeRequest({
            rpc: Rpc.fromTaggedRequest(PrimaryKeyTest),
            payload: new PrimaryKeyTest({ id: 123 })
          })
        )
        expect(result._tag).toEqual("Duplicate")
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("unprocessedMessages excludes complete requests", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        yield* storage.saveReply(yield* makeReply(request))
        const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
        expect(messages).toHaveLength(0)
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("repliesFor", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        let replies = yield* storage.repliesFor([request])
        expect(replies).toHaveLength(0)
        yield* storage.saveReply(yield* makeReply(request))
        replies = yield* storage.repliesFor([request])
        expect(replies).toHaveLength(1)
        expect(replies[0].requestId).toEqual(request.envelope.requestId)
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("registerReplyHandler", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const latch = yield* Effect.makeLatch()
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        const fiber = yield* storage.registerReplyHandler(
          new Message.OutgoingRequest({
            ...request,
            respond: () => latch.open
          })
        ).pipe(Effect.fork)
        yield* TestClock.adjust(1)
        yield* storage.saveReply(yield* makeReply(request))
        yield* latch.await
        yield* fiber.await
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("unregisterReplyHandler", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        const fiber = yield* storage.registerReplyHandler(
          new Message.OutgoingRequest({
            ...request,
            respond: () => Effect.void
          })
        ).pipe(Effect.fork)
        yield* TestClock.adjust(1)
        yield* storage.unregisterReplyHandler(request.envelope.requestId)
        yield* fiber.await
      }).pipe(Effect.provide(MemoryLive)))
  })
})

export const GetUserRpc = Rpc.make("GetUser", {
  payload: { id: Schema.Number }
})

export const makeRequest = Effect.fnUntraced(function*(options?: {
  readonly rpc?: Rpc.AnyWithProps
  readonly payload?: any
}) {
  const snowflake = yield* Snowflake.Generator
  const rpc = options?.rpc ?? GetUserRpc
  return new Message.OutgoingRequest({
    envelope: Envelope.makeRequest<any>({
      requestId: snowflake.unsafeNext(),
      address: EntityAddress.EntityAddress.make({
        shardId: ShardId.make("default", 1),
        entityType: EntityType.EntityType.make("test"),
        entityId: EntityId.EntityId.make("1")
      }),
      tag: rpc._tag,
      payload: options?.payload ?? { id: 123 },
      traceId: "noop",
      spanId: "noop",
      sampled: false,
      headers: Headers.empty
    }),
    context: Context.empty() as any,
    rpc,
    lastReceivedReply: Option.none(),
    respond() {
      return Effect.void
    }
  })
})

export class PrimaryKeyTest extends Schema.TaggedRequest<PrimaryKeyTest>()("PrimaryKeyTest", {
  success: Schema.Void,
  failure: Schema.Never,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return this.id.toString()
  }
}

export class StreamTest extends Schema.TaggedRequest<StreamTest>()("StreamTest", {
  success: RpcSchema.Stream({
    success: Schema.Void,
    failure: Schema.Never
  }),
  failure: Schema.Never,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return this.id.toString()
  }
}
export const StreamRpc = Rpc.fromTaggedRequest(StreamTest)

export const makeReply = Effect.fnUntraced(function*(request: Message.OutgoingRequest<any>) {
  const snowflake = yield* Snowflake.Generator
  return new Reply.ReplyWithContext({
    reply: new Reply.WithExit({
      id: snowflake.unsafeNext(),
      requestId: request.envelope.requestId,
      exit: Exit.void as any
    }),
    context: request.context,
    rpc: request.rpc
  })
})

export const makeAckChunk = Effect.fnUntraced(function*(
  request: Message.OutgoingRequest<any>,
  chunk: Reply.ReplyWithContext<any>
) {
  const snowflake = yield* Snowflake.Generator
  return new Message.OutgoingEnvelope({
    envelope: new Envelope.AckChunk({
      id: snowflake.unsafeNext(),
      address: request.envelope.address,
      requestId: chunk.reply.requestId,
      replyId: chunk.reply.id
    }),
    rpc: request.rpc
  })
})

export const makeChunkReply = Effect.fnUntraced(function*(request: Message.OutgoingRequest<any>, sequence = 0) {
  const snowflake = yield* Snowflake.Generator
  return new Reply.ReplyWithContext({
    reply: new Reply.Chunk({
      id: snowflake.unsafeNext(),
      requestId: request.envelope.requestId,
      sequence,
      values: [undefined]
    }),
    context: request.context,
    rpc: request.rpc
  })
})

export const makeEmptyReply = (request: Message.OutgoingRequest<any>) => {
  return new Reply.ReplyWithContext({
    reply: Reply.Chunk.emptyFrom(request.envelope.requestId),
    context: request.context,
    rpc: request.rpc
  })
}
