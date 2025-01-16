/**
 * @since 1.0.0
 */
import type { EntryId } from "@effect/experimental/EventJournal"
import { makeRemoteId, RemoteId } from "@effect/experimental/EventJournal"
import { EncryptedRemoteEntry, EventLogEncryption, layerSubtle } from "@effect/experimental/EventLogEncryption"
import * as EventLogServer from "@effect/experimental/EventLogServer"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as PubSub from "effect/PubSub"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as SqlClient from "./SqlClient.js"
import type { SqlError } from "./SqlError.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeStorage = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
  readonly insertBatchSize?: number
}): Effect.Effect<
  typeof EventLogServer.Storage.Service,
  SqlError,
  SqlClient.SqlClient | EventLogEncryption | Scope
> =>
  Effect.gen(function*() {
    const encryptions = yield* EventLogEncryption
    const sql = yield* SqlClient.SqlClient

    const tablePrefix = options?.entryTablePrefix ?? "effect_events"
    const remoteIdTable = options?.remoteIdTable ?? "effect_remote_id"
    const insertBatchSize = options?.insertBatchSize ?? 200

    yield* sql.onDialectOrElse({
      pg: () =>
        sql`CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BYTEA PRIMARY KEY
          )`.withoutTransform,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BINARY(16) PRIMARY KEY
          )`.withoutTransform,
      mssql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id VARBINARY(16) PRIMARY KEY
          )`.withoutTransform,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(remoteIdTable)} (
            remote_id BLOB PRIMARY KEY
          )`.withoutTransform
    })
    const remoteId = yield* sql<{ remote_id: Uint8Array }>`SELECT remote_id FROM ${sql(remoteIdTable)}`.pipe(
      Effect.flatMap((results) => {
        if (results.length > 0) {
          return Effect.succeed(RemoteId.make(results[0].remote_id))
        }
        const newRemoteId = makeRemoteId()
        return Effect.as(
          sql`INSERT INTO ${sql(remoteIdTable)} (remote_id) VALUES (${newRemoteId})`,
          RemoteId.make(newRemoteId)
        )
      })
    )

    const resources = yield* RcMap.make({
      lookup: (publicKey: string) =>
        Effect.gen(function*() {
          const publicKeyHash = (yield* encryptions.sha256String(new TextEncoder().encode(publicKey))).slice(0, 16)
          const table = `${tablePrefix}_${publicKeyHash}`

          yield* sql.onDialectOrElse({
            pg: () =>
              sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence SERIAL PRIMARY KEY,
                  iv BYTEA NOT NULL,
                  entry_id BYTEA UNIQUE NOT NULL,
                  encrypted_entry BYTEA NOT NULL
                )`.withoutTransform,
            mysql: () =>
              sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INT AUTO_INCREMENT PRIMARY KEY,
                  iv BINARY(12) NOT NULL,
                  entry_id BINARY(16) UNIQUE NOT NULL,
                  encrypted_entry BLOB NOT NULL
                )`.withoutTransform,
            mssql: () =>
              sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INT IDENTITY(1,1) PRIMARY KEY,
                  iv VARBINARY(12) NOT NULL,
                  entry_id VARBINARY(16) UNIQUE NOT NULL,
                  encrypted_entry VARBINARY(MAX) NOT NULL
                )`.withoutTransform,
            orElse: () =>
              sql`
                CREATE TABLE IF NOT EXISTS ${sql(table)} (
                  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                  iv BLOB NOT NULL,
                  entry_id BLOB UNIQUE NOT NULL,
                  encrypted_entry BLOB NOT NULL
                )`.withoutTransform
          })

          const pubsub = yield* Effect.acquireRelease(
            PubSub.unbounded<EncryptedRemoteEntry>(),
            PubSub.shutdown
          )
          return { pubsub, table } as const
        }),
      idleTimeToLive: "5 minutes"
    })

    return EventLogServer.Storage.of({
      getId: Effect.succeed(remoteId),
      write: (publicKey, entries) =>
        Effect.gen(function*() {
          if (entries.length === 0) return []
          const { pubsub, table } = yield* RcMap.get(resources, publicKey)
          const forInsert: Array<
            {
              readonly ids: Array<EntryId>
              readonly entries: Array<
                {
                  iv: Uint8Array
                  entry_id: Uint8Array
                  encrypted_entry: Uint8Array
                }
              >
            }
          > = [{
            ids: [],
            entries: []
          }]
          let currentBatch = forInsert[0]
          for (const entry of entries) {
            currentBatch.ids.push(entry.entryId)
            currentBatch.entries.push({
              iv: entry.iv,
              entry_id: entry.entryId,
              encrypted_entry: entry.encryptedEntry
            })
            if (currentBatch.entries.length === insertBatchSize) {
              currentBatch = { ids: [], entries: [] }
              forInsert.push(currentBatch)
            }
          }
          const allEntries: Array<EncryptedRemoteEntry> = []
          for (const batch of forInsert) {
            const encryptedEntries = yield* pipe(
              sql`INSERT INTO ${sql(table)} ${sql.insert(batch.entries)} ON CONFLICT DO NOTHING`.withoutTransform,
              Effect.zipRight(
                sql`SELECT * FROM ${sql(table)} WHERE ${sql.in("entry_id", batch.ids)} ORDER BY sequence ASC`
              ),
              Effect.flatMap(decodeEntries)
            )
            yield* pubsub.offerAll(encryptedEntries)
            // eslint-disable-next-line no-restricted-syntax
            allEntries.push(...encryptedEntries)
          }
          return allEntries
        }).pipe(
          Effect.orDie,
          Effect.scoped
        ),
      entries: (publicKey, startSequence) =>
        Effect.gen(function*() {
          const { table } = yield* RcMap.get(resources, publicKey)
          return yield* sql`SELECT * FROM ${sql(table)} WHERE sequence >= ${startSequence} ORDER BY sequence ASC`.pipe(
            Effect.flatMap(decodeEntries)
          )
        }).pipe(Effect.orDie, Effect.scoped),
      changes: (publicKey, startSequence) =>
        Effect.gen(function*() {
          const { pubsub, table } = yield* RcMap.get(resources, publicKey)
          const mailbox = yield* Mailbox.make<EncryptedRemoteEntry>()
          const queue = yield* pubsub.subscribe
          const initial = yield* sql`SELECT * FROM ${
            sql(table)
          } WHERE sequence >= ${startSequence} ORDER BY sequence ASC`.pipe(
            Effect.flatMap(decodeEntries)
          )
          yield* mailbox.offerAll(initial)
          yield* queue.takeBetween(1, Number.MAX_SAFE_INTEGER).pipe(
            Effect.tap((chunk) => mailbox.offerAll(Chunk.filter(chunk, (_) => _.sequence >= startSequence))),
            Effect.forever,
            Effect.forkScoped,
            Effect.interruptible
          )
          return mailbox
        }).pipe(Effect.orDie)
    })
  })

