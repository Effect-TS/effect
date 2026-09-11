import type { Envelope } from "@effect/cluster"
import {
  ClusterError,
  EntityAddress,
  EntityId,
  EntityType,
  Message,
  MessageStorage,
  Reply,
  ShardId,
  ShardingConfig,
  Snowflake
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Option, Schema } from "effect"
import * as TestClock from "effect/TestClock"
import { makeReply, makeRequest, PrimaryKeyTest } from "./fixtures/message-storage.js"

const MemoryLive = MessageStorage.layerMemory.pipe(
  Layer.provideMerge(Snowflake.layerGenerator),
  Layer.provide(ShardingConfig.layerDefaults)
)

describe("MessageStorage", () => {
  describe("memory", () => {
    it.effect("rebalance releases parked reply waiters with a routing error", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const request = yield* makeRequest()
        const waiter = yield* Effect.fork(storage.registerReplyHandler(request))
        yield* TestClock.adjust(1)
        yield* storage.unregisterShardReplyHandlers(request.envelope.address.shardId)
        const exit = yield* Fiber.await(waiter)
        assert(Exit.isFailure(exit))
        assert.instanceOf(Cause.squash(exit.cause), ClusterError.EntityNotAssignedToRunner)
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("stores a defect fallback when a persisted reply cannot be encoded", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const rpc = Rpc.make("InvalidReply", { success: Schema.Int })
        const request = yield* makeRequest({ rpc, payload: undefined })
        yield* storage.saveRequest(request)
        const id = (yield* Snowflake.Generator).unsafeNext()
        const saved = yield* storage.saveReply(
          new Reply.ReplyWithContext<typeof rpc>({
            rpc,
            context: request.context,
            reply: new Reply.WithExit<typeof rpc>({
              id,
              requestId: request.envelope.requestId,
              exit: Exit.succeed(1.5)
            })
          })
        ).pipe(Effect.exit)
        assert(Exit.isSuccess(saved), "reply serialization must persist its defect fallback")
        const replies = yield* storage.repliesFor([request])
        assert.strictEqual(replies.length, 1)
        assert(replies[0]._tag === "WithExit")
        assert(Exit.isFailure(replies[0].exit))
        assert.include(Cause.pretty(replies[0].exit.cause), "MalformedMessage")
        assert.strictEqual((yield* storage.unprocessedMessages([request.envelope.address.shardId])).length, 0)
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("removes a queued Interrupt when clearing an address", () =>
      Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const snowflake = yield* Snowflake.Generator
        const request = yield* makeRequest()
        yield* storage.saveRequest(request)
        yield* storage.saveEnvelope(Message.OutgoingEnvelope.interrupt({
          id: snowflake.unsafeNext(),
          requestId: request.envelope.requestId,
          address: request.envelope.address
        }))

        yield* storage.clearAddress(request.envelope.address)

        const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
        assert.deepStrictEqual(messages.map(({ envelope }) => envelope._tag), [])
      }).pipe(Effect.provide(MemoryLive)))

    it.effect("removes the primary-key index when clearing an address", () =>
      Effect.gen(function*() {
        const driver = yield* MessageStorage.MemoryDriver
        const address = EntityAddress.EntityAddress.make({
          shardId: ShardId.make("default", 1),
          entityType: EntityType.EntityType.make("Repro"),
          entityId: EntityId.make("one")
        })
        const envelope: Envelope.Request.Encoded = {
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
        assert.strictEqual(result._tag, "Success")
      }).pipe(Effect.provide(MessageStorage.MemoryDriver.Default)))

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

  describe("makeEncoded", () => {
    it.effect("guards empty id lists before delegating", () =>
      Effect.gen(function*() {
        const encoded = {
          saveEnvelope: () => Effect.succeed(MessageStorage.SaveResultEncoded.Success()),
          saveReply: () => Effect.void,
          clearReplies: () => Effect.void,
          requestIdForPrimaryKey: () => Effect.succeed(Option.none()),
          repliesFor: () => Effect.succeed([]),
          repliesForUnfiltered: () => Effect.die("unexpected repliesForUnfiltered call"),
          unprocessedMessages: () => Effect.succeed([]),
          unprocessedMessagesById: () => Effect.succeed([]),
          resetAddress: () => Effect.void,
          clearAddress: () => Effect.void,
          resetShards: () => Effect.die("unexpected resetShards call")
        }

        const storage = yield* MessageStorage.makeEncoded(encoded).pipe(
          Effect.provide(Snowflake.layerGenerator)
        )

        const replies = yield* storage.repliesForUnfiltered([])
        expect(replies).toEqual([])

        yield* storage.resetShards([])
      }))
  })
})
