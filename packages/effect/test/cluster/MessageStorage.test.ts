import { describe, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Fiber, Latch, Layer, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
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
} from "effect/unstable/cluster"
import { Headers } from "effect/unstable/http"
import { Rpc, RpcSchema } from "effect/unstable/rpc"

const MemoryLayer = MessageStorage.layerMemory.pipe(
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(ShardingConfig.layerDefaults)
)

describe("MessageStorage", () => {
  describe("memory", () => {
    it.effect("removes the primary-key index when clearing an address", () =>
      Effect.gen(function*() {
        const driver = yield* MessageStorage.MemoryDriver
        const address = EntityAddress.make({
          shardId: ShardId.make("default", 1),
          entityType: EntityType.make("Repro"),
          entityId: EntityId.make("one")
        })
        const envelope: Envelope.PartialRequestEncoded = {
          _tag: "Request",
          requestId: "1",
          address: { shardId: { group: "default", id: 1 }, entityType: "Repro", entityId: "one" },
          tag: "Repro",
          payload: {},
          headers: {}
        }
        yield* driver.encoded.saveEnvelope({ envelope, primaryKey: "dedup-key", deliverAt: null })
        yield* driver.encoded.clearAddress(address)
        const result = yield* driver.encoded.saveEnvelope({
          envelope: { ...envelope, requestId: "2" },
          primaryKey: "dedup-key",
          deliverAt: null
        })
        expect(result._tag).toEqual("Success")
      }).pipe(Effect.provide(MessageStorage.MemoryDriver.layer)))

    it.effect("clears messages and replies only from the matching shard", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const entityType = EntityType.make("Repro")
        const entityId = EntityId.make("one")
        const targetAddress = EntityAddress.make({
          shardId: ShardId.make("default", 1),
          entityType,
          entityId
        })
        const preservedAddress = EntityAddress.make({
          shardId: ShardId.make("default", 2),
          entityType,
          entityId
        })
        const target = yield* makeRequest({
          rpc: PrimaryKeyTest,
          payload: PrimaryKeyTest.payloadSchema.make({ id: 1 }),
          address: targetAddress
        })
        const preserved = yield* makeRequest({
          rpc: PrimaryKeyTest,
          payload: PrimaryKeyTest.payloadSchema.make({ id: 2 }),
          address: preservedAddress
        })
        yield* storage.saveRequest(target)
        yield* storage.saveRequest(preserved)
        yield* storage.saveReply(yield* makeReply(target))
        yield* storage.saveReply(yield* makeReply(preserved))

        yield* storage.clearAddress(targetAddress)

        const targetId = yield* storage.requestIdForPrimaryKey({
          address: targetAddress,
          tag: target.envelope.tag,
          id: "1"
        })
        const preservedId = yield* storage.requestIdForPrimaryKey({
          address: preservedAddress,
          tag: preserved.envelope.tag,
          id: "2"
        })
        expect(targetId).toEqual(Option.none())
        expect(preservedId).toEqual(Option.some(preserved.envelope.requestId))
        expect(yield* storage.repliesForUnfiltered([target.envelope.requestId])).toHaveLength(0)
        expect(yield* storage.repliesForUnfiltered([preserved.envelope.requestId])).toHaveLength(1)
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("saves a request", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        const result = yield* storage.saveRequest(request)
        expect(result._tag).toEqual("Success")
        const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
        expect(messages).toHaveLength(1)
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("detects duplicates", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: PrimaryKeyTest,
            payload: PrimaryKeyTest.payloadSchema.make({ id: 123 })
          })
        )
        const result = yield* storage.saveRequest(
          yield* makeRequest({
            rpc: PrimaryKeyTest,
            payload: PrimaryKeyTest.payloadSchema.make({ id: 123 })
          })
        )
        expect(result._tag).toEqual("Duplicate")
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("unprocessedMessages excludes complete requests", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        yield* storage.saveReply(yield* makeReply(request))
        const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
        expect(messages).toHaveLength(0)
      }).pipe(Effect.provide(MemoryLayer)))

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
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("registerReplyHandler", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const latch = yield* Latch.make()
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        const fiber = yield* storage.registerReplyHandler(
          new Message.OutgoingRequest({
            ...request,
            respond: () => latch.open
          })
        ).pipe(Effect.forkChild)
        yield* TestClock.adjust(1)
        yield* storage.saveReply(yield* makeReply(request))
        yield* latch.await
        yield* Fiber.await(fiber)
      }).pipe(Effect.provide(MemoryLayer)))
  })
})

export const GetUserRpc = Rpc.make("GetUser", {
  payload: { id: Schema.Number }
})

export const makeRequest = Effect.fnUntraced(function*(options?: {
  readonly rpc?: Rpc.AnyWithProps
  readonly payload?: any
  readonly address?: EntityAddress.EntityAddress
}) {
  const snowflake = yield* Snowflake.Generator
  const rpc = options?.rpc ?? GetUserRpc
  return new Message.OutgoingRequest({
    envelope: Envelope.makeRequest<any>({
      requestId: snowflake.nextUnsafe(),
      address: options?.address ??
        EntityAddress.make({
          shardId: ShardId.make("default", 1),
          entityType: EntityType.make("test"),
          entityId: EntityId.make("1")
        }),
      tag: rpc._tag,
      payload: options?.payload ?? { id: 123 },
      traceId: "noop",
      spanId: "noop",
      sampled: false,
      headers: Headers.empty
    }),
    annotations: rpc.annotations,
    context: Context.empty() as any,
    rpc,
    lastReceivedReply: Option.none(),
    respond() {
      return Effect.void
    }
  })
})

export class PrimaryKeyTest extends Rpc.make("PrimaryKeyTest", {
  payload: {
    id: Schema.Number
  },
  primaryKey: (value) => value.id.toString()
}) {}

export class StreamRpc extends Rpc.make("StreamTest", {
  success: RpcSchema.Stream(Schema.Void, Schema.Never),
  payload: {
    id: Schema.Number
  },
  primaryKey: (value) => value.id.toString()
}) {}

export const makeReply = Effect.fnUntraced(function*(request: Message.OutgoingRequest<any>) {
  const snowflake = yield* Snowflake.Generator
  return new Reply.ReplyWithContext({
    reply: new Reply.WithExit({
      id: snowflake.nextUnsafe(),
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
      id: snowflake.nextUnsafe(),
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
      id: snowflake.nextUnsafe(),
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