const EncryptedRemoteEntrySql = Schema.Struct({
  sequence: Schema.Number,
  iv: Schema.Uint8ArrayFromSelf,
  entry_id: Schema.Uint8ArrayFromSelf,
  encrypted_entry: Schema.Uint8ArrayFromSelf
})

const EncryptedRemoteEntryFromSql = Schema.transform(
  EncryptedRemoteEntrySql,
  EncryptedRemoteEntry,
  {
    decode(fromA) {
      return {
        sequence: fromA.sequence,
        iv: fromA.iv,
        entryId: fromA.entry_id,
        encryptedEntry: fromA.encrypted_entry
      }
    },
    encode(toI) {
      return {
        sequence: toI.sequence,
        iv: toI.iv,
        entry_id: toI.entryId,
        encrypted_entry: toI.encryptedEntry
      }
    }
  }
)
const decodeEntries = Schema.decodeUnknown(Schema.Array(EncryptedRemoteEntryFromSql))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerStorage = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
  readonly insertBatchSize?: number
}): Layer.Layer<EventLogServer.Storage, SqlError, SqlClient.SqlClient | EventLogEncryption> =>
  Layer.scoped(EventLogServer.Storage, makeStorage(options))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerStorageSubtle = (options?: {
  readonly entryTablePrefix?: string
  readonly remoteIdTable?: string
  readonly insertBatchSize?: number
}): Layer.Layer<EventLogServer.Storage, SqlError, SqlClient.SqlClient> =>
  layerStorage(options).pipe(
    Layer.provide(layerSubtle)
  )
