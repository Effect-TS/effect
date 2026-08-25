import { assert, describe, expect, it } from "@effect/vitest"
import { Clock, Context, DateTime, Duration, Effect, Exit, Fiber, Latch, Layer, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  DeliverAt,
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

    it.effect("encoded unprocessedMessages fails closed for an empty address filter", () =>
      Effect.gen(function*() {
        const driver = yield* MessageStorage.MemoryDriver
        const envelope: Envelope.PartialRequestEncoded = {
          _tag: "Request",
          requestId: "1",
          address: { shardId: { group: "default", id: 1 }, entityType: "Repro", entityId: "one" },
          tag: "Repro",
          payload: {},
          headers: {}
        }
        yield* driver.encoded.saveEnvelope({ envelope, primaryKey: null, deliverAt: null })
        const messages = yield* driver.encoded.unprocessedMessages(["default:1"], 0, { addresses: [] })
        expect(messages).toHaveLength(0)
      }).pipe(Effect.provide(MessageStorage.MemoryDriver.layer)))

    it.effect("encoded resetAddresses fails closed for an empty address list", () =>
      Effect.gen(function*() {
        const driver = yield* MessageStorage.MemoryDriver
        const envelope: Envelope.PartialRequestEncoded = {
          _tag: "Request",
          requestId: "1",
          address: { shardId: { group: "default", id: 1 }, entityType: "Repro", entityId: "one" },
          tag: "Repro",
          payload: {},
          headers: {}
        }
        yield* driver.encoded.saveEnvelope({ envelope, primaryKey: null, deliverAt: null })
        const claimed = yield* driver.encoded.unprocessedMessages(["default:1"], 0)
        expect(claimed).toHaveLength(1)
        yield* driver.encoded.resetAddresses([])
        const messages = yield* driver.encoded.unprocessedMessages(["default:1"], 1)
        expect(messages).toHaveLength(0)
      }).pipe(Effect.provide(MessageStorage.MemoryDriver.layer)))

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
    it.effect("unprocessedMessages honors the limit option", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        for (let i = 1; i <= 5; i++) {
          yield* storage.saveRequest(yield* makeRequest({ payload: { id: i }, entityId: String(i) }))
        }
        const shardId = ShardId.make("default", 1)
        const messages = yield* storage.unprocessedMessages([shardId], { limit: 3 })
        expect(messages).toHaveLength(3)
        expect(messages.map((m: any) => m.envelope.payload.id)).toEqual([1, 2, 3])
        const remaining = yield* storage.unprocessedMessages([shardId])
        expect(remaining.map((m: any) => m.envelope.payload.id)).toEqual([4, 5])
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("unprocessedMessages filters by address", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        for (let i = 1; i <= 4; i++) {
          yield* storage.saveRequest(yield* makeRequest({ payload: { id: i }, entityId: String(i) }))
        }
        const shardId = ShardId.make("default", 1)
        const address = (entityId: string) =>
          EntityAddress.make({
            shardId,
            entityType: EntityType.make("test"),
            entityId: EntityId.make(entityId)
          })
        const messages = yield* storage.unprocessedMessages([shardId], {
          addresses: [address("2"), address("4")]
        })
        expect(messages.map((m: any) => m.envelope.payload.id)).toEqual([2, 4])
        // an empty address filter returns nothing
        const none = yield* storage.unprocessedMessages([shardId], { addresses: [] })
        expect(none).toHaveLength(0)
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("resetAddresses makes claimed messages eligible again", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        for (let i = 1; i <= 4; i++) {
          yield* storage.saveRequest(yield* makeRequest({ payload: { id: i }, entityId: String(i) }))
        }
        const shardId = ShardId.make("default", 1)
        yield* storage.unprocessedMessages([shardId], { limit: 3 })
        yield* storage.resetAddresses(["1", "3"].map((entityId) =>
          EntityAddress.make({
            shardId,
            entityType: EntityType.make("test"),
            entityId: EntityId.make(entityId)
          })
        ))

        const messages = yield* storage.unprocessedMessages([shardId])
        expect(messages.map((m: any) => m.envelope.payload.id)).toEqual([1, 3, 4])
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt returns none when nothing is scheduled", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const next = yield* storage.nextDeliverAt([ShardId.make("default", 1)])
        assert.isTrue(Option.isNone(next))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt returns the minimum future delivery time", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const now = yield* Clock.currentTimeMillis
        const shard1 = ShardId.make("default", 1)
        const shard2 = ShardId.make("default", 2)
        const earlier = now + 60_000
        const later = now + 120_000
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(later) }),
            shardId: shard1
          })
        )
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 2, deliverAt: DateTime.makeUnsafe(earlier) }),
            shardId: shard2
          })
        )

        const next = yield* storage.nextDeliverAt([shard1, shard2])
        assert.deepStrictEqual(next, Option.some(Duration.millis(60_000)))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt handles epoch zero across the due boundary", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const shard = ShardId.make("default", 1)
        yield* TestClock.setTime(-1)
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(0) }),
            shardId: shard
          })
        )

        let next = yield* storage.nextDeliverAt([shard])
        assert.deepStrictEqual(next, Option.some(Duration.millis(1)))
        let messages = yield* storage.unprocessedMessages([shard])
        assert.strictEqual(messages.length, 0)

        yield* TestClock.setTime(0)
        next = yield* storage.nextDeliverAt([shard])
        assert.isTrue(Option.isNone(next))
        messages = yield* storage.unprocessedMessages([shard])
        assert.strictEqual(messages.length, 1)
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt accounts for lookup latency", () =>
      Effect.gen(function*() {
        yield* TestClock.setTime(0)
        const driver = yield* MessageStorage.MemoryDriver
        const storage = yield* MessageStorage.makeEncoded({
          ...driver.encoded,
          nextDeliverAt: (shardIds, now) =>
            driver.encoded.nextDeliverAt(shardIds, now).pipe(Effect.delay(Duration.seconds(2)))
        })
        const shard = ShardId.make("default", 1)
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(1000) }),
            shardId: shard
          })
        )

        const fiber = yield* storage.nextDeliverAt([shard]).pipe(Effect.forkChild)
        yield* TestClock.adjust(2000)

        assert.deepStrictEqual(yield* Fiber.join(fiber), Option.some(Duration.zero))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt ignores messages on other shards", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const now = yield* Clock.currentTimeMillis
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(now + 60_000) }),
            shardId: ShardId.make("default", 2)
          })
        )

        const next = yield* storage.nextDeliverAt([ShardId.make("default", 1)])
        assert.isTrue(Option.isNone(next))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt ignores already-due messages", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const now = yield* Clock.currentTimeMillis
        const shard = ShardId.make("default", 1)
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(now) }),
            shardId: shard
          })
        )
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 2, deliverAt: DateTime.makeUnsafe(now - 1) }),
            shardId: shard
          })
        )

        const next = yield* storage.nextDeliverAt([shard])
        assert.isTrue(Option.isNone(next))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt ignores completed requests", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const now = yield* Clock.currentTimeMillis
        const request = yield* makeRequest({
          rpc: ScheduledRpc,
          payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(now + 60_000) })
        })
        yield* storage.saveRequest(request)
        yield* storage.saveReply(yield* makeReply(request))

        const next = yield* storage.nextDeliverAt([request.envelope.address.shardId])
        assert.isTrue(Option.isNone(next))
      }).pipe(Effect.provide(MemoryLayer)))

    it.effect("nextDeliverAt returns none for an empty shard iterable", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const now = yield* Clock.currentTimeMillis
        yield* storage.saveRequest(
          yield* makeRequest({
            rpc: ScheduledRpc,
            payload: new ScheduledPayload({ id: 1, deliverAt: DateTime.makeUnsafe(now + 60_000) })
          })
        )

        const next = yield* storage.nextDeliverAt([])
        assert.isTrue(Option.isNone(next))
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
  readonly entityId?: string
  readonly shardId?: ShardId.ShardId
}) {
  const snowflake = yield* Snowflake.Generator
  const rpc = options?.rpc ?? GetUserRpc
  return new Message.OutgoingRequest({
    envelope: Envelope.makeRequest<any>({
      requestId: snowflake.nextUnsafe(),
      address: EntityAddress.make({
        shardId: options?.shardId ?? ShardId.make("default", 1),
        entityType: EntityType.make("test"),
        entityId: EntityId.make(options?.entityId ?? "1")
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

export class ScheduledPayload extends Schema.Class<ScheduledPayload>("ScheduledPayload")({
  id: Schema.Number,
  deliverAt: Schema.DateTimeUtcFromMillis
}) {
  [DeliverAt.symbol]() {
    return this.deliverAt
  }
}

export class ScheduledRpc extends Rpc.make("ScheduledRpc", {
  payload: ScheduledPayload
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
