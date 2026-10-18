import { NodeCrypto } from "@effect/platform-node"
import { SqliteClient } from "@effect/sql-sqlite-do"
import { assert, describe, expect, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema } from "effect"
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
  Snowflake,
  SqlMessageStorage
} from "effect/cluster"
import { Headers } from "effect/http"
import { Rpc } from "effect/rpc"
import { SqlClient } from "effect/sql"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"

class UserById extends Rpc.make("UserById", {
  payload: {
    id: Schema.Number
  },
  primaryKey: (value) => value.id.toString()
}) {}

// Low bits stay set so the id is not an exactly representable double.
const snowflakeAboveSafeInteger = (sequence: number): Snowflake.Snowflake =>
  Snowflake.Snowflake(
    (BigInt(Date.UTC(2026, 0, 15) - Snowflake.constEpochMillis) << BigInt(22)) + BigInt(sequence)
  )

const makeRequest = (requestId: Snowflake.Snowflake) =>
  new Message.OutgoingRequest({
    envelope: Envelope.makeRequest<any>({
      requestId,
      address: EntityAddress.make({
        shardId: ShardId.make("default", 1),
        entityType: EntityType.make("test"),
        entityId: EntityId.make("1")
      }),
      tag: UserById._tag,
      payload: UserById.payloadSchema.make({ id: 1 }),
      traceId: "noop",
      spanId: "noop",
      sampled: false,
      headers: Headers.empty
    }),
    annotations: UserById.annotations,
    context: Context.empty() as any,
    rpc: UserById,
    lastReceivedReply: Option.none(),
    respond: () => Effect.void
  })

const makeReply = (
  request: Message.OutgoingRequest<any>,
  replyId: Snowflake.Snowflake,
  requestId: Snowflake.Snowflake
) =>
  new Reply.ReplyWithContext({
    reply: new Reply.WithExit({
      id: replyId,
      requestId,
      exit: Exit.void as any
    }),
    context: request.context,
    rpc: request.rpc
  })

// Durable Object `sql.exec().raw()` returns SQLite INTEGER as a JavaScript number.
// Read the exact int64, then round it the same way so snowflakes above 2^53 corrupt.
const makeNumberSqliteStorage = (): SqliteClient.SqliteClientConfig["storage"] => {
  const db = new DatabaseSync(":memory:")
  let savepoint = 0

  const exec = (query: string, ...params: ReadonlyArray<unknown>) => {
    const statement = db.prepare(query)
    statement.setReadBigInts(true)
    const objects = statement.all(...params as Array<SQLInputValue>) as ReadonlyArray<Record<string, unknown>>
    const columnNames = objects.length === 0 ? [] : Object.keys(objects[0]!)
    const rows = objects.map((object) =>
      columnNames.map((column) => {
        const value = object[column]
        return typeof value === "bigint" ? Number(value) : value
      })
    )
    return {
      columnNames,
      *raw() {
        for (const row of rows) {
          yield row.slice()
        }
      }
    }
  }

  const storage = {
    sql: { exec },
    transaction<T>(closure: (txn: { rollback: () => void }) => Promise<T>): Promise<T> {
      const name = `sp_${savepoint++}`
      db.exec(`SAVEPOINT ${name}`)
      let rolledBack = false
      const txn = {
        rollback() {
          if (!rolledBack) {
            rolledBack = true
            db.exec(`ROLLBACK TO ${name}`)
          }
        }
      }
      return Promise.resolve().then(() => closure(txn)).then(
        (value) => {
          db.exec(`RELEASE ${name}`)
          return value
        },
        (error: unknown) => {
          if (!rolledBack) {
            db.exec(`ROLLBACK TO ${name}`)
          }
          db.exec(`RELEASE ${name}`)
          throw error
        }
      )
    }
  }

  return storage as unknown as SqliteClient.SqliteClientConfig["storage"]
}

describe("SqlMessageStorage", () => {
  it.effect("keeps snowflake ids exact when sqlite returns integers as numbers", () => {
    const layer = SqlMessageStorage.layer.pipe(
      Layer.provideMerge(SqliteClient.layer({ storage: makeNumberSqliteStorage() })),
      Layer.provide([ShardingConfig.layerDefaults, NodeCrypto.layer])
    )
    return Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const request = makeRequest(snowflakeAboveSafeInteger(1))
      const requestId = String(request.envelope.requestId)
      assert.notStrictEqual(String(Number(request.envelope.requestId)), requestId)

      yield* storage.saveRequest(request)
      const shards = [request.envelope.address.shardId]
      const [message] = yield* storage.unprocessedMessages(shards)
      assert(message !== undefined && message._tag === "IncomingRequest")
      expect(String(message.envelope.requestId)).toEqual(requestId)
      // The claim writes last_read with the id it just read. A rounded id matches no row.
      expect(yield* storage.unprocessedMessages(shards)).toHaveLength(0)

      const reply = makeReply(request, snowflakeAboveSafeInteger(3), message.envelope.requestId)
      yield* storage.saveReply(reply)

      const sql = yield* SqlClient.SqlClient
      expect(
        yield* sql<{ id: string; processed: number | bigint }>`
        SELECT CAST(id AS TEXT) AS id, processed FROM cluster_messages
      `
      ).toEqual([{ id: requestId, processed: 1 }])
      expect(
        yield* sql<{ id: string; request_id: string }>`
        SELECT CAST(id AS TEXT) AS id, CAST(request_id AS TEXT) AS request_id FROM cluster_replies
      `
      ).toEqual([{ id: String(reply.reply.id), request_id: requestId }])

      const replies = yield* storage.repliesFor([request])
      expect(replies.map((stored) => String(stored.requestId))).toEqual([requestId])
      expect(replies.map((stored) => String(stored.id))).toEqual([String(reply.reply.id)])

      const duplicate = yield* storage.saveRequest(makeRequest(snowflakeAboveSafeInteger(5)))
      assert(duplicate._tag === "Duplicate" && Option.isSome(duplicate.lastReceivedReply))
      expect(String(duplicate.originalId)).toEqual(requestId)
      expect(String(duplicate.lastReceivedReply.value.id)).toEqual(String(reply.reply.id))
      expect(String(duplicate.lastReceivedReply.value.requestId)).toEqual(requestId)

      expect(
        yield* storage.requestIdForPrimaryKey({
          address: request.envelope.address,
          tag: request.envelope.tag,
          id: "1"
        })
      ).toEqual(Option.some(request.envelope.requestId))
    }).pipe(Effect.provide(layer))
  })
})
