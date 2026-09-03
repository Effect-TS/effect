import { NodeCrypto } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { MessageStorage, ShardingConfig, Snowflake, SqlMessageStorage } from "effect/unstable/cluster"
import { SqlClient } from "effect/unstable/sql"
import { makeAckChunk, makeChunkReply, makeRequest, StreamRpc } from "./MessageStorageTest.ts"

// Each Effect.provide builds and closes an independent native in-memory database.
const Dependencies = Layer.mergeAll(
  SqliteClient.layer({ filename: ":memory:" }),
  Snowflake.layerGenerator,
  NodeCrypto.layer
).pipe(Layer.provide(ShardingConfig.layerDefaults))

const StorageLayer = SqlMessageStorage.layer.pipe(
  Layer.provideMerge(Dependencies),
  Layer.provide(ShardingConfig.layerDefaults)
)

const saveStreamRequest = Effect.gen(function*() {
  const storage = yield* MessageStorage.MessageStorage
  const request = yield* makeRequest({
    rpc: StreamRpc,
    payload: StreamRpc.payloadSchema.make({ id: 123 })
  })
  assert.strictEqual((yield* storage.saveRequest(request))._tag, "Success")
  return request
})

const saveAcknowledgedChunk = Effect.fnUntraced(function*(sequence: number) {
  const storage = yield* MessageStorage.MessageStorage
  const request = yield* saveStreamRequest
  let chunk = yield* makeChunkReply(request, 0)
  yield* storage.saveReply(chunk)
  let ack = yield* makeAckChunk(request, chunk)
  yield* storage.saveEnvelope(ack)
  for (let i = 1; i <= sequence; i++) {
    chunk = yield* makeChunkReply(request, i)
    yield* storage.saveReply(chunk)
    ack = yield* makeAckChunk(request, chunk)
    yield* storage.saveEnvelope(ack)
  }
  const replies = yield* storage.repliesForUnfiltered([request.envelope.requestId])
  assert.strictEqual(replies.length, sequence + 1)
  const persisted = replies[sequence]
  assert(persisted._tag === "Chunk")
  assert.strictEqual(persisted.id, String(chunk.reply.id))
  assert.strictEqual(persisted.requestId, String(request.envelope.requestId))
  assert.strictEqual(persisted.sequence, sequence)
  assert.deepStrictEqual(persisted.values, [null])
  return { request, chunk, ack, persisted }
})

describe("SqlMessageStorage native SQLite by-ID reply projection", () => {
  it.effect("before any reply lastSentReply is None", () =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const sql = yield* SqlClient.SqlClient
      const version = yield* sql`SELECT sqlite_version() AS version`
      console.log(JSON.stringify({ witness: "sqlite-version", node: process.version, version }))
      const request = yield* saveStreamRequest
      const messages = yield* storage.unprocessedMessagesById([request.envelope.requestId])
      assert.strictEqual(messages.length, 1)
      const message = messages[0]
      assert(message._tag === "IncomingRequest")
      assert.strictEqual(message.envelope.requestId, request.envelope.requestId)
      assert.deepStrictEqual(message.lastSentReply, Option.none())
    }).pipe(Effect.provide(StorageLayer)))

  it.effect("an unacknowledged chunk excludes the request from both readers", () =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const request = yield* saveStreamRequest
      yield* storage.saveReply(yield* makeChunkReply(request, 0))
      assert.strictEqual((yield* storage.repliesForUnfiltered([request.envelope.requestId])).length, 1)
      assert.deepStrictEqual(yield* storage.unprocessedMessagesById([request.envelope.requestId]), [])
      assert.deepStrictEqual(yield* storage.unprocessedMessages([request.envelope.address.shardId]), [])
    }).pipe(Effect.provide(StorageLayer)))

  it.effect.each([0, 1])("by-ID preserves acknowledged chunk sequence %i", (sequence) =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const { persisted, request } = yield* saveAcknowledgedChunk(sequence)
      const messages = yield* storage.unprocessedMessagesById([request.envelope.requestId])
      assert.strictEqual(messages.length, 1)
      const message = messages[0]
      assert(message._tag === "IncomingRequest")
      assert.strictEqual(message.envelope.requestId, request.envelope.requestId)
      console.log(JSON.stringify({
        witness: "sqlite-by-id",
        sequence,
        actual: message.lastSentReply,
        expected: Option.some(persisted)
      }))
      assert.deepStrictEqual(message.lastSentReply, Option.some(persisted))
    }).pipe(Effect.provide(StorageLayer)))

  it.effect.each([0, 1])("shard reader preserves acknowledged chunk sequence %i", (sequence) =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const { persisted, request } = yield* saveAcknowledgedChunk(sequence)
      const messages = yield* storage.unprocessedMessages([request.envelope.address.shardId])
      assert.strictEqual(messages.length, 2)
      const requests = messages.filter((message) => message._tag === "IncomingRequest")
      assert.strictEqual(requests.length, 1)
      assert.strictEqual(requests[0].envelope.requestId, request.envelope.requestId)
      assert.deepStrictEqual(requests[0].lastSentReply, Option.some(persisted))
    }).pipe(Effect.provide(StorageLayer)))

  it.effect("encoded AckChunk selected by its own ID preserves the envelope replyId", () =>
    Effect.gen(function*() {
      const { ack, persisted } = yield* saveAcknowledgedChunk(0)
      const encoded = yield* SqlMessageStorage.makeEncoded()
      const messages = yield* encoded.unprocessedMessagesById([ack.envelope.id], 0)
      assert.strictEqual(messages.length, 1)
      const { envelope, lastSentReply } = messages[0]
      assert(envelope._tag === "AckChunk")
      assert.strictEqual(envelope.id, String(ack.envelope.id))
      assert.strictEqual(envelope.requestId, persisted.requestId)
      assert.deepStrictEqual(lastSentReply, Option.none())
      console.log(JSON.stringify({ witness: "sqlite-ack", actual: envelope.replyId, expected: persisted.id }))
      assert.strictEqual(envelope.replyId, persisted.id)
    }).pipe(Effect.provide(StorageLayer)))
})
