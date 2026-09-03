import { NodeCrypto } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { MessageStorage, ShardingConfig, Snowflake, SqlMessageStorage } from "effect/unstable/cluster"
import { makeAckChunk, makeChunkReply, makeRequest, StreamRpc } from "./MessageStorageTest.ts"

const StorageLayer = SqlMessageStorage.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      SqliteClient.layer({ filename: ":memory:" }),
      Snowflake.layerGenerator,
      NodeCrypto.layer
    ).pipe(Layer.provide(ShardingConfig.layerDefaults))
  ),
  Layer.provide(ShardingConfig.layerDefaults)
)

describe("SqlMessageStorage unprocessedMessagesById", () => {
  it.effect("preserves the reply ID of an AckChunk envelope", () =>
    Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const request = yield* makeRequest({
        rpc: StreamRpc,
        payload: StreamRpc.payloadSchema.make({ id: 123 })
      })
      yield* storage.saveRequest(request)

      const chunk = yield* makeChunkReply(request)
      yield* storage.saveReply(chunk)
      const ack = yield* makeAckChunk(request, chunk)
      yield* storage.saveEnvelope(ack)

      const encoded = yield* SqlMessageStorage.makeEncoded()
      const messages = yield* encoded.unprocessedMessagesById([ack.envelope.id], 0)

      assert.strictEqual(messages.length, 1)
      assert(messages[0].envelope._tag === "AckChunk")
      assert.strictEqual(messages[0].envelope.replyId, String(chunk.reply.id))
    }).pipe(Effect.provide(StorageLayer)))
})
