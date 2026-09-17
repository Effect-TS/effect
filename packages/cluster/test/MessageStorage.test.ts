import {
  ClusterError,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
  MessageStorage,
  Reply,
  ShardId,
  Snowflake
} from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, expect, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Option, Schema, TestServices } from "effect"
import * as TestClock from "effect/TestClock"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import {
  makeAckChunk,
  makeChunkReply,
  makeReply,
  makeRequest,
  PrimaryKeyTest,
  StreamRpc,
  StreamTest
} from "./fixtures/message-storage.js"

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

    for (const invalidFailure of [false, true]) {
      it.effect(`persists and delivers a defect for a malformed terminal reply (error=${invalidFailure})`, () =>
        Effect.gen(function*() {
          const storage = yield* MessageStorage.MessageStorage
          const rpc = Rpc.make("InvalidReply", { success: Schema.Int, error: Schema.Int })
          const responses: Array<Reply.Reply<typeof rpc>> = []
          const request = new Message.OutgoingRequest({
            ...yield* makeRequest({ rpc }),
            respond: (reply: Reply.Reply<typeof rpc>) =>
              Effect.sync(() => {
                responses.push(reply)
              })
          })
          yield* storage.saveRequest(request)
          const waiter = yield* storage.registerReplyHandler(request).pipe(Effect.forkScoped)
          yield* TestClock.adjust(1)
          assert(Option.isNone(yield* Fiber.poll(waiter)), "reply waiter must be parked before saving")
          const id = (yield* Snowflake.Generator).unsafeNext()
          yield* storage.saveReply(
            new Reply.ReplyWithContext<typeof rpc>({
              rpc,
              context: request.context,
              reply: new Reply.WithExit<typeof rpc>({
                id,
                requestId: request.envelope.requestId,
                exit: invalidFailure ? Exit.fail(1.5) : Exit.succeed(1.5)
              })
            })
          )
          const released = yield* Fiber.await(waiter).pipe(
            Effect.timeoutOption("1 second"),
            TestServices.provideLive,
            Effect.ensuring(Fiber.interrupt(waiter))
          )
          const replies = yield* storage.repliesFor([request])
          assert.strictEqual(replies.length, 1)
          const stored = replies[0]
          assert(stored._tag === "WithExit")
          assert(Exit.isFailure(stored.exit))
          assert(Cause.isDie(stored.exit.cause))
          assert.include(Cause.pretty(stored.exit.cause), "MalformedMessage")
          assert.strictEqual(stored.id, id)
          assert.strictEqual(stored.requestId, request.envelope.requestId)
          assert.strictEqual((yield* storage.unprocessedMessages([request.envelope.address.shardId])).length, 0)
          assert(Option.isSome(released) && Exit.isSuccess(released.value), "terminal defect must release the waiter")
          assert.strictEqual(responses.length, 1)
          const delivered = responses[0]
          assert(delivered._tag === "WithExit")
          assert(
            Exit.isFailure(delivered.exit) && Cause.isDie(delivered.exit.cause),
            "caller must receive the stored defect, not the malformed terminal reply"
          )
          assert.include(Cause.pretty(delivered.exit.cause), "MalformedMessage")
          assert.strictEqual(delivered.id, stored.id)
          assert.strictEqual(delivered.requestId, stored.requestId)
        }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
    }

    for (const malformed of [false, true]) {
      it.effect(`persisted stream chunks preserve waiter and caller semantics (malformed=${malformed})`, () =>
        Effect.gen(function*() {
          const storage = yield* MessageStorage.MessageStorage
          const rpc = Rpc.make("Values", { success: Schema.Int, stream: true })
          const responses: Array<Reply.Reply<typeof rpc>> = []
          const request = new Message.OutgoingRequest({
            ...yield* makeRequest({ rpc }),
            respond: (reply: Reply.Reply<typeof rpc>) =>
              Effect.sync(() => {
                responses.push(reply)
              })
          })
          yield* storage.saveRequest(request)
          const waiter = yield* storage.registerReplyHandler(request).pipe(Effect.forkScoped)
          yield* TestClock.adjust(1)
          assert(Option.isNone(yield* Fiber.poll(waiter)), "reply waiter must be parked before saving")
          const id = (yield* Snowflake.Generator).unsafeNext()
          const chunk = new Reply.Chunk<typeof rpc>({
            id,
            requestId: request.envelope.requestId,
            sequence: 0,
            values: malformed ? [1.5] : [1, 2]
          })
          yield* storage.saveReply(new Reply.ReplyWithContext({ rpc, context: request.context, reply: chunk }))
          const replies = yield* storage.repliesFor([request])
          assert.strictEqual(replies.length, 1)
          const stored = replies[0]
          if (!malformed) {
            assert.deepStrictEqual(stored, chunk)
            assert.deepStrictEqual(responses, [chunk])
            assert(Option.isNone(yield* Fiber.poll(waiter)), "a valid chunk must retain its reply waiter")
            const terminal = new Reply.WithExit<typeof rpc>({
              id: (yield* Snowflake.Generator).unsafeNext(),
              requestId: request.envelope.requestId,
              exit: Exit.void
            })
            yield* storage.saveReply(new Reply.ReplyWithContext({ rpc, context: request.context, reply: terminal }))
            const released = yield* Fiber.await(waiter).pipe(
              Effect.timeoutOption("1 second"),
              TestServices.provideLive,
              Effect.ensuring(Fiber.interrupt(waiter))
            )
            assert(
              Option.isSome(released) && Exit.isSuccess(released.value),
              "normal completion must release the waiter"
            )
            assert.deepStrictEqual(responses, [chunk, terminal])
            assert.deepStrictEqual(yield* storage.repliesFor([request]), [chunk, terminal])
          } else {
            assert(stored._tag === "WithExit")
            assert(Exit.isFailure(stored.exit))
            assert(Cause.isDie(stored.exit.cause))
            assert.include(Cause.pretty(stored.exit.cause), "MalformedMessage")
            assert.strictEqual(stored.id, id)
            assert.strictEqual(stored.requestId, request.envelope.requestId)
            const released = yield* Fiber.await(waiter).pipe(
              Effect.timeoutOption("1 second"),
              TestServices.provideLive,
              Effect.ensuring(Fiber.interrupt(waiter))
            )
            assert.deepStrictEqual(
              {
                waiterReleased: Option.isSome(released) && Exit.isSuccess(released.value),
                deliveredTags: responses.map((reply) => reply._tag)
              },
              { waiterReleased: true, deliveredTags: ["WithExit"] },
              "the stored terminal defect must release the waiter and replace the malformed chunk for the caller"
            )
            const delivered = responses[0]
            assert(delivered._tag === "WithExit")
            assert(Exit.isFailure(delivered.exit))
            assert(Cause.isDie(delivered.exit.cause))
            assert.include(Cause.pretty(delivered.exit.cause), "MalformedMessage")
            assert.strictEqual(delivered.id, stored.id)
            assert.strictEqual(delivered.requestId, stored.requestId)
          }
          assert.strictEqual((yield* storage.unprocessedMessages([request.envelope.address.shardId])).length, 0)
        }).pipe(Effect.scoped, Effect.provide(MemoryLive)))
    }

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

describe("reply waiters and address cleanup", () => {
  it.effect("shutdown interrupts reply waiters instead of exposing a routing error", () =>
    Effect.gen(function*() {
      assert(Cause.isInterruptedOnly(yield* abandonmentCause))
    }).pipe(Effect.provide(MemoryLive)))

  it.effect("clearAddress removes AckChunk without deleting another entity's messages", () =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const request = yield* makeRequest({ rpc: StreamRpc, payload: new StreamTest({ id: 1 }) })
      const other = new Message.OutgoingRequest({
        ...request,
        envelope: Envelope.makeRequest<any>({
          ...request.envelope,
          requestId: (yield* Snowflake.Generator).unsafeNext(),
          address: EntityAddress.make({
            shardId: ShardId.make("default", 1),
            entityType: EntityType.EntityType.make("other"),
            entityId: EntityId.make("2")
          })
        })
      })
      yield* storage.saveRequest(request)
      yield* storage.saveRequest(other)
      const chunk = yield* makeChunkReply(request)
      yield* storage.saveReply(chunk)
      const ack = yield* makeAckChunk(request, chunk)
      yield* storage.saveEnvelope(ack)
      yield* storage.clearAddress(request.envelope.address)
      const pending = yield* storage.unprocessedMessages([request.envelope.address.shardId])
      assert.deepStrictEqual(pending.map(({ envelope }) => envelope.requestId), [other.envelope.requestId])
    }).pipe(Effect.provide(MemoryLive)))
})
