import {
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
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Schema, TestClock } from "effect"
import { abandonmentCause, MemoryLive } from "./fixtures/abandonment.js"
import { makeAckChunk, makeChunkReply, makeRequest, StreamRpc, StreamTest } from "./fixtures/message-storage.js"

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

for (const invalidFailure of [false, true]) {
  it.effect(`malformed stored replies release parked waiters (invalid failure=${invalidFailure})`, () =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const rpc = Rpc.make("MalformedStored", { success: Schema.Int, error: Schema.Int })
      const request = yield* makeRequest({ rpc, payload: undefined })
      yield* storage.saveRequest(request)
      const waiter = yield* storage.registerReplyHandler(request).pipe(Effect.fork)
      yield* TestClock.adjust(1)
      yield* storage.saveReply(
        new Reply.ReplyWithContext<typeof rpc>({
          rpc,
          context: request.context,
          reply: new Reply.WithExit<typeof rpc>({
            id: (yield* Snowflake.Generator).unsafeNext(),
            requestId: request.envelope.requestId,
            exit: invalidFailure ? Exit.fail(1.5) : Exit.succeed(1.5)
          })
        })
      )
      assert(Exit.isSuccess(yield* Fiber.await(waiter)))
      const replies = yield* storage.repliesFor([request])
      assert.strictEqual(replies.length, 1)
      const reply = replies[0]
      assert(reply._tag === "WithExit" && Exit.isFailure(reply.exit))
      assert(Cause.isDie(reply.exit.cause))
      assert.include(Cause.pretty(reply.exit.cause), "MalformedMessage")
    }).pipe(Effect.provide(MemoryLive)))
}
